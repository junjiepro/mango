/**
 * ACP Session Store
 * ACP会话持久化存储管理器
 *
 * 用于将ACP会话及其消息持久化到本地文件系统
 * 服务重启后可还原会话（不自动初始化ACP连接）
 *
 * 新版本：每个 binding 的会话存储在各自的 data 目录下
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { ACPSessionConfig } from '../types/acp-config.js';
import type { UIMessage } from 'ai';
import { bindingCodeManager } from './binding-code-manager.js';

/**
 * 持久化的ACP会话数据
 */
export interface PersistedACPSession {
  /** 会话ID */
  sessionId: string;
  /** 绑定码 */
  bindingCode: string;
  /** 会话配置 */
  config: ACPSessionConfig;
  /** 消息历史 */
  messages: UIMessage[];
  /** 创建时间 */
  createdAt: string;
  /** 最后活跃时间 */
  lastActiveAt: string;
  /** 会话是否已激活（ACP连接已初始化） */
  isActivated: boolean;
}

/**
 * 持久化存储数据结构（单个 binding 的数据）
 */
interface ACPSessionStoreData {
  /** 版本号 */
  version: number;
  /** 会话列表 */
  sessions: PersistedACPSession[];
  /** 最后更新时间 */
  updatedAt: string;
}

/**
 * ACP会话持久化存储类
 * 每个 binding 的会话存储在各自的 data 目录下
 */
export class ACPSessionStore {
  private configDir: string;
  private globalStorePath: string;
  /** 按 bindingCode 缓存的数据 */
  private dataCache: Map<string, ACPSessionStoreData> = new Map();

  constructor() {
    this.configDir = join(homedir(), '.mango');
    this.globalStorePath = join(this.configDir, 'acp_sessions.json');
  }

  /**
   * 获取指定 binding 的存储路径
   */
  private getStorePathForBinding(bindingCode: string): string {
    const dataDir = bindingCodeManager.getBindingDataDir(bindingCode);
    return join(dataDir, 'acp_sessions.json');
  }

