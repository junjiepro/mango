/**
 * Service Health Check
 * 监控MCP/ACP服务的健康状态
 */

import { mcpConnector } from './connectors/mcp-connector.js';
import { acpConnector } from './connectors/acp-connector.js';

export interface ServiceHealthStatus {
  name: string;
  type: 'mcp' | 'acp';
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: number;
  error?: string;
}

/**
 * 服务健康检查管理器
 */
export class ServiceHealthChecker {
  private healthStatus: Map<string, ServiceHealthStatus> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private intervalMs: number = 30000; // 默认30秒检查一次

  /**
   * 启动健康检查
   */
  start(intervalMs: number = 30000): void {
    this.intervalMs = intervalMs;
    this.checkInterval = setInterval(() => {
      this.checkAllServices();
    }, this.intervalMs);

    // 立即执行一次检查
    this.checkAllServices();
  }

  /**
   * 停止健康检查
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * 检查所有服务
   */
  private async checkAllServices(): Promise<void> {
    // 检查MCP服务
    const mcpServices = mcpConnector.getServices();
    for (const service of mcpServices) {
      await this.checkMCPService(service.name);
    }

    // 检查ACP服务
    const acpServices = acpConnector.getServices();
    for (const service of acpServices) {
      await this.checkACPService(service.name);
    }
  }

  /**
   * 检查单个MCP服务
   */
  private async checkMCPService(serviceName: string): Promise<void> {
    const status: ServiceHealthStatus = {
      name: serviceName,
      type: 'mcp',
      status: 'unknown',
      lastCheck: Date.now(),
    };

    try {
      if (!mcpConnector.isConnected(serviceName)) {
        status.status = 'unhealthy';
        status.error = 'Service not connected';
      } else {
        // 尝试列出工具来验证连接
        await mcpConnector.listTools(serviceName);
        status.status = 'healthy';
      }
    } catch (error) {
      status.status = 'unhealthy';
      status.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.healthStatus.set(serviceName, status);
  }

  /**
   * 检查单个ACP服务
   */
  private async checkACPService(serviceName: string): Promise<void> {
    const status: ServiceHealthStatus = {
      name: serviceName,
      type: 'acp',
      status: 'unknown',
      lastCheck: Date.now(),
    };

    try {
      if (!acpConnector.isRegistered(serviceName)) {
        status.status = 'unhealthy';
        status.error = 'Service not registered';
      } else {
        // ACP协议待实现,暂时标记为healthy
        status.status = 'healthy';
      }
    } catch (error) {
      status.status = 'unhealthy';
      status.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.healthStatus.set(serviceName, status);
  }

  /**
   * 获取所有服务的健康状态
   */
  getAllStatus(): ServiceHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * 获取特定服务的健康状态
   */
  getServiceStatus(serviceName: string): ServiceHealthStatus | undefined {
    return this.healthStatus.get(serviceName);
  }

  /**
   * 手动触发单个服务检查
   */
  async checkService(serviceName: string, type: 'mcp' | 'acp'): Promise<ServiceHealthStatus> {
    if (type === 'mcp') {
      await this.checkMCPService(serviceName);
    } else {
      await this.checkACPService(serviceName);
    }

    const status = this.healthStatus.get(serviceName);
    if (!status) {
      throw new Error(`Service "${serviceName}" not found`);
    }

    return status;
  }
}

// 导出单例实例
export const serviceHealthChecker = new ServiceHealthChecker();
