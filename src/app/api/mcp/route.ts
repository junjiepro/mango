import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MCPClientService } from '@/lib/mcp/client'
import { PluginManagerService } from '@/lib/plugins/manager'
import type {
  MCPClientConfig,
  MCPServer,
  MCPToolSchema,
  MCPPlugin,
  PluginConfig
} from '@/types/ai-agent'

// Initialize services
const mcpClient = new MCPClientService()
const pluginManager = new PluginManagerService()

// GET /api/mcp - List MCP servers and plugins
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'servers': {
        // List connected MCP servers
        const connectedServers = mcpClient.getConnectedServers()
        const serverDetails = await Promise.all(
          connectedServers.map(async (server) => {
            try {
              const tools = await mcpClient.listTools(server.id)
              const resources = await mcpClient.listResources(server.id)

              return {
                id: server.id,
                name: server.config.name,
                type: server.config.type,
                status: server.status,
                capabilities: server.capabilities,
                tools: tools.map(tool => ({
                  name: tool.name,
                  description: tool.description,
                  inputSchema: tool.inputSchema
                })),
                resources: resources.map(resource => ({
                  uri: resource.uri,
                  name: resource.name,
                  mimeType: resource.mimeType
                })),
                lastActivity: server.lastActivity,
                errorCount: server.errorCount
              }
            } catch (error) {
              console.error(`Error getting details for server ${server.id}:`, error)
              return {
                id: server.id,
                name: server.config.name,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          })
        )

        return NextResponse.json({
          success: true,
          servers: serverDetails,
          totalCount: serverDetails.length
        })
      }

      case 'plugins': {
        // List loaded MCP plugins
        const loadedPlugins = pluginManager.getLoadedPlugins()
        const pluginDetails = Array.from(loadedPlugins.entries()).map(([id, plugin]) => ({
          id,
          name: plugin.name,
          version: plugin.version,
          type: plugin.type,
          status: plugin.status,
          capabilities: plugin.capabilities,
          description: plugin.description,
          author: plugin.author,
          lastActivity: plugin.lastActivity,
          errorCount: plugin.errorCount || 0
        }))

        return NextResponse.json({
          success: true,
          plugins: pluginDetails,
          totalCount: pluginDetails.length
        })
      }

      case 'available': {
        // List available MCP plugins for installation
        const availablePlugins = await mcpClient.discoverPlugins()

        return NextResponse.json({
          success: true,
          available: availablePlugins,
          totalCount: availablePlugins.length
        })
      }

      default: {
        // Return overview of MCP system
        const connectedServers = mcpClient.getConnectedServers()
        const loadedPlugins = pluginManager.getLoadedPlugins()

        return NextResponse.json({
          success: true,
          overview: {
            connectedServers: connectedServers.length,
            loadedPlugins: loadedPlugins.size,
            systemStatus: mcpClient.getSystemStatus(),
            lastActivity: new Date().toISOString()
          }
        })
      }
    }

  } catch (error) {
    console.error('MCP API GET Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve MCP information',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/mcp - Register and configure MCP servers/plugins
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, config, pluginId, serverId } = body

    switch (action) {
      case 'connect_server': {
        // Connect to an MCP server
        const mcpConfig: MCPClientConfig = {
          id: config.id,
          name: config.name,
          type: config.type,
          transport: config.transport,
          capabilities: config.capabilities || [],
          retryConfig: config.retryConfig || {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000
          }
        }

        // Validate configuration
        if (!mcpConfig.id || !mcpConfig.name || !mcpConfig.transport) {
          return NextResponse.json(
            { error: 'Invalid MCP server configuration: missing required fields' },
            { status: 400 }
          )
        }

        const session = await mcpClient.connect(mcpConfig)

        return NextResponse.json({
          success: true,
          message: 'MCP server connected successfully',
          server: {
            id: session.id,
            name: session.config.name,
            status: session.status,
            capabilities: session.capabilities
          }
        })
      }

      case 'disconnect_server': {
        // Disconnect from an MCP server
        if (!serverId) {
          return NextResponse.json(
            { error: 'Server ID is required' },
            { status: 400 }
          )
        }

        await mcpClient.disconnect(serverId)

        return NextResponse.json({
          success: true,
          message: 'MCP server disconnected successfully'
        })
      }

      case 'install_plugin': {
        // Install an MCP plugin
        if (!pluginId && !config) {
          return NextResponse.json(
            { error: 'Plugin ID or configuration is required' },
            { status: 400 }
          )
        }

        let pluginConfig: PluginConfig

        if (pluginId) {
          // Install by plugin ID
          pluginConfig = await mcpClient.getPluginConfig(pluginId)
        } else {
          // Install with custom configuration
          pluginConfig = config
        }

        // Validate plugin configuration
        if (!pluginConfig.id || !pluginConfig.name) {
          return NextResponse.json(
            { error: 'Invalid plugin configuration' },
            { status: 400 }
          )
        }

        // Create MCP plugin instance
        const mcpPlugin: MCPPlugin = {
          id: pluginConfig.id,
          name: pluginConfig.name,
          version: pluginConfig.version || '1.0.0',
          type: 'mcp',
          status: 'loading',
          description: pluginConfig.description || '',
          author: pluginConfig.author || 'Unknown',
          capabilities: pluginConfig.capabilities || [],
          mcpConfig: pluginConfig.mcpConfig,
          toolSchemas: pluginConfig.toolSchemas || [],
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        }

        await pluginManager.register(mcpPlugin)
        await pluginManager.load(mcpPlugin.id)

        return NextResponse.json({
          success: true,
          message: 'MCP plugin installed successfully',
          plugin: {
            id: mcpPlugin.id,
            name: mcpPlugin.name,
            status: mcpPlugin.status
          }
        })
      }

      case 'uninstall_plugin': {
        // Uninstall an MCP plugin
        if (!pluginId) {
          return NextResponse.json(
            { error: 'Plugin ID is required' },
            { status: 400 }
          )
        }

        await pluginManager.unload(pluginId)
        await pluginManager.unregister(pluginId)

        return NextResponse.json({
          success: true,
          message: 'MCP plugin uninstalled successfully'
        })
      }

      case 'update_config': {
        // Update MCP server or plugin configuration
        if (!serverId && !pluginId) {
          return NextResponse.json(
            { error: 'Server ID or Plugin ID is required' },
            { status: 400 }
          )
        }

        if (serverId) {
          // Update server configuration
          await mcpClient.updateServerConfig(serverId, config)

          return NextResponse.json({
            success: true,
            message: 'MCP server configuration updated successfully'
          })
        } else {
          // Update plugin configuration
          await pluginManager.updatePluginConfig(pluginId, config)

          return NextResponse.json({
            success: true,
            message: 'MCP plugin configuration updated successfully'
          })
        }
      }

      case 'test_connection': {
        // Test MCP server connection
        if (!config) {
          return NextResponse.json(
            { error: 'Server configuration is required for testing' },
            { status: 400 }
          )
        }

        try {
          const testResult = await mcpClient.testConnection(config)

          return NextResponse.json({
            success: true,
            message: 'Connection test completed',
            result: testResult
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            message: 'Connection test failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      case 'discover_tools': {
        // Discover tools from an MCP server
        if (!serverId) {
          return NextResponse.json(
            { error: 'Server ID is required' },
            { status: 400 }
          )
        }

        const tools = await mcpClient.listTools(serverId)
        const toolSchemas = await Promise.all(
          tools.map(async (tool) => {
            try {
              const schema = await mcpClient.getToolSchema(serverId, tool.name)
              return {
                name: tool.name,
                description: tool.description,
                inputSchema: schema,
                examples: tool.examples || []
              }
            } catch (error) {
              console.error(`Error getting schema for tool ${tool.name}:`, error)
              return {
                name: tool.name,
                description: tool.description,
                error: 'Schema unavailable'
              }
            }
          })
        )

        return NextResponse.json({
          success: true,
          tools: toolSchemas,
          totalCount: toolSchemas.length
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('MCP API POST Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'MCP operation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/mcp - Update MCP configurations
export async function PUT(request: NextRequest) {
  try {
    // Validate authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { serverId, pluginId, config, action } = body

    switch (action) {
      case 'reload_plugin': {
        // Reload an MCP plugin
        if (!pluginId) {
          return NextResponse.json(
            { error: 'Plugin ID is required' },
            { status: 400 }
          )
        }

        await pluginManager.unload(pluginId)
        await pluginManager.load(pluginId)

        return NextResponse.json({
          success: true,
          message: 'MCP plugin reloaded successfully'
        })
      }

      case 'restart_server': {
        // Restart MCP server connection
        if (!serverId) {
          return NextResponse.json(
            { error: 'Server ID is required' },
            { status: 400 }
          )
        }

        const serverConfig = await mcpClient.getServerConfig(serverId)
        await mcpClient.disconnect(serverId)
        await mcpClient.connect(serverConfig)

        return NextResponse.json({
          success: true,
          message: 'MCP server restarted successfully'
        })
      }

      case 'update_settings': {
        // Update global MCP settings
        if (config.globalSettings) {
          await mcpClient.updateGlobalSettings(config.globalSettings)
        }

        return NextResponse.json({
          success: true,
          message: 'MCP settings updated successfully'
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action specified' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('MCP API PUT Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'MCP update operation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/mcp - Remove MCP servers or plugins
export async function DELETE(request: NextRequest) {
  try {
    // Validate authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const serverId = searchParams.get('serverId')
    const pluginId = searchParams.get('pluginId')
    const force = searchParams.get('force') === 'true'

    if (serverId) {
      // Remove MCP server
      try {
        await mcpClient.disconnect(serverId)
        await mcpClient.removeServer(serverId)

        return NextResponse.json({
          success: true,
          message: 'MCP server removed successfully'
        })
      } catch (error) {
        if (force) {
          // Force removal even if disconnect fails
          await mcpClient.removeServer(serverId)
          return NextResponse.json({
            success: true,
            message: 'MCP server force removed'
          })
        }
        throw error
      }
    }

    if (pluginId) {
      // Remove MCP plugin
      try {
        await pluginManager.unload(pluginId)
        await pluginManager.unregister(pluginId)

        return NextResponse.json({
          success: true,
          message: 'MCP plugin removed successfully'
        })
      } catch (error) {
        if (force) {
          // Force removal even if unload fails
          await pluginManager.unregister(pluginId)
          return NextResponse.json({
            success: true,
            message: 'MCP plugin force removed'
          })
        }
        throw error
      }
    }

    return NextResponse.json(
      { error: 'Server ID or Plugin ID is required' },
      { status: 400 }
    )

  } catch (error) {
    console.error('MCP API DELETE Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'MCP removal operation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}