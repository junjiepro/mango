/**
 * ACP Service Connector
 * 连接和管理本地ACP服务
 * 使用 @mcpc-tech/acp-ai-provider 实现 ACP 协议支持
 */

import { NewSessionResponse } from '@agentclientprotocol/sdk';
import type { ACPSessionConfig } from '../../types/acp-config.js';
import { ACPProvider, createACPProvider } from '@mcpc-tech/acp-ai-provider';
import { acpSessionStore, PersistedACPSession } from '../acp-session-store.js';
import type { UIMessage } from 'ai';

/**
 * 重连配置
 */
interface ReconnectConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * ACP会话管理器
 */
class ACPSession {
  public sessionId: string;
  public bindingCode: string;
  public config: ACPSessionConfig;
  public provider: ACPProvider | null = null;
  public lastActiveAt: Date;
  public initError?: string;
  public isInitialized: boolean = false;
  private innserSession?: NewSessionResponse;
  private innerSessionId?: string;
  private idleTimer?: NodeJS.Timeout;
  private reconnectConfig: ReconnectConfig = DEFAULT_RECONNECT_CONFIG;
  private providerCreated: boolean = false;

  constructor(
    sessionId: string,
    bindingCode: string,
    config: ACPSessionConfig,
    createProvider: boolean = true
  ) {
    this.sessionId = sessionId;
    this.bindingCode = bindingCode;
    this.config = config;
    this.lastActiveAt = new Date(config.lastActiveAt || new Date());

    if (createProvider) {
      this.createProvider();
    }
  }

  /**
   * 创建 ACP Provider
   */
  private createProvider(): void {
    if (this.providerCreated) return;

    this.provider = createACPProvider({
      command: this.config.agent.command,
      args: this.config.agent.args,
      env: this.config.agent.env,
      session: {
        ...this.config.session,
        mcpServers: [],
      },
      authMethodId: this.config.agent.authMethodId,
      persistSession: true,
    });
    this.providerCreated = true;
  }

  /**
   * 确保 Provider 已创建
   */
  ensureProvider(): void {
    this.createProvider();
  }

  /**
   * 检查 Provider 是否已创建
   */
  hasProvider(): boolean {
    return this.providerCreated && this.provider !== null;
  }

  /**
   * 计算指数退避延迟
   */
  private calculateDelay(retryCount: number): number {
    const delay = Math.min(
      this.reconnectConfig.baseDelayMs * Math.pow(2, retryCount),
      this.reconnectConfig.maxDelayMs
    );
    // 添加抖动 (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async initSession(): Promise<string | undefined> {
    // 确保 Provider 已创建
    this.ensureProvider();

    if (!this.provider) {
      this.initError = 'Provider not created';
      return undefined;
    }

    for (let attempt = 0; attempt <= this.reconnectConfig.maxRetries; attempt++) {
      try {
        const session = await this.provider.initSession();
        this.innserSession = session;
        this.innerSessionId = session.sessionId;
        this.isInitialized = true;
        this.initError = undefined;

        // 启动空闲超时检查
        this.startIdleTimer();

        // 更新持久化存储的激活状态
        acpSessionStore.updateActivationStatus(this.sessionId, true);

        console.log(`ACP session ${this.sessionId} initialized successfully`);
        return this.innerSessionId;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.initError = errorMsg;

        if (attempt < this.reconnectConfig.maxRetries) {
          const delayMs = this.calculateDelay(attempt);
          console.warn(
            `ACP session ${this.sessionId} init failed (attempt ${attempt + 1}/${this.reconnectConfig.maxRetries + 1}), retrying in ${delayMs}ms...`
          );
          await this.delay(delayMs);
        }
      }
    }

    console.error(
      `Failed to initialize ACP session ${this.sessionId} after ${this.reconnectConfig.maxRetries + 1} attempts`
    );
    this.config.status = 'error';
    return undefined;
  }

  /**
   * 检查会话是否就绪
   */
  isReady(): boolean {
    return this.isInitialized && !this.initError;
  }

