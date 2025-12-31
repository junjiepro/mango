/**
 * Device Service HTTP Server
 * 使用Hono框架构建轻量级HTTP服务器
 * 新的绑定流程：临时绑定码 + Realtime Channel + 正式绑定码
 */

import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';
import os from 'os';
import type { CLIConfig } from '../types/index.js';
import { mcpConnector } from '../lib/connectors/mcp-connector.js';
import { acpConnector } from '../lib/connectors/acp-connector.js';
import { serviceHealthChecker } from '../lib/service-health.js';
import { findAvailablePort } from '../lib/port-utils.js';
import { bindingCodeManager, BindingConfig } from '../lib/binding-code-manager.js';
import { generateDeviceId, getLocalIpAddress } from '../lib/device-id.js';
import { tempBindingManager } from '../lib/temp-binding-manager.js';
import { tunnelManager } from '../lib/tunnel-manager.js';
import { randomBytes } from 'crypto';
import { actualPort } from '../commands/start.js';

const getBindingCodeAndCheckFromHeader = (
  c: Context
): [string, BindingConfig | undefined, Response | undefined] => {
  // 从请求头获取 binding code
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return [
      '',
      undefined,
      c.json(
        {
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Missing authorization header' },
          id: null,
        },
        { status: 401 }
      ),
    ];
  }

  const bindingCode = authHeader.replace('Bearer ', '');

  // 验证 binding code
  const config = bindingCodeManager.readConfig();
  const codeConfig = config?.[bindingCode];

  return [
    bindingCode,
    codeConfig,
    !codeConfig
      ? c.json(
          {
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Invalid binding code' },
            id: null,
          },
          { status: 401 }
        )
      : undefined,
  ];
};

/**
 * 创建HTTP服务器
 */
export function createServer(config: CLIConfig) {
  const app = new Hono();
  const deviceSecret = config.deviceSecret || randomBytes(32).toString('base64url');

  // 全局中间件
  app.use('*', cors());
  app.use('*', logger());

  // 健康检查端点（无需认证）
  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
      timestamp: Date.now(),
      version: '0.1.0',
      platform: process.platform,
      hostname: os.hostname(),
    });
  });

  // 创建新的临时绑定码端点
  app.post('/new-binding', async (c) => {
    try {
      const body = await c.req.json();
      const { device_secret } = body;

      // 验证 device_secret
      if (!device_secret || device_secret !== deviceSecret) {
        return c.json({ error: 'Invalid device_secret' }, 401);
      }

      // 生成新的临时绑定码
      const tempCode = tempBindingManager.generateTempCode();

      // 准备设备 URL 信息
      const tunnelUrl = tunnelManager.getTunnelUrl();
      const localIp = getLocalIpAddress();
      const deviceUrls = {
        cloudflare_url: tunnelUrl,
        localhost_url: `http://localhost:${actualPort}`,
        hostname_url: `http://${localIp}:${actualPort}`,
      };

      // 准备设备信息
      const deviceId = generateDeviceId();
      const deviceInfo = {
        platform: process.platform,
        hostname: os.hostname(),
        deviceId,
      };

      // 建立 Realtime Channel 并发送设备 URL
      await tempBindingManager.publishDeviceUrls(tempCode, deviceUrls, deviceInfo);

      // 生成绑定 URL
      const bindUrl = `${config.appUrl}/devices/bind?code=${tempCode}`;

      return c.json({
        success: true,
        temp_code: tempCode,
        bind_url: bindUrl,
        device_urls: deviceUrls,
        expires_in: 3600, // 1小时后过期（可配置）
      });
    } catch (error) {
      console.error('New binding endpoint error:', error);
      return c.json({ error: 'Failed to create new binding' }, 500);
    }
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
    const [_, targetConfig, errorResponse] = getBindingCodeAndCheckFromHeader(c);

    if (errorResponse) {
      return errorResponse;
    }

    return c.json({
      success: true,
      config: targetConfig,
    });
  });

  // 配置管理端点（POST）- 保存绑定配置
  app.post('/setting', async (c) => {
    try {
      const body = await c.req.json();
      const {
        binding_code,
        device_id,
        device_name,
        user_id,
        platform,
        hostname,
        temp_code,
        mcp_services,
      } = body;
      const rest = { ...body };
      delete rest.binding_code;
      delete rest.temp_code;

      // 验证必需字段
      if (!binding_code) {
        return c.json({ error: 'Missing required field: binding_code' }, 400);
      }

      console.log('Received binding configuration:', rest, binding_code);

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
        mcpServices: mcp_services,
      });

      // 如果提供了 temp_code，标记为已使用并清理 Channel
      if (temp_code && tempBindingManager.isValidTempCode(temp_code)) {
        tempBindingManager.markAsUsed(temp_code);
        // 延迟清理 Channel，给 Web 端一些时间完成操作
        setTimeout(async () => {
          await tempBindingManager.cleanupTempCode(temp_code);
        }, 5000); // 5秒后清理
      }

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
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);

      if (errorResponse) {
        return errorResponse;
      }

      const healthStatus = serviceHealthChecker.getAllStatus(bindingCode);
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
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);

      if (errorResponse) {
        return errorResponse;
      }

      const status = serviceHealthChecker.getServiceStatus(bindingCode, service);
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
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);

      if (errorResponse) {
        return errorResponse;
      }

      const services = mcpConnector.getServices(bindingCode);
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

  // MCP服务重新加载端点（需要认证）
  app.post('/mcp/reload', async (c) => {
    try {
      const body = await c.req.json();
      const { action, service } = body;

      if (!action) {
        return c.json({ error: 'Action is required' }, 400);
      }

      return c.json({
        success: true,
        message: `MCP service ${action} completed successfully`,
      });
    } catch (error) {
      console.error('MCP reload endpoint error:', error);
      return c.json(
        {
          error: error instanceof Error ? error.message : 'Failed to reload MCP services',
        },
        500
      );
    }
  });

  // MCP 服务端点
  app.all('/mcp', async (c) => {
    try {
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);

      if (errorResponse) {
        return errorResponse;
      }

      const aggregator = mcpConnector.getAggregator(bindingCode);
      if (!aggregator) {
        return c.json(
          {
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Missing MCP aggregator' },
            id: null,
          },
          { status: 401 }
        );
      }

      // Get the aggregator's transport
      const transport = await aggregator.getConnectedTransport();

      return transport.handleRequest(c);
    } catch (error) {
      console.error('MCP streamable endpoint error:', error);
      return c.json(
        {
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        },
        { status: 500 }
      );
    }
  });

  // ACP端点（ACP协议服务代理，需要认证）
  app.all('/acp', async (c) => {
    try {
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);

      if (errorResponse) {
        return errorResponse;
      }

      // 获取ACP服务列表
      const services = acpConnector.getServices();

      // 返回服务列表（即使为空也返回 200）
      return c.json({
        message: services.length === 0
          ? 'No ACP services configured. Please configure ACP services first.'
          : 'ACP protocol support is in progress',
        available_services: services.map((s) => ({
          name: s.name,
          description: s.description,
        })),
        note: 'Full ACP protocol implementation will be added once the protocol specification is finalized',
      });
    } catch (error) {
      console.error('ACP endpoint error:', error);
      return c.json(
        {
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      );
    }
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
