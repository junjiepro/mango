/**
 * Device Service HTTP Server
 * 使用Hono框架构建轻量级HTTP服务器
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import type { CLIConfig } from '../types/index.js';
import { mcpConnector } from '../lib/connectors/mcp-connector.js';
import { acpConnector } from '../lib/connectors/acp-connector.js';
import { serviceHealthChecker } from '../lib/service-health.js';
import { findAvailablePort } from '../lib/port-utils.js';

/**
 * 创建HTTP服务器
 */
export function createServer(config: CLIConfig, deviceSecret: string) {
  const app = new Hono();

  // 全局中间件
  app.use('*', cors());
  app.use('*', logger());

  // 健康检查端点（无需认证）
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: Date.now(),
      version: '0.1.0',
    });
  });

  // 设备绑定端点
  app.post('/bind', async (c) => {
    try {
      const body = await c.req.json();
      const { device_secret, user_id, binding_name } = body;

      // 验证 device_secret
      if (device_secret !== deviceSecret) {
        return c.json({ error: 'Invalid device_secret' }, 401);
      }

      // TODO: 实现设备绑定逻辑
      // 1. 生成设备ID
      // 2. 创建或更新设备记录
      // 3. 创建绑定记录
      // 4. 生成binding_token

      return c.json({
        message: 'Device binding is in progress',
        device_secret,
      });
    } catch (error) {
      return c.json({ error: 'Invalid request body' }, 400);
    }
  });

  // 配置管理端点（GET）
  app.get('/setting', async (c) => {
    // TODO: 实现配置读取逻辑
    return c.json({
      message: 'Configuration management is in progress',
    });
  });

  // 配置管理端点（POST）
  app.post('/setting', async (c) => {
    try {
      const body = await c.req.json();
      // TODO: 实现配置更新逻辑
      return c.json({
        message: 'Configuration update is in progress',
        config: body,
      });
    } catch (error) {
      return c.json({ error: 'Invalid request body' }, 400);
    }
  });

  // 服务健康检查端点
  app.get('/health/services', async (c) => {
    try {
      const healthStatus = serviceHealthChecker.getAllStatus();
      return c.json({
        services: healthStatus,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to get service health status:', error);
      return c.json({ error: 'Failed to get health status' }, 500);
    }
  });

  // 单个服务健康检查端点
  app.get('/health/services/:service', async (c) => {
    const { service } = c.req.param();
    try {
      const status = serviceHealthChecker.getServiceStatus(service);
      if (!status) {
        return c.json({ error: `Service "${service}" not found` }, 404);
      }
      return c.json(status);
    } catch (error) {
      console.error(`Failed to get health status for service "${service}":`, error);
      return c.json({ error: 'Failed to get health status' }, 500);
    }
  });

  // MCP服务列表端点
  app.get('/mcp/services', async (c) => {
    try {
      const services = mcpConnector.getServices();
      return c.json({
        services: services.map((s) => ({
          name: s.name,
          status: s.status,
          command: s.command,
        })),
      });
    } catch (error) {
      console.error('Failed to list MCP services:', error);
      return c.json({ error: 'Failed to list MCP services' }, 500);
    }
  });

  // MCP工具列表端点
  app.get('/mcp/:service/tools', async (c) => {
    const { service } = c.req.param();
    try {
      if (!mcpConnector.isConnected(service)) {
        return c.json({ error: `Service "${service}" not found or not connected` }, 404);
      }
      const tools = await mcpConnector.listTools(service);
      return c.json({
        service,
        tools,
      });
    } catch (error) {
      console.error(`Failed to list tools for service "${service}":`, error);
      return c.json({ error: 'Failed to list tools' }, 500);
    }
  });

  // MCP工具调用端点
  app.post('/mcp/:service/tools/:tool', async (c) => {
    const { service, tool } = c.req.param();
    try {
      if (!mcpConnector.isConnected(service)) {
        return c.json({ error: `Service "${service}" not found or not connected` }, 404);
      }
      const args = await c.req.json();
      const result = await mcpConnector.callTool(service, tool, args);
      return c.json({
        service,
        tool,
        result,
      });
    } catch (error) {
      console.error(`Failed to call tool "${tool}" on service "${service}":`, error);
      return c.json({ error: 'Tool invocation failed' }, 500);
    }
  });

  // MCP资源列表端点
  app.get('/mcp/:service/resources', async (c) => {
    const { service } = c.req.param();
    try {
      if (!mcpConnector.isConnected(service)) {
        return c.json({ error: `Service "${service}" not found or not connected` }, 404);
      }
      const resources = await mcpConnector.listResources(service);
      return c.json({
        service,
        resources,
      });
    } catch (error) {
      console.error(`Failed to list resources for service "${service}":`, error);
      return c.json({ error: 'Failed to list resources' }, 500);
    }
  });

  // MCP资源读取端点
  app.get('/mcp/:service/resources/*', async (c) => {
    const { service } = c.req.param();
    const uri = c.req.path.replace(`/mcp/${service}/resources/`, '');
    try {
      if (!mcpConnector.isConnected(service)) {
        return c.json({ error: `Service "${service}" not found or not connected` }, 404);
      }
      const content = await mcpConnector.readResource(service, uri);
      return c.json({
        service,
        uri,
        content,
      });
    } catch (error) {
      console.error(`Failed to read resource "${uri}" from service "${service}":`, error);
      return c.json({ error: 'Failed to read resource' }, 500);
    }
  });

  // ACP端点（预留）
  app.post('/acp', async (c) => {
    // TODO: 实现ACP协议支持
    return c.json({
      message: 'ACP protocol support is in progress',
    });
  });

  // 404处理
  app.notFound((c) => {
    return c.json({ error: 'Not found' }, 404);
  });

  // 错误处理
  app.onError((err, c) => {
    console.error('Server error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}

/**
 * 启动HTTP服务器
 * @returns 返回实际使用的端口号
 */
export async function startServer(
  config: CLIConfig,
  deviceSecret: string
): Promise<number> {
  const app = createServer(config, deviceSecret);

  // 查找可用端口
  const availablePort = await findAvailablePort(config.port);

  return new Promise((resolve, reject) => {
    try {
      serve(
        {
          fetch: app.fetch,
          port: availablePort,
        },
        (info) => {
          console.log(`Server running on http://localhost:${info.port}`);
          resolve(info.port);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}
