/**
 * MiniApp MCP Client
 * 用于与 MiniApp MCP Server 通信
 * 支持标准 MCP JSON-RPC 协议
 */

// 统一的 UI Resource URI
const UNIFIED_UI_RESOURCE_URI = 'ui://mango/main';

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  _meta?: {
    ui?: {
      resourceUri?: string;
    };
  };
}

interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export class MiniAppMCPClient {
  private baseUrl: string;
  private miniAppId: string;
  private requestId = 0;
  private authToken?: string;

  constructor(miniAppId: string, authToken?: string) {
    this.miniAppId = miniAppId;
    this.authToken = authToken;
    this.baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/miniapp-mcp/mcp/${miniAppId}`;
  }

  private async request(method: string, params?: Record<string, unknown>): Promise<MCPResponse> {
    const body: MCPRequest = {
      jsonrpc: '2.0',
      id: ++this.requestId,
      method,
      params,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * 初始化连接
   */
  async initialize(): Promise<{ protocolVersion: string; serverInfo: { name: string; version: string } }> {
    const response = await this.request('initialize');
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result as { protocolVersion: string; serverInfo: { name: string; version: string } };
  }

  /**
   * 列出可用工具
   */
  async listTools(): Promise<ToolDefinition[]> {
    const response = await this.request('tools/list');
    if (response.error) {
      throw new Error(response.error.message);
    }
    return (response.result as { tools: ToolDefinition[] })?.tools || [];
  }

  /**
   * 调用工具
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const response = await this.request('tools/call', { name, arguments: args });
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result;
  }

  /**
   * 列出 UI 资源
   */
  async listResources(): Promise<ResourceDefinition[]> {
    const response = await this.request('resources/list');
    if (response.error) {
      throw new Error(response.error.message);
    }
    return (response.result as { resources: ResourceDefinition[] })?.resources || [];
  }

  /**
   * 读取 UI 资源（返回原始内容，不做解析）
   */
  async readResource(uri: string): Promise<{ text: string; mimeType: string; _meta?: Record<string, unknown> } | null> {
    const response = await this.request('resources/read', { uri });
    if (response.error) {
      throw new Error(response.error.message);
    }
    const contents = (response.result as { contents: Array<{ text: string; mimeType?: string; _meta?: Record<string, unknown> }> })?.contents;
    if (contents?.[0]?.text) {
      return {
        text: contents[0].text,
        mimeType: contents[0].mimeType || 'application/json',
        _meta: contents[0]._meta,
      };
    }
    return null;
  }

  /**
   * 读取资源并解析为 JSON（旧行为兼容）
   */
  async readResourceAsJSON(uri: string): Promise<unknown> {
    const resource = await this.readResource(uri);
    if (resource?.text) {
      return JSON.parse(resource.text);
    }
    return null;
  }

  /**
   * 读取资源原始 MCP 响应（供 AppBridge 转发给 View）
   */
  async readResourceRaw(uri: string): Promise<unknown> {
    const response = await this.request('resources/read', { uri });
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result;
  }

  /**
   * 从 listResources() 中查找 HTML 类型资源
   * 支持任意 MCP ext-app 的 HTML 资源发现（不硬编码 URI）
   */
  async findHtmlResource(): Promise<ResourceDefinition | null> {
    const resources = await this.listResources();
    return resources.find(
      r => r.mimeType === 'text/html' ||
           r.mimeType === 'text/html;profile=mcp-app'
    ) ?? null;
  }

  /**
   * 读取主界面 UI Resource
   * 优先通过 findHtmlResource() 发现，回退到默认 URI
   */
  async readMainUI(): Promise<{ text: string; mimeType: string; _meta?: Record<string, unknown> } | null> {
    const htmlResource = await this.findHtmlResource();
    if (htmlResource) {
      return this.readResource(htmlResource.uri);
    }
    // 回退：尝试默认约定 URI
    return this.readResource(UNIFIED_UI_RESOURCE_URI);
  }

  /**
   * 获取主界面 URI
   */
  getMainUri(): string {
    return UNIFIED_UI_RESOURCE_URI;
  }
}
