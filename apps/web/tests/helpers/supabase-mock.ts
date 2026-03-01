/**
 * Supabase Mock Helper
 * 用于单元测试的 Supabase 客户端 mock
 */

import { vi } from 'vitest'

export interface MockSupabaseClient {
  auth: {
    getUser: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
}

export function createMockSupabaseClient(): MockSupabaseClient {
  // 创建一个可链式调用的 query builder
  // 使用共享的 builder 实例以便在测试中配置返回值
  const builder: any = {}

  builder.select = vi.fn().mockReturnValue(builder)
  builder.insert = vi.fn().mockReturnValue(builder)
  builder.update = vi.fn().mockReturnValue(builder)
  builder.delete = vi.fn().mockReturnValue(builder)
  builder.eq = vi.fn().mockReturnValue(builder)
  builder.in = vi.fn().mockReturnValue(builder)
  builder.lt = vi.fn().mockReturnValue(builder)
  builder.gt = vi.fn().mockReturnValue(builder)
  builder.order = vi.fn().mockReturnValue(builder)
  builder.range = vi.fn().mockResolvedValue({ data: [], error: null, count: 0 })
  builder.limit = vi.fn().mockReturnValue(builder)
  builder.textSearch = vi.fn().mockReturnValue(builder)
  builder.single = vi.fn().mockResolvedValue({ data: null, error: null })

  const mockFrom = vi.fn(() => builder)
  const mockGetUser = vi.fn()

  return {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }
}

export function mockAuthenticatedUser(userId = 'test-user-id') {
  return {
    data: {
      user: {
        id: userId,
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      },
    },
    error: null,
  }
}

export function mockUnauthenticatedUser() {
  return {
    data: { user: null },
    error: null,
  }
}

export function mockDatabaseError(message = 'Database error') {
  return {
    data: null,
    error: {
      message,
      code: 'DATABASE_ERROR',
    },
  }
}

export function mockNotFoundError() {
  return {
    data: null,
    error: {
      message: 'Not found',
      code: 'PGRST116',
    },
  }
}

export function mockSuccessResponse<T>(data: T) {
  return {
    data,
    error: null,
  }
}

export function mockCountResponse(count: number) {
  return {
    count,
    error: null,
  }
}
