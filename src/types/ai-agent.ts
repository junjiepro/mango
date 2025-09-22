/**
 * AI Agent 核心类型定义
 * 支持多模态内容、插件架构和 MCP 集成的智能代理系统
 */

import type { User, Session } from '@supabase/supabase-js'
import type { Locale } from './i18n'

// ========================================
// 会话管理类型
// ========================================

/**
 * AI Agent 会话类型
 */
export interface AgentSession {
  id: string
  userId: string
  title: string
  status: 'active' | 'paused' | 'completed' | 'error'
  mode: 'simple' | 'advanced'
  createdAt: string
  updatedAt: string
  lastActivity: string
  settings: AgentSessionSettings
  context: AgentSessionContext
  statistics: AgentSessionStatistics
}

/**
 * 会话设置
 */
export interface AgentSessionSettings {
  language: Locale
  theme: 'light' | 'dark' | 'auto'
  autoSave: boolean
  maxHistory: number
  enabledPlugins: string[]
  mcpConfigs: MCPConfiguration[]
}

/**
 * 会话上下文
 */
export interface AgentSessionContext {
  conversationHistory: AgentMessage[]
  currentState: Record<string, any>
  toolExecutionHistory: ToolExecutionRecord[]
  sharedVariables: Record<string, any>
}

/**
 * 会话统计信息
 */
export interface AgentSessionStatistics {
  messageCount: number
  toolExecutionCount: number
  totalExecutionTime: number
  errorCount: number
  successRate: number
  lastExecutionTime?: number
}

// ========================================
// 消息和内容类型
// ========================================

/**
 * AI Agent 消息类型
 */
export interface AgentMessage {
  id: string
  sessionId: string
  type: 'user' | 'assistant' | 'system' | 'tool'
  content: MultimodalContent[]
  metadata: MessageMetadata
  createdAt: string
  updatedAt?: string
}

/**
 * 消息元数据
 */
export interface MessageMetadata {
  model?: string
  tokens?: {
    input: number
    output: number
    total: number
  }
  executionTime?: number
  toolCalls?: ToolCall[]
  parentMessageId?: string
  isStreaming?: boolean
  status: 'pending' | 'completed' | 'error' | 'cancelled'
}

/**
 * 多模态内容基础类型
 */
export interface MultimodalContentBase {
  id: string
  type: string
  metadata: {
    timestamp: string
    source: 'user' | 'agent' | 'tool'
    size?: number
    encoding?: string
  }
}

/**
 * 多模态内容联合类型
 */
export type MultimodalContent =
  | TextContent
  | CodeContent
  | HTMLContent
  | ImageContent
  | AudioContent
  | FileContent
  | ToolResultContent

/**
 * 文本内容
 */
export interface TextContent extends MultimodalContentBase {
  type: 'text'
  content: string
  format?: 'plain' | 'markdown' | 'rich'
  language?: string
}

/**
 * 代码内容
 */
export interface CodeContent extends MultimodalContentBase {
  type: 'code'
  content: string
  language: string
  filename?: string
  executable?: boolean
  editorConfig: {
    theme: string
    fontSize: number
    wordWrap: boolean
    lineNumbers: boolean
  }
}

/**
 * HTML 内容
 */
export interface HTMLContent extends MultimodalContentBase {
  type: 'html'
  content: string
  sanitized: boolean
  previewMode: 'iframe' | 'inline' | 'modal'
  sandboxOptions: string[]
}

/**
 * 图像内容
 */
export interface ImageContent extends MultimodalContentBase {
  type: 'image'
  url: string
  alt?: string
  width?: number
  height?: number
  format: 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp' | 'svg'
  thumbnail?: string
}

/**
 * 音频内容
 */
export interface AudioContent extends MultimodalContentBase {
  type: 'audio'
  url: string
  duration?: number
  format: 'mp3' | 'wav' | 'ogg' | 'webm'
  transcript?: string
  controls: {
    autoplay: boolean
    loop: boolean
    volume: number
  }
}

/**
 * 文件内容
 */
export interface FileContent extends MultimodalContentBase {
  type: 'file'
  url: string
  filename: string
  mimeType: string
  downloadable: boolean
  previewSupported: boolean
}

/**
 * 工具执行结果内容
 */
export interface ToolResultContent extends MultimodalContentBase {
  type: 'tool-result'
  toolName: string
  toolVersion?: string
  result: any
  executionTime: number
  status: 'success' | 'error' | 'timeout'
  visualization?: 'table' | 'chart' | 'json' | 'custom'
}

// ========================================
// 工具和插件系统类型
// ========================================

/**
 * 工具调用
 */
export interface ToolCall {
  id: string
  type: 'function' | 'mcp-tool' | 'plugin'
  name: string
  parameters: Record<string, any>
  status: 'pending' | 'running' | 'completed' | 'error'
  startTime: string
  endTime?: string
  result?: any
  error?: string
}

/**
 * 工具执行记录
 */
export interface ToolExecutionRecord {
  id: string
  sessionId: string
  toolCall: ToolCall
  input: Record<string, any>
  output: any
  executionTime: number
  timestamp: string
  success: boolean
  errorDetails?: {
    code: string
    message: string
    stack?: string
  }
}

/**
 * MCP 配置
 */
