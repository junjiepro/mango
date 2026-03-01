/**
 * MiniAppMCPClient Unit Tests
 * 测试 MiniApp MCP 客户端的核心功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MiniAppMCPClient } from '@/services/MiniAppMCPClient'

// Mock fetch API
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('MiniAppMCPClient', () => {
  let client: MiniAppMCPClient
  const miniAppId = 'test-miniapp-123'
  const authToken = 'test-auth-token'

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    client = new MiniAppMCPClient(miniAppId, authToken)
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('initialize', () => {
    it('应该成功初始化连接并返回协议信息', async () => {
      const mockResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'miniapp-mcp', version: '1.0.0' },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.initialize()

      expect(result.protocolVersion).toBe('2024-11-05')
      expect(result.serverInfo.name).toBe('miniapp-mcp')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/miniapp-mcp/mcp/'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          }),
        })
      )
    })

    it('应该在服务器返回错误时抛出异常', async () => {
      const mockResponse = {
        jsonrpc: '2.0',
        id: 1,
        error: { code: -32600, message: 'Invalid Request' },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await expect(client.initialize()).rejects.toThrow('Invalid Request')
    })
  })

  describe('listTools', () => {
    it('应该返回工具定义列表', async () => {
      const mockTools = [
        {
          name: 'add_todo',
          description: '添加待办事项',
          inputSchema: { type: 'object', properties: { title: { type: 'string' } } },
        },
        {
          name: 'list_todos',
          description: '列出待办事项',
          inputSchema: { type: 'object', properties: {} },
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { tools: mockTools },
        }),
      })

      const result = await client.listTools()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('add_todo')
      expect(result[1].name).toBe('list_todos')
    })

    it('应该在没有工具时返回空数组', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { tools: [] },
        }),
      })

      const result = await client.listTools()
      expect(result).toEqual([])
    })
  })

  describe('callTool', () => {
    it('应该正确传递工具名称和参数', async () => {
      const mockResult = { success: true, todoId: 'todo-123' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: mockResult,
        }),
      })

      const result = await client.callTool('add_todo', { title: '测试任务' })

      expect(result).toEqual(mockResult)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"method":"tools/call"'),
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.params.name).toBe('add_todo')
      expect(callBody.params.arguments).toEqual({ title: '测试任务' })
    })

    it('应该在工具调用失败时抛出错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32602, message: 'Invalid params' },
        }),
      })

      await expect(
        client.callTool('invalid_tool', {})
      ).rejects.toThrow('Invalid params')
    })
  })

  describe('readResource', () => {
    it('应该正确读取 UI 资源', async () => {
      const mockUIContent = {
        type: 'container',
        children: [{ type: 'text', content: 'Hello' }],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: {
            contents: [{ text: JSON.stringify(mockUIContent) }],
          },
        }),
      })

      const result = await client.readResource('ui://mango/main')

      expect(result).toEqual({
        text: JSON.stringify(mockUIContent),
        mimeType: 'application/json',
        _meta: undefined,
      })
    })

    it('应该在资源不存在时返回 null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { contents: [] },
        }),
      })

      const result = await client.readResource('ui://mango/nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('findHtmlResource', () => {
    it('应该从资源列表中找到 HTML 资源', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: {
            resources: [
              { uri: 'ui://mango/main', name: 'Main UI', mimeType: 'text/html' },
            ],
          },
        }),
      })

      const result = await client.findHtmlResource()
      expect(result).toEqual({
        uri: 'ui://mango/main',
        name: 'Main UI',
        mimeType: 'text/html',
      })
    })

    it('应该在没有 HTML 资源时返回 null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { resources: [] },
        }),
      })

      const result = await client.findHtmlResource()
      expect(result).toBeNull()
    })
  })

  describe('readMainUI', () => {
    it('应该通过资源发现读取主界面 HTML', async () => {
      const mockHtml = '<!DOCTYPE html><html><body>Hello</body></html>'

      // 第一次 fetch: listResources (findHtmlResource)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: {
            resources: [
              { uri: 'ui://myapp/main', name: 'Main UI', mimeType: 'text/html' },
            ],
          },
        }),
      })

      // 第二次 fetch: readResource
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 2,
          result: {
            contents: [{ text: mockHtml, mimeType: 'text/html' }],
          },
        }),
      })

      const result = await client.readMainUI()
      expect(result).toEqual({
        text: mockHtml,
        mimeType: 'text/html',
        _meta: undefined,
      })
    })

    it('应该在无 HTML 资源时回退到默认 URI', async () => {
      const mockHtml = '<!DOCTYPE html><html><body>Fallback</body></html>'

      // 第一次 fetch: listResources (无 HTML 资源)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 1,
          result: { resources: [] },
        }),
      })

      // 第二次 fetch: readResource (回退到默认 URI)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: '2.0',
          id: 2,
          result: {
            contents: [{ text: mockHtml, mimeType: 'text/html' }],
          },
        }),
      })

      const result = await client.readMainUI()
      expect(result).toEqual({
        text: mockHtml,
        mimeType: 'text/html',
        _meta: undefined,
      })
    })
  })

  describe('网络错误处理', () => {
    it('应该在网络请求失败时抛出错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      })

      await expect(client.initialize()).rejects.toThrow('MCP request failed')
    })

    it('应该在 fetch 抛出异常时传播错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(client.initialize()).rejects.toThrow('Network error')
    })
  })

  describe('getMainUri', () => {
    it('应该返回统一的 UI Resource URI', () => {
      expect(client.getMainUri()).toBe('ui://mango/main')
    })
  })
})
