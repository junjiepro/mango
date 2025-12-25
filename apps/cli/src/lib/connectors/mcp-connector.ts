/**
 * MCP Service Connector
 * 连接和管理本地MCP服务
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MCPServiceConfig } from '../../types/mcp-config.js';
import { MCPAggregator } from '../mcp-aggregator.js';

/**
 * MCP连接器类
 */
export class MCPConnector {
  private clients: Map<string, Client> = new Map();
  private configs: Map<string, MCPServiceConfig> = new Map();
  private bindingCode2AggregatorMap: Map<string, MCPAggregator> = new Map();
  private bindingCodeIds: Map<string, string> = new Map();
  private idCounter = 0;

  /**
   * 获取 MCP 聚合器
   */
  getAggregator(bindingCode: string): MCPAggregator | undefined {
    return this.bindingCode2AggregatorMap.get(bindingCode);
  }

  /**
   * 获取 MCP 客户端
   */
  getClient(configId: string): Client | undefined {
    return this.clients.get(configId);
  }

  /**
   * 添加MCP服务
   */
  async addService(bindingCode: string, config: MCPServiceConfig): Promise<void> {
    try {
      // 获取 bindingCode 对应的 id
      let bindingCodeId = this.bindingCodeIds.get(bindingCode);
      if (!bindingCodeId) {
        this.idCounter++;
        bindingCodeId = this.idCounter.toString();
        this.bindingCodeIds.set(bindingCode, bindingCodeId);
      }

      // 获取 bindingCode 对应的 aggregator
      let aggregator = this.bindingCode2AggregatorMap.get(bindingCode);
      if (!aggregator) {
        aggregator = new MCPAggregator();
        this.bindingCode2AggregatorMap.set(bindingCode, aggregator);
      }

      // 生成 configId
      const configId = `${bindingCodeId}-${config.name}`;

      // 如果存在则先删除
      if (this.clients.has(configId)) {
        await this.removeService(bindingCode, config.name);
      }

      // 创建 MCP 客户端
      const client = new Client({
        name: `mango-device-service-${configId}`,
        version: '1.0.0',
      });

      // 创建 stdio 传输层
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          ...config.env,
        },
      });

      // 连接到 MCP 服务
      await client.connect(transport);

      // 保存客户端和配置
      this.clients.set(configId, client);
      this.configs.set(configId, config);

      // 注册客户端
      aggregator.registerClient(configId, config.name, client);

      console.log(
        `Binding code "${bindingCode.substring(0, 20)}..." MCP service "${config.name}" connected`
      );
    } catch (error) {
      console.error(`Failed to connect to MCP service "${config.name}":`, error);
      throw error;
    }
  }

  /**
   * 删除MCP服务
   */
  async removeService(bindingCode: string, name: string): Promise<void> {
    const configId = `${this.bindingCodeIds.get(bindingCode)}-${name}`;
    const client = this.clients.get(configId);
    const aggregator = this.bindingCode2AggregatorMap.get(bindingCode);
    if (client) {
      await client.close();
      this.clients.delete(configId);
      this.configs.delete(configId);
      console.log(
        `Binding code "${bindingCode.substring(0, 20)}..." MCP service "${name}" disconnected`
      );
    }
    aggregator?.unregisterClient(configId);
  }

  /**
   * 列出所有工具
   */
  async listTools(bindingCode: string, serviceName: string) {
    const configId = `${this.bindingCodeIds.get(bindingCode)}-${serviceName}`;
    const client = this.clients.get(configId);
    if (!client) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    const result = await client.listTools();
    return result;
  }

  /**
   * 获取所有服务配置
   */
  getAllServices(): [string, MCPServiceConfig][] {
    return Array.from(this.configs.entries());
  }

  /**
   * 获取所有服务配置
   */
  getServices(bindingCode: string): MCPServiceConfig[] {
    const codeId = this.bindingCodeIds.get(bindingCode);
    if (!codeId) return [];
    return Array.from(this.configs.entries())
      .filter(([key]) => key.startsWith(`${codeId}-`))
      .map(([_, config]) => config);
  }

  /**
   * 获取特定服务配置
   */
  getService(bindingCode: string, serviceName: string): MCPServiceConfig | undefined {
    const codeId = this.bindingCodeIds.get(bindingCode);
    if (!codeId) return undefined;
    return this.configs.get(`${codeId}-${serviceName}`);
  }

  /**
   * 检查服务是否已连接
   */
  isConnected(bindingCode: string, serviceName: string): boolean {
    const codeId = this.bindingCodeIds.get(bindingCode);
    if (!codeId) return false;
    return this.clients.has(`${codeId}-${serviceName}`);
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
