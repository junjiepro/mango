/**
 * Logging Utility
 * T033: Create logging utility
 */

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 日志级别优先级
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
}

/**
 * 日志配置
 */
interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteEndpoint?: string
  context?: Record<string, any>
}

/**
 * 日志条目
 */
interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

/**
 * Logger 类
 */
class Logger {
  private config: LoggerConfig

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
      enableConsole: true,
      enableRemote: false,
      ...config,
    }
  }

  /**
   * 检查是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level]
  }

  /**
   * 格式化日志条目
   */
  private formatLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    }

    // 合并全局上下文和局部上下文
    if (this.config.context || context) {
      entry.context = {
        ...this.config.context,
        ...context,
      }
    }

    // 添加错误信息
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
        }),
      }
    }

    return entry
  }

  /**
   * 输出到控制台
   */
  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return

    const { level, message, timestamp, context, error } = entry

    // 根据级别选择控制台方法
    const consoleMethod = {
      [LogLevel.DEBUG]: console.debug,
      [LogLevel.INFO]: console.info,
      [LogLevel.WARN]: console.warn,
      [LogLevel.ERROR]: console.error,
    }[level]

    // 格式化输出
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    if (context || error) {
      consoleMethod(prefix, message, { context, error })
    } else {
      consoleMethod(prefix, message)
    }
  }

  /**
   * 发送到远程日志服务
   */
  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      // 远程日志失败时，至少输出到控制台
      console.error('Failed to send log to remote:', error)
    }
  }

  /**
   * 记录日志
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.shouldLog(level)) return

    const entry = this.formatLogEntry(level, message, context, error)

    // 输出到控制台
    this.logToConsole(entry)

    // 发送到远程 (异步，不阻塞)
    if (this.config.enableRemote) {
      this.logToRemote(entry).catch(console.error)
    }
  }

  /**
   * Debug 级别日志
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Info 级别日志
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Warn 级别日志
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Error 级别日志
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  /**
   * 创建子 Logger (带有额外的上下文)
   */
  child(context: Record<string, any>): Logger {
    return new Logger({
      ...this.config,
      context: {
        ...this.config.context,
        ...context,
      },
    })
  }

  /**
   * 更新配置
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    }
  }
}

/**
 * 默认 Logger 实例
 */
export const logger = new Logger()

/**
 * 创建新的 Logger 实例
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config)
}

/**
 * 性能监控装饰器
 */
export function logPerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
    const start = performance.now()
    const methodName = `${target.constructor.name}.${propertyKey}`

    logger.debug(`Starting ${methodName}`)

    try {
      const result = await originalMethod.apply(this, args)
      const duration = performance.now() - start

      logger.debug(`Completed ${methodName}`, {
        duration: `${duration.toFixed(2)}ms`,
      })

      return result
    } catch (error) {
      const duration = performance.now() - start

      logger.error(`Failed ${methodName}`, error as Error, {
        duration: `${duration.toFixed(2)}ms`,
      })

      throw error
    }
  }

  return descriptor
}

/**
 * 请求日志中间件辅助函数
 */
export function logRequest(
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  context?: Record<string, any>
): void {
  const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO

  logger.log(
    level,
    `${method} ${url} ${statusCode}`,
    {
      method,
      url,
      statusCode,
      duration: `${duration.toFixed(2)}ms`,
      ...context,
    }
  )
}
