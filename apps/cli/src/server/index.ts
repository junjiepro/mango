/**
 * Device Service HTTP Server
 * 使用Hono框架构建轻量级HTTP服务器
 * 新的绑定流程：临时绑定码 + Realtime Channel + 正式绑定码
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import os from 'os';
import type { CLIConfig } from '../types/index.js';
import { mcpConnector } from '../lib/connectors/mcp-connector.js';
import { acpConnector } from '../lib/connectors/acp-connector.js';
import { serviceHealthChecker } from '../lib/service-health.js';
import { findAvailablePort } from '../lib/port-utils.js';
import { bindingCodeManager } from '../lib/binding-code-manager.js';
import { generateDeviceId } from '../lib/device-id.js';
import { createClient } from '@supabase/supabase-js';

/**
 * 创建HTTP服务器
 */
export function createServer(config: CLIConfig) {
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

  // 设备绑定端点（新的绑定流程）
  app.post('/bind', async (c) => {
    try {
      const body = await c.req.json();
      const { user_id, binding_name } = body;

      if (!user_id || !binding_name) {
        return c.json({ error: 'Missing required fields: user_id, binding_name' }, 400);
      }

      // 1. 生成设备 ID（基于硬件信息）
      const deviceId = generateDeviceId();

      // 2. 生成并保存正式绑定码（256位）
      const bindingCode = bindingCodeManager.generateAndSave();

      // 3. 转换 platform 格式以匹配数据库约束
      const platformMap: Record<string, string> = {
        win32: 'windows',
        darwin: 'macos',
        linux: 'linux',
      };
      const platform = platformMap[process.platform] || 'linux';

      // 4. 返回设备信息和绑定码给 Web 端
      // Web 端负责创建 devices 和 device_bindings 记录
      return c.json({
        success: true,
        binding_code: bindingCode,
        device_info: {
          device_id: deviceId,
          device_name: binding_name,
          platform: platform,
          hostname: os.hostname(),
        },
      });
    } catch (error) {
      console.error('Bind endpoint error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  });

  // 配置管理端点（GET）
  app.get('/setting', async (c) => {
    // TODO: 实现配置读取逻辑
    return c.json({
      message: 'Configuration management is in progress',
    });
  });

  // 配置管理端点（POST）- 保存绑定配置
  app.post('/setting', async (c) => {
    try {
      const body = await c.req.json();
      const { binding_code, device_id, device_name, user_id, platform, hostname } = body;
      const rest = { ...body };
      delete rest.binding_code;

      // 验证必需字段
      if (!binding_code) {
        return c.json({ error: 'Missing required field: binding_code' }, 400);
      }

      // 保存完整的绑定配置
      bindingCodeManager.saveConfig(binding_code, rest, {
        bindingCode: binding_code,
        deviceId: device_id,
        deviceName: device_name,
        boundAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        userId: user_id,
        metadata: {
          platform: platform || process.platform,
          hostname: hostname || os.hostname(),
          arch: os.arch(),
        },
      });

      return c.json({
        success: true,
        message: 'Binding configuration saved successfully',
      });
    } catch (error) {
      console.error('Failed to save binding configuration:', error);
      return c.json({ error: 'Failed to save configuration' }, 500);
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
export async function startServer(config: CLIConfig): Promise<number> {
  const app = createServer(config);

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
          resolve(info.port);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}
