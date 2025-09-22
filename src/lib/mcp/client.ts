/**
 * MCP (Model Context Protocol) 客户端服务
 * 使用 @modelcontextprotocol/sdk 实现 MCP 工具连接和通信
 */

import type {
  MCPConfiguration,
  MCPTool,
  ToolCall,
  ToolExecutionRecord
} from '@/types/ai-agent'

/**
 * MCP 传输协议类型
 */
export type MCPTransportType = 'streamable-http' | 'sse' | 'websocket' | 'stdio'

/**
 * MCP 连接状态
 */
export type MCPConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

/**
 * MCP 客户端配置
 */
export interface MCPClientConfig extends Omit<MCPConfiguration, 'id' | 'status' | 'tools'> {
  // 连接配置
  connectionTimeout: number
  requestTimeout: number
  retryAttempts: number
  retryDelay: number

  // 会话配置
  enableSessionPersistence: boolean
  sessionStorageKey?: string
  maxSessionHistory: number

  // 安全配置
  validateResponses: boolean
  allowUnsafeFunctions: boolean
  maxPayloadSize: number

  // 调试配置
  enableDebugLogging: boolean
  logRequests: boolean
  logResponses: boolean
}

/**
 * MCP 工具调用结果
 */
export interface MCPToolResult {
  success: boolean
  result?: any
  error?: {
    code: string
    message: string
    details?: any
  }
  metadata: {
    executionTime: number
    timestamp: string
    toolName: string
    toolVersion?: string
  }
}

/**
 * MCP 会话信息
 */
export interface MCPSession {
  id: string
  serverId: string
  serverName: string
  connected: boolean
  capabilities: {
    prompts?: boolean
    resources?: boolean
    tools?: boolean
    sampling?: boolean
    roots?: boolean
  }
  tools: MCPTool[]
  createdAt: string
  lastActivity: string
  statistics: {
    requestCount: number
    errorCount: number
    averageResponseTime: number
  }
}

/**
 * MCP 客户端事件
 */
export interface MCPClientEvents {
  'connection-status-changed': {
    serverId: string
    status: MCPConnectionStatus
    error?: Error
  }
  'tool-discovered': {
    serverId: string
    tool: MCPTool
  }
  'tool-executed': {
    serverId: string
    execution: ToolExecutionRecord
  }
  'session-created': {
    session: MCPSession
  }
  'session-destroyed': {
    sessionId: string
  }
  'error': {
    serverId: string
    error: Error
    context?: any
  }
}

/**
 * MCP 客户端接口
 */
export interface MCPClient {
  // 连接管理
  connect(config: MCPClientConfig): Promise<MCPSession>
  disconnect(serverId: string): Promise<void>
  reconnect(serverId: string): Promise<void>
  isConnected(serverId: string): boolean
  getConnectionStatus(serverId: string): MCPConnectionStatus

  // 会话管理
  getSession(serverId: string): MCPSession | null
  getAllSessions(): MCPSession[]
  destroySession(sessionId: string): Promise<void>

  // 工具管理
  discoverTools(serverId: string): Promise<MCPTool[]>
  getAvailableTools(serverId: string): MCPTool[]
  validateTool(serverId: string, toolName: string): Promise<boolean>

  // 工具执行
  executeTool(serverId: string, toolName: string, parameters: Record<string, any>): Promise<MCPToolResult>
  executeToolWithTimeout(serverId: string, toolName: string, parameters: Record<string, any>, timeout: number): Promise<MCPToolResult>

  // 事件系统
  on<K extends keyof MCPClientEvents>(event: K, handler: (data: MCPClientEvents[K]) => void): void
  off<K extends keyof MCPClientEvents>(event: K, handler: (data: MCPClientEvents[K]) => void): void
  emit<K extends keyof MCPClientEvents>(event: K, data: MCPClientEvents[K]): void

  // 健康检查
  healthCheck(serverId: string): Promise<boolean>
  getStatistics(serverId: string): MCPSession['statistics'] | null

  // 配置管理
  updateConfig(serverId: string, config: Partial<MCPClientConfig>): Promise<void>
  getConfig(serverId: string): MCPClientConfig | null

  // 清理
  cleanup(): Promise<void>
}

/**
 * MCP 客户端实现
 */
