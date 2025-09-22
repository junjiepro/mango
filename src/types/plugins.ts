/**
 * AI Agent 插件系统类型定义
 * 支持模块化插件架构，包括 MCP 插件和自定义插件
 */

import type { AgentSession, AgentMessage, MultimodalContent, ToolCall, MCPConfiguration } from './ai-agent'

// ========================================
// 基础插件类型
// ========================================

/**
 * 插件生命周期状态
 */
export type PluginLifecycleState =
  | 'unloaded'       // 未加载
  | 'loading'        // 加载中
  | 'loaded'         // 已加载
  | 'initializing'   // 初始化中
  | 'active'         // 活跃状态
  | 'suspended'      // 暂停状态
  | 'error'          // 错误状态
  | 'unloading'      // 卸载中

/**
 * 插件类型
 */
export type PluginType =
  | 'mcp'            // MCP 协议插件
  | 'native'         // 原生插件
  | 'external'       // 外部插件
  | 'builtin'        // 内置插件

/**
 * 插件权限级别
 */
export type PluginPermissionLevel =
  | 'read'           // 只读权限
  | 'write'          // 读写权限
  | 'execute'        // 执行权限
  | 'admin'          // 管理员权限

/**
 * 插件执行上下文
 */
export interface PluginExecutionContext {
  sessionId: string
  userId: string
  message?: AgentMessage
  multimodalContent?: MultimodalContent[]
  sharedVariables: Record<string, any>
  timestamp: string
  requestId: string
}

// ========================================
// 核心插件接口
// ========================================

/**
 * 插件基础接口
 */
export interface AgentPlugin {
  // 插件标识
  id: string
  name: string
  version: string
  type: PluginType
  description?: string
  author?: string
  homepage?: string
  repository?: string

  // 插件状态
  state: PluginLifecycleState
  enabled: boolean
  loaded: boolean

  // 插件能力
  capabilities: PluginCapabilities
  dependencies: PluginDependency[]
  requirements: PluginRequirements

  // 插件配置
  config: PluginConfig
  defaultConfig: PluginConfig

  // 生命周期方法
  onLoad?(): Promise<void>
  onInit?(context: PluginInitContext): Promise<void>
  onActivate?(): Promise<void>
  onDeactivate?(): Promise<void>
  onUnload?(): Promise<void>

  // 错误处理
  onError?(error: PluginError): Promise<void>

  // 配置更新
  onConfigChange?(newConfig: PluginConfig, oldConfig: PluginConfig): Promise<void>
}

/**
 * MCP 插件接口
 */
export interface MCPPlugin extends AgentPlugin {
  type: 'mcp'
  mcpConfig: MCPConfiguration
  tools: MCPPluginTool[]

  // MCP 特定方法
  connect(): Promise<void>
  disconnect(): Promise<void>
  listTools(): Promise<MCPPluginTool[]>
  executeTool(name: string, parameters: Record<string, any>): Promise<any>

  // 连接状态
  isConnected(): boolean
  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' | 'error'
}

/**
 * 原生插件接口
 */
export interface NativePlugin extends AgentPlugin {
  type: 'native'

  // 消息处理
  onMessage?(message: AgentMessage, context: PluginExecutionContext): Promise<MultimodalContent[] | null>

  // 工具调用
  onToolCall?(toolCall: ToolCall, context: PluginExecutionContext): Promise<any>

  // 自定义命令
  executeCommand?(command: string, args: any[], context: PluginExecutionContext): Promise<any>

  // UI 扩展
  getUIComponents?(): PluginUIComponent[]
}

// ========================================
// 插件能力和配置
// ========================================

/**
 * 插件能力定义
 */
export interface PluginCapabilities {
  // 消息处理能力
  messageProcessing: {
    canRead: boolean
    canWrite: boolean
    canModify: boolean
    supportedContentTypes: string[]
  }

  // 工具调用能力
  toolExecution: {
    canExecute: boolean
    canRegisterTools: boolean
    providedTools: string[]
    requiredPermissions: PluginPermissionLevel[]
  }

