/**
 * Error Utilities Unit Tests
 */

import { describe, it, expect } from 'vitest'
import {
  AppError,
  AuthError,
  ValidationError,
  NotFoundError,
  ErrorType,
  normalizeError,
} from '../../../packages/shared/utils/errors'

describe('AppError', () => {
  it('应该创建带默认值的错误', () => {
    const error = new AppError('test error')
    expect(error.message).toBe('test error')
    expect(error.type).toBe(ErrorType.UNKNOWN_ERROR)
    expect(error.statusCode).toBe(500)
    expect(error.isOperational).toBe(true)
  })

  it('应该创建带自定义参数的错误', () => {
    const error = new AppError('custom', ErrorType.DATABASE_ERROR, 503, false, { key: 'val' })
    expect(error.type).toBe(ErrorType.DATABASE_ERROR)
    expect(error.statusCode).toBe(503)
    expect(error.isOperational).toBe(false)
    expect(error.context).toEqual({ key: 'val' })
  })

  it('toJSON 应该返回正确结构', () => {
    const error = new AppError('test', ErrorType.VALIDATION_FAILED, 400)
    const json = error.toJSON()
    expect(json.name).toBe('AppError')
    expect(json.type).toBe(ErrorType.VALIDATION_FAILED)
    expect(json.statusCode).toBe(400)
    expect(json.timestamp).toBeDefined()
  })
})

describe('AuthError', () => {
  it('应该默认 401 状态码', () => {
    const error = new AuthError('unauthorized')
    expect(error.statusCode).toBe(401)
    expect(error.type).toBe(ErrorType.AUTH_UNAUTHORIZED)
  })
})

describe('ValidationError', () => {
  it('应该默认 400 状态码', () => {
    const error = new ValidationError('invalid input')
    expect(error.statusCode).toBe(400)
    expect(error.type).toBe(ErrorType.VALIDATION_FAILED)
  })
})

describe('NotFoundError', () => {
  it('应该包含资源名称', () => {
    const error = new NotFoundError('User')
    expect(error.message).toBe('User not found')
    expect(error.statusCode).toBe(404)
  })
})

describe('normalizeError', () => {
  it('应该保留 AppError 实例', () => {
    const original = new AppError('test')
    const normalized = normalizeError(original)
    expect(normalized).toBe(original)
  })

  it('应该将普通 Error 转换为 AppError', () => {
    const original = new Error('plain error')
    const normalized = normalizeError(original)
    expect(normalized).toBeInstanceOf(AppError)
    expect(normalized.message).toBe('plain error')
  })

  it('应该处理非 Error 对象', () => {
    const normalized = normalizeError('string error')
    expect(normalized).toBeInstanceOf(AppError)
  })
})
