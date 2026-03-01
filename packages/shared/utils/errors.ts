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
 * Supported locales for error messages
 */
export type SupportedLocale = 'zh' | 'en'

/**
 * 错误消息映射 (多语言)
 */
export const ERROR_MESSAGES: Record<ErrorType, Record<SupportedLocale, string>> = {
  [ErrorType.AUTH_UNAUTHORIZED]: { zh: '未授权，请先登录', en: 'Unauthorized. Please log in' },
  [ErrorType.AUTH_FORBIDDEN]: { zh: '权限不足，无法访问该资源', en: 'Access denied' },
  [ErrorType.AUTH_SESSION_EXPIRED]: { zh: '会话已过期，请重新登录', en: 'Session expired. Please log in again' },
  [ErrorType.AUTH_INVALID_CREDENTIALS]: { zh: '用户名或密码错误', en: 'Invalid email or password' },

  [ErrorType.VALIDATION_FAILED]: { zh: '输入验证失败', en: 'Validation failed' },
  [ErrorType.VALIDATION_REQUIRED_FIELD]: { zh: '必填字段缺失', en: 'Required field is missing' },
  [ErrorType.VALIDATION_INVALID_FORMAT]: { zh: '输入格式无效', en: 'Invalid format' },

  [ErrorType.RESOURCE_NOT_FOUND]: { zh: '请求的资源不存在', en: 'Resource not found' },
  [ErrorType.RESOURCE_ALREADY_EXISTS]: { zh: '资源已存在', en: 'Resource already exists' },
  [ErrorType.RESOURCE_CONFLICT]: { zh: '资源冲突', en: 'Resource conflict' },

  [ErrorType.BUSINESS_LOGIC_ERROR]: { zh: '业务逻辑错误', en: 'Business logic error' },
  [ErrorType.QUOTA_EXCEEDED]: { zh: '配额已用尽', en: 'Quota exceeded' },
  [ErrorType.RATE_LIMIT_EXCEEDED]: { zh: '请求过于频繁，请稍后再试', en: 'Too many requests. Please try again later' },

  [ErrorType.INTERNAL_SERVER_ERROR]: { zh: '服务器内部错误', en: 'Internal server error' },
  [ErrorType.DATABASE_ERROR]: { zh: '数据库错误', en: 'Database error' },
  [ErrorType.NETWORK_ERROR]: { zh: '网络错误', en: 'Network error' },
  [ErrorType.TIMEOUT_ERROR]: { zh: '请求超时', en: 'Request timed out' },

  [ErrorType.EXTERNAL_SERVICE_ERROR]: { zh: '外部服务错误', en: 'External service error' },
  [ErrorType.MCP_SERVICE_ERROR]: { zh: 'MCP 服务错误', en: 'MCP service error' },
  [ErrorType.MINIAPP_ERROR]: { zh: '小应用错误', en: 'Mini app error' },

  [ErrorType.UNKNOWN_ERROR]: { zh: '未知错误', en: 'Unknown error' },
}

/**
 * 获取指定类型和语言的错误消息
 */
export function getErrorMessage(type: ErrorType, locale: SupportedLocale = 'zh'): string {
  return ERROR_MESSAGES[type]?.[locale] || ERROR_MESSAGES[type]?.zh || 'Unknown error'
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(error: AppError, locale: SupportedLocale = 'zh'): string {
  return ERROR_MESSAGES[error.type]?.[locale] || error.message
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