  // UI 扩展能力
  uiExtension: {
    canExtendInterface: boolean
    providedComponents: string[]
    supportedModes: ('simple' | 'advanced')[]
  }

  // 数据访问能力
  dataAccess: {
    canAccessSessions: boolean
    canAccessUserData: boolean
    canPersistData: boolean
    requiredPermissions: PluginPermissionLevel[]
  }

  // 网络访问能力
  networkAccess: {
    canMakeRequests: boolean
    allowedDomains: string[]
    requiresProxy: boolean
  }
}

/**
 * 插件依赖关系
 */
export interface PluginDependency {
  id: string
  name: string
  version: string
  optional: boolean
  reason?: string
}

/**
 * 插件系统要求
 */
export interface PluginRequirements {
  nodeVersion?: string
  agentVersion: string
  platform?: string[]
  permissions: PluginPermissionLevel[]
  features: string[]
}

/**
 * 插件配置接口
 */
export interface PluginConfig {
  [key: string]: any

  // 基础配置
  enabled?: boolean
  priority?: number
  timeout?: number

  // 执行配置
  maxConcurrentExecutions?: number
  retryAttempts?: number
  errorHandling?: 'ignore' | 'log' | 'throw'

  // 缓存配置
  cacheEnabled?: boolean
  cacheTtl?: number

  // 日志配置
  logLevel?: 'error' | 'warn' | 'info' | 'debug'
  logToFile?: boolean
}

/**
 * 插件初始化上下文
 */
export interface PluginInitContext {
  agentVersion: string
  platform: string
  userPermissions: PluginPermissionLevel[]
  availableFeatures: string[]
  sharedResources: Record<string, any>
  logger: PluginLogger
}

// ========================================
// MCP 插件特定类型
// ========================================

/**
 * MCP 插件工具定义
 */
export interface MCPPluginTool {
  name: string
  description?: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  outputSchema?: {
    type: 'object'
    properties: Record<string, any>
  }
  examples?: MCPToolExample[]
  metadata?: {
    version?: string
    author?: string
    tags?: string[]
    category?: string
  }
}

/**
 * MCP 工具使用示例
 */
export interface MCPToolExample {
  name: string
  description: string
  input: Record<string, any>
  expectedOutput?: any
  notes?: string
}

// ========================================
// 插件管理器接口
// ========================================

/**
 * 插件管理器接口
 */
export interface PluginManager {
  // 插件注册
  register(plugin: AgentPlugin): Promise<void>
  unregister(pluginId: string): Promise<void>

  // 插件生命周期管理
  load(pluginId: string): Promise<void>
  unload(pluginId: string): Promise<void>
  enable(pluginId: string): Promise<void>
  disable(pluginId: string): Promise<void>

  // 插件查询
  getPlugin(pluginId: string): AgentPlugin | null
  getAllPlugins(): AgentPlugin[]
  getPluginsByType(type: PluginType): AgentPlugin[]
  getEnabledPlugins(): AgentPlugin[]

  // 插件执行
  executePlugin(pluginId: string, context: PluginExecutionContext): Promise<any>
  broadcastMessage(message: AgentMessage, context: PluginExecutionContext): Promise<MultimodalContent[]>

  // 配置管理
  updatePluginConfig(pluginId: string, config: Partial<PluginConfig>): Promise<void>
  validatePluginConfig(pluginId: string, config: PluginConfig): Promise<boolean>

  // 状态监控
  getPluginStatus(pluginId: string): PluginStatus
  getManagerStats(): PluginManagerStats

  // 事件处理
  on(event: PluginManagerEvent, handler: (data: any) => void): void
  off(event: PluginManagerEvent, handler: (data: any) => void): void
  emit(event: PluginManagerEvent, data: any): void
}

/**
 * 插件状态信息
 */
