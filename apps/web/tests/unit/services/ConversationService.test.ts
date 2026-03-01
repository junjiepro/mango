/**
 * ConversationService Unit Tests
 * 测试对话服务的核心功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConversationService } from '@/services/ConversationService'
import { AppError, ErrorType } from '@mango/shared/utils'
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockDatabaseError,
  mockNotFoundError,
  mockSuccessResponse,
  mockCountResponse,
} from '../../helpers/supabase-mock'
import {
  createMockConversation,
  createMockConversationList,
} from '../../helpers/test-data'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

describe('ConversationService', () => {
  let service: ConversationService
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClient()
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue(mockSupabase)
    service = new ConversationService()
  })

  describe('createConversation', () => {
    it('应该成功创建对话', async () => {
      const mockConversation = createMockConversation()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockConversation)
      )

      const result = await service.createConversation({
        title: 'Test Conversation',
        description: 'Test description',
      })

      expect(result).toEqual(mockConversation)
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Conversation',
          description: 'Test description',
          status: 'active',
        })
      )
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(
        service.createConversation({ title: 'Test' })
      ).rejects.toThrow(AppError)

      await expect(
        service.createConversation({ title: 'Test' })
      ).rejects.toMatchObject({
        type: ErrorType.AUTH_UNAUTHORIZED,
        statusCode: 401,
      })
    })

    it('应该在数据库错误时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockDatabaseError('Insert failed')
      )

      await expect(
        service.createConversation({ title: 'Test' })
      ).rejects.toThrow(AppError)

      await expect(
        service.createConversation({ title: 'Test' })
      ).rejects.toMatchObject({
        type: ErrorType.DATABASE_ERROR,
        statusCode: 500,
      })
    })

    it('应该使用默认 context 配置', async () => {
      const mockConversation = createMockConversation()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockConversation)
      )

      await service.createConversation({ title: 'Test' })

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            model: 'claude-3-5-sonnet',
            temperature: 0.7,
            max_tokens: 4096,
          }),
        })
      )
    })
  })

  describe('getConversations', () => {
    it('应该成功获取对话列表', async () => {
      const mockConversations = createMockConversationList(3)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())

      // 创建两个独立的 builder
      const countBuilder: any = {}
      countBuilder.select = vi.fn().mockReturnValue(countBuilder)
      countBuilder.eq = vi.fn()
        .mockReturnValueOnce(countBuilder)
        .mockResolvedValueOnce({ count: 3, error: null })

      const dataBuilder: any = {}
      dataBuilder.select = vi.fn().mockReturnValue(dataBuilder)
      dataBuilder.eq = vi.fn().mockReturnValue(dataBuilder)
      dataBuilder.order = vi.fn().mockReturnValue(dataBuilder)
      dataBuilder.range = vi.fn().mockResolvedValue({
        data: mockConversations,
        error: null,
      })

      // 第一次调用 from() 返回 countBuilder,第二次返回 dataBuilder
      mockSupabase.from
        .mockReturnValueOnce(countBuilder)
        .mockReturnValueOnce(dataBuilder)

      const result = await service.getConversations()

      expect(result.conversations).toEqual(mockConversations)
      expect(result.total).toBe(3)
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
    })

    it('应该支持分页参数', async () => {
      const mockConversations = createMockConversationList(2)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())

      mockSupabase.from().range.mockResolvedValue({
        data: mockConversations,
        count: 10,
        error: null,
      })

      await service.getConversations({ limit: 2, offset: 4 })

      expect(mockSupabase.from().range).toHaveBeenCalledWith(4, 5)
    })

    it('应该支持按状态筛选', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())

      mockSupabase.from().range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      })

      await service.getConversations({ status: 'archived' })

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', 'archived')
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(service.getConversations()).rejects.toThrow(AppError)
    })
  })

  describe('getConversation', () => {
    it('应该成功获取单个对话', async () => {
      const mockConversation = createMockConversation()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().eq().single.mockResolvedValue(
        mockSuccessResponse(mockConversation)
      )

      const result = await service.getConversation('conv-123')

      expect(result).toEqual(mockConversation)
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', 'conv-123')
    })

    it('应该在对话不存在时抛出 404 错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().eq().single.mockResolvedValue(
        mockNotFoundError()
      )

      await expect(service.getConversation('non-existent')).rejects.toThrow(
        AppError
      )

      await expect(
        service.getConversation('non-existent')
      ).rejects.toMatchObject({
        type: ErrorType.RESOURCE_NOT_FOUND,
        statusCode: 404,
      })
    })
  })

  describe('updateConversation', () => {
    it('应该成功更新对话', async () => {
      const updatedConversation = createMockConversation({
        title: 'Updated Title',
      })
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().update().eq().eq().select().single.mockResolvedValue(
        mockSuccessResponse(updatedConversation)
      )

      const result = await service.updateConversation('conv-123', {
        title: 'Updated Title',
      })

      expect(result.title).toBe('Updated Title')
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        title: 'Updated Title',
      })
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(
        service.updateConversation('conv-123', { title: 'New' })
      ).rejects.toThrow(AppError)
    })
  })

  describe('deleteConversation', () => {
    it('应该软删除对话', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())

      // Mock update to return success
      mockSupabase.from().update.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })

      await service.deleteConversation('conv-123')

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        status: 'deleted',
      })
    })

    it('应该在数据库错误时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())

      mockSupabase.from().update.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockDatabaseError('Delete failed'))
        })
      })

      await expect(service.deleteConversation('conv-123')).rejects.toThrow(
        AppError
      )
    })
  })

  describe('archiveConversation', () => {
    it('应该归档对话', async () => {
      const archivedConversation = createMockConversation({
        status: 'archived',
        archived_at: new Date().toISOString(),
      })
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().update().eq().eq().select().single.mockResolvedValue(
        mockSuccessResponse(archivedConversation)
      )

      const result = await service.archiveConversation('conv-123')

      expect(result.status).toBe('archived')
      expect(result.archived_at).not.toBeNull()
    })
  })

  describe('unarchiveConversation', () => {
    it('应该恢复归档的对话', async () => {
      const activeConversation = createMockConversation({
        status: 'active',
        archived_at: null,
      })
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().update().eq().eq().select().single.mockResolvedValue(
        mockSuccessResponse(activeConversation)
      )

      const result = await service.unarchiveConversation('conv-123')

      expect(result.status).toBe('active')
      expect(result.archived_at).toBeNull()
    })
  })

  describe('searchConversations', () => {
    it('应该搜索对话', async () => {
      const mockConversations = createMockConversationList(2)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .textSearch()
        .order()
        .limit.mockResolvedValue(mockSuccessResponse(mockConversations))

      const result = await service.searchConversations('test query')

      expect(result).toEqual(mockConversations)
      expect(mockSupabase.from().textSearch).toHaveBeenCalledWith(
        'title',
        'test query',
        expect.any(Object)
      )
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(service.searchConversations('test')).rejects.toThrow(
        AppError
      )
    })
  })
})
