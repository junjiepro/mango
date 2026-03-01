/**
 * Conversations API Integration Tests
 * 测试对话 API 路由的集成功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/conversations/route'
import { NextRequest } from 'next/server'
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockSuccessResponse,
  mockDatabaseError,
} from '../../helpers/supabase-mock'
import { createMockConversation, createMockConversationList } from '../../helpers/test-data'

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock logger
vi.mock('@mango/shared/utils', async () => {
  const actual = await vi.importActual('@mango/shared/utils')
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  }
})

describe('Conversations API Routes', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClient()
    const { createClient } = await import('@/lib/supabase/server')
    vi.mocked(createClient).mockResolvedValue(mockSupabase)
    vi.clearAllMocks()
  })

  describe('GET /api/conversations', () => {
    it('应该成功获取对话列表', async () => {
      const mockConversations = createMockConversationList(3)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .order()
        .range.mockResolvedValue({
        data: mockConversations,
        count: 3,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/conversations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toHaveLength(3)
      expect(data.total).toBe(3)
      expect(data.limit).toBe(20)
      expect(data.offset).toBe(0)
    })

    it('应该支持分页参数', async () => {
      const mockConversations = createMockConversationList(5)
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .order()
        .range.mockResolvedValue({
        data: mockConversations,
        count: 50,
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/conversations?limit=5&offset=10'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.limit).toBe(5)
      expect(data.offset).toBe(10)
      expect(mockSupabase.from().range).toHaveBeenCalledWith(10, 14)
    })

    it('应该支持状态筛选', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .order()
        .range.mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      })

      const request = new NextRequest(
        'http://localhost:3000/api/conversations?status=archived'
      )
      await GET(request)

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', 'archived')
    })

    it('应该在用户未认证时返回 401', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      const request = new NextRequest('http://localhost:3000/api/conversations')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('应该在数据库错误时返回 500', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .order()
        .range.mockResolvedValue(mockDatabaseError('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/conversations')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Failed to fetch conversations')
    })

    it('应该处理数据库返回 null 的情况', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .order()
        .range.mockResolvedValue({
        data: null,
        count: null,
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/conversations')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.conversations).toEqual([])
      expect(data.total).toBe(0)
    })
  })

  describe('POST /api/conversations', () => {
    it('应该成功创建对话', async () => {
      const mockConversation = createMockConversation()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockConversation)
      )

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Conversation',
          description: 'Test description',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBe(mockConversation.id)
      expect(data.title).toBe(mockConversation.title)
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Conversation',
          description: 'Test description',
          status: 'active',
        })
      )
    })

    it('应该使用默认 context 配置', async () => {
      const mockConversation = createMockConversation()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockConversation)
      )

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
        }),
      })

      await POST(request)

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

    it('应该支持自定义 context', async () => {
      const mockConversation = createMockConversation()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockConversation)
      )

      const customContext = {
        model: 'claude-opus-4',
        temperature: 0.5,
        max_tokens: 8192,
        system_prompt: 'Custom prompt',
      }

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          context: customContext,
        }),
      })

      await POST(request)

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          context: customContext,
        })
      )
    })

    it('应该在标题为空时返回 400', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: '',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Title is required')
    })

    it('应该在标题缺失时返回 400', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          description: 'No title',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Title is required')
    })

    it('应该自动修剪标题和描述的空白字符', async () => {
      const mockConversation = createMockConversation()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockConversation)
      )

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: '  Test Title  ',
          description: '  Test Description  ',
        }),
      })

      await POST(request)

      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          description: 'Test Description',
        })
      )
    })

    it('应该在用户未认证时返回 401', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser())

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
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

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Failed to create conversation')
    })

    it('应该记录成功创建的日志', async () => {
      const mockConversation = createMockConversation()
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser())
      mockSupabase.from().insert().select().single.mockResolvedValue(
        mockSuccessResponse(mockConversation)
      )

      const { logger } = await import('@mango/shared/utils')

      const request = new NextRequest('http://localhost:3000/api/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
        }),
      })

      await POST(request)

      expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
        'Conversation created',
        expect.objectContaining({
          conversationId: mockConversation.id,
        })
      )
    })
  })
})
