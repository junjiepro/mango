/**
 * MCP Protocol Adapter
 * Wrapper around @modelcontextprotocol/sdk Client
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { Tool, Resource, Prompt, CallToolResult, ReadResourceResult, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
export interface MCPAdapterConfig {
    clientInfo: {
        name: string;
        version: string;
    };
    capabilities?: {
        tools?: {
            listChanged?: boolean;
        };
        resources?: {
            subscribe?: boolean;
            listChanged?: boolean;
        };
        prompts?: {
            listChanged?: boolean;
        };
        sampling?: Record<string, unknown>;
    };
}
/**
 * MCP Adapter - 封装官方 SDK Client
 * 提供统一的 MCP 协议交互接口
 */
export declare class MCPAdapter {
    protected client: Client;
    protected currentTransport?: Transport;
    private _isConnected;
    protected config: MCPAdapterConfig;
    constructor(config: MCPAdapterConfig);
    /**
     * 连接到 MCP 服务器
     */
    connect(transport: Transport): Promise<void>;
    /**
     * 断开连接
     */
    disconnect(): Promise<void>;
    /**
     * 检查是否已连接
     */
    isConnected(): boolean;
    /**
     * 列出所有可用工具
     */
    listTools(cursor?: string): Promise<{
        tools: Tool[];
        nextCursor?: string;
    }>;
    /**
     * 调用工具
     */
    callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
    /**
     * 列出所有可用资源
     */
    listResources(cursor?: string): Promise<{
        resources: Resource[];
        nextCursor?: string;
    }>;
    /**
     * 读取资源
     */
    readResource(uri: string): Promise<ReadResourceResult>;
    /**
     * 列出所有可用提示词
     */
    listPrompts(cursor?: string): Promise<{
        prompts: Prompt[];
        nextCursor?: string;
    }>;
    /**
     * 获取提示词
     */
    getPrompt(name: string, args?: Record<string, string>): Promise<GetPromptResult>;
    /**
     * 获取服务器信息
     */
    getServerInfo(): {
        version: string;
        name: string;
        websiteUrl?: string | undefined;
        icons?: {
            src: string;
            mimeType?: string | undefined;
            sizes?: string[] | undefined;
        }[] | undefined;
        title?: string | undefined;
    } | undefined;
    /**
     * 获取服务器能力
     */
    getServerCapabilities(): {
        [x: string]: unknown;
        experimental?: {
            [x: string]: object;
        } | undefined;
        logging?: object | undefined;
        completions?: object | undefined;
        prompts?: {
            listChanged?: boolean | undefined;
        } | undefined;
        resources?: {
            subscribe?: boolean | undefined;
            listChanged?: boolean | undefined;
        } | undefined;
        tools?: {
            listChanged?: boolean | undefined;
        } | undefined;
        tasks?: {
            [x: string]: unknown;
            list?: {
                [x: string]: unknown;
            } | undefined;
            cancel?: {
                [x: string]: unknown;
            } | undefined;
            requests?: {
                [x: string]: unknown;
                tools?: {
                    [x: string]: unknown;
                    call?: {
                        [x: string]: unknown;
                    } | undefined;
                } | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    /**
     * 确保已连接
     */
    private ensureConnected;
    /**
     * 获取底层 Client 实例（用于高级用法）
     */
    getClient(): Client;
}
//# sourceMappingURL=adapter.d.ts.map