export interface MCPConfiguration {
  id: string
  name: string
  description?: string
  serverUrl: string
  transport: 'streamable-http' | 'sse' | 'websocket' | 'stdio'
  credentials?: {
    apiKey?: string
    headers?: Record<string, string>
  }
  capabilities: MCPCapabilities
  status: 'connected' | 'disconnected' | 'error' | 'connecting'
  lastConnected?: string
  tools: MCPTool[]
}

/**
 * MCP 能力配置
 */
export interface MCPCapabilities {
  prompts?: boolean
  resources?: boolean
  tools?: boolean
  sampling?: boolean
  roots?: boolean
}

/**
 * MCP 工具定义
 */
export interface MCPTool {
  name: string
  description?: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  examples?: ToolExample[]
}

/**
 * 工具使用示例
 */
export interface ToolExample {
  name: string
  description: string
  parameters: Record<string, any>
  expectedResult?: any
}

// ========================================
// Agent 引擎类型
// ========================================

/**
 * Agent 引擎配置
 */
export interface AgentEngineConfig {
  model: string
  temperature: number
  maxTokens: number
  streamResponse: boolean
  enableToolCalling: boolean
  enableMultimodal: boolean
  fallbackModel?: string
  retryAttempts: number
  timeout: number
}

/**
 * Agent 引擎状态
 */
export interface AgentEngineState {
  status: 'idle' | 'processing' | 'error' | 'maintenance'
  activeSession?: string
  processingQueue: string[]
  performance: {
    averageResponseTime: number
    successRate: number
    totalRequests: number
    errorCount: number
  }
  resources: {
    memoryUsage: number
    cpuUsage: number
    activeConnections: number
  }
}

/**
 * Agent 响应
 */
export interface AgentResponse {
  id: string
  sessionId: string
  content: MultimodalContent[]
  toolCalls?: ToolCall[]
  metadata: {
    model: string
    usage: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter'
    executionTime: number
  }
  streaming: boolean
}

// ========================================
// 用户和权限类型
// ========================================

/**
 * Agent 用户配置
 */
export interface AgentUserProfile {
  userId: string
  preferences: {
    defaultMode: 'simple' | 'advanced'
    language: Locale
    theme: 'light' | 'dark' | 'auto'
    notifications: {
      toolCompletions: boolean
      errors: boolean
      sessionUpdates: boolean
    }
  }
  permissions: AgentPermissions
  usage: {
    totalSessions: number
    totalMessages: number
    totalToolCalls: number
    lastActivity: string
  }
}

/**
 * Agent 权限配置
 */
export interface AgentPermissions {
  canCreateSessions: boolean
  canManagePlugins: boolean
  canConfigureMCP: boolean
  canAccessAdvancedMode: boolean
  canExportData: boolean
  maxConcurrentSessions: number
  toolExecutionLimits: {
    daily: number
    hourly: number
    concurrent: number
  }
}

// ========================================
// API 和集成类型
// ========================================

/**
 * Agent API 请求
 */
export interface AgentAPIRequest {
  sessionId: string
  message: string
  multimodalContent?: MultimodalContent[]
  toolSelection?: string[]
  config?: Partial<AgentEngineConfig>
  metadata?: Record<string, any>
}

/**
 * Agent API 响应
 */
export interface AgentAPIResponse {
  success: boolean
  data?: AgentResponse
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata?: {
    requestId: string
    timestamp: string
    executionTime: number
  }
}

/**
 * 流式响应块
 */
export interface AgentStreamChunk {
  type: 'content' | 'tool-call' | 'tool-result' | 'metadata' | 'error' | 'done'
  data: any
  timestamp: string
  sessionId: string
}

// ========================================
// 事件和通知类型
// ========================================

/**
 * Agent 事件类型
 */
export interface AgentEvent {
  id: string
  type: 'session-created' | 'session-updated' | 'message-received' | 'tool-executed' | 'error-occurred'
  sessionId: string
  timestamp: string
  data: any
  severity: 'info' | 'warning' | 'error'
}

/**
 * 实时通知
 */
export interface AgentNotification {
  id: string
  userId: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  actionable: boolean
  action?: {
    label: string
    url: string
  }
  createdAt: string
  readAt?: string
}

// ========================================
// 导出的主要类型别名
// ========================================

/**
 * Agent 上下文类型 - 用于 React Context
 */
export interface AgentContextType {
  currentSession: AgentSession | null
  sessions: AgentSession[]
  user: User | null
  userProfile: AgentUserProfile | null
  loading: boolean
  error: string | null

  // 会话管理
  createSession: (title?: string, mode?: 'simple' | 'advanced') => Promise<AgentSession>
  loadSession: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  updateSessionSettings: (settings: Partial<AgentSessionSettings>) => Promise<void>

  // 消息处理
  sendMessage: (content: string, multimodal?: MultimodalContent[]) => Promise<void>
  executeToolCall: (toolCall: ToolCall) => Promise<void>

  // MCP 管理
  addMCPConfig: (config: Omit<MCPConfiguration, 'id' | 'status' | 'tools'>) => Promise<void>
  removeMCPConfig: (configId: string) => Promise<void>
  testMCPConnection: (configId: string) => Promise<boolean>
}

/**
 * Agent Hook 返回类型
 */
export interface UseAgentReturn extends AgentContextType {}