export interface PluginStatus {
  id: string
  state: PluginLifecycleState
  enabled: boolean
  loaded: boolean
  health: 'healthy' | 'warning' | 'error'
  performance: {
    averageExecutionTime: number
    totalExecutions: number
    successRate: number
    errorCount: number
  }
  resources: {
    memoryUsage: number
    cpuUsage: number
  }
  lastActivity?: string
  errors: PluginError[]
}

/**
 * 插件管理器统计信息
 */
export interface PluginManagerStats {
  totalPlugins: number
  enabledPlugins: number
  loadedPlugins: number
  activePlugins: number
  errorPlugins: number

  performance: {
    totalExecutions: number
    averageExecutionTime: number
    successRate: number
  }

  resources: {
    totalMemoryUsage: number
    totalCpuUsage: number
  }
}

// ========================================
// 插件错误和事件类型
// ========================================

/**
 * 插件错误类型
 */
export interface PluginError {
  id: string
  pluginId: string
  type: 'load' | 'init' | 'execute' | 'config' | 'dependency' | 'permission' | 'network'
  message: string
  stack?: string
  context?: Record<string, any>
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoverable: boolean
}

/**
 * 插件管理器事件类型
 */
export type PluginManagerEvent =
  | 'plugin-registered'
  | 'plugin-unregistered'
  | 'plugin-loaded'
  | 'plugin-unloaded'
  | 'plugin-enabled'
  | 'plugin-disabled'
  | 'plugin-error'
  | 'plugin-executed'
  | 'config-changed'
  | 'dependency-resolved'
  | 'dependency-missing'

// ========================================
// UI 扩展类型
// ========================================

/**
 * 插件 UI 组件
 */
export interface PluginUIComponent {
  id: string
  name: string
  type: 'panel' | 'modal' | 'toolbar' | 'sidebar' | 'inline'
  component: React.ComponentType<any>
  props?: Record<string, any>
  position?: {
    location: string
    priority: number
  }
  conditions?: {
    mode?: 'simple' | 'advanced'
    userPermissions?: PluginPermissionLevel[]
    sessionState?: string[]
  }
}

/**
 * 插件日志接口
 */
export interface PluginLogger {
  debug(message: string, ...args: any[]): void
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, error?: Error, ...args: any[]): void
  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void
}

// ========================================
// 插件发现和安装类型
// ========================================

/**
 * 插件清单
 */
export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  license?: string
  homepage?: string
  repository?: string

  main: string
  type: PluginType

  dependencies: Record<string, string>
  peerDependencies?: Record<string, string>

  capabilities: PluginCapabilities
  requirements: PluginRequirements
  defaultConfig: PluginConfig

  files: string[]
  keywords?: string[]

  engines: {
    agent: string
    node?: string
  }
}

/**
 * 插件安装选项
 */
export interface PluginInstallOptions {
  source: 'npm' | 'github' | 'local' | 'url'
  version?: string
  force?: boolean
  skipDependencies?: boolean
  configOverrides?: Partial<PluginConfig>
}

/**
 * 插件热加载配置
 */
export interface PluginHotReloadConfig {
  enabled: boolean
  watchPaths: string[]
  debounceDelay: number
  excludePatterns: string[]
  reloadStrategy: 'full' | 'partial' | 'smart'
}

// ========================================
// 导出的实用类型
// ========================================

/**
 * 插件工厂函数类型
 */
export type PluginFactory<T extends AgentPlugin = AgentPlugin> = (
  context: PluginInitContext
) => Promise<T>

/**
 * 插件装饰器类型
 */
export type PluginDecorator = <T extends AgentPlugin>(
  target: new (...args: any[]) => T
) => new (...args: any[]) => T

/**
 * 插件事件处理器类型
 */
export type PluginEventHandler<T = any> = (data: T) => Promise<void> | void

/**
 * 插件验证器类型
 */
export type PluginValidator = (plugin: AgentPlugin) => Promise<boolean>

/**
 * 插件过滤器类型
 */
export type PluginFilter = (plugin: AgentPlugin) => boolean