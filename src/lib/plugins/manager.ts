/**
 * 插件管理器
 * 负责插件的注册、加载、生命周期管理和执行
 */

import type {
  PluginManager,
  AgentPlugin,
  MCPPlugin,
  NativePlugin,
  PluginType,
  PluginLifecycleState,
  PluginStatus,
  PluginManagerStats,
  PluginManagerEvent,
  PluginError,
  PluginConfig,
  PluginExecutionContext,
  PluginInitContext
} from '@/types/plugins'
import type { MCPConfiguration } from '@/types/ai-agent'
import type { MCPClient } from '@/lib/mcp/client'
import { getMCPClient } from '@/lib/mcp/client'

/**
 * 插件管理器配置
 */
export interface PluginManagerConfig {
  // 加载配置
  enableHotReload: boolean
  maxConcurrentLoads: number
  loadTimeout: number

  // 执行配置
  maxConcurrentExecutions: number
  executionTimeout: number
  enableSandbox: boolean

  // 错误处理
  maxRetries: number
  errorThreshold: number
  autoDisableOnError: boolean

  // 安全配置
  allowUnsafePlugins: boolean
  validatePluginSignatures: boolean
  restrictedPermissions: string[]

  // 监控配置
  enableMetrics: boolean
  metricsRetentionDays: number
  performanceMonitoring: boolean
}

/**
 * 插件注册信息
 */
export interface PluginRegistration {
  plugin: AgentPlugin
  registeredAt: string
  registeredBy: string
  config: PluginConfig
  dependencies: string[]
}

/**
 * 插件执行结果
 */
export interface PluginExecutionResult {
  success: boolean
  result?: any
  error?: PluginError
  executionTime: number
  timestamp: string
  pluginId: string
}

/**
 * 插件管理器实现
 */
export class PluginManagerService implements PluginManager {
  private config: PluginManagerConfig
  private plugins: Map<string, PluginRegistration> = new Map()
  private pluginStatus: Map<string, PluginStatus> = new Map()
  private eventHandlers: Map<PluginManagerEvent, Function[]> = new Map()
  private mcpClient: MCPClient
  private executionQueue: Array<{ pluginId: string; context: PluginExecutionContext; resolve: Function; reject: Function }> = []
  private isProcessingQueue = false

  constructor(config?: Partial<PluginManagerConfig>) {
    this.config = {
      enableHotReload: true,
      maxConcurrentLoads: 5,
      loadTimeout: 30000,
      maxConcurrentExecutions: 10,
      executionTimeout: 60000,
      enableSandbox: true,
      maxRetries: 3,
      errorThreshold: 5,
      autoDisableOnError: true,
      allowUnsafePlugins: false,
      validatePluginSignatures: true,
      restrictedPermissions: [],
      enableMetrics: true,
      metricsRetentionDays: 30,
      performanceMonitoring: true,
      ...config
    }

    this.mcpClient = getMCPClient()
    this.initializeEventHandlers()
  }

  /**
   * 注册插件
   */
  async register(plugin: AgentPlugin): Promise<void> {
    try {
      // 验证插件
      await this.validatePlugin(plugin)

      // 检查依赖
      await this.resolveDependencies(plugin)

      // 创建注册信息
      const registration: PluginRegistration = {
        plugin,
        registeredAt: new Date().toISOString(),
        registeredBy: 'system', // TODO: 获取当前用户
        config: plugin.defaultConfig,
        dependencies: plugin.dependencies.map(dep => dep.id)
      }

      // 创建状态信息
      const status: PluginStatus = {
        id: plugin.id,
        state: 'unloaded',
        enabled: false,
        loaded: false,
        health: 'healthy',
        performance: {
          averageExecutionTime: 0,
          totalExecutions: 0,
          successRate: 100,
          errorCount: 0
        },
        resources: {
          memoryUsage: 0,
          cpuUsage: 0
        },
        errors: []
      }

      // 保存到映射
      this.plugins.set(plugin.id, registration)
      this.pluginStatus.set(plugin.id, status)

      // 触发事件
      this.emit('plugin-registered', { pluginId: plugin.id, plugin })

      console.log(`Plugin ${plugin.name} (${plugin.id}) registered successfully`)

    } catch (error) {
      const pluginError: PluginError = {
        id: this.generateErrorId(),
        pluginId: plugin.id,
        type: 'load',
        message: `Failed to register plugin: ${error}`,
        timestamp: new Date().toISOString(),
        severity: 'high',
        recoverable: false
      }

      this.emit('plugin-error', { pluginId: plugin.id, error: pluginError })
      throw error
    }
  }

