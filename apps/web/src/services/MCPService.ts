/**
 * MCP Service
 * Manages MCP tool invocation and server connections
 */

import { createMCPClient, MCPClient, Tool, CallToolResult } from '@mango/protocols/mcp';
import { globalToolRegistry } from '@mango/protocols/mcp';

export interface MCPServiceConfig {
  serverUrl: string;
  clientName: string;
  clientVersion: string;
  headers?: Record<string, string>;
}

export interface ToolInvocationResult {
  success: boolean;
  content?: CallToolResult['content'];
  error?: string;
  duration?: number;
}

/**
 * MCP Service for managing tool invocations
 */
export class MCPService {
  private clients = new Map<string, MCPClient>();
  private config: MCPServiceConfig;

  constructor(config: MCPServiceConfig) {
    this.config = config;
  }

  /**
   * Initialize connection to MCP server
   */
  async connect(serverUrl?: string): Promise<void> {
    const url = serverUrl || this.config.serverUrl;

    if (this.clients.has(url)) {
      const client = this.clients.get(url)!;
      if (client.isConnected()) {
        return; // Already connected
      }
    }

    const client = createMCPClient({
      serverUrl: url,
      headers: this.config.headers,
      clientInfo: {
        name: this.config.clientName,
        version: this.config.clientVersion,
      },
      capabilities: {
        tools: {
          listChanged: true,
        },
      },
    });

    try {
      await client.connect();
      this.clients.set(url, client);

      // Load available tools
      await this.refreshTools(url);

      console.log(`Connected to MCP server: ${url}`);
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MCP server
   */
  async disconnect(serverUrl?: string): Promise<void> {
    const url = serverUrl || this.config.serverUrl;
    const client = this.clients.get(url);

    if (client) {
      await client.disconnect();
      this.clients.delete(url);
    }
  }

  /**
   * Disconnect all clients
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.clients.values()).map((client) =>
      client.disconnect()
    );
    await Promise.all(disconnectPromises);
    this.clients.clear();
  }

  /**
   * Refresh tools from server
   */
  private async refreshTools(serverUrl: string): Promise<void> {
    const client = this.clients.get(serverUrl);
    if (!client || !client.isConnected()) {
      throw new Error('Client not connected');
    }

    let cursor: string | undefined;
    const allTools: Tool[] = [];

    // Paginate through all tools
    do {
      const response = await client.listTools(cursor);
      allTools.push(...response.tools);
      cursor = response.nextCursor;
    } while (cursor);

    // Register tools in global registry
    for (const tool of allTools) {
      globalToolRegistry.register(tool, {
        serverUrl,
        enabled: true,
      });
    }

    console.log(`Loaded ${allTools.length} tools from ${serverUrl}`);
  }

  /**
   * List all available tools
   */
  listTools(filter?: {
    enabled?: boolean;
    category?: string;
    serverUrl?: string;
  }): Tool[] {
    const entries = globalToolRegistry.list(filter);
    return entries.map((entry) => entry.tool);
  }

  /**
   * Get a specific tool
   */
  getTool(name: string): Tool | undefined {
    const entry = globalToolRegistry.get(name);
    return entry?.tool;
  }

  /**
   * Invoke a tool
   */
  async invokeTool(
    toolName: string,
    args: Record<string, any>
  ): Promise<ToolInvocationResult> {
    const startTime = Date.now();

    try {
      // Get tool from registry
      const entry = globalToolRegistry.get(toolName);
      if (!entry) {
        return {
          success: false,
          error: `Tool not found: ${toolName}`,
        };
      }

      if (!entry.enabled) {
        return {
          success: false,
          error: `Tool is disabled: ${toolName}`,
        };
      }

      // Get client for this tool's server
      const serverUrl = entry.serverUrl || this.config.serverUrl;
      const client = this.clients.get(serverUrl);

      if (!client || !client.isConnected()) {
        return {
          success: false,
          error: `Not connected to server: ${serverUrl}`,
        };
      }

      // Validate arguments against tool schema
      const validationError = this.validateArguments(entry.tool, args);
      if (validationError) {
        return {
          success: false,
          error: validationError,
        };
      }

      // Invoke tool
      const response = await client.callTool(toolName, args);

      // Record usage
      globalToolRegistry.recordUsage(toolName);

      const duration = Date.now() - startTime;

      if (response.isError) {
        return {
          success: false,
          content: response.content,
          error: 'Tool execution failed',
          duration,
        };
      }

      return {
        success: true,
        content: response.content,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      };
    }
  }

  /**
   * Validate tool arguments against schema
   */
  private validateArguments(tool: Tool, args: Record<string, any>): string | null {
    const schema = tool.inputSchema;

    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in args)) {
          return `Missing required argument: ${field}`;
        }
      }
    }

    // Basic type checking
    for (const [key, value] of Object.entries(args)) {
      const paramSchema = schema.properties[key];
      if (!paramSchema) {
        return `Unknown argument: ${key}`;
      }

      const expectedType = paramSchema.type;
      const actualType = Array.isArray(value) ? 'array' : typeof value;

      if (expectedType === 'number' && actualType !== 'number') {
        return `Argument '${key}' must be a number`;
      }
      if (expectedType === 'string' && actualType !== 'string') {
        return `Argument '${key}' must be a string`;
      }
      if (expectedType === 'boolean' && actualType !== 'boolean') {
        return `Argument '${key}' must be a boolean`;
      }
      if (expectedType === 'array' && !Array.isArray(value)) {
        return `Argument '${key}' must be an array`;
      }
      if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(value))) {
        return `Argument '${key}' must be an object`;
      }
    }

    return null;
  }

  /**
   * Search tools
   */
  searchTools(query: string): Tool[] {
    const entries = globalToolRegistry.search(query);
    return entries.map((entry) => entry.tool);
  }

  /**
   * Get connection status
   */
  isConnected(serverUrl?: string): boolean {
    const url = serverUrl || this.config.serverUrl;
    const client = this.clients.get(url);
    return client?.isConnected() || false;
  }

  /**
   * Get server info
   */
  getServerInfo(serverUrl?: string) {
    const url = serverUrl || this.config.serverUrl;
    const client = this.clients.get(url);
    return client?.getServerInfo();
  }

  /**
   * Get server capabilities
   */
  getServerCapabilities(serverUrl?: string) {
    const url = serverUrl || this.config.serverUrl;
    const client = this.clients.get(url);
    return client?.getServerCapabilities();
  }
}

/**
 * Create singleton MCP service instance
 */
let mcpServiceInstance: MCPService | null = null;

export function getMCPService(config?: MCPServiceConfig): MCPService {
  if (!mcpServiceInstance) {
    if (!config) {
      throw new Error('MCPService not initialized. Provide config on first call.');
    }
    mcpServiceInstance = new MCPService(config);
  }
  return mcpServiceInstance;
}

export function resetMCPService(): void {
  if (mcpServiceInstance) {
    mcpServiceInstance.disconnectAll();
    mcpServiceInstance = null;
  }
}
