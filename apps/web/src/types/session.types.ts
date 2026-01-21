/**
 * Session Types and State Management
 * 会话类型定义和状态管理
 */

export type SessionType = 'mango' | 'acp';

export interface SessionTab {
  id: string;
  type: SessionType;
  label: string;
  icon?: string;
  // Mango 会话特有属性
  conversationId?: string;
  // ACP 会话特有属性
  acpSessionId?: string;
  deviceId?: string;
  agentName?: string;
  persistedId?: string; // 数据库中的持久化记录 ID
}

export interface SessionState {
  activeSessionId: string;
  sessions: SessionTab[];
}
