/**
 * Learning Rules API Integration Tests
 * 测试学习规则 API 路由的集成功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/learning/rules/route'
import { NextRequest } from 'next/server'
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockSuccessResponse,
  mockDatabaseError,
} from '../../helpers/supabase-mock'
import { createMockLearningRecord, createMockLearningRecordList } from '../../helpers/test-data'

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Learning Rules API Routes', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClient()
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
    vi.clearAllMocks()
  })

  describe('GET /api/learning/rules', () => {
    it('应该成功获取活跃的学习规则列表', async () => {
      const mockRecords = createMockLearningRecordList(3)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().eq().order.mockResolvedValue(
        mockSuccessResponse(mockRecords)
      )

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(3)
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('is_active', true)
    })

    it('应该在用户未认证时返回 401', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      const response = await GET()

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('应该在数据库错误时返回 500', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().eq().order.mockResolvedValue(
        mockDatabaseError('Database error')
      )

      const response = await GET()

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/learning/rules', () => {
    it('应该成功创建学习规则', async () => {
      const mockRecord = createMockLearningRecord()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockRecord)
      )

      const request = new NextRequest('http://localhost:3000/api/learning/rules', {
        method: 'POST',
        body: JSON.stringify({
          record_type: 'preference',
          content: { format: 'table' },
          confidence: 0.6,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.record_type).toBe('preference')
    })

    it('应该使用默认 confidence 值', async () => {
      const mockRecord = createMockLearningRecord({ confidence: 0.5 })
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockRecord)
      )

      const request = new NextRequest('http://localhost:3000/api/learning/rules', {
        method: 'POST',
        body: JSON.stringify({
          record_type: 'preference',
          content: { format: 'list' },
        }),
      })

      await POST(request)

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({ confidence: 0.5 })
      )
    })

    it('应该在用户未认证时返回 401', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      const request = new NextRequest('http://localhost:3000/api/learning/rules', {
        method: 'POST',
        body: JSON.stringify({
          record_type: 'preference',
          content: {},
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })
})
