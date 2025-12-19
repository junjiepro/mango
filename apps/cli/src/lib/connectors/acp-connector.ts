/**
 * ACP Service Connector
 * 连接和管理本地ACP服务
 *
 * 注意: ACP协议目前处于预留状态,具体实现待协议规范确定后补充
 */

import type { MCPServiceConfig } from '../../types/mcp-config.js';

/**
 * ACP连接器类
 *
 * 当前为占位实现,待ACP协议规范确定后完善
 */
export class ACPConnector {
  private configs: Map<string, MCPServiceConfig> = new Map();

  /**
   * 添加ACP服务
   */
  async addService(config: MCPServiceConfig): Promise<void> {
    // TODO: 实现ACP服务连接逻辑
    this.configs.set(config.name, config);
    console.log(`ACP service "${config.name}" registered (placeholder)`);
  }

  /**
   * 删除ACP服务
   */
  async removeService(name: string): Promise<void> {
    this.configs.delete(name);
    console.log(`ACP service "${name}" unregistered`);
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
   * 检查服务是否已注册
   */
  isRegistered(serviceName: string): boolean {
    return this.configs.has(serviceName);
  }

  /**
   * 关闭所有连接
   */
  async closeAll(): Promise<void> {
    // TODO: 实现ACP连接清理逻辑
    this.configs.clear();
  }
}

// 导出单例实例
export const acpConnector = new ACPConnector();
