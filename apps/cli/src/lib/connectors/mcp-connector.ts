/**
 * MCP Service Connector
 * 连接和管理本地MCP服务
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type {
  MCPServiceConfig,
  MCPTool,
  MCPResource,
  MCPToolResult,
  MCPResourceContent,
} from '../../types/mcp-config.js';

/**
 * MCP连接器类
 */
export class MCPConnector {
  private clients: Map<string, Client> = new Map();
  private configs: Map<string, MCPServiceConfig> = new Map();

  /**
   * 添加MCP服务
   */
  async addService(config: MCPServiceConfig): Promise<void> {
    try {
      // 创建 MCP 客户端
      const client = new Client(
        {
          name: 'mango-device-service',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
            resources: {},
          },
        }
      );

      // 创建 stdio 传输层
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          ...(Object.fromEntries(
            Object.entries(process.env).filter(([_, v]) => v !== undefined)
          ) as Record<string, string>),
          ...config.env,
        },
      });

      // 连接到 MCP 服务
      await client.connect(transport);

      // 保存客户端和配置
      this.clients.set(config.name, client);
      this.configs.set(config.name, config);

      console.log(`MCP service "${config.name}" connected`);
    } catch (error) {
      console.error(`Failed to connect to MCP service "${config.name}":`, error);
      throw error;
    }
  }

  /**
   * 删除MCP服务
   */
  async removeService(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      await client.close();
      this.clients.delete(name);
      this.configs.delete(name);
      console.log(`MCP service "${name}" disconnected`);
    }
  }

  /**
   * 列出所有工具
   */
  async listTools(serviceName: string): Promise<MCPTool[]> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    const result = await client.listTools();
    return result.tools as MCPTool[];
  }

  /**
   * 调用工具
   */
  async callTool(
    serviceName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<MCPToolResult> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    try {
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });
      return result as MCPToolResult;
    } catch (error) {
      console.error(`Tool call failed: ${serviceName}/${toolName}`, error);
      throw error;
    }
  }

  /**
   * 列出所有资源
   */
  async listResources(serviceName: string): Promise<MCPResource[]> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    const result = await client.listResources();
    return result.resources as MCPResource[];
  }

  /**
   * 读取资源
   */
  async readResource(serviceName: string, uri: string): Promise<MCPResourceContent> {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    const result = await client.readResource({ uri });
    return result.contents[0] as MCPResourceContent;
  }

  /**
   * 获取所有服务配置
   */
  getServices(): MCPServiceConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 获取特定服务配置
   */
  getService(serviceName: string): MCPServiceConfig | undefined {
    return this.configs.get(serviceName);
  }

  /**
   * 检查服务是否已连接
   */
  isConnected(serviceName: string): boolean {
    return this.clients.has(serviceName);
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.clients.values()).map((client) =>
      client.close().catch((err) => console.error('Error closing client:', err))
    );

    await Promise.all(closePromises);
    this.clients.clear();
    this.configs.clear();
  }
}

// 导出单例实例
export const mcpConnector = new MCPConnector();
