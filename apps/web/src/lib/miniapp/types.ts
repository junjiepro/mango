/**
 * MiniApp 统一通信协议类型定义
 * 对标 MCP Apps 规范的 JSON-RPC 方言
 */

// === JSON-RPC 基础类型 ===

export interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: string | number;
}

export interface JsonRpcRequest extends JsonRpcMessage {
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse extends JsonRpcMessage {
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface JsonRpcNotification extends JsonRpcMessage {
  method: string;
  params?: Record<string, unknown>;
}

// === Host -> View 通知方法 ===

export type HostNotificationMethod =
  | 'notifications/toolInput'
  | 'notifications/toolInputPartial'
  | 'notifications/toolResult'
  | 'notifications/toolCancelled'
  | 'notifications/hostContextChanged'
  | 'notifications/teardown';

// === View -> Host 请求方法 ===

export type ViewRequestMethod =
  | 'initialize'
  | 'tools/call'
  | 'resources/read'
  | 'openLink'
  | 'sendMessage'
  | 'sizeChanged';

// === 工具相关类型 ===

export interface ToolInput {
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface ToolCancelled {
  reason?: string;
}

// === Host 上下文 ===

export interface HostContext {
  theme?: 'light' | 'dark';
  locale?: string;
  containerDimensions?: { width?: number; maxHeight?: number };
}

// === CSP 配置 ===

export interface CSPConfig {
  connectDomains?: string[];
  resourceDomains?: string[];
  frameDomains?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
}

// === 工具定义扩展 ===

export interface ToolDefinitionMeta {
  ui?: {
    resourceUri?: string;
    csp?: CSPConfig;
  };
}

export interface ToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  _meta?: ToolDefinitionMeta;
}

// === 资源定义 ===

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// === View 初始化信息 ===

export interface ViewInfo {
  name: string;
  version: string;
}

export interface ViewCapabilities {
  tools?: { listChanged?: boolean };
}

// === Console 日志条目 ===

export interface ConsoleEntry {
  level: 'log' | 'info' | 'warn' | 'error';
  args: string[];
  timestamp: number;
}

// === AppBridge 事件回调 ===

export interface AppBridgeCallbacks {
  oninitialized?: () => void;
  onsizechange?: (size: { width?: number; height?: number }) => void;
  onmessage?: (msg: { role: string; content: string }) => Promise<Record<string, unknown>>;
  onopenlink?: (params: { url: string }) => Promise<Record<string, unknown>>;
  onconsole?: (entry: ConsoleEntry) => void;
}
