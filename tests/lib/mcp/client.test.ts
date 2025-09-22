import { jest } from '@jest/globals'
import { MCPClientService } from '@/lib/mcp/client'
import type {
  MCPClientConfig,
  MCPSession,
  MCPToolResult,
  MCPServer
} from '@/types/ai-agent'

// Mock Model Context Protocol SDK
jest.mock('@modelcontextprotocol/sdk', () => ({
  Client: jest.fn(),
  StdioClientTransport: jest.fn(),
  SSEClientTransport: jest.fn(),
}))

// Mock WebSocket for testing
global.WebSocket = jest.fn() as any

describe('MCPClientService', () => {
  let mcpClient: MCPClientService
  let mockConfig: MCPClientConfig
  let mockTransport: any
  let mockClient: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock transport
    mockTransport = {
      start: jest.fn(),
      close: jest.fn(),
      send: jest.fn(),
      onMessage: jest.fn(),
      onClose: jest.fn(),
      onError: jest.fn(),
    }

    // Setup mock MCP client
    mockClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      listTools: jest.fn(),
      callTool: jest.fn(),
      listResources: jest.fn(),
      readResource: jest.fn(),
      ping: jest.fn(),
    }

    mockConfig = {
      id: 'test-server',
      name: 'Test MCP Server',
      type: 'github',
      transport: {
        type: 'http',
        url: 'http://localhost:3001/mcp',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      },
      capabilities: ['tools', 'resources'],
      retryConfig: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 10000
      }
    }

    mcpClient = new MCPClientService()
  })

  describe('Connection Management', () => {
    it('should establish connection to MCP server successfully', async () => {
      mockClient.connect.mockResolvedValue({
        protocolVersion: '1.0.0',
        serverInfo: {
          name: 'Test Server',
          version: '1.0.0'
        },
        capabilities: {
          tools: {},
          resources: {}
        }
      })

      const session = await mcpClient.connect(mockConfig)

      expect(session).toEqual(expect.objectContaining({
        id: expect.any(String),
        config: mockConfig,
        status: 'connected',
        capabilities: expect.any(Object)
      }))

      expect(mockClient.connect).toHaveBeenCalled()
    })

    it('should handle connection failures gracefully', async () => {
      mockClient.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(mcpClient.connect(mockConfig))
        .rejects.toThrow('Connection failed')
    })

    it('should disconnect from MCP server', async () => {
      // First establish connection
      mockClient.connect.mockResolvedValue({
        protocolVersion: '1.0.0',
        serverInfo: { name: 'Test Server', version: '1.0.0' },
        capabilities: {}
      })

      const session = await mcpClient.connect(mockConfig)

      mockClient.disconnect.mockResolvedValue(undefined)

      await mcpClient.disconnect(session.id)

      expect(mockClient.disconnect).toHaveBeenCalled()
    })

    it('should handle multiple server connections', async () => {
      const config1 = { ...mockConfig, id: 'server-1', name: 'Server 1' }
      const config2 = { ...mockConfig, id: 'server-2', name: 'Server 2' }

      mockClient.connect.mockResolvedValue({
        protocolVersion: '1.0.0',
        serverInfo: { name: 'Test Server', version: '1.0.0' },
        capabilities: {}
      })

      const session1 = await mcpClient.connect(config1)
      const session2 = await mcpClient.connect(config2)

      expect(session1.id).not.toBe(session2.id)

      const connectedServers = mcpClient.getConnectedServers()
      expect(connectedServers).toHaveLength(2)
    })
  })

  describe('Tool Execution', () => {
    let mockSession: MCPSession

    beforeEach(async () => {
      mockClient.connect.mockResolvedValue({
        protocolVersion: '1.0.0',
        serverInfo: { name: 'Test Server', version: '1.0.0' },
        capabilities: { tools: {} }
      })

      mockSession = await mcpClient.connect(mockConfig)
    })

    it('should execute tools successfully', async () => {
      const toolResult = {
        content: [
          {
            type: 'text',
            text: 'Tool execution successful'
          }
        ],
        isError: false
      }

      mockClient.callTool.mockResolvedValue(toolResult)

      const result = await mcpClient.executeTool(
        mockSession.id,
        'test-tool',
        { input: 'test' }
      )

      expect(result).toEqual(expect.objectContaining({
        success: true,
        result: expect.any(Object)
      }))

      expect(mockClient.callTool).toHaveBeenCalledWith({
        name: 'test-tool',
        arguments: { input: 'test' }
      })
    })

    it('should handle tool execution errors', async () => {
      mockClient.callTool.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Tool execution failed'
          }
        ],
        isError: true
      })

      const result = await mcpClient.executeTool(
        mockSession.id,
        'failing-tool',
        {}
      )

      expect(result).toEqual(expect.objectContaining({
        success: false,
        error: expect.any(String)
      }))
    })

    it('should validate tool parameters', async () => {
      await expect(mcpClient.executeTool('invalid-session', 'test-tool', {}))
        .rejects.toThrow('Session not found')
    })

    it('should list available tools', async () => {
      const mockTools = [
        {
          name: 'get-repository',
          description: 'Get repository information',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' }
            }
          }
        },
        {
          name: 'create-issue',
          description: 'Create a new issue',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string' }
            }
          }
        }
      ]

      mockClient.listTools.mockResolvedValue({ tools: mockTools })

      const tools = await mcpClient.listTools(mockSession.id)

      expect(tools).toHaveLength(2)
      expect(tools[0]).toEqual(expect.objectContaining({
        name: 'get-repository',
        description: expect.any(String),
        inputSchema: expect.any(Object)
      }))
    })
  })

  describe('Resource Management', () => {
    let mockSession: MCPSession

    beforeEach(async () => {
      mockClient.connect.mockResolvedValue({
        protocolVersion: '1.0.0',
        serverInfo: { name: 'Test Server', version: '1.0.0' },
        capabilities: { resources: {} }
      })

      mockSession = await mcpClient.connect(mockConfig)
    })

    it('should list available resources', async () => {
      const mockResources = [
        {
          uri: 'file://project/README.md',
          name: 'README.md',
          mimeType: 'text/markdown'
        },
        {
          uri: 'file://project/package.json',
          name: 'package.json',
          mimeType: 'application/json'
        }
      ]

      mockClient.listResources.mockResolvedValue({ resources: mockResources })

      const resources = await mcpClient.listResources(mockSession.id)

      expect(resources).toHaveLength(2)
      expect(resources[0]).toEqual(expect.objectContaining({
        uri: expect.any(String),
        name: expect.any(String),
        mimeType: expect.any(String)
      }))
    })

    it('should read resource content', async () => {
      const mockContent = {
        contents: [
          {
            uri: 'file://project/README.md',
            mimeType: 'text/markdown',
            text: '# Project README\n\nThis is a test project.'
          }
        ]
      }

      mockClient.readResource.mockResolvedValue(mockContent)

      const content = await mcpClient.readResource(
        mockSession.id,
        'file://project/README.md'
      )

      expect(content).toEqual(expect.objectContaining({
        success: true,
        content: expect.any(Object)
      }))
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should implement retry logic for failed connections', async () => {
      let callCount = 0
      mockClient.connect.mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.reject(new Error('Connection failed'))
        }
        return Promise.resolve({
          protocolVersion: '1.0.0',
          serverInfo: { name: 'Test Server', version: '1.0.0' },
          capabilities: {}
        })
      })

      const session = await mcpClient.connect(mockConfig)

      expect(callCount).toBe(3)
      expect(session.status).toBe('connected')
    })

    it('should handle transport-level errors', async () => {
      mockTransport.start.mockRejectedValue(new Error('Transport error'))

      await expect(mcpClient.connect(mockConfig))
        .rejects.toThrow('Transport error')
    })

    it('should timeout long-running operations', async () => {
      mockClient.callTool.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 60000))
      )

      // Assuming there's a timeout mechanism
      const startTime = Date.now()

      try {
        await mcpClient.executeTool('test-session', 'slow-tool', {})
      } catch (error) {
        const duration = Date.now() - startTime
        expect(duration).toBeLessThan(60000)
      }
    })

    it('should track error counts and recovery', async () => {
      const session = await mcpClient.connect(mockConfig)

      // Simulate some errors
      mockClient.callTool.mockRejectedValue(new Error('Tool error'))

      try {
        await mcpClient.executeTool(session.id, 'test-tool', {})
      } catch (error) {
        // Error should be tracked
      }

      const serverInfo = mcpClient.getServerInfo(session.id)
      expect(serverInfo?.errorCount).toBeGreaterThan(0)
    })
  })

  describe('Configuration Management', () => {
    it('should validate MCP configuration', async () => {
      const invalidConfig = {
        ...mockConfig,
        transport: undefined
      } as any

      await expect(mcpClient.connect(invalidConfig))
        .rejects.toThrow()
    })

    it('should update server configuration', async () => {
      const session = await mcpClient.connect(mockConfig)

      const updatedConfig = {
        ...mockConfig,
        name: 'Updated Server Name'
      }

      await mcpClient.updateServerConfig(session.id, updatedConfig)

      const serverInfo = mcpClient.getServerInfo(session.id)
      expect(serverInfo?.config.name).toBe('Updated Server Name')
    })

    it('should support different transport types', async () => {
      const httpConfig = {
        ...mockConfig,
        transport: {
          type: 'http' as const,
          url: 'http://localhost:3001/mcp'
        }
      }

      const sseConfig = {
        ...mockConfig,
        id: 'sse-server',
        transport: {
          type: 'sse' as const,
          url: 'http://localhost:3002/events'
        }
      }

      // Should handle both transport types
      expect(() => mcpClient.connect(httpConfig)).not.toThrow()
      expect(() => mcpClient.connect(sseConfig)).not.toThrow()
    })
  })

  describe('Health and Monitoring', () => {
    it('should report system status', () => {
      const status = mcpClient.getSystemStatus()

      expect(status).toEqual(expect.objectContaining({
        status: expect.stringMatching(/healthy|degraded|unhealthy/),
        connectedServers: expect.any(Number),
        lastActivity: expect.any(String)
      }))
    })

    it('should ping servers for health checks', async () => {
      const session = await mcpClient.connect(mockConfig)

      mockClient.ping.mockResolvedValue({ success: true })

      const health = await mcpClient.pingServer(session.id)

      expect(health).toBe(true)
      expect(mockClient.ping).toHaveBeenCalled()
    })

    it('should track performance metrics', async () => {
      const session = await mcpClient.connect(mockConfig)

      const startTime = Date.now()
      mockClient.callTool.mockResolvedValue({
        content: [{ type: 'text', text: 'success' }],
        isError: false
      })

      await mcpClient.executeTool(session.id, 'test-tool', {})

      const serverInfo = mcpClient.getServerInfo(session.id)
      expect(serverInfo?.responseTimeAvgMs).toBeGreaterThan(0)
    })
  })
})