export class MCPClientService implements MCPClient {
  private sessions: Map<string, MCPSession> = new Map()
  private configs: Map<string, MCPClientConfig> = new Map()
  private connections: Map<string, any> = new Map() // TODO: 使用正确的 MCP SDK 类型
  private eventHandlers: Map<keyof MCPClientEvents, Function[]> = new Map()
  private connectionStatus: Map<string, MCPConnectionStatus> = new Map()

  constructor() {
    this.initializeEventHandlers()
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(config: MCPClientConfig): Promise<MCPSession> {
    const serverId = this.generateServerId(config.serverUrl)

    try {
      this.connectionStatus.set(serverId, 'connecting')
      this.emit('connection-status-changed', {
        serverId,
        status: 'connecting'
      })

      // 保存配置
      this.configs.set(serverId, config)

      // 创建连接（基于传输类型）
      const connection = await this.createConnection(config)
      this.connections.set(serverId, connection)

      // 发现工具
      const tools = await this.discoverTools(serverId)

      // 创建会话
      const session: MCPSession = {
        id: this.generateSessionId(),
        serverId,
        serverName: config.name,
        connected: true,
        capabilities: config.capabilities,
        tools,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        statistics: {
          requestCount: 0,
          errorCount: 0,
          averageResponseTime: 0
        }
      }

      this.sessions.set(serverId, session)
      this.connectionStatus.set(serverId, 'connected')

      // 触发事件
      this.emit('connection-status-changed', {
        serverId,
        status: 'connected'
      })
      this.emit('session-created', { session })

      return session
    } catch (error) {
      this.connectionStatus.set(serverId, 'error')
      this.emit('connection-status-changed', {
        serverId,
        status: 'error',
        error: error as Error
      })

      throw new Error(`Failed to connect to MCP server: ${error}`)
    }
  }

  /**
   * 断开连接
   */
  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId)
    const session = this.sessions.get(serverId)

    if (connection) {
      try {
        // 关闭连接（具体实现取决于传输类型）
        await this.closeConnection(connection)
      } catch (error) {
        console.warn(`Error closing connection for server ${serverId}:`, error)
      }
    }

    // 清理状态
    this.connections.delete(serverId)
    this.sessions.delete(serverId)
    this.configs.delete(serverId)
    this.connectionStatus.set(serverId, 'disconnected')

    // 触发事件
    this.emit('connection-status-changed', {
      serverId,
      status: 'disconnected'
    })

