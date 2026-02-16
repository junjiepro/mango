/**
 * Type definitions for process-agent-message Edge Function
 */

export interface AgentMessagePayload {
  conversationId: string;
  messageId: string;
  userId: string;
  deviceId?: string | null;
  /** 续传参数 */
  continuation?: {
    /** Agent 消息 ID（续传时使用） */
    agentMessageId: string;
    /** 当前运行次数 */
    runCount: number;
    /** 已累积的内容 */
    partialContent?: string;
    /** 已累积的 token 数 */
    totalTokens?: number;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'agent' | 'system' | 'miniapp';
  sender_id?: string;
  content: string;
  content_type: string;
  sequence_number: number;
  status: string;
  agent_metadata?: Record<string, any>;
  created_at: string;
  reply_to_message_id?: string;
}

export interface ToolCallStatus {
  tool: string;
  toolCallId?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  args?: any;
  result?: any;
  error?: string;
  isMcpTool?: boolean;
  deviceName?: string;
}

/** 消息执行状态 */
export type MessageExecutionStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'timeout'
  | 'interrupted';

/** Agent 元数据扩展 */
export interface AgentMetadata {
  model?: string;
  tokens?: number;
  thinking_time_ms?: number;
  error?: string;
  processing_time_ms?: number;
  /** 超时信息 */
  timeout?: {
    timedOut: boolean;
    reason?: 'approaching_limit' | 'hard_timeout';
    canContinue: boolean;
  };
  /** 执行检查点 */
  checkpoint?: {
    stepIndex: number;
    elapsedTime: number;
    timestamp: string;
    canResume: boolean;
    lastToolCall?: string;
    partialContent?: string;
  };
}
