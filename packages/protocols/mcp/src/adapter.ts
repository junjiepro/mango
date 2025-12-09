/**
 * MCP Protocol Adapter
 * Wrapper around @modelcontextprotocol/sdk Client
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type {
  Tool,
  Resource,
  Prompt,
  CallToolResult,
  ReadResourceResult,
  GetPromptResult,
} from '@modelcontextprotocol/sdk/types.js';

export interface MCPAdapterConfig {
  clientInfo: {
    name: string;
    version: string;
  };
  capabilities?: {
    tools?: { listChanged?: boolean };
    resources?: { subscribe?: boolean; listChanged?: boolean };
    prompts?: { listChanged?: boolean };
    sampling?: Record<string, unknown>;
  };
}

/**
 * MCP Adapter - 封装官方 SDK Client
 * 提供统一的 MCP 协议交互接口
 */
export class MCPAdapter {
  protected client: Client;
  protected currentTransport?: Transport;
  private _isConnected = false;
  protected config: MCPAdapterConfig;

  constructor(config: MCPAdapterConfig) {
    this.config = config;
    this.client = new Client(
      {
        name: config.clientInfo.name,
        version: config.clientInfo.version,
      },
      {
        capabilities: config.capabilities || {},
      }
    );
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(transport: Transport): Promise<void> {
    this.currentTransport = transport;
    await this.client.connect(transport);
    this._isConnected = true;
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this._isConnected = false;
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * 列出所有可用工具
   */
  async listTools(cursor?: string): Promise<{ tools: Tool[]; nextCursor?: string }> {
    this.ensureConnected();
    return await this.client.listTools({ cursor });
  }

  /**
   * 调用工具
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    this.ensureConnected();
    const result = await this.client.callTool({
      name,
      arguments: args,
    });
    // 确保返回类型符合 CallToolResult 接口
    return result as CallToolResult;
  }

  /**
   * 列出所有可用资源
   */
  async listResources(cursor?: string): Promise<{ resources: Resource[]; nextCursor?: string }> {
    this.ensureConnected();
    return await this.client.listResources({ cursor });
  }

  /**
   * 读取资源
   */
  async readResource(uri: string): Promise<ReadResourceResult> {
    this.ensureConnected();
    return await this.client.readResource({ uri });
  }

  /**
   * 列出所有可用提示词
   */
  async listPrompts(cursor?: string): Promise<{ prompts: Prompt[]; nextCursor?: string }> {
    this.ensureConnected();
    return await this.client.listPrompts({ cursor });
  }

  /**
   * 获取提示词
   */
  async getPrompt(name: string, args?: Record<string, string>): Promise<GetPromptResult> {
    this.ensureConnected();
    return await this.client.getPrompt({
      name,
      arguments: args,
    });
  }

  /**
   * 获取服务器信息
   */
  getServerInfo() {
    return this.client.getServerVersion();
  }

  /**
   * 获取服务器能力
   */
  getServerCapabilities() {
    return this.client.getServerCapabilities();
  }

  /**
   * 确保已连接
   */
  private ensureConnected(): void {
    if (!this._isConnected) {
      throw new Error('Not connected to MCP server');
    }
  }

  /**
   * 获取底层 Client 实例（用于高级用法）
   */
  getClient(): Client {
    return this.client;
  }
}
