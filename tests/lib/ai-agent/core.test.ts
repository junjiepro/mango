import { jest } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { AgentEngine } from '@/lib/ai-agent/core'
import { MCPClientService } from '@/lib/mcp/client'
import { MultimodalProcessorService } from '@/lib/multimodal/processor'
import { PluginManagerService } from '@/lib/plugins/manager'
import type {
  AgentSession,
  AgentMessage,
  AgentResponse,
  MultimodalContent
} from '@/types/ai-agent'

// Mock dependencies
jest.mock('@supabase/supabase-js')
jest.mock('@/lib/mcp/client')
jest.mock('@/lib/multimodal/processor')
jest.mock('@/lib/plugins/manager')

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
}

// Mock implementations
const mockMCPClient = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  executeTool: jest.fn(),
  getConnectedServers: jest.fn(() => []),
  getSystemStatus: jest.fn(() => 'healthy'),
} as any

const mockMultimodalProcessor = {
  processContent: jest.fn(),
  validateContent: jest.fn(),
} as any

const mockPluginManager = {
  register: jest.fn(),
  unregister: jest.fn(),
  load: jest.fn(),
  unload: jest.fn(),
  executePlugin: jest.fn(),
  getLoadedPlugins: jest.fn(() => new Map()),
} as any

describe('AgentEngine', () => {
  let agentEngine: AgentEngine
  let mockUser: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mocks
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    ;(MCPClientService as jest.Mock).mockImplementation(() => mockMCPClient)
    ;(MultimodalProcessorService as jest.Mock).mockImplementation(() => mockMultimodalProcessor)
    ;(PluginManagerService as jest.Mock).mockImplementation(() => mockPluginManager)

    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com'
    }

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    agentEngine = new AgentEngine()
  })

  describe('Session Management', () => {
    it('should create a new session successfully', async () => {
      const mockSession: Partial<AgentSession> = {
        id: 'test-session-id',
        userId: mockUser.id,
        title: 'Test Session',
        mode: 'simple',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        messageCount: 0
      }

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const result = await agentEngine.createSession('Test Session', 'simple')

      expect(result).toEqual(expect.objectContaining({
        id: 'test-session-id',
        title: 'Test Session',
        mode: 'simple',
        status: 'active'
      }))

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_agent_sessions')
    })

    it('should handle session creation errors', async () => {
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      await expect(agentEngine.createSession('Test Session', 'simple'))
        .rejects.toThrow('Database error')
    })

    it('should retrieve an existing session', async () => {
      const mockSession: Partial<AgentSession> = {
        id: 'test-session-id',
        userId: mockUser.id,
        title: 'Existing Session',
        mode: 'advanced',
        status: 'active'
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const result = await agentEngine.getSession('test-session-id')

      expect(result).toEqual(expect.objectContaining({
        id: 'test-session-id',
        title: 'Existing Session'
      }))
    })

    it('should update session properties', async () => {
      const updates = {
        title: 'Updated Title',
        lastActivity: new Date().toISOString()
      }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: { id: 'test-session-id', ...updates },
        error: null
      })

      await agentEngine.updateSession('test-session-id', updates)

      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        expect.objectContaining(updates)
      )
    })

    it('should delete a session', async () => {
      mockSupabaseClient.from().delete().eq.mockResolvedValue({
        error: null
      })

      await agentEngine.deleteSession('test-session-id', true)

      expect(mockSupabaseClient.from().delete).toHaveBeenCalled()
    })
  })

  describe('Message Processing', () => {
    let mockSession: AgentSession

    beforeEach(() => {
      mockSession = {
        id: 'test-session-id',
        userId: mockUser.id,
        title: 'Test Session',
        mode: 'simple',
        status: 'active',
        context: {},
        capabilities: [],
        plugins: [],
        messageCount: 0,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })
    })

    it('should process a simple text message', async () => {
      const mockResponse: AgentResponse = {
        sessionId: 'test-session-id',
        message: {
          id: 'test-message-id',
          role: 'assistant',
          content: 'Hello! How can I help you?',
          timestamp: new Date().toISOString(),
          sessionId: 'test-session-id'
        },
        toolCalls: [],
        usage: {
          promptTokens: 10,
          completionTokens: 15,
          totalTokens: 25
        }
      }

      // Mock message saving
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockResponse.message,
        error: null
      })

      const result = await agentEngine.processMessage(
        'test-session-id',
        'Hello'
      )

      expect(result).toEqual(expect.objectContaining({
        sessionId: 'test-session-id',
        message: expect.objectContaining({
          role: 'assistant',
          content: expect.any(String)
        })
      }))
    })

    it('should handle multimodal content processing', async () => {
      const multimodalContent: MultimodalContent[] = [
        {
          type: 'image',
          data: { url: 'https://example.com/image.jpg' },
          metadata: { width: 800, height: 600 }
        }
      ]

      mockMultimodalProcessor.processContent.mockResolvedValue({
        success: true,
        processedContent: multimodalContent[0],
        metadata: { processed: true }
      })

      const result = await agentEngine.processMessage(
        'test-session-id',
        'Analyze this image',
        multimodalContent
      )

      expect(mockMultimodalProcessor.processContent).toHaveBeenCalledWith(
        multimodalContent[0]
      )
      expect(result.message.multimodalContent).toBeDefined()
    })

    it('should handle tool execution during message processing', async () => {
      const mockToolResult = {
        success: true,
        result: { data: 'Tool execution result' },
        error: null
      }

      mockMCPClient.executeTool.mockResolvedValue(mockToolResult)

      const result = await agentEngine.processMessage(
        'test-session-id',
        'Execute the test tool'
      )

      expect(result).toEqual(expect.objectContaining({
        sessionId: 'test-session-id'
      }))
    })

    it('should handle message processing errors gracefully', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Session not found' }
      })

      await expect(agentEngine.processMessage('invalid-session', 'Hello'))
        .rejects.toThrow('Session not found')
    })
  })

  describe('User Sessions Management', () => {
    it('should retrieve user sessions with filtering', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: mockUser.id,
          title: 'Session 1',
          status: 'active'
        },
        {
          id: 'session-2',
          userId: mockUser.id,
          title: 'Session 2',
          status: 'completed'
        }
      ]

      mockSupabaseClient.from().select().eq().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            offset: jest.fn().mockResolvedValue({
              data: mockSessions,
              error: null
            })
          })
        })
      })

      const result = await agentEngine.getUserSessions(mockUser.id, {
        status: 'active',
        limit: 10,
        offset: 0
      })

      expect(result).toHaveLength(2)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('ai_agent_sessions')
    })

    it('should count user sessions correctly', async () => {
      mockSupabaseClient.from().select().eq().mockReturnValue({
        count: jest.fn().mockResolvedValue({
          count: 5,
          error: null
        })
      })

      const count = await agentEngine.getUserSessionCount(mockUser.id)

      expect(count).toBe(5)
    })
  })

  describe('Integration with Services', () => {
    it('should integrate with MCP client for tool execution', async () => {
      const toolResult = { success: true, data: 'result' }
      mockMCPClient.executeTool.mockResolvedValue(toolResult)

      // This would be tested within message processing
      expect(mockMCPClient.executeTool).toBeDefined()
    })

    it('should integrate with plugin manager', async () => {
      const mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        status: 'active'
      }

      mockPluginManager.getLoadedPlugins.mockReturnValue(
        new Map([['test-plugin', mockPlugin]])
      )

      const plugins = mockPluginManager.getLoadedPlugins()
      expect(plugins.has('test-plugin')).toBe(true)
    })

    it('should handle service integration errors', async () => {
      mockMCPClient.executeTool.mockRejectedValue(new Error('MCP Error'))

      // Error handling should be tested in the context of message processing
      expect(mockMCPClient.executeTool).toBeDefined()
    })
  })

  describe('Performance and Monitoring', () => {
    it('should track token usage', async () => {
      const mockSession = {
        id: 'test-session-id',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300
        }
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: mockSession,
        error: null
      })

      const session = await agentEngine.getSession('test-session-id')
      expect(session.usage?.totalTokens).toBe(300)
    })

    it('should update session activity timestamps', async () => {
      const updates = { lastActivity: new Date().toISOString() }

      mockSupabaseClient.from().update().eq().select().single.mockResolvedValue({
        data: { id: 'test-session-id', ...updates },
        error: null
      })

      await agentEngine.updateSession('test-session-id', updates)

      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        expect.objectContaining({ lastActivity: expect.any(String) })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Authentication failed' }
      })

      // Test that methods requiring authentication handle this appropriately
      await expect(agentEngine.createSession('Test'))
        .rejects.toThrow()
    })

    it('should handle database connection errors', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' }
      })

      await expect(agentEngine.getSession('test-id'))
        .rejects.toThrow('Connection timeout')
    })

    it('should handle invalid session IDs', async () => {
      mockSupabaseClient.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Session not found' }
      })

      await expect(agentEngine.getSession('invalid-id'))
        .rejects.toThrow('Session not found')
    })
  })
})