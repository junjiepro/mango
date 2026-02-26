/**
 * Rate Limit Utility Tests
 */

import { describe, it, expect } from 'vitest'
import { rateLimit, checkRateLimit } from '../../../src/lib/rate-limit'

describe('rateLimit', () => {
  it('首次请求应该成功', () => {
    const result = rateLimit('test-1', { limit: 5, windowMs: 60000 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('超过限制应该失败', () => {
    const key = 'test-exceed-' + Date.now()
    for (let i = 0; i < 3; i++) {
      rateLimit(key, { limit: 3, windowMs: 60000 })
    }
    const result = rateLimit(key, { limit: 3, windowMs: 60000 })
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })
})

describe('checkRateLimit', () => {
  it('未超限时应返回 null', () => {
    const result = checkRateLimit('check-1-' + Date.now(), { limit: 10, windowMs: 60000 })
    expect(result).toBeNull()
  })

  it('超限时应返回 429 Response', () => {
    const key = 'check-exceed-' + Date.now()
    for (let i = 0; i < 2; i++) {
      checkRateLimit(key, { limit: 2, windowMs: 60000 })
    }
    const result = checkRateLimit(key, { limit: 2, windowMs: 60000 })
    expect(result).not.toBeNull()
    expect(result!.status).toBe(429)
  })
})
