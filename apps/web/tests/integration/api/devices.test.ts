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

    it('应该支持 status 过滤参数', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().order().range.mockResolvedValue({
        data: [], count: 0, error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/devices?status=active')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('应该支持 check_online 参数', async () => {
      const mockDevices = [
        { id: 'dev-1', status: 'active', device_url: 'http://device.local' },
        { id: 'dev-2', status: 'inactive', device_url: null },
      ]
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().order().range.mockResolvedValue({
        data: mockDevices, count: 2, error: null,
      })
      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      const request = new NextRequest('http://localhost:3000/api/devices?check_online=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.devices[0]).toHaveProperty('is_online')
    })

    it('check_online 设备离线时应标记为 false', async () => {
      const mockDevices = [{ id: 'dev-1', status: 'active', device_url: 'http://device.local' }]
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().order().range.mockResolvedValue({
        data: mockDevices, count: 1, error: null,
      })
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'))

      const request = new NextRequest('http://localhost:3000/api/devices?check_online=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.devices[0].is_online).toBe(false)
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

    it('绑定不存在时应返回 404', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null, error: { message: 'Not found', code: 'PGRST116' },
      })

      const request = new NextRequest('http://localhost:3000/api/devices?id=dev-1', { method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(404)
    })

    it('非所有者时应返回 403', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'dev-1', user_id: 'other-user' }, error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/devices?id=dev-1', { method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(403)
    })

    it('应该成功解绑设备', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'dev-1', user_id: 'test-user-id' }, error: null,
      })
      mockSupabase.from().setDefault({ error: null })

      const request = new NextRequest('http://localhost:3000/api/devices?id=dev-1', { method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toBe('Device unbound successfully')
    })

    it('删除时数据库错误应返回 500', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'dev-1', user_id: 'test-user-id' }, error: null,
      })
      mockSupabase.from().setDefault(mockDatabaseError('Delete failed'))

      const request = new NextRequest('http://localhost:3000/api/devices?id=dev-1', { method: 'DELETE' })
      const response = await DELETE(request)

      expect(response.status).toBe(500)
    })
  })
})
