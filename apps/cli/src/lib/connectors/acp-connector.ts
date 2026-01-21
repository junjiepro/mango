/**
 * ACP Service Connector
 * 连接和管理本地ACP服务
 * 使用 @mcpc-tech/acp-ai-provider 实现 ACP 协议支持
 */

import { NewSessionResponse } from '@agentclientprotocol/sdk';
import type { ACPSessionConfig } from '../../types/acp-config.js';
import { ACPProvider, createACPProvider } from '@mcpc-tech/acp-ai-provider';

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
  public provider: ACPProvider;
  public lastActiveAt: Date;
  public initError?: string;
  public isInitialized: boolean = false;
  private innserSession?: NewSessionResponse;
  private innerSessionId?: string;
  private idleTimer?: NodeJS.Timeout;
  private reconnectConfig: ReconnectConfig = DEFAULT_RECONNECT_CONFIG;

  constructor(sessionId: string, bindingCode: string, config: ACPSessionConfig) {
    this.sessionId = sessionId;
    this.bindingCode = bindingCode;
    this.config = config;
    this.lastActiveAt = new Date();

    // 创建 ACP Provider
    this.provider = createACPProvider({
      command: config.agent.command,
      args: config.agent.args,
      env: config.agent.env,
      session: {
        ...config.session,
        mcpServers: [],
      },
      authMethodId: config.agent.authMethodId,
      persistSession: true, // Keep session alive
    });
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
    for (let attempt = 0; attempt <= this.reconnectConfig.maxRetries; attempt++) {
      try {
        const session = await this.provider.initSession();
        this.innserSession = session;
        this.innerSessionId = session.sessionId;
        this.isInitialized = true;
        this.initError = undefined;

        // 启动空闲超时检查
        this.startIdleTimer();

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
    this.provider.cleanup();
  }
}

/**
 * ACP连接器类
 */
export class ACPConnector {
  private sessions: Map<string, ACPSession> = new Map();
  private sessionsByBinding: Map<string, Set<string>> = new Map();

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
  async closeSession(sessionId: string): Promise<boolean> {
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