  /**
   * 注销插件
   */
  async unregister(pluginId: string): Promise<void> {
    const registration = this.plugins.get(pluginId)
    if (!registration) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    try {
      // 先卸载插件
      if (registration.plugin.loaded) {
        await this.unload(pluginId)
      }

      // 移除注册信息
      this.plugins.delete(pluginId)
      this.pluginStatus.delete(pluginId)

      // 触发事件
      this.emit('plugin-unregistered', { pluginId })

      console.log(`Plugin ${pluginId} unregistered successfully`)

    } catch (error) {
      const pluginError: PluginError = {
        id: this.generateErrorId(),
        pluginId,
        type: 'load',
        message: `Failed to unregister plugin: ${error}`,
        timestamp: new Date().toISOString(),
        severity: 'medium',
        recoverable: true
      }

      this.emit('plugin-error', { pluginId, error: pluginError })
      throw error
    }
  }

  /**
   * 加载插件
   */
  async load(pluginId: string): Promise<void> {
    const registration = this.plugins.get(pluginId)
    const status = this.pluginStatus.get(pluginId)

    if (!registration || !status) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (registration.plugin.loaded) {
      console.warn(`Plugin ${pluginId} is already loaded`)
      return
    }

    try {
      status.state = 'loading'
      this.emit('plugin-loading', { pluginId })

      // 超时控制
      const loadPromise = this.loadPluginInternal(registration.plugin)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Load timeout')), this.config.loadTimeout)
      })

      await Promise.race([loadPromise, timeoutPromise])

      // 更新状态
      status.state = 'loaded'
      status.loaded = true
      registration.plugin.loaded = true

      this.emit('plugin-loaded', { pluginId })

