/**
 * Session Types and State Management
 * 会话类型定义和状态管理
 */

import type { UIMessage } from 'ai';

export type SessionType = 'mango' | 'acp';

export type SessionRunningStatus = 'idle' | 'streaming' | 'submitted';

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
  isActivated?: boolean; // ACP连接是否已激活
  // 工作目录（ACP会话启动时的工作目录）
  workingDirectory?: string;
  // 消息缓存（用于标签页切换时保留消息）
  cachedMessages?: UIMessage[];
  // 运行状态（用于显示后台会话是否正在运行）
  runningStatus?: SessionRunningStatus;
}

export interface SessionState {
  activeSessionId: string;
  sessions: SessionTab[];
}
