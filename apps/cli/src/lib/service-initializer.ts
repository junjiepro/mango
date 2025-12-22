/**
 * Service Initializer
 * 初始化和加载MCP/ACP服务配置
 */

import { mcpConnector } from './connectors/mcp-connector.js';
import { acpConnector } from './connectors/acp-connector.js';
import { serviceHealthChecker } from './service-health.js';
import { formatter } from './formatter.js';
import { urlUpdateManager } from './url-update-manager.js';
import type { MCPServiceConfig } from '../types/mcp-config.js';

/**
 * 服务初始化器
 */
export class ServiceInitializer {
  /**
   * 初始化所有服务
   * @param mcpServices MCP服务配置列表
   * @param bindingCodes 绑定码列表（用于验证绑定状态）
   */
  async initializeServices(
    mcpServices: MCPServiceConfig[],
    bindingCodes?: string[]
  ): Promise<void> {
    formatter.info('Initializing MCP/ACP services...');

    // 检查绑定状态
    if (bindingCodes && bindingCodes.length > 0) {
      const hasInvalidBinding = bindingCodes.some(
        (code) => !urlUpdateManager.isBindingValid(code)
      );

      if (hasInvalidBinding) {
        formatter.error('Device binding is invalid - services will not be started');
        formatter.warning(
          'Please check your network connection and restart the CLI to retry binding validation'
        );
        formatter.newline();

        // 显示详细的绑定状态
        bindingCodes.forEach((code) => {
          const status = urlUpdateManager.getBindingStatus(code);
          if (status && !status.isValid) {
            formatter.labeled('Binding Code', code.substring(0, 20) + '...');
            formatter.labeled('Status', 'Invalid');
            formatter.labeled('Reason', status.failureReason || 'Unknown');
            formatter.labeled('Failed Attempts', status.retryCount.toString());
            formatter.newline();
          }
        });

        return;
      }
    }

    // 初始化MCP服务
    if (mcpServices.length > 0) {
      await this.initializeMCPServices(mcpServices);
    } else {
      formatter.dim('No MCP services configured');
    }

    // 启动健康检查
    serviceHealthChecker.start(30000); // 每30秒检查一次
    formatter.success('Service health checker started');
  }

  /**
   * 初始化MCP服务
   */
  private async initializeMCPServices(services: MCPServiceConfig[]): Promise<void> {
    const results: Array<{ name: string; success: boolean; error?: string }> = [];

    for (const service of services) {
      if (service.status === 'inactive') {
        formatter.dim(`Skipping inactive service: ${service.name}`);
        continue;
      }

      try {
        formatter.dim(`Connecting to MCP service: ${service.name}...`);
        await mcpConnector.addService(service);
        results.push({ name: service.name, success: true });
        formatter.success(`✓ ${service.name} connected`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.push({ name: service.name, success: false, error: errorMsg });
        formatter.error(`✗ ${service.name} failed: ${errorMsg}`);
      }
    }

    // 显示总结
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    formatter.newline();
    if (successCount > 0) {
      formatter.success(`${successCount} MCP service(s) connected successfully`);
    }
    if (failCount > 0) {
      formatter.warning(`${failCount} MCP service(s) failed to connect`);
    }
  }

  /**
   * 清理所有服务连接
   */
  async cleanup(): Promise<void> {
    formatter.info('Cleaning up services...');

    // 停止健康检查
    serviceHealthChecker.stop();

    // 关闭所有MCP连接
    await mcpConnector.closeAll();

    // 关闭所有ACP连接
    await acpConnector.closeAll();

    formatter.success('All services cleaned up');
  }
}

// 导出单例实例
export const serviceInitializer = new ServiceInitializer();
