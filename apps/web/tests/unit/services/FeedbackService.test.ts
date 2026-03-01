/**
 * FeedbackService Unit Tests
 * 测试反馈服务的核心功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockDatabaseError,
  mockSuccessResponse,
} from '../../helpers/supabase-mock'
import { createMockFeedback, createMockFeedbackList } from '../../helpers/test-data'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

describe('FeedbackService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let feedbackService: typeof import('@/services/FeedbackService').feedbackService

  beforeEach(async () => {
    vi.resetModules()
    mockSupabase = createMockSupabaseClient()
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    // 重新导入服务以获取新的实例
    const module = await import('@/services/FeedbackService')
    feedbackService = module.feedbackService
  })

  describe('createFeedback', () => {
    it('应该成功创建正面反馈', async () => {
      const mockFeedback = createMockFeedback({ rating: 'positive' })

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockFeedback)
      )

      const result = await feedbackService.createFeedback({
        conversation_id: 'conv-123',
        message_id: 'msg-123',
        feedback_type: 'satisfaction',
        rating: 'positive',
        comment: 'Great response!',
      })

      expect(result.rating).toBe('positive')
      expect(mockSupabase.from).toHaveBeenCalledWith('feedback_records')
    })

    it('应该成功创建负面反馈并包含改进建议', async () => {
      const mockFeedback = createMockFeedback({
        rating: 'negative',
        comment: '希望用表格展示数据',
      })

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockFeedback)
      )

      const result = await feedbackService.createFeedback({
        conversation_id: 'conv-123',
        feedback_type: 'usefulness',
        rating: 'negative',
        comment: '希望用表格展示数据',
      })

      expect(result.rating).toBe('negative')
      expect(result.comment).toContain('表格')
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(
        feedbackService.createFeedback({
          feedback_type: 'satisfaction',
          rating: 'positive',
        })
      ).rejects.toThrow('User not authenticated')
    })

    it('应该在数据库错误时正确传播错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockDatabaseError('Insert failed')
      )

      await expect(
        feedbackService.createFeedback({
          feedback_type: 'satisfaction',
          rating: 'positive',
        })
      ).rejects.toMatchObject({
        message: 'Insert failed',
      })
    })
  })

  describe('getFeedbackByConversation', () => {
    it('应该返回正确数量的反馈并按时间排序', async () => {
      const mockFeedbackList = createMockFeedbackList(5)

      mockSupabase.from().select().eq().order.mockResolvedValue(
        mockSuccessResponse(mockFeedbackList)
      )

      const result = await feedbackService.getFeedbackByConversation('conv-123')

      expect(result).toHaveLength(5)
      expect(mockSupabase.from).toHaveBeenCalledWith('feedback_records')
    })

    it('应该在没有反馈时返回空数组', async () => {
      mockSupabase.from().select().eq().order.mockResolvedValue(
        mockSuccessResponse([])
      )

      const result = await feedbackService.getFeedbackByConversation('conv-empty')

      expect(result).toEqual([])
    })
  })

  describe('getUserFeedback', () => {
    it('应该获取用户的反馈列表', async () => {
      const mockFeedbackList = createMockFeedbackList(3)

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().order().limit.mockResolvedValue(
        mockSuccessResponse(mockFeedbackList)
      )

      const result = await feedbackService.getUserFeedback()

      expect(result).toHaveLength(3)
    })

    it('应该支持自定义 limit 参数', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().order().limit.mockResolvedValue(
        mockSuccessResponse([])
      )

      await feedbackService.getUserFeedback(10)

      expect(mockSupabase.from().limit).toHaveBeenCalledWith(10)
    })
  })

  describe('deleteFeedback', () => {
    it('应该成功删除反馈', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({ error: null })

      await feedbackService.deleteFeedback('feedback-123')

      expect(mockSupabase.from).toHaveBeenCalledWith('feedback_records')
    })

    it('应该在删除失败时抛出错误', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue(
        mockDatabaseError('Delete failed')
      )

      await expect(
        feedbackService.deleteFeedback('feedback-123')
      ).rejects.toMatchObject({
        message: 'Delete failed',
      })
    })
  })
})
