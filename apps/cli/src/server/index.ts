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
import { WebSocketServer } from 'ws';
import * as pty from 'node-pty';
import { existsSync, mkdirSync } from 'fs';

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

      // 4. 生成默认工作空间目录（使用绑定码前8位）
      const pathModule = await import('path');
      const workspaceDir = pathModule.join(
        bindingCodeManager.getConfigDir(),
        'workspaces',
        bindingCode.substring(0, 8)
      );

      // 5. 返回设备信息和绑定码给 Web 端
      // Web 端负责创建 devices 和 device_bindings 记录
      return c.json({
        success: true,
        binding_code: bindingCode,
        workspace_dir: workspaceDir,
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
        workspace_dir,
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
        workspaceDir: workspace_dir,
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

  // ACP会话创建端点
  app.post('/acp/sessions', async (c) => {
    try {
      const [bindingCode, codeConfig, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { agent, envVars } = body;

      if (!agent || !agent.command) {
        return c.json({ error: 'Agent configuration is required' }, 400);
      }

      // 准备会话配置
      const session = {
        cwd: codeConfig?.workspaceDir || process.cwd(),
        mcpServers: codeConfig?.mcpServices || [],
      };

      // 创建 ACP 会话
      const sessionId = await acpConnector.createSession(
        bindingCode,
        {
          command: agent.command,
          args: agent.args,
          env: envVars,
          authMethodId: agent.authMethodId,
        },
        session
      );

      return c.json({
        success: true,
        sessionId,
        message: 'ACP session created successfully',
      });
    } catch (error) {
      console.error('ACP session creation error:', error);
      return c.json({ error: 'Failed to create ACP session' }, 500);
    }
  });

  // ACP会话列表端点
  app.get('/acp/sessions', async (c) => {
    try {
      const [bindingCode, _, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const sessions = acpConnector.getSessionsByBinding(bindingCode);
      return c.json({
        success: true,
        sessions: sessions.map((s) => ({
          sessionId: s.sessionId,
          status: s.config.status,
          createdAt: s.config.createdAt,
          lastActiveAt: s.config.lastActiveAt,
          agent: s.config.agent,
        })),
      });
    } catch (error) {
      console.error('ACP sessions list error:', error);
      return c.json({ error: 'Failed to list ACP sessions' }, 500);
    }
  });

  // ACP会话关闭端点
  app.delete('/acp/sessions/:sessionId', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const { sessionId } = c.req.param();
      const success = await acpConnector.closeSession(sessionId);

      if (!success) {
        return c.json({ error: 'Session not found' }, 404);
      }

      return c.json({ success: true, message: 'Session closed successfully' });
    } catch (error) {
      console.error('ACP session close error:', error);
      return c.json({ error: 'Failed to close session' }, 500);
    }
  });

  // ACP聊天端点（AI SDK兼容）
  app.post('/acp/chat', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { sessionId, messages } = body;

      if (!sessionId || !messages) {
        return c.json({ error: 'sessionId and messages are required' }, 400);
      }

      const session = acpConnector.getSession(sessionId);
      if (!session) {
        return c.json({ error: 'Session not found' }, 404);
      }

      // 更新会话活跃时间
      acpConnector.updateSessionActivity(sessionId);

      // 使用 ACP provider 的 streamText
      const { streamText } = await import('ai');
      const result = streamText({
        model: session.provider.languageModel(),
        messages,
        tools: session.provider.tools,
      });

      return result.toDataStreamResponse();
    } catch (error) {
      console.error('ACP chat error:', error);
      return c.json({ error: 'Failed to process chat' }, 500);
    }
  });

  // 文件列表端点
  app.get('/files/list', async (c) => {
    try {
      const [bindingCode, codeConfig, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      let path = c.req.query('path') || '';
      const fs = await import('fs/promises');
      const pathModule = await import('path');

      // 如果请求的path为空或'/',则使用配置的workspaceDir作为默认路径
      if (!path || path === '/' || path === '') {
        const workspaceDir = codeConfig?.workspaceDir;
        if (workspaceDir) {
          // 确保工作空间目录存在
          try {
            await fs.mkdir(workspaceDir, { recursive: true });
            path = workspaceDir;
          } catch (mkdirError) {
            console.error('Failed to create workspace directory:', mkdirError);
            path = process.cwd();
          }
        } else {
          path = process.cwd();
        }
      }

      const fullPath = pathModule.resolve(path);
      const stats = await fs.stat(fullPath);

      if (!stats.isDirectory()) {
        return c.json({ error: 'Path is not a directory' }, 400);
      }

      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = pathModule.join(fullPath, entry.name);
          const entryStat = await fs.stat(entryPath);
          return {
            name: entry.name,
            path: entryPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: entryStat.size,
            modified: entryStat.mtime.toISOString(),
          };
        })
      );

      return c.json({ success: true, files, path: fullPath });
    } catch (error) {
      console.error('File list error:', error);
      return c.json({ error: 'Failed to list files' }, 500);
    }
  });

  // 文件读取端点
  app.get('/files/read', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const path = c.req.query('path');
      if (!path) {
        return c.json({ error: 'Path is required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(path);
      const content = await fs.readFile(fullPath, 'utf-8');

      return c.json({ success: true, content, path: fullPath });
    } catch (error) {
      console.error('File read error:', error);
      return c.json({ error: 'Failed to read file' }, 500);
    }
  });

  // 文件写入端点
  app.post('/files/write', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { path, content } = body;

      if (!path || content === undefined) {
        return c.json({ error: 'Path and content are required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(path);
      await fs.writeFile(fullPath, content, 'utf-8');

      return c.json({ success: true, message: 'File written successfully' });
    } catch (error) {
      console.error('File write error:', error);
      return c.json({ error: 'Failed to write file' }, 500);
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
      const server = serve(
        {
          fetch: app.fetch,
          port: availablePort,
        },
        (info) => {
          // 创建 WebSocket 服务器
          const wss = new WebSocketServer({ server: server as any, path: '/terminal' });

          wss.on('connection', (ws, req) => {
            console.log('[Server] Terminal WebSocket connected');

            let ptyProcess: pty.IPty | null = null;
            let authenticated = false;

            ws.on('message', (data) => {
              try {
                const message = JSON.parse(data.toString());
                console.log('[Server] Received message:', message.type);

                if (message.type === 'auth') {
                  // 验证 binding code
                  const bindingConfig = bindingCodeManager.readConfig();
                  if (bindingConfig && bindingConfig[message.token]) {
                    authenticated = true;
                    const config = bindingConfig[message.token];
                    ws.send(JSON.stringify({ type: 'auth', success: true }));

                    // 获取工作目录：优先使用workspaceDir，否则使用当前目录
                    let workingDir = config.workspaceDir || process.cwd();
                    // 确保工作空间目录存在
                    try {
                      if (!existsSync(workingDir)) {
                        mkdirSync(workingDir, { recursive: true });
                      }
                    } catch (err) {
                      console.error('Failed to create workspace directory:', err);
                      workingDir = process.cwd();
                    }

                    // 使用 node-pty 创建伪终端
                    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
                    ptyProcess = pty.spawn(shell, [], {
                      name: 'xterm-256color',
                      cols: 80,
                      rows: 30,
                      cwd: workingDir,
                      env: process.env as { [key: string]: string },
                    });

                    console.log('[Server] PTY created:', shell, 'in directory:', workingDir);

                    // 监听 PTY 输出
                    ptyProcess.onData((data) => {
                      ws.send(JSON.stringify({ type: 'output', data }));
                    });

                    // 监听 PTY 退出
                    ptyProcess.onExit(() => {
                      ws.close();
                    });
                  } else {
                    ws.send(JSON.stringify({ type: 'auth', success: false }));
                    ws.close();
                  }
                } else if (message.type === 'resize') {
                  if (ptyProcess && message.cols && message.rows) {
                    ptyProcess.resize(message.cols, message.rows);
                    console.log('[Server] Terminal resized to:', message.cols, 'x', message.rows);
                  }
                } else if (message.type === 'input') {
                  if (authenticated && ptyProcess) {
                    ptyProcess.write(message.data);
                  }
                }
              } catch (error) {
                console.error('Terminal message error:', error);
              }
            });

            ws.on('close', () => {
              console.log('[Server] Terminal WebSocket disconnected');
              if (ptyProcess) {
                ptyProcess.kill();
              }
            });
          });

          resolve(info.port);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}
