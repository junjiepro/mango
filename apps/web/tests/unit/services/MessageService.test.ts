/**
 * MessageService Unit Tests
 * 测试消息服务的核心功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MessageService } from '@/services/MessageService'
import { AppError, ErrorType } from '@mango/shared/utils'
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockDatabaseError,
  mockNotFoundError,
  mockSuccessResponse,
} from '../../helpers/supabase-mock'
import { createMockMessage, createMockMessageList } from '../../helpers/test-data'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock fetch for sendMessage
global.fetch = vi.fn()

describe('MessageService', () => {
  let service: MessageService
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClient()
    const { createClient } = await import('@/lib/supabase/client')
    vi.mocked(createClient).mockReturnValue(mockSupabase)
    service = new MessageService()
    vi.clearAllMocks()
  })

  describe('sendMessage', () => {
    it('应该通过 API 路由成功发送消息', async () => {
      const mockMessage = createMockMessage()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockMessage,
      })

      const result = await service.sendMessage({
        conversationId: 'conv-123',
        content: 'Test message',
      })

      expect(result).toEqual(mockMessage)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/conversations/conv-123/messages',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test message'),
        })
      )
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(
        service.sendMessage({
          conversationId: 'conv-123',
          content: 'Test',
        })
      ).rejects.toThrow(AppError)
    })

    it('应该在 API 请求失败时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' }),
      })

      await expect(
        service.sendMessage({
          conversationId: 'conv-123',
          content: 'Test',
        })
      ).rejects.toThrow(AppError)

      await expect(
        service.sendMessage({
          conversationId: 'conv-123',
          content: 'Test',
        })
      ).rejects.toMatchObject({
        type: ErrorType.NETWORK_ERROR,
        statusCode: 500,
      })
    })

    it('应该支持附件和回复消息', async () => {
      const mockMessage = createMockMessage()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockMessage,
      })

      await service.sendMessage({
        conversationId: 'conv-123',
        content: 'Test with attachments',
        attachments: [{ id: 'att-1', type: 'image' }],
        replyToMessageId: 'msg-456',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('att-1'),
        })
      )
    })
  })

  describe('getMessages', () => {
    it('应该成功获取消息列表', async () => {
      const mockMessages = createMockMessageList(5)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .range.mockResolvedValue(mockSuccessResponse(mockMessages))

      const result = await service.getMessages('conv-123')

      expect(result.messages).toEqual(mockMessages)
      expect(mockSupabase.from).toHaveBeenCalledWith('messages')
      expect(mockSupabase.from().eq).toHaveBeenCalledWith(
        'conversation_id',
        'conv-123'
      )
    })

    it('应该支持分页参数', async () => {
      const mockMessages = createMockMessageList(10)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .range.mockResolvedValue(mockSuccessResponse(mockMessages))

      await service.getMessages('conv-123', { limit: 10, offset: 20 })

      expect(mockSupabase.from().range).toHaveBeenCalledWith(20, 30)
    })

    it('应该支持游标查询 (beforeSequence)', async () => {
      const mockMessages = createMockMessageList(5)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .lt()
        .range.mockResolvedValue(mockSuccessResponse(mockMessages))

      await service.getMessages('conv-123', { beforeSequence: 100 })

      expect(mockSupabase.from().lt).toHaveBeenCalledWith('sequence_number', 100)
    })

    it('应该支持游标查询 (afterSequence)', async () => {
      const mockMessages = createMockMessageList(5)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .gt()
        .range.mockResolvedValue(mockSuccessResponse(mockMessages))

      await service.getMessages('conv-123', { afterSequence: 50 })

      expect(mockSupabase.from().gt).toHaveBeenCalledWith('sequence_number', 50)
    })

    it('应该正确判断是否有更多消息', async () => {
      const mockMessages = createMockMessageList(51)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .range.mockResolvedValue(mockSuccessResponse(mockMessages))

      const result = await service.getMessages('conv-123', { limit: 50 })

      expect(result.hasMore).toBe(true)
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(service.getMessages('conv-123')).rejects.toThrow(AppError)
    })
  })

  describe('getMessage', () => {
    it('应该成功获取单条消息', async () => {
      const mockMessage = createMockMessage()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse(mockMessage)
      )

      const result = await service.getMessage('msg-123')

      expect(result).toEqual(mockMessage)
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', 'msg-123')
    })

    it('应该在消息不存在时抛出 404 错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().select().eq().single.mockResolvedValue(
        mockNotFoundError()
      )

      await expect(service.getMessage('non-existent')).rejects.toThrow(AppError)

      await expect(service.getMessage('non-existent')).rejects.toMatchObject({
        type: ErrorType.RESOURCE_NOT_FOUND,
        statusCode: 404,
      })
    })
  })

  describe('updateMessage', () => {
    it('应该成功更新消息', async () => {
      const updatedMessage = createMockMessage({
        content: 'Updated content',
        edited_at: new Date().toISOString(),
      })
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(updatedMessage))

      const result = await service.updateMessage('msg-123', {
        content: 'Updated content',
      })

      expect(result.content).toBe('Updated content')
      expect(result.edited_at).not.toBeNull()
    })

    it('应该自动设置 edited_at 时间戳', async () => {
      const updatedMessage = createMockMessage()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .update()
        .eq()
        .eq()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(updatedMessage))

      await service.updateMessage('msg-123', { content: 'New' })

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          edited_at: expect.any(String),
        })
      )
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(
        service.updateMessage('msg-123', { content: 'New' })
      ).rejects.toThrow(AppError)
    })
  })

  describe('deleteMessage', () => {
    it('应该软删除消息', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())

      mockSupabase.from().update.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      })

      await service.deleteMessage('msg-123')

      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'deleted',
          deleted_at: expect.any(String),
        })
      )
    })

    it('应该在数据库错误时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())

      mockSupabase.from().update.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue(mockDatabaseError('Delete failed'))
        })
      })

      await expect(service.deleteMessage('msg-123')).rejects.toThrow(AppError)
    })
  })

  describe('createAgentMessage', () => {
    it('应该成功创建 Agent 响应消息', async () => {
      const mockMessage = createMockMessage({
        sender_type: 'agent',
        sender_id: null,
        content_type: 'text/markdown',
        sequence_number: 6,
      })

      // Mock getting last message sequence
      mockSupabase.from().single.mockResolvedValueOnce(
        mockSuccessResponse({ sequence_number: 5 })
      )

      // Mock inserting new message
      mockSupabase.from().single.mockResolvedValueOnce(
        mockSuccessResponse(mockMessage)
      )

      const result = await service.createAgentMessage({
        conversationId: 'conv-123',
        content: 'Agent response',
      })

      expect(result.sender_type).toBe('agent')
      expect(result.sender_id).toBeNull()
      expect(result.sequence_number).toBe(6)
    })

    it('应该支持 Agent 元数据', async () => {
      const mockMessage = createMockMessage()
      mockSupabase
        .from()
        .select()
        .eq()
        .order()
        .limit()
        .single.mockResolvedValue(mockSuccessResponse({ sequence_number: 0 }))
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockMessage)
      )

      await service.createAgentMessage({
        conversationId: 'conv-123',
        content: 'Response',
        agentMetadata: { model: 'claude-3-5-sonnet', tokens: 100 },
      })

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_metadata: { model: 'claude-3-5-sonnet', tokens: 100 },
        })
      )
    })

    it('应该在没有历史消息时从序列号 1 开始', async () => {
      const mockMessage = createMockMessage({ sequence_number: 1 })

      // Mock no previous messages
      mockSupabase.from().single.mockResolvedValueOnce(
        mockSuccessResponse(null)
      )

      // Mock inserting new message
      mockSupabase.from().single.mockResolvedValueOnce(
        mockSuccessResponse(mockMessage)
      )

      const result = await service.createAgentMessage({
        conversationId: 'conv-123',
        content: 'First message',
      })

      expect(result.sequence_number).toBe(1)
    })
  })

  describe('searchMessages', () => {
    it('应该搜索消息', async () => {
      const mockMessages = createMockMessageList(3)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .textSearch()
        .order()
        .limit.mockResolvedValue(mockSuccessResponse(mockMessages))

      const result = await service.searchMessages('conv-123', 'test query')

      expect(result).toEqual(mockMessages)
      expect(mockSupabase.from().textSearch).toHaveBeenCalledWith(
        'content',
        'test query',
        expect.any(Object)
      )
    })

    it('应该限制搜索结果数量', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .textSearch()
        .order()
        .limit.mockResolvedValue(mockSuccessResponse([]))

      await service.searchMessages('conv-123', 'query')

      expect(mockSupabase.from().limit).toHaveBeenCalledWith(50)
    })

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      await expect(
        service.searchMessages('conv-123', 'query')
      ).rejects.toThrow(AppError)
    })
  })
})
