/**
 * Feedback API Integration Tests
 * 测试反馈 API 路由的集成功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/feedback/route'
import { NextRequest } from 'next/server'
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockSuccessResponse,
  mockDatabaseError,
} from '../../helpers/supabase-mock'
import { createMockFeedback, createMockFeedbackList } from '../../helpers/test-data'

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('Feedback API Routes', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClient()
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
    vi.clearAllMocks()
  })

  describe('POST /api/feedback', () => {
    it('应该成功提交反馈并返回 200', async () => {
      const mockFeedback = createMockFeedback()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockFeedback)
      )

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: 'conv-123',
          message_id: 'msg-123',
          feedback_type: 'satisfaction',
          rating: 'positive',
          comment: 'Great response!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(mockFeedback.id)
      expect(data.rating).toBe('positive')
    })

    it('应该在用户未认证时返回 401', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          feedback_type: 'satisfaction',
          rating: 'positive',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('应该在数据库错误时返回 500', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockDatabaseError('Insert failed')
      )

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          feedback_type: 'satisfaction',
          rating: 'positive',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/feedback', () => {
    it('应该成功获取用户反馈列表', async () => {
      const mockFeedbackList = createMockFeedbackList(3)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().order().limit.mockResolvedValue(
        mockSuccessResponse(mockFeedbackList)
      )

      const request = new NextRequest('http://localhost:3000/api/feedback')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(3)
    })

    it('应该支持 limit 参数', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().order().limit.mockResolvedValue(
        mockSuccessResponse([])
      )

      const request = new NextRequest('http://localhost:3000/api/feedback?limit=10')
      await GET(request)

      expect(mockSupabase.from().limit).toHaveBeenCalledWith(10)
    })

    it('应该在用户未认证时返回 401', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      const request = new NextRequest('http://localhost:3000/api/feedback')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })
})
