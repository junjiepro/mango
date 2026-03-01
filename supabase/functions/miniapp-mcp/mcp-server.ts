/**
 * MiniApp MCP Server
 * 基于 @modelcontextprotocol/sdk 的标准 MCP Server 实现
 */

import type { MiniApp, MiniAppSandboxContext, UIResourceContent } from './types.ts';

// MCP Protocol Types
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

// Tool Definition
export interface ToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  _meta?: {
    ui?: {
      resourceUri?: string;
    };
  };
}

// Resource Definition
export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Tool Result
export interface ToolResult {
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
  structuredContent?: unknown;
}

// Resource Content
export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
}

// Handler Types
type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>;
type ResourceHandler = () => Promise<ResourceContent[]>;

/**
 * MCP Server 实现
 */
export class MCPServer {
  private name: string;
  private version: string;
  private tools: Map<string, { def: ToolDefinition; handler: ToolHandler }> = new Map();
  private resources: Map<string, { def: ResourceDefinition; handler: ResourceHandler }> = new Map();

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }

  /**
   * 注册工具
   */
  registerTool(def: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(def.name, { def, handler });
  }

  /**
   * 注册资源
   */
  registerResource(def: ResourceDefinition, handler: ResourceHandler): void {
    this.resources.set(def.uri, { def, handler });
  }

  /**
   * 处理 MCP 请求
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const { id, method, params } = request;

    try {
      const result = await this.dispatch(method, params);
      return { jsonrpc: '2.0', id, result };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    }
  }

  private async dispatch(method: string, params?: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize':
        return this.handleInitialize();
      case 'tools/list':
        return this.handleToolsList();
      case 'tools/call':
        return this.handleToolsCall(params);
      case 'resources/list':
        return this.handleResourcesList();
      case 'resources/read':
        return this.handleResourcesRead(params);
      default:
        throw new Error(`Method not found: ${method}`);
    }
  }

  private handleInitialize() {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: false },
        resources: { subscribe: false, listChanged: false },
      },
      serverInfo: { name: this.name, version: this.version },
    };
  }

  private handleToolsList() {
    const tools = Array.from(this.tools.values()).map(t => t.def);
    return { tools };
  }

  private async handleToolsCall(params?: Record<string, unknown>) {
    const name = params?.name as string;
    const args = (params?.arguments || {}) as Record<string, unknown>;

    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    return await tool.handler(args);
  }

  private handleResourcesList() {
    const resources = Array.from(this.resources.values()).map(r => r.def);
    return { resources };
  }

  private async handleResourcesRead(params?: Record<string, unknown>) {
    const uri = params?.uri as string;
    const resource = this.resources.get(uri);

    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const contents = await resource.handler();
    return { contents };
  }
}
