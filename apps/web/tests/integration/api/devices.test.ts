/**
 * Devices API Integration Tests
 * 测试设备 API 路由的集成功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, DELETE } from '@/app/api/devices/route'
import { NextRequest } from 'next/server'
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockDatabaseError,
} from '../../helpers/supabase-mock'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@mango/shared/utils', async () => {
  const actual = await vi.importActual('@mango/shared/utils')
  return {
    ...actual,
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  }
})

describe('Devices API Routes', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClient()
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
    vi.clearAllMocks()
  })

  describe('GET /api/devices', () => {
    it('应该成功获取设备列表', async () => {
      const mockDevices = [{ id: 'dev-1', device_name: 'Test Device', status: 'active' }]
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().order().range.mockResolvedValue({
        data: mockDevices, count: 1, error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/devices')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.devices).toHaveLength(1)
      expect(data.total).toBe(1)
    })

    it('应该在用户未认证时返回 401', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      const request = new NextRequest('http://localhost:3000/api/devices')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('应该在数据库错误时返回 500', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().order().range.mockResolvedValue(
        mockDatabaseError('DB error')
      )

      const request = new NextRequest('http://localhost:3000/api/devices')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('DELETE /api/devices', () => {
    it('应该在缺少 id 参数时返回 400', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())

      const request = new NextRequest('http://localhost:3000/api/devices', { method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Binding ID is required')
    })

    it('应该在用户未认证时返回 401', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      const request = new NextRequest('http://localhost:3000/api/devices?id=dev-1', { method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(401)
    })
  })
})
