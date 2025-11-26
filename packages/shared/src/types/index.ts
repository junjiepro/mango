// Database types (将在 Supabase 配置后自动生成)
export interface Database {
  public: {
    Tables: Record<string, any>;
    Views: Record<string, any>;
    Functions: Record<string, any>;
  };
}

// Common types
export type UUID = string;

export type Timestamp = string;

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// User types
export interface UserProfile {
  id: UUID;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  preferences: UserPreferences;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserPreferences {
  language: 'zh-CN' | 'en';
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  agent_behavior: AgentBehavior;
}

export interface AgentBehavior {
  response_style: 'concise' | 'balanced' | 'detailed';
  detail_level: 'low' | 'medium' | 'high';
  auto_execute: boolean;
}

// Conversation types
export interface Conversation {
  id: UUID;
  user_id: UUID;
  title: string;
  description?: string;
  status: 'active' | 'archived' | 'deleted';
  context: ConversationContext;
  created_at: Timestamp;
  updated_at: Timestamp;
  last_message_at?: Timestamp;
}

export interface ConversationContext {
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt?: string;
}

// Message types
export interface Message {
  id: UUID;
  conversation_id: UUID;
  sender_type: 'user' | 'agent' | 'system' | 'miniapp';
  sender_id?: UUID;
  content: string;
  content_type: 'text/plain' | 'text/markdown' | 'text/html' | 'application/json';
  attachments: Attachment[];
  agent_metadata?: AgentMetadata;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  sequence_number: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface Attachment {
  id: UUID;
  type: string;
  url: string;
  size: number;
  name: string;
}

export interface AgentMetadata {
  model: string;
  tokens: number;
  thinking_time_ms: number;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  tool_name: string;
  input: Record<string, any>;
  output: any;
  duration_ms: number;
}

// Task types
export interface Task {
  id: UUID;
  conversation_id: UUID;
  user_id: UUID;
  title: string;
  description?: string;
  task_type: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: any;
  error_message?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}
