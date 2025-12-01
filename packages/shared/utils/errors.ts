/**
 * Error Handling Utility
 * T032: Create error handling utility
 */

/**
 * 应用错误类型
 */
export enum ErrorType {
  // 认证错误
  AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN = 'AUTH_FORBIDDEN',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',

  // 验证错误
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_REQUIRED_FIELD = 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',

  // 资源错误
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // 业务逻辑错误
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // 系统错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // 外部服务错误
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  MCP_SERVICE_ERROR = 'MCP_SERVICE_ERROR',
  MINIAPP_ERROR = 'MINIAPP_ERROR',

  // 未知错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, any>
  public readonly timestamp: Date

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message)

    this.name = this.constructor.name
    this.type = type
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context
    this.timestamp = new Date()

    // 维护正确的堆栈跟踪
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        stack: this.stack,
      }),
    }
  }
}

/**
 * 认证错误
 */
export class AuthError extends AppError {
  constructor(message: string, type: ErrorType = ErrorType.AUTH_UNAUTHORIZED, context?: Record<string, any>) {
    super(message, type, 401, true, context)
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.VALIDATION_FAILED, 400, true, context)
  }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`, ErrorType.RESOURCE_NOT_FOUND, 404, true, context)
  }
}

/**
 * 资源冲突错误
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.RESOURCE_CONFLICT, 409, true, context)
  }
}

/**
 * 配额超限错误
 */
export class QuotaExceededError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.QUOTA_EXCEEDED, 429, true, context)
  }
}

/**
 * 速率限制错误
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, ErrorType.RATE_LIMIT_EXCEEDED, 429, true, context)
  }
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(
      `External service error (${service}): ${message}`,
      ErrorType.EXTERNAL_SERVICE_ERROR,
      502,
      true,
      context
    )
  }
}

/**
 * 判断是否是操作性错误
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

/**
 * 从未知错误创建 AppError
 */
export function normalizeError(error: unknown): AppError {
  // 如果已经是 AppError，直接返回
  if (error instanceof AppError) {
    return error
  }

  // 如果是标准 Error
  if (error instanceof Error) {
    return new AppError(
      error.message,
      ErrorType.UNKNOWN_ERROR,
      500,
      false,
      { originalError: error.name }
    )
  }

  // 如果是字符串
  if (typeof error === 'string') {
    return new AppError(error, ErrorType.UNKNOWN_ERROR, 500, false)
  }

  // 其他类型
  return new AppError(
    'An unknown error occurred',
    ErrorType.UNKNOWN_ERROR,
    500,
    false,
    { originalError: String(error) }
  )
}

/**
 * 错误消息映射 (用户友好的错误消息)
 */
export const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.AUTH_UNAUTHORIZED]: '未授权，请先登录',
  [ErrorType.AUTH_FORBIDDEN]: '权限不足，无法访问该资源',
  [ErrorType.AUTH_SESSION_EXPIRED]: '会话已过期，请重新登录',
  [ErrorType.AUTH_INVALID_CREDENTIALS]: '用户名或密码错误',

  [ErrorType.VALIDATION_FAILED]: '输入验证失败',
  [ErrorType.VALIDATION_REQUIRED_FIELD]: '必填字段缺失',
  [ErrorType.VALIDATION_INVALID_FORMAT]: '输入格式无效',

  [ErrorType.RESOURCE_NOT_FOUND]: '请求的资源不存在',
  [ErrorType.RESOURCE_ALREADY_EXISTS]: '资源已存在',
  [ErrorType.RESOURCE_CONFLICT]: '资源冲突',

  [ErrorType.BUSINESS_LOGIC_ERROR]: '业务逻辑错误',
  [ErrorType.QUOTA_EXCEEDED]: '配额已用尽',
  [ErrorType.RATE_LIMIT_EXCEEDED]: '请求过于频繁，请稍后再试',

  [ErrorType.INTERNAL_SERVER_ERROR]: '服务器内部错误',
  [ErrorType.DATABASE_ERROR]: '数据库错误',
  [ErrorType.NETWORK_ERROR]: '网络错误',
  [ErrorType.TIMEOUT_ERROR]: '请求超时',

  [ErrorType.EXTERNAL_SERVICE_ERROR]: '外部服务错误',
  [ErrorType.MCP_SERVICE_ERROR]: 'MCP 服务错误',
  [ErrorType.MINIAPP_ERROR]: '小应用错误',

  [ErrorType.UNKNOWN_ERROR]: '未知错误',
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(error: AppError): string {
  return ERROR_MESSAGES[error.type] || error.message
}

/**
 * 错误日志格式化
 */
export function formatErrorForLogging(error: AppError): Record<string, any> {
  return {
    type: error.type,
    message: error.message,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    context: error.context,
    timestamp: error.timestamp.toISOString(),
    stack: error.stack,
  }
}
