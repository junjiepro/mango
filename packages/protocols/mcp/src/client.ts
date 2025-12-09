/**
 * MCP Client Implementation
 * HTTP/SSE transport for web applications
 */

import { MCPAdapter, MCPAdapterConfig } from './adapter.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface MCPClientConfig extends MCPAdapterConfig {
  serverUrl: string;
  headers?: Record<string, string>;
}

/**
 * MCP Client for HTTP/SSE transport
 * 适用于浏览器和 Node.js 环境
 */
export class MCPClient extends MCPAdapter {
  private serverUrl: string;

  constructor(config: MCPClientConfig) {
    super(config);
    this.serverUrl = config.serverUrl;
    // Note: StreamableHTTPClientTransport doesn't support custom headers in constructor
    // Headers should be set via fetch options if needed
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(): Promise<void> {
    // 创建 HTTP 传输层
    const transport = new StreamableHTTPClientTransport(
      new URL(this.serverUrl)
    );

    // 使用父类的 connect 方法
    await super.connect(transport);
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    await super.disconnect();
  }

  /**
   * 获取传输层实例
   */
  getTransport(): StreamableHTTPClientTransport | undefined {
    return this.currentTransport as StreamableHTTPClientTransport | undefined;
  }
}

/**
 * 工厂函数：创建 MCP 客户端
 */
export function createMCPClient(config: MCPClientConfig): MCPClient {
  return new MCPClient(config);
}
