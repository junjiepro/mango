/**
 * Type definitions for process-agent-message Edge Function
 */

export interface AgentMessagePayload {
  conversationId: string;
  messageId: string;
  userId: string;
  deviceId?: string | null;
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