    if (session) {
      this.emit('session-destroyed', {
        sessionId: session.id
      })
    }
  }

  /**
   * 重新连接
   */
  async reconnect(serverId: string): Promise<void> {
    const config = this.configs.get(serverId)
    if (!config) {
      throw new Error(`No configuration found for server ${serverId}`)
    }

    await this.disconnect(serverId)
    await this.connect(config)
  }

  /**
   * 检查连接状态
   */
  isConnected(serverId: string): boolean {
    return this.connectionStatus.get(serverId) === 'connected'
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(serverId: string): MCPConnectionStatus {
    return this.connectionStatus.get(serverId) || 'disconnected'
  }

  /**
   * 获取会话
   */
  getSession(serverId: string): MCPSession | null {
    return this.sessions.get(serverId) || null
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): MCPSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * 销毁会话
   */
  async destroySession(sessionId: string): Promise<void> {
    for (const [serverId, session] of this.sessions.entries()) {
      if (session.id === sessionId) {
        await this.disconnect(serverId)
        break
      }
    }
  }

  /**
   * 发现工具
   */
  async discoverTools(serverId: string): Promise<MCPTool[]> {
    const connection = this.connections.get(serverId)
    if (!connection) {
      throw new Error(`No connection found for server ${serverId}`)
    }

    try {
      // TODO: 使用 MCP SDK 发现工具
      // 这里是模拟实现
      const tools: MCPTool[] = []

      // 更新会话工具列表
      const session = this.sessions.get(serverId)
      if (session) {
        session.tools = tools
        session.lastActivity = new Date().toISOString()
      }

      // 触发工具发现事件
      tools.forEach(tool => {
        this.emit('tool-discovered', {
          serverId,
          tool
        })
      })

      return tools
    } catch (error) {
      throw new Error(`Failed to discover tools for server ${serverId}: ${error}`)
    }
  }

  /**
   * 获取可用工具
   */
  getAvailableTools(serverId: string): MCPTool[] {
    const session = this.sessions.get(serverId)
    return session ? session.tools : []
  }

  /**
   * 验证工具
   */
  async validateTool(serverId: string, toolName: string): Promise<boolean> {
    const tools = this.getAvailableTools(serverId)
    return tools.some(tool => tool.name === toolName)
  }

  /**
   * 执行工具
   */
  async executeTool(serverId: string, toolName: string, parameters: Record<string, any>): Promise<MCPToolResult> {
    const config = this.configs.get(serverId)
    const timeout = config?.requestTimeout || 30000

    return this.executeToolWithTimeout(serverId, toolName, parameters, timeout)
  }

  /**
   * 带超时的工具执行
   */
  async executeToolWithTimeout(
    serverId: string,
    toolName: string,
    parameters: Record<string, any>,
    timeout: number
  ): Promise<MCPToolResult> {
    const connection = this.connections.get(serverId)
    const session = this.sessions.get(serverId)

    if (!connection || !session) {
      throw new Error(`No active session found for server ${serverId}`)
    }

    const startTime = Date.now()

    try {
      // 验证工具存在
      const toolExists = await this.validateTool(serverId, toolName)
      if (!toolExists) {
        throw new Error(`Tool '${toolName}' not found on server ${serverId}`)
      }

      // 创建超时 Promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
      })

      // 执行工具（模拟实现）
      const executionPromise = this.executeToolInternal(connection, toolName, parameters)

      // 等待执行或超时
      const result = await Promise.race([executionPromise, timeoutPromise])

      const executionTime = Date.now() - startTime

      // 更新统计信息
      this.updateSessionStatistics(serverId, executionTime, true)

      const toolResult: MCPToolResult = {
        success: true,
        result,
        metadata: {
          executionTime,
          timestamp: new Date().toISOString(),
          toolName,
          toolVersion: this.getToolVersion(serverId, toolName)
        }
      }

      // 记录执行历史
      const executionRecord: ToolExecutionRecord = {
        id: this.generateExecutionId(),
        sessionId: session.id,
        toolCall: {
          id: this.generateToolCallId(),
          type: 'mcp-tool',
          name: toolName,
          parameters,
          status: 'completed',
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          result
        },
        input: parameters,
        output: result,
        executionTime,
        timestamp: new Date().toISOString(),
        success: true
      }

      this.emit('tool-executed', {
        serverId,
        execution: executionRecord
      })

      return toolResult

    } catch (error) {
      const executionTime = Date.now() - startTime
      this.updateSessionStatistics(serverId, executionTime, false)

      const toolResult: MCPToolResult = {
        success: false,
        error: {
          code: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : String(error),
          details: error
        },
        metadata: {
          executionTime,
          timestamp: new Date().toISOString(),
          toolName,
          toolVersion: this.getToolVersion(serverId, toolName)
        }
      }

      this.emit('error', {
        serverId,
        error: error as Error,
        context: { toolName, parameters }
      })

      return toolResult
    }
  }

  /**
   * 事件监听
   */
  on<K extends keyof MCPClientEvents>(event: K, handler: (data: MCPClientEvents[K]) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  /**
   * 移除事件监听
   */
  off<K extends keyof MCPClientEvents>(event: K, handler: (data: MCPClientEvents[K]) => void): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  emit<K extends keyof MCPClientEvents>(event: K, data: MCPClientEvents[K]): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(serverId: string): Promise<boolean> {
    try {
      const session = this.sessions.get(serverId)
      return !!session && session.connected
    } catch (error) {
      return false
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics(serverId: string): MCPSession['statistics'] | null {
    const session = this.sessions.get(serverId)
    return session ? session.statistics : null
  }

  /**
   * 更新配置
   */
  async updateConfig(serverId: string, config: Partial<MCPClientConfig>): Promise<void> {
    const existingConfig = this.configs.get(serverId)
    if (!existingConfig) {
      throw new Error(`No configuration found for server ${serverId}`)
    }

    const newConfig = { ...existingConfig, ...config }
    this.configs.set(serverId, newConfig)

    // 如果连接相关配置发生变化，重新连接
    if (this.shouldReconnect(existingConfig, newConfig)) {
      await this.reconnect(serverId)
    }
  }

  /**
   * 获取配置
   */
  getConfig(serverId: string): MCPClientConfig | null {
    return this.configs.get(serverId) || null
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    const disconnectPromises = Array.from(this.sessions.keys()).map(serverId =>
      this.disconnect(serverId)
    )

    await Promise.all(disconnectPromises)

    this.sessions.clear()
    this.configs.clear()
    this.connections.clear()
    this.eventHandlers.clear()
    this.connectionStatus.clear()
  }

  // ========================================
  // 私有方法
  // ========================================

  private initializeEventHandlers(): void {
    // 初始化事件处理器 Map
    const events: (keyof MCPClientEvents)[] = [
      'connection-status-changed',
      'tool-discovered',
      'tool-executed',
      'session-created',
      'session-destroyed',
      'error'
    ]

    events.forEach(event => {
      this.eventHandlers.set(event, [])
    })
  }

  private generateServerId(serverUrl: string): string {
    return `mcp_${serverUrl.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateToolCallId(): string {
    return `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async createConnection(config: MCPClientConfig): Promise<any> {
    // TODO: 基于传输类型创建实际连接
    // 这里是模拟实现
    switch (config.transport) {
      case 'streamable-http':
        return this.createStreamableHttpConnection(config)
      case 'sse':
        return this.createSSEConnection(config)
      case 'websocket':
        return this.createWebSocketConnection(config)
      case 'stdio':
        return this.createStdioConnection(config)
      default:
        throw new Error(`Unsupported transport type: ${config.transport}`)
    }
  }

  private async createStreamableHttpConnection(config: MCPClientConfig): Promise<any> {
    // TODO: 实现 Streamable HTTP 连接
    return {}
  }

  private async createSSEConnection(config: MCPClientConfig): Promise<any> {
    // TODO: 实现 SSE 连接
    return {}
  }

  private async createWebSocketConnection(config: MCPClientConfig): Promise<any> {
    // TODO: 实现 WebSocket 连接
    return {}
  }

  private async createStdioConnection(config: MCPClientConfig): Promise<any> {
    // TODO: 实现 stdio 连接
    return {}
  }

  private async closeConnection(connection: any): Promise<void> {
    // TODO: 基于连接类型实现关闭逻辑
  }

  private async executeToolInternal(connection: any, toolName: string, parameters: Record<string, any>): Promise<any> {
    // TODO: 使用 MCP SDK 执行工具
    // 模拟实现
    return { result: 'Mock tool execution result' }
  }

  private getToolVersion(serverId: string, toolName: string): string | undefined {
    const session = this.sessions.get(serverId)
    if (!session) return undefined

    const tool = session.tools.find(t => t.name === toolName)
    return tool?.metadata?.version
  }

  private updateSessionStatistics(serverId: string, executionTime: number, success: boolean): void {
    const session = this.sessions.get(serverId)
    if (!session) return

    session.statistics.requestCount += 1

    if (success) {
      const { requestCount, averageResponseTime } = session.statistics
      session.statistics.averageResponseTime =
        (averageResponseTime * (requestCount - 1) + executionTime) / requestCount
    } else {
      session.statistics.errorCount += 1
    }

    session.lastActivity = new Date().toISOString()
  }

  private shouldReconnect(oldConfig: MCPClientConfig, newConfig: MCPClientConfig): boolean {
    return (
      oldConfig.serverUrl !== newConfig.serverUrl ||
      oldConfig.transport !== newConfig.transport ||
      JSON.stringify(oldConfig.credentials) !== JSON.stringify(newConfig.credentials)
    )
  }
}

/**
 * 创建默认 MCP 客户端实例
 */
export function createMCPClient(): MCPClient {
  return new MCPClientService()
}

/**
 * 全局 MCP 客户端实例（单例模式）
 */
let globalMCPClient: MCPClient | null = null

/**
 * 获取全局 MCP 客户端实例
 */
export function getMCPClient(): MCPClient {
  if (!globalMCPClient) {
    globalMCPClient = createMCPClient()
  }
  return globalMCPClient
}

/**
 * 重置全局 MCP 客户端实例
 */
export async function resetMCPClient(): Promise<void> {
  if (globalMCPClient) {
    await globalMCPClient.cleanup()
    globalMCPClient = null
  }
}