      console.log(`Plugin ${pluginId} loaded successfully`)

    } catch (error) {
      status.state = 'error'
      status.loaded = false

      const pluginError: PluginError = {
        id: this.generateErrorId(),
        pluginId,
        type: 'load',
        message: `Failed to load plugin: ${error}`,
        timestamp: new Date().toISOString(),
        severity: 'high',
        recoverable: true
      }

      status.errors.push(pluginError)
      this.emit('plugin-error', { pluginId, error: pluginError })
      throw error
    }
  }

  /**
   * 卸载插件
   */
  async unload(pluginId: string): Promise<void> {
    const registration = this.plugins.get(pluginId)
    const status = this.pluginStatus.get(pluginId)

    if (!registration || !status) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (!registration.plugin.loaded) {
      console.warn(`Plugin ${pluginId} is not loaded`)
      return
    }

    try {
      status.state = 'unloading'
      this.emit('plugin-unloading', { pluginId })

      // 先禁用插件
      if (status.enabled) {
        await this.disable(pluginId)
      }

      // 卸载插件
      await this.unloadPluginInternal(registration.plugin)

      // 更新状态
      status.state = 'unloaded'
      status.loaded = false
      registration.plugin.loaded = false

      this.emit('plugin-unloaded', { pluginId })

      console.log(`Plugin ${pluginId} unloaded successfully`)

    } catch (error) {
      status.state = 'error'

      const pluginError: PluginError = {
        id: this.generateErrorId(),
        pluginId,
        type: 'load',
        message: `Failed to unload plugin: ${error}`,
        timestamp: new Date().toISOString(),
        severity: 'medium',
        recoverable: true
      }

      status.errors.push(pluginError)
      this.emit('plugin-error', { pluginId, error: pluginError })
      throw error
    }
  }

  /**
   * 启用插件
   */
  async enable(pluginId: string): Promise<void> {
    const registration = this.plugins.get(pluginId)
    const status = this.pluginStatus.get(pluginId)

    if (!registration || !status) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (status.enabled) {
      console.warn(`Plugin ${pluginId} is already enabled`)
      return
    }

    try {
      // 确保插件已加载
      if (!registration.plugin.loaded) {
        await this.load(pluginId)
      }

      status.state = 'initializing'
      this.emit('plugin-enabling', { pluginId })

      // 初始化插件
      await this.initializePlugin(registration.plugin)

      // 激活插件
      await this.activatePlugin(registration.plugin)

      // 更新状态
      status.state = 'active'
      status.enabled = true
      registration.plugin.enabled = true

      this.emit('plugin-enabled', { pluginId })

      console.log(`Plugin ${pluginId} enabled successfully`)

    } catch (error) {
      status.state = 'error'
      status.enabled = false

      const pluginError: PluginError = {
        id: this.generateErrorId(),
        pluginId,
        type: 'init',
        message: `Failed to enable plugin: ${error}`,
        timestamp: new Date().toISOString(),
        severity: 'high',
        recoverable: true
      }

      status.errors.push(pluginError)
      this.emit('plugin-error', { pluginId, error: pluginError })
      throw error
    }
  }

  /**
   * 禁用插件
   */
  async disable(pluginId: string): Promise<void> {
    const registration = this.plugins.get(pluginId)
    const status = this.pluginStatus.get(pluginId)

    if (!registration || !status) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (!status.enabled) {
      console.warn(`Plugin ${pluginId} is not enabled`)
      return
    }

    try {
      status.state = 'suspended'
      this.emit('plugin-disabling', { pluginId })

      // 停用插件
      await this.deactivatePlugin(registration.plugin)

      // 更新状态
      status.state = 'loaded'
      status.enabled = false
      registration.plugin.enabled = false

      this.emit('plugin-disabled', { pluginId })

      console.log(`Plugin ${pluginId} disabled successfully`)

    } catch (error) {
      const pluginError: PluginError = {
        id: this.generateErrorId(),
        pluginId,
        type: 'execute',
        message: `Failed to disable plugin: ${error}`,
        timestamp: new Date().toISOString(),
        severity: 'medium',
        recoverable: true
      }

      status.errors.push(pluginError)
      this.emit('plugin-error', { pluginId, error: pluginError })
      throw error
    }
  }

  /**
   * 获取插件
   */
  getPlugin(pluginId: string): AgentPlugin | null {
    const registration = this.plugins.get(pluginId)
    return registration ? registration.plugin : null
  }

  /**
   * 获取所有插件
   */
  getAllPlugins(): AgentPlugin[] {
    return Array.from(this.plugins.values()).map(reg => reg.plugin)
  }

  /**
   * 根据类型获取插件
   */
  getPluginsByType(type: PluginType): AgentPlugin[] {
    return this.getAllPlugins().filter(plugin => plugin.type === type)
  }

  /**
   * 获取已启用的插件
   */
  getEnabledPlugins(): AgentPlugin[] {
    return this.getAllPlugins().filter(plugin => plugin.enabled)
  }

  /**
   * 执行插件
   */
  async executePlugin(pluginId: string, context: PluginExecutionContext): Promise<any> {
    return new Promise((resolve, reject) => {
      this.executionQueue.push({ pluginId, context, resolve, reject })
      this.processExecutionQueue()
    })
  }

  /**
   * 广播消息给所有插件
   */
  async broadcastMessage(message: any, context: PluginExecutionContext): Promise<any[]> {
    const enabledPlugins = this.getEnabledPlugins()
    const results: any[] = []

    for (const plugin of enabledPlugins) {
      try {
        if (plugin.type === 'native') {
          const nativePlugin = plugin as NativePlugin
          if (nativePlugin.onMessage) {
            const result = await nativePlugin.onMessage(message, context)
            if (result) {
              results.push(...result)
            }
          }
        }
      } catch (error) {
        console.warn(`Error broadcasting message to plugin ${plugin.id}:`, error)
      }
    }

    return results
  }

  /**
   * 更新插件配置
   */
  async updatePluginConfig(pluginId: string, config: Partial<PluginConfig>): Promise<void> {
    const registration = this.plugins.get(pluginId)
    if (!registration) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    const oldConfig = registration.config
    const newConfig = { ...oldConfig, ...config }

    // 验证配置
    const isValid = await this.validatePluginConfig(pluginId, newConfig)
    if (!isValid) {
      throw new Error(`Invalid configuration for plugin ${pluginId}`)
    }

    // 更新配置
    registration.config = newConfig

    // 通知插件配置变更
    if (registration.plugin.onConfigChange) {
      await registration.plugin.onConfigChange(newConfig, oldConfig)
    }

    this.emit('config-changed', { pluginId, oldConfig, newConfig })
  }

  /**
   * 验证插件配置
   */
  async validatePluginConfig(pluginId: string, config: PluginConfig): Promise<boolean> {
    // TODO: 实现配置验证逻辑
    return true
  }

  /**
   * 获取插件状态
   */
  getPluginStatus(pluginId: string): PluginStatus {
    const status = this.pluginStatus.get(pluginId)
    if (!status) {
      throw new Error(`Plugin ${pluginId} not found`)
    }
    return { ...status }
  }

  /**
   * 获取管理器统计信息
   */
  getManagerStats(): PluginManagerStats {
    const plugins = this.getAllPlugins()
    const enabledPlugins = plugins.filter(p => p.enabled)
    const loadedPlugins = plugins.filter(p => p.loaded)
    const activePlugins = plugins.filter(p => p.state === 'active')
    const errorPlugins = plugins.filter(p => p.state === 'error')

    const totalExecutions = Array.from(this.pluginStatus.values())
      .reduce((sum, status) => sum + status.performance.totalExecutions, 0)

    const totalExecutionTime = Array.from(this.pluginStatus.values())
      .reduce((sum, status) => sum + (status.performance.averageExecutionTime * status.performance.totalExecutions), 0)

    const totalErrors = Array.from(this.pluginStatus.values())
      .reduce((sum, status) => sum + status.performance.errorCount, 0)

    return {
      totalPlugins: plugins.length,
      enabledPlugins: enabledPlugins.length,
      loadedPlugins: loadedPlugins.length,
      activePlugins: activePlugins.length,
      errorPlugins: errorPlugins.length,
      performance: {
        totalExecutions,
        averageExecutionTime: totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0,
        successRate: totalExecutions > 0 ? ((totalExecutions - totalErrors) / totalExecutions) * 100 : 100
      },
      resources: {
        totalMemoryUsage: Array.from(this.pluginStatus.values())
          .reduce((sum, status) => sum + status.resources.memoryUsage, 0),
        totalCpuUsage: Array.from(this.pluginStatus.values())
          .reduce((sum, status) => sum + status.resources.cpuUsage, 0)
      }
    }
  }

  /**
   * 事件监听
   */
  on(event: PluginManagerEvent, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  /**
   * 移除事件监听
   */
  off(event: PluginManagerEvent, handler: (data: any) => void): void {
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
  emit(event: PluginManagerEvent, data: any): void {
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

  // ========================================
  // 私有方法
  // ========================================

  private initializeEventHandlers(): void {
    const events: PluginManagerEvent[] = [
      'plugin-registered', 'plugin-unregistered', 'plugin-loaded', 'plugin-unloaded',
      'plugin-enabled', 'plugin-disabled', 'plugin-error', 'plugin-executed',
      'config-changed', 'dependency-resolved', 'dependency-missing'
    ]

    events.forEach(event => {
      this.eventHandlers.set(event, [])
    })
  }

  private async validatePlugin(plugin: AgentPlugin): Promise<void> {
    // 基础验证
    if (!plugin.id || !plugin.name || !plugin.version) {
      throw new Error('Plugin must have id, name, and version')
    }

    // 检查插件是否已存在
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} already registered`)
    }

    // 类型特定验证
    if (plugin.type === 'mcp') {
      await this.validateMCPPlugin(plugin as MCPPlugin)
    }

    // 安全验证
    if (!this.config.allowUnsafePlugins && this.isUnsafePlugin(plugin)) {
      throw new Error(`Unsafe plugin ${plugin.id} not allowed`)
    }
  }

  private async validateMCPPlugin(plugin: MCPPlugin): Promise<void> {
    if (!plugin.mcpConfig) {
      throw new Error('MCP plugin must have mcpConfig')
    }
  }

  private isUnsafePlugin(plugin: AgentPlugin): boolean {
    // TODO: 实现安全检查逻辑
    return false
  }

  private async resolveDependencies(plugin: AgentPlugin): Promise<void> {
    for (const dependency of plugin.dependencies) {
      if (!dependency.optional && !this.plugins.has(dependency.id)) {
        this.emit('dependency-missing', { pluginId: plugin.id, dependency })
        throw new Error(`Required dependency ${dependency.id} not found for plugin ${plugin.id}`)
      }
    }

    this.emit('dependency-resolved', { pluginId: plugin.id })
  }

  private async loadPluginInternal(plugin: AgentPlugin): Promise<void> {
    if (plugin.onLoad) {
      await plugin.onLoad()
    }
  }

  private async unloadPluginInternal(plugin: AgentPlugin): Promise<void> {
    if (plugin.onUnload) {
      await plugin.onUnload()
    }
  }

  private async initializePlugin(plugin: AgentPlugin): Promise<void> {
    if (plugin.onInit) {
      const context: PluginInitContext = {
        agentVersion: '1.0.0', // TODO: 从配置获取
        platform: 'browser',
        userPermissions: [],
        availableFeatures: [],
        sharedResources: {},
        logger: this.createPluginLogger(plugin.id)
      }

      await plugin.onInit(context)
    }
  }

  private async activatePlugin(plugin: AgentPlugin): Promise<void> {
    if (plugin.onActivate) {
      await plugin.onActivate()
    }
  }

  private async deactivatePlugin(plugin: AgentPlugin): Promise<void> {
    if (plugin.onDeactivate) {
      await plugin.onDeactivate()
    }
  }

  private async processExecutionQueue(): Promise<void> {
    if (this.isProcessingQueue || this.executionQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    try {
      while (this.executionQueue.length > 0) {
        const batch = this.executionQueue.splice(0, this.config.maxConcurrentExecutions)

        await Promise.all(batch.map(async ({ pluginId, context, resolve, reject }) => {
          try {
            const result = await this.executePluginInternal(pluginId, context)
            resolve(result)
          } catch (error) {
            reject(error)
          }
        }))
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  private async executePluginInternal(pluginId: string, context: PluginExecutionContext): Promise<any> {
    const registration = this.plugins.get(pluginId)
    const status = this.pluginStatus.get(pluginId)

    if (!registration || !status) {
      throw new Error(`Plugin ${pluginId} not found`)
    }

    if (!status.enabled) {
      throw new Error(`Plugin ${pluginId} is not enabled`)
    }

    const startTime = Date.now()

    try {
      let result: any

      if (registration.plugin.type === 'mcp') {
        result = await this.executeMCPPlugin(registration.plugin as MCPPlugin, context)
      } else if (registration.plugin.type === 'native') {
        result = await this.executeNativePlugin(registration.plugin as NativePlugin, context)
      } else {
        throw new Error(`Unsupported plugin type: ${registration.plugin.type}`)
      }

      const executionTime = Date.now() - startTime

      // 更新性能统计
      this.updatePluginPerformance(pluginId, executionTime, true)

      this.emit('plugin-executed', { pluginId, result, executionTime })

      return result

    } catch (error) {
      const executionTime = Date.now() - startTime
      this.updatePluginPerformance(pluginId, executionTime, false)

      const pluginError: PluginError = {
        id: this.generateErrorId(),
        pluginId,
        type: 'execute',
        message: `Plugin execution failed: ${error}`,
        timestamp: new Date().toISOString(),
        severity: 'medium',
        recoverable: true
      }

      status.errors.push(pluginError)
      this.emit('plugin-error', { pluginId, error: pluginError })

      throw error
    }
  }

  private async executeMCPPlugin(plugin: MCPPlugin, context: PluginExecutionContext): Promise<any> {
    // TODO: 实现 MCP 插件执行
    throw new Error('MCP plugin execution not yet implemented')
  }

  private async executeNativePlugin(plugin: NativePlugin, context: PluginExecutionContext): Promise<any> {
    // TODO: 实现原生插件执行
    throw new Error('Native plugin execution not yet implemented')
  }

  private updatePluginPerformance(pluginId: string, executionTime: number, success: boolean): void {
    const status = this.pluginStatus.get(pluginId)
    if (!status) return

    const { performance } = status
    performance.totalExecutions += 1

    if (success) {
      performance.averageExecutionTime =
        (performance.averageExecutionTime * (performance.totalExecutions - 1) + executionTime) / performance.totalExecutions
    } else {
      performance.errorCount += 1
    }

    performance.successRate =
      ((performance.totalExecutions - performance.errorCount) / performance.totalExecutions) * 100
  }

  private createPluginLogger(pluginId: string): any {
    return {
      debug: (message: string, ...args: any[]) => console.debug(`[${pluginId}]`, message, ...args),
      info: (message: string, ...args: any[]) => console.info(`[${pluginId}]`, message, ...args),
      warn: (message: string, ...args: any[]) => console.warn(`[${pluginId}]`, message, ...args),
      error: (message: string, error?: Error, ...args: any[]) => console.error(`[${pluginId}]`, message, error, ...args),
      setLevel: (level: string) => {}
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * 创建默认插件管理器实例
 */
export function createPluginManager(config?: Partial<PluginManagerConfig>): PluginManager {
  return new PluginManagerService(config)
}

/**
 * 全局插件管理器实例（单例模式）
 */
let globalPluginManager: PluginManager | null = null

/**
 * 获取全局插件管理器实例
 */
export function getPluginManager(): PluginManager {
  if (!globalPluginManager) {
    globalPluginManager = createPluginManager()
  }
  return globalPluginManager
}

/**
 * 重置全局插件管理器实例
 */
export function resetPluginManager(): void {
  globalPluginManager = null
}