  /**
   * 确保 binding 数据目录存在
   */
  private ensureBindingDataDir(bindingCode: string): void {
    const dataDir = bindingCodeManager.getBindingDataDir(bindingCode);
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * 加载指定 binding 的存储数据
   */
  private loadDataForBinding(bindingCode: string): ACPSessionStoreData {
    // 检查缓存
    if (this.dataCache.has(bindingCode)) {
      return this.dataCache.get(bindingCode)!;
    }

    const storePath = this.getStorePathForBinding(bindingCode);

    if (!existsSync(storePath)) {
      // 尝试从全局存储迁移数据
      const migratedData = this.migrateFromGlobalStore(bindingCode);
      if (migratedData) {
        this.dataCache.set(bindingCode, migratedData);
        return migratedData;
      }

      const emptyData: ACPSessionStoreData = {
        version: 1,
        sessions: [],
        updatedAt: new Date().toISOString(),
      };
      this.dataCache.set(bindingCode, emptyData);
      return emptyData;
    }

    try {
      const content = readFileSync(storePath, 'utf-8');
      const data = JSON.parse(content) as ACPSessionStoreData;
      this.dataCache.set(bindingCode, data);
      return data;
    } catch (error) {
      console.error(`Failed to load ACP session store for binding ${bindingCode}:`, error);
      const emptyData: ACPSessionStoreData = {
        version: 1,
        sessions: [],
        updatedAt: new Date().toISOString(),
      };
      this.dataCache.set(bindingCode, emptyData);
      return emptyData;
    }
  }

  /**
   * 保存指定 binding 的存储数据
   */
  private saveDataForBinding(bindingCode: string): void {
    const data = this.dataCache.get(bindingCode);
    if (!data) return;

    this.ensureBindingDataDir(bindingCode);
    data.updatedAt = new Date().toISOString();

    const storePath = this.getStorePathForBinding(bindingCode);

    try {
      writeFileSync(storePath, JSON.stringify(data, null, 2), {
        mode: 0o600,
      });
    } catch (error) {
      console.error(`Failed to save ACP session store for binding ${bindingCode}:`, error);
    }
  }

  /**
   * 从全局存储迁移数据到 binding 目录
   */
  private migrateFromGlobalStore(bindingCode: string): ACPSessionStoreData | null {
    if (!existsSync(this.globalStorePath)) {
      return null;
    }

    try {
      const content = readFileSync(this.globalStorePath, 'utf-8');
      const globalData = JSON.parse(content) as {
        version: number;
        sessions: Record<string, PersistedACPSession[]>;
        updatedAt: string;
      };

      // 检查是否有该 binding 的会话数据
      const bindingSessions = globalData.sessions[bindingCode];
      if (!bindingSessions || bindingSessions.length === 0) {
        return null;
      }

      console.log(`Migrating ${bindingSessions.length} sessions for binding ${bindingCode.substring(0, 8)}...`);

      const migratedData: ACPSessionStoreData = {
        version: 1,
        sessions: bindingSessions,
        updatedAt: new Date().toISOString(),
      };

      // 保存到新位置
      this.ensureBindingDataDir(bindingCode);
      const storePath = this.getStorePathForBinding(bindingCode);
      writeFileSync(storePath, JSON.stringify(migratedData, null, 2), { mode: 0o600 });

      console.log(`Migration completed for binding ${bindingCode.substring(0, 8)}`);
      return migratedData;
    } catch (error) {
      console.error('Failed to migrate from global store:', error);
      return null;
    }
  }

  /**
   * 保存会话
   */
  saveSession(session: PersistedACPSession): void {
    const { bindingCode, sessionId } = session;
    const data = this.loadDataForBinding(bindingCode);

    // 查找是否已存在该会话
    const existingIndex = data.sessions.findIndex((s) => s.sessionId === sessionId);

    if (existingIndex >= 0) {
      // 更新已存在的会话
      data.sessions[existingIndex] = session;
    } else {
      // 添加新会话
      data.sessions.push(session);
    }

    this.saveDataForBinding(bindingCode);
    console.log(`ACP session saved: ${sessionId}`);
  }

  /**
   * 更新会话消息
   */
  updateMessages(sessionId: string, messages: UIMessage[], bindingCode?: string): void {
    // 如果提供了 bindingCode，直接查找
    if (bindingCode) {
      const data = this.loadDataForBinding(bindingCode);
      const sessionIndex = data.sessions.findIndex((s) => s.sessionId === sessionId);

      if (sessionIndex >= 0) {
        data.sessions[sessionIndex].messages = messages;
        data.sessions[sessionIndex].lastActiveAt = new Date().toISOString();
        this.saveDataForBinding(bindingCode);
        return;
      }
    }

    // 否则遍历所有已知的 binding 查找
    const session = this.findSessionWithBinding(sessionId);
    if (session) {
      const data = this.loadDataForBinding(session.bindingCode);
      const sessionIndex = data.sessions.findIndex((s) => s.sessionId === sessionId);

      if (sessionIndex >= 0) {
        data.sessions[sessionIndex].messages = messages;
        data.sessions[sessionIndex].lastActiveAt = new Date().toISOString();
        this.saveDataForBinding(session.bindingCode);
        return;
      }
    }

    console.warn(`Session not found for message update: ${sessionId}`);
  }

  /**
   * 添加消息到会话
   */
  appendMessage(sessionId: string, message: UIMessage, bindingCode?: string): void {
    // 如果提供了 bindingCode，直接查找
    if (bindingCode) {
      const data = this.loadDataForBinding(bindingCode);
      const sessionIndex = data.sessions.findIndex((s) => s.sessionId === sessionId);

      if (sessionIndex >= 0) {
        data.sessions[sessionIndex].messages.push(message);
        data.sessions[sessionIndex].lastActiveAt = new Date().toISOString();
        this.saveDataForBinding(bindingCode);
        return;
      }
    }

    // 否则遍历查找
    const session = this.findSessionWithBinding(sessionId);
    if (session) {
      const data = this.loadDataForBinding(session.bindingCode);
      const sessionIndex = data.sessions.findIndex((s) => s.sessionId === sessionId);

      if (sessionIndex >= 0) {
        data.sessions[sessionIndex].messages.push(message);
        data.sessions[sessionIndex].lastActiveAt = new Date().toISOString();
        this.saveDataForBinding(session.bindingCode);
        return;
      }
    }

    console.warn(`Session not found for message append: ${sessionId}`);
  }

  /**
   * 更新会话激活状态
   */
  updateActivationStatus(sessionId: string, isActivated: boolean, bindingCode?: string): void {
    // 如果提供了 bindingCode，直接查找
    if (bindingCode) {
      const data = this.loadDataForBinding(bindingCode);
      const sessionIndex = data.sessions.findIndex((s) => s.sessionId === sessionId);

      if (sessionIndex >= 0) {
        data.sessions[sessionIndex].isActivated = isActivated;
        data.sessions[sessionIndex].lastActiveAt = new Date().toISOString();
        this.saveDataForBinding(bindingCode);
        return;
      }
    }

    // 否则遍历查找
    const session = this.findSessionWithBinding(sessionId);
    if (session) {
      const data = this.loadDataForBinding(session.bindingCode);
      const sessionIndex = data.sessions.findIndex((s) => s.sessionId === sessionId);

      if (sessionIndex >= 0) {
        data.sessions[sessionIndex].isActivated = isActivated;
        data.sessions[sessionIndex].lastActiveAt = new Date().toISOString();
        this.saveDataForBinding(session.bindingCode);
        return;
      }
    }
  }

  /**
   * 查找会话并返回其 bindingCode
   */
  private findSessionWithBinding(sessionId: string): PersistedACPSession | undefined {
    // 从缓存中查找
    for (const [bindingCode, data] of this.dataCache.entries()) {
      const session = data.sessions.find((s) => s.sessionId === sessionId);
      if (session) {
        return session;
      }
    }

    // 从配置中获取所有 binding codes 并查找
    const config = bindingCodeManager.readConfig();
    if (config) {
      for (const bindingCode of Object.keys(config)) {
        if (this.dataCache.has(bindingCode)) continue;

        const data = this.loadDataForBinding(bindingCode);
        const session = data.sessions.find((s) => s.sessionId === sessionId);
        if (session) {
          return session;
        }
      }
    }

    return undefined;
  }

  /**
   * 获取会话
   */
  getSession(sessionId: string, bindingCode?: string): PersistedACPSession | undefined {
    // 如果提供了 bindingCode，直接查找
    if (bindingCode) {
      const data = this.loadDataForBinding(bindingCode);
      return data.sessions.find((s) => s.sessionId === sessionId);
    }

    // 否则遍历查找
    return this.findSessionWithBinding(sessionId);
  }

  /**
   * 获取会话的消息历史
   */
  getMessages(sessionId: string, bindingCode?: string): UIMessage[] {
    const session = this.getSession(sessionId, bindingCode);
    return session?.messages || [];
  }

  /**
   * 获取指定绑定码的所有会话
   */
  getSessionsByBinding(bindingCode: string): PersistedACPSession[] {
    const data = this.loadDataForBinding(bindingCode);
    return data.sessions;
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): PersistedACPSession[] {
    const allSessions: PersistedACPSession[] = [];

    // 从配置中获取所有 binding codes
    const config = bindingCodeManager.readConfig();
    if (config) {
      for (const bindingCode of Object.keys(config)) {
        const data = this.loadDataForBinding(bindingCode);
        allSessions.push(...data.sessions);
      }
    }

    return allSessions;
  }

  /**
   * 删除会话
   */
  deleteSession(sessionId: string, bindingCode?: string): boolean {
    // 如果提供了 bindingCode，直接查找
    if (bindingCode) {
      const data = this.loadDataForBinding(bindingCode);
      const sessionIndex = data.sessions.findIndex((s) => s.sessionId === sessionId);

      if (sessionIndex >= 0) {
        data.sessions.splice(sessionIndex, 1);
        this.saveDataForBinding(bindingCode);
        console.log(`ACP session deleted: ${sessionId}`);
        return true;
      }
    }

    // 否则遍历查找
    const session = this.findSessionWithBinding(sessionId);
    if (session) {
      const data = this.loadDataForBinding(session.bindingCode);
      const sessionIndex = data.sessions.findIndex((s) => s.sessionId === sessionId);

      if (sessionIndex >= 0) {
        data.sessions.splice(sessionIndex, 1);
        this.saveDataForBinding(session.bindingCode);
        console.log(`ACP session deleted: ${sessionId}`);
        return true;
      }
    }

    return false;
  }

  /**
   * 清理过期会话
   * @param maxAgeMs 最大保留时间（毫秒），默认7天
   */
  cleanupExpiredSessions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    // 从配置中获取所有 binding codes
    const config = bindingCodeManager.readConfig();
    if (config) {
      for (const bindingCode of Object.keys(config)) {
        const data = this.loadDataForBinding(bindingCode);
        const originalCount = data.sessions.length;

        data.sessions = data.sessions.filter((s) => {
          const lastActive = new Date(s.lastActiveAt).getTime();
          const isExpired = now - lastActive > maxAgeMs;
          if (isExpired) cleaned++;
          return !isExpired;
        });

        if (data.sessions.length !== originalCount) {
          this.saveDataForBinding(bindingCode);
        }
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired ACP sessions`);
    }

    return cleaned;
  }

  /**
   * 标记所有会话为未激活（服务重启时调用）
   */
  markAllAsDeactivated(): void {
    // 从配置中获取所有 binding codes
    const config = bindingCodeManager.readConfig();
    if (config) {
      for (const bindingCode of Object.keys(config)) {
        const data = this.loadDataForBinding(bindingCode);
        let hasChanges = false;

        for (const session of data.sessions) {
          if (session.isActivated) {
            session.isActivated = false;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          this.saveDataForBinding(bindingCode);
        }
      }
    }

    console.log('All ACP sessions marked as deactivated');
  }

  /**
   * 刷新缓存（强制重新加载）
   */
  refresh(): void {
    this.dataCache.clear();
  }

  /**
   * 刷新指定 binding 的缓存
   */
  refreshBinding(bindingCode: string): void {
    this.dataCache.delete(bindingCode);
  }
}

// 导出单例实例
export const acpSessionStore = new ACPSessionStore();