  /**
   * 等待会话初始化完成
   */
  async waitForReady(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      if (this.isInitialized) return true;
      if (this.initError) return false;
      await this.delay(100);
    }
    return false;
  }

  /**
   * 更新最后活跃时间
   */
  updateActivity() {
    this.lastActiveAt = new Date();
    this.config.lastActiveAt = this.lastActiveAt.toISOString();
    this.config.status = 'active';

    // 重置空闲计时器
    this.startIdleTimer();
  }

  /**
   * 启动空闲计时器
   */
  private startIdleTimer() {
    // 清除现有计时器
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }

    // 设置新的空闲计时器（默认30分钟）
    const timeout = this.config.idleTimeout || 30 * 60 * 1000;
    this.idleTimer = setTimeout(() => {
      this.config.status = 'idle';
      console.log(`ACP session ${this.sessionId} marked as idle`);
    }, timeout);
  }

  /**
   * 关闭会话
   */
  async close() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.config.status = 'closed';
    // ACP provider 清理资源
    if (this.provider) {
      this.provider.cleanup();
    }
    this.isInitialized = false;
  }
}

/**
 * ACP连接器类
 */
export class ACPConnector {
  private sessions: Map<string, ACPSession> = new Map();
  private sessionsByBinding: Map<string, Set<string>> = new Map();
  private initialized: boolean = false;

  /**
   * 初始化连接器（服务启动时调用）
   * 还原持久化的会话，但不初始化ACP连接
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // 标记所有持久化会话为未激活
    acpSessionStore.markAllAsDeactivated();

    // 清理过期会话（默认7天）
    acpSessionStore.cleanupExpiredSessions();

    // 加载持久化的会话（不初始化连接）
    const persistedSessions = acpSessionStore.getAllSessions();
    console.log(`Loading ${persistedSessions.length} persisted ACP sessions`);

    for (const persisted of persistedSessions) {
      this.restoreSessionFromPersisted(persisted);
    }

    this.initialized = true;
    console.log('ACP Connector initialized');
  }

  /**
   * 从持久化数据还原会话（不初始化ACP连接）
   */
  private restoreSessionFromPersisted(persisted: PersistedACPSession): void {
    const { sessionId, bindingCode, config } = persisted;

    // 创建会话对象但不初始化ACP Provider
    const acpSession = new ACPSession(sessionId, bindingCode, config, false);
    this.sessions.set(sessionId, acpSession);

    // 记录绑定码对应的会话
    if (!this.sessionsByBinding.has(bindingCode)) {
      this.sessionsByBinding.set(bindingCode, new Set());
    }
    this.sessionsByBinding.get(bindingCode)!.add(sessionId);

    console.log(`Restored ACP session: ${sessionId} (not activated)`);
  }

