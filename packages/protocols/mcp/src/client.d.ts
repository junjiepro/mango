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
export declare class MCPClient extends MCPAdapter {
    private serverUrl;
    constructor(config: MCPClientConfig);
    /**
     * 连接到 MCP 服务器
     */
    connect(): Promise<void>;
    /**
     * 断开连接
     */
    disconnect(): Promise<void>;
    /**
     * 获取传输层实例
     */
    getTransport(): StreamableHTTPClientTransport | undefined;
}
/**
 * 工厂函数：创建 MCP 客户端
 */
export declare function createMCPClient(config: MCPClientConfig): MCPClient;
//# sourceMappingURL=client.d.ts.map