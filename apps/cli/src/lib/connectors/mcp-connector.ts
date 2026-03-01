/**
 * MCP Service Connector
 * 连接和管理本地MCP服务
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { MCPServiceConfig } from '../../types/mcp-config.js';
import { MCPAggregator } from '../mcp-aggregator.js';

/**
 * 重连配置
 */
interface ReconnectConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * 服务状态信息
 */
interface ServiceStatus {
  config: MCPServiceConfig;
  retryCount: number;
  lastError?: string;
  isReconnecting: boolean;
}

/**
 * MCP连接器类
 */
export class MCPConnector {
  private clients: Map<string, Client> = new Map();
  private configs: Map<string, MCPServiceConfig> = new Map();
  private serviceStatus: Map<string, ServiceStatus> = new Map();
  private bindingCode2AggregatorMap: Map<string, MCPAggregator> = new Map();
  private bindingCodeIds: Map<string, string> = new Map();
  private idCounter = 0;
  private reconnectConfig: ReconnectConfig = DEFAULT_RECONNECT_CONFIG;

  /**
   * 计算指数退避延迟
   */
  private calculateDelay(retryCount: number): number {
    const delay = Math.min(
      this.reconnectConfig.baseDelayMs * Math.pow(2, retryCount),
      this.reconnectConfig.maxDelayMs
    );
    // 添加抖动 (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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

    // 初始化服务状态
    this.serviceStatus.set(configId, {
      config,
      retryCount: 0,
      isReconnecting: false,
    });

    // 尝试连接（带重试）
    await this.connectWithRetry(bindingCode, configId, config, aggregator);
  }

  /**
   * 带重试的连接逻辑
   */
  private async connectWithRetry(
    bindingCode: string,
    configId: string,
    config: MCPServiceConfig,
    aggregator: MCPAggregator
  ): Promise<void> {
    const status = this.serviceStatus.get(configId);
    if (!status) return;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.reconnectConfig.maxRetries; attempt++) {
      try {
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

        // 更新状态
        status.retryCount = 0;
        status.lastError = undefined;
        status.isReconnecting = false;

        // 注册客户端
        aggregator.registerClient(configId, config.name, client);

        console.log(
          `Binding code "${bindingCode.substring(0, 20)}..." MCP service "${config.name}" connected`
        );

        // 监听客户端关闭事件，触发重连
        this.setupClientErrorHandler(bindingCode, configId, config, aggregator, client);

        return; // 连接成功，退出重试循环
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        status.retryCount = attempt + 1;
        status.lastError = lastError.message;

        if (attempt < this.reconnectConfig.maxRetries) {
          const delayMs = this.calculateDelay(attempt);
          console.warn(
            `MCP service "${config.name}" connection failed (attempt ${attempt + 1}/${this.reconnectConfig.maxRetries + 1}), retrying in ${delayMs}ms...`
          );
          await this.delay(delayMs);
        }
      }
    }

    // 所有重试都失败了
    console.error(
      `Failed to connect to MCP service "${config.name}" after ${this.reconnectConfig.maxRetries + 1} attempts:`,
      lastError?.message
    );
    // 不抛出错误，让服务继续运行
  }

  /**
   * 设置客户端错误处理和自动重连
   */
  private setupClientErrorHandler(
    bindingCode: string,
    configId: string,
    config: MCPServiceConfig,
    aggregator: MCPAggregator,
    client: Client
  ): void {
    // 监听传输层关闭
    client.onclose = async () => {
      const status = this.serviceStatus.get(configId);
      if (!status || status.isReconnecting) return;

      console.warn(`MCP service "${config.name}" disconnected, attempting to reconnect...`);
      status.isReconnecting = true;

      // 清理旧连接
      this.clients.delete(configId);
      aggregator.unregisterClient(configId);

      // 延迟后尝试重连
      await this.delay(this.reconnectConfig.baseDelayMs);
      await this.connectWithRetry(bindingCode, configId, config, aggregator);
    };
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
   * 获取服务状态信息
   */
  getServiceStatus(bindingCode: string, serviceName: string): ServiceStatus | undefined {
    const codeId = this.bindingCodeIds.get(bindingCode);
    if (!codeId) return undefined;
    return this.serviceStatus.get(`${codeId}-${serviceName}`);
  }

  /**
   * 手动触发服务重连
   */
  async reconnectService(bindingCode: string, serviceName: string): Promise<boolean> {
    const codeId = this.bindingCodeIds.get(bindingCode);
    if (!codeId) return false;

    const configId = `${codeId}-${serviceName}`;
    const status = this.serviceStatus.get(configId);
    if (!status) return false;

    const aggregator = this.bindingCode2AggregatorMap.get(bindingCode);
    if (!aggregator) return false;

    // 先断开现有连接
    await this.removeService(bindingCode, serviceName);

    // 重新连接
    status.retryCount = 0;
    status.isReconnecting = false;
    await this.connectWithRetry(bindingCode, configId, status.config, aggregator);

    return this.clients.has(configId);
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