  /**
   * 创建新的 ACP 会话
   */
  async createSession(
    bindingCode: string,
    agent: ACPSessionConfig['agent'],
    session: ACPSessionConfig['session']
  ): Promise<string> {
    const sessionId = `acp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const config: ACPSessionConfig = {
      sessionId,
      bindingCode,
      agent,
      session,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      status: 'active',
      idleTimeout: 30 * 60 * 1000, // 30分钟
    };

    const acpSession = new ACPSession(sessionId, bindingCode, config);
    this.sessions.set(sessionId, acpSession);

    // 持久化会话
    const persistedSession: PersistedACPSession = {
      sessionId,
      bindingCode,
      config,
      messages: [],
      createdAt: config.createdAt,
      lastActiveAt: config.lastActiveAt,
      isActivated: false,
    };
    acpSessionStore.saveSession(persistedSession);

    // 后台初始化（带错误处理）
    acpSession.initSession().catch((error) => {
      console.error(`Failed to initialize ACP session ${sessionId}:`, error);
    });

    // 记录绑定码对应的会话
    if (!this.sessionsByBinding.has(bindingCode)) {
      this.sessionsByBinding.set(bindingCode, new Set());
    }
    this.sessionsByBinding.get(bindingCode)!.add(sessionId);

    console.log(`ACP session created: ${sessionId} for binding ${bindingCode}`);
    return sessionId;
  }

  /**
   * 激活会话（初始化ACP连接）
   * 用于还原的历史会话在需要时激活
   */
  async activateSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`Session not found: ${sessionId}`);
      return false;
    }

    // 如果已经初始化，直接返回成功
    if (session.isReady()) {
      return true;
    }

    // 初始化会话
    const result = await session.initSession();
    return result !== undefined;
  }

  /**
   * 获取会话的历史消息
   */
  getSessionMessages(sessionId: string): UIMessage[] {
    return acpSessionStore.getMessages(sessionId);
  }

  /**
   * 更新会话消息
   */
  updateSessionMessages(sessionId: string, messages: UIMessage[]): void {
    acpSessionStore.updateMessages(sessionId, messages);
  }

  /**
   * 添加消息到会话
   */
  appendSessionMessage(sessionId: string, message: UIMessage): void {
    acpSessionStore.appendMessage(sessionId, message);
  }

  /**
   * 检查会话是否已激活
   */
  isSessionActivated(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.isReady() || false;
  }

  /**
   * 获取会话（带就绪检查）
   */
  getSession(sessionId: string): ACPSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取就绪的会话，如果未初始化则等待
   */
  async getReadySession(sessionId: string, timeoutMs: number = 30000): Promise<ACPSession | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    if (!session.isReady()) {
      const ready = await session.waitForReady(timeoutMs);
      if (!ready) {
        console.error(`ACP session ${sessionId} failed to become ready: ${session.initError}`);
        return undefined;
      }
    }

    return session;
  }

  /**
   * 获取绑定码的所有会话
   */
  getSessionsByBinding(bindingCode: string): ACPSession[] {
    const sessionIds = this.sessionsByBinding.get(bindingCode);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id))
      .filter((s): s is ACPSession => s !== undefined);
  }

  /**
   * 更新会话活跃时间
   */
  updateSessionActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.updateActivity();
    return true;
  }

  /**
   * 关闭会话
   */
  async closeSession(sessionId: string, deletePersisted: boolean = true): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    await session.close();
    this.sessions.delete(sessionId);

    // 从绑定码映射中移除
    const bindingSessions = this.sessionsByBinding.get(session.bindingCode);
    if (bindingSessions) {
      bindingSessions.delete(sessionId);
      if (bindingSessions.size === 0) {
        this.sessionsByBinding.delete(session.bindingCode);
      }
    }

    // 从持久化存储中删除
    if (deletePersisted) {
      acpSessionStore.deleteSession(sessionId);
    }

    console.log(`ACP session closed: ${sessionId}`);
    return true;
  }

  /**
   * 清理空闲会话
   */
  async cleanupIdleSessions(): Promise<number> {
    let cleaned = 0;
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.config.status === 'idle') {
        const idleTime = now - session.lastActiveAt.getTime();
        const maxIdleTime = (session.config.idleTimeout || 30 * 60 * 1000) * 2; // 2倍超时时间后清理

        if (idleTime > maxIdleTime) {
          await this.closeSession(sessionId);
          cleaned++;
        }
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} idle ACP sessions`);
    }

    return cleaned;
  }

  /**
   * 关闭所有会话
   */
  async closeAll(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(sessionIds.map((id) => this.closeSession(id)));
    console.log('All ACP sessions closed');
  }

  /**
   * 获取会话统计信息
   */
  getStats() {
    const stats = {
      total: this.sessions.size,
      active: 0,
      idle: 0,
      byBinding: {} as Record<string, number>,
    };

    for (const session of this.sessions.values()) {
      if (session.config.status === 'active') stats.active++;
      if (session.config.status === 'idle') stats.idle++;

      const binding = session.bindingCode;
      stats.byBinding[binding] = (stats.byBinding[binding] || 0) + 1;
    }

    return stats;
  }
}

// 导出单例实例
export const acpConnector = new ACPConnector();
