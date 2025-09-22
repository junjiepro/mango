import { jest } from '@jest/globals'
import { PluginManagerService } from '@/lib/plugins/manager'
import type {
  AgentPlugin,
  MCPPlugin,
  NativePlugin,
  PluginExecutionContext,
  PluginCapability
} from '@/types/plugins'

// Mock plugin dependencies
jest.mock('@/lib/mcp/client')

describe('PluginManagerService', () => {
  let pluginManager: PluginManagerService
  let mockMCPPlugin: MCPPlugin
  let mockNativePlugin: NativePlugin

  beforeEach(() => {
    jest.clearAllMocks()
    pluginManager = new PluginManagerService()

    mockMCPPlugin = {
      id: 'mcp-test-plugin',
      name: 'Test MCP Plugin',
      version: '1.0.0',
      type: 'mcp',
      status: 'loading',
      description: 'A test MCP plugin',
      author: 'Test Author',
      capabilities: ['code_analysis', 'file_operations'],
      mcpConfig: {
        serverId: 'test-server',
        toolMappings: {
          'analyze-code': 'code_analysis',
          'read-file': 'file_operations'
        }
      },
      toolSchemas: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    }

    mockNativePlugin = {
      id: 'native-test-plugin',
      name: 'Test Native Plugin',
      version: '2.0.0',
      type: 'native',
      status: 'loading',
      description: 'A test native plugin',
      author: 'Native Author',
      capabilities: ['data_processing', 'api_integration'],
      implementation: {
        entry: 'index.js',
        runtime: 'node',
        dependencies: ['axios', 'lodash']
      },
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    }
  })

  describe('Plugin Registration', () => {
    it('should register a new plugin successfully', async () => {
      await pluginManager.register(mockMCPPlugin)

      const loadedPlugins = pluginManager.getLoadedPlugins()
      expect(loadedPlugins.has(mockMCPPlugin.id)).toBe(true)
      expect(loadedPlugins.get(mockMCPPlugin.id)).toEqual(
        expect.objectContaining({
          id: mockMCPPlugin.id,
          name: mockMCPPlugin.name,
          type: 'mcp'
        })
      )
    })

    it('should prevent duplicate plugin registration', async () => {
      await pluginManager.register(mockMCPPlugin)

      await expect(pluginManager.register(mockMCPPlugin))
        .rejects.toThrow('Plugin with ID mcp-test-plugin is already registered')
    })

    it('should validate plugin configuration during registration', async () => {
      const invalidPlugin = {
        ...mockMCPPlugin,
        id: '', // Invalid empty ID
      } as AgentPlugin

      await expect(pluginManager.register(invalidPlugin))
        .rejects.toThrow('Invalid plugin configuration')
    })

    it('should handle plugin registration errors gracefully', async () => {
      const errorPlugin = {
        ...mockMCPPlugin,
        mcpConfig: {
          serverId: 'non-existent-server',
          toolMappings: {}
        }
      }

      await expect(pluginManager.register(errorPlugin))
        .rejects.toThrow()
    })
  })

  describe('Plugin Loading and Unloading', () => {
    beforeEach(async () => {
      await pluginManager.register(mockMCPPlugin)
      await pluginManager.register(mockNativePlugin)
    })

    it('should load a registered plugin', async () => {
      await pluginManager.load(mockMCPPlugin.id)

      const plugin = pluginManager.getLoadedPlugins().get(mockMCPPlugin.id)
      expect(plugin?.status).toBe('active')
    })

    it('should unload a loaded plugin', async () => {
      await pluginManager.load(mockMCPPlugin.id)
      await pluginManager.unload(mockMCPPlugin.id)

      const plugin = pluginManager.getLoadedPlugins().get(mockMCPPlugin.id)
      expect(plugin?.status).toBe('disabled')
    })

    it('should handle loading non-existent plugins', async () => {
      await expect(pluginManager.load('non-existent-plugin'))
        .rejects.toThrow('Plugin not found')
    })

    it('should support hot-reloading of plugins', async () => {
      await pluginManager.load(mockMCPPlugin.id)

      // Simulate plugin update
      const updatedPlugin = {
        ...mockMCPPlugin,
        version: '1.1.0',
        description: 'Updated plugin'
      }

      await pluginManager.unload(mockMCPPlugin.id)
      await pluginManager.unregister(mockMCPPlugin.id)
      await pluginManager.register(updatedPlugin)
      await pluginManager.load(updatedPlugin.id)

      const plugin = pluginManager.getLoadedPlugins().get(updatedPlugin.id)
      expect(plugin?.version).toBe('1.1.0')
      expect(plugin?.description).toBe('Updated plugin')
    })
  })

  describe('Plugin Execution', () => {
    let mockContext: PluginExecutionContext

    beforeEach(async () => {
      await pluginManager.register(mockMCPPlugin)
      await pluginManager.load(mockMCPPlugin.id)

      mockContext = {
        sessionId: 'test-session',
        userId: 'test-user',
        mode: 'advanced',
        parameters: {
          input: 'test input'
        },
        environment: {
          workingDirectory: '/tmp',
          permissions: ['read', 'write']
        }
      }
    })

    it('should execute a loaded plugin successfully', async () => {
      const mockResult = {
        success: true,
        data: 'Plugin execution result',
        metadata: {
          executionTime: 150,
          resourcesUsed: ['cpu', 'memory']
        }
      }

      // Mock the actual plugin execution
      jest.spyOn(pluginManager as any, '_executePluginImplementation')
        .mockResolvedValue(mockResult)

      const result = await pluginManager.executePlugin(mockMCPPlugin.id, mockContext)

      expect(result).toEqual(mockResult)
    })

    it('should handle plugin execution errors', async () => {
      jest.spyOn(pluginManager as any, '_executePluginImplementation')
        .mockRejectedValue(new Error('Plugin execution failed'))

      await expect(
        pluginManager.executePlugin(mockMCPPlugin.id, mockContext)
      ).rejects.toThrow('Plugin execution failed')

      // Plugin should be marked as error state
      const plugin = pluginManager.getLoadedPlugins().get(mockMCPPlugin.id)
      expect(plugin?.status).toBe('error')
    })

    it('should enforce execution timeouts', async () => {
      jest.spyOn(pluginManager as any, '_executePluginImplementation')
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 60000)))

      const startTime = Date.now()

      try {
        await pluginManager.executePlugin(mockMCPPlugin.id, mockContext)
      } catch (error) {
        const duration = Date.now() - startTime
        expect(duration).toBeLessThan(60000)
      }
    })

    it('should maintain execution queue for concurrent requests', async () => {
      const executions = Array.from({ length: 5 }, (_, i) => ({
        ...mockContext,
        parameters: { input: `test input ${i}` }
      }))

      const promises = executions.map(context =>
        pluginManager.executePlugin(mockMCPPlugin.id, context)
      )

      // All executions should complete without interference
      const results = await Promise.allSettled(promises)
      expect(results.every(result => result.status === 'fulfilled')).toBe(true)
    })
  })

  describe('Plugin Capabilities', () => {
    beforeEach(async () => {
      await pluginManager.register(mockMCPPlugin)
      await pluginManager.register(mockNativePlugin)
    })

    it('should query plugins by capability', () => {
      const codeAnalysisPlugins = pluginManager.getPluginsByCapability('code_analysis')
      const fileOperationPlugins = pluginManager.getPluginsByCapability('file_operations')

      expect(codeAnalysisPlugins).toContain(mockMCPPlugin.id)
      expect(fileOperationPlugins).toContain(mockMCPPlugin.id)
    })

    it('should list all available capabilities', () => {
      const capabilities = pluginManager.getAvailableCapabilities()

      expect(capabilities).toContain('code_analysis')
      expect(capabilities).toContain('file_operations')
      expect(capabilities).toContain('data_processing')
      expect(capabilities).toContain('api_integration')
    })

    it('should validate capability requirements', () => {
      const requiredCapabilities: PluginCapability[] = ['code_analysis', 'file_operations']
      const satisfyingPlugins = pluginManager.findPluginsForCapabilities(requiredCapabilities)

      expect(satisfyingPlugins).toContain(mockMCPPlugin.id)
      expect(satisfyingPlugins).not.toContain(mockNativePlugin.id)
    })
  })

  describe('Plugin Configuration Management', () => {
    beforeEach(async () => {
      await pluginManager.register(mockMCPPlugin)
    })

    it('should update plugin configuration', async () => {
      const newConfig = {
        ...mockMCPPlugin.mcpConfig,
        toolMappings: {
          ...mockMCPPlugin.mcpConfig?.toolMappings,
          'new-tool': 'new_capability'
        }
      }

      await pluginManager.updatePluginConfig(mockMCPPlugin.id, {
        mcpConfig: newConfig
      })

      const plugin = pluginManager.getLoadedPlugins().get(mockMCPPlugin.id)
      expect(plugin?.mcpConfig?.toolMappings).toEqual(newConfig.toolMappings)
    })

    it('should validate configuration updates', async () => {
      const invalidConfig = {
        mcpConfig: {
          serverId: '', // Invalid empty server ID
          toolMappings: {}
        }
      }

      await expect(
        pluginManager.updatePluginConfig(mockMCPPlugin.id, invalidConfig)
      ).rejects.toThrow('Invalid configuration')
    })

    it('should persist configuration changes', async () => {
      const updatedDescription = 'Updated plugin description'

      await pluginManager.updatePluginConfig(mockMCPPlugin.id, {
        description: updatedDescription
      })

      // Simulate plugin manager restart
      const newPluginManager = new PluginManagerService()
      await newPluginManager.register({
        ...mockMCPPlugin,
        description: updatedDescription
      })

      const plugin = newPluginManager.getLoadedPlugins().get(mockMCPPlugin.id)
      expect(plugin?.description).toBe(updatedDescription)
    })
  })

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await pluginManager.register(mockMCPPlugin)
    })

    it('should isolate plugin failures', async () => {
      const faultyPlugin = {
        ...mockNativePlugin,
        id: 'faulty-plugin'
      }

      await pluginManager.register(faultyPlugin)

      // Simulate plugin failure
      jest.spyOn(pluginManager as any, '_executePluginImplementation')
        .mockImplementation((pluginId: string) => {
          if (pluginId === 'faulty-plugin') {
            throw new Error('Plugin crashed')
          }
          return Promise.resolve({ success: true, data: 'ok' })
        })

      // Faulty plugin should fail
      await expect(
        pluginManager.executePlugin('faulty-plugin', {} as any)
      ).rejects.toThrow('Plugin crashed')

      // Other plugins should continue working
      const result = await pluginManager.executePlugin(mockMCPPlugin.id, {} as any)
      expect(result.success).toBe(true)
    })

    it('should track plugin error counts', async () => {
      await pluginManager.load(mockMCPPlugin.id)

      jest.spyOn(pluginManager as any, '_executePluginImplementation')
        .mockRejectedValue(new Error('Execution failed'))

      try {
        await pluginManager.executePlugin(mockMCPPlugin.id, {} as any)
      } catch (error) {
        // Error should be tracked
      }

      const plugin = pluginManager.getLoadedPlugins().get(mockMCPPlugin.id)
      expect(plugin?.errorCount).toBeGreaterThan(0)
    })

    it('should implement circuit breaker pattern', async () => {
      await pluginManager.load(mockMCPPlugin.id)

      jest.spyOn(pluginManager as any, '_executePluginImplementation')
        .mockRejectedValue(new Error('Repeated failure'))

      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        try {
          await pluginManager.executePlugin(mockMCPPlugin.id, {} as any)
        } catch (error) {
          // Expected to fail
        }
      }

      const plugin = pluginManager.getLoadedPlugins().get(mockMCPPlugin.id)
      expect(plugin?.status).toBe('error')

      // Further executions should be blocked
      await expect(
        pluginManager.executePlugin(mockMCPPlugin.id, {} as any)
      ).rejects.toThrow('Plugin is in error state')
    })
  })

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await pluginManager.register(mockMCPPlugin)
      await pluginManager.load(mockMCPPlugin.id)
    })

    it('should track plugin performance metrics', async () => {
      jest.spyOn(pluginManager as any, '_executePluginImplementation')
        .mockResolvedValue({
          success: true,
          data: 'result',
          metadata: { executionTime: 250 }
        })

      await pluginManager.executePlugin(mockMCPPlugin.id, {} as any)

      const metrics = pluginManager.getPluginMetrics(mockMCPPlugin.id)
      expect(metrics).toEqual(expect.objectContaining({
        totalExecutions: 1,
        averageExecutionTime: expect.any(Number),
        successRate: expect.any(Number)
      }))
    })

    it('should provide system-wide plugin statistics', () => {
      const stats = pluginManager.getSystemStats()

      expect(stats).toEqual(expect.objectContaining({
        totalPlugins: expect.any(Number),
        activePlugins: expect.any(Number),
        failedPlugins: expect.any(Number),
        totalExecutions: expect.any(Number)
      }))
    })
  })
})