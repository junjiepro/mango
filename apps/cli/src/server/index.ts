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
import { convertToModelMessages, streamText } from 'ai';
import { planEntrySchema } from '@agentclientprotocol/sdk';
import z from 'zod';

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

      try {
        // Get the aggregator's transport
        const transport = await aggregator.getConnectedTransport();
        return transport.handleRequest(c);
      } catch (transportError) {
        console.error('MCP transport error:', transportError);
        return c.json(
          {
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message:
                transportError instanceof Error ? transportError.message : 'Transport error',
            },
            id: null,
          },
          { status: 503 }
        );
      }
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

      // 使用带就绪检查的获取方法
      const session = await acpConnector.getReadySession(sessionId);
      if (!session) {
        const rawSession = acpConnector.getSession(sessionId);
        if (!rawSession) {
          return c.json({ error: 'Session not found' }, 404);
        }
        // 会话存在但未就绪
        return c.json(
          {
            error: 'Session not ready',
            details: rawSession.initError || 'Session is still initializing',
          },
          503
        );
      }

      // 更新会话活跃时间
      acpConnector.updateSessionActivity(sessionId);

      try {
        // 使用 ACP provider 的 streamText
        const result = streamText({
          model: session.provider.languageModel(),
          // Ensure raw chunks like agent plan are included for streaming
          includeRawChunks: true,
          messages: await convertToModelMessages(messages),
          onError: (error) => {
            console.error('Error occurred while streaming text:', error);
          },
          tools: session.provider.tools,
        });

        return result.toUIMessageStreamResponse({
          messageMetadata: ({ part }) => {
            // Convert raw parts to metadata for easier UI access
            if (part.type === 'raw' && part.rawValue) {
              try {
                const data = JSON.parse(part.rawValue as string);
                switch (data.type) {
                  case 'plan':
                    return { plan: data.entries };
                  case 'diff':
                    return { diffs: [data] }; // Accumulate multiple diffs
                  case 'terminal':
                    return { terminals: [data] }; // Accumulate terminal outputs
                }
              } catch {
                // 忽略解析错误
              }
            }
          },
          onError: (error) => {
            console.error('Stream error:', error);
            return error instanceof Error ? error.message : String(error);
          },
        });
      } catch (streamError) {
        // 捕获 streamText 的同步错误
        console.error('StreamText error:', streamError);
        return c.json(
          {
            error: 'Failed to process stream',
            details: streamError instanceof Error ? streamError.message : String(streamError),
          },
          500
        );
      }
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
      const [content, stats] = await Promise.all([
        fs.readFile(fullPath, 'utf-8'),
        fs.stat(fullPath),
      ]);

      return c.json({
        success: true,
        content,
        path: fullPath,
        modified: stats.mtime.toISOString(),
        size: stats.size,
      });
    } catch (error) {
      console.error('File read error:', error);
      return c.json({ error: 'Failed to read file' }, 500);
    }
  });

  // 文件元数据获取端点（仅获取修改时间、大小等，不读取内容）
  app.get('/files/stat', async (c) => {
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
      const stats = await fs.stat(fullPath);

      return c.json({
        success: true,
        path: fullPath,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        modified: stats.mtime.toISOString(),
        created: stats.birthtime.toISOString(),
        accessed: stats.atime.toISOString(),
      });
    } catch (error) {
      console.error('File stat error:', error);
      return c.json({ error: 'Failed to get file stats' }, 500);
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

  // 文件/目录创建端点
  app.post('/files/create', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { path, type } = body;

      if (!path || !type) {
        return c.json({ error: 'Path and type are required' }, 400);
      }

      if (type !== 'file' && type !== 'directory') {
        return c.json({ error: 'Type must be "file" or "directory"' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(path);

      if (type === 'directory') {
        await fs.mkdir(fullPath, { recursive: true });
      } else {
        // 确保父目录存在
        const dir = pathModule.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        // 创建空文件
        await fs.writeFile(fullPath, '', 'utf-8');
      }

      return c.json({
        success: true,
        message: `${type === 'file' ? 'File' : 'Directory'} created successfully`,
      });
    } catch (error) {
      console.error('File/directory create error:', error);
      return c.json({ error: 'Failed to create file or directory' }, 500);
    }
  });

  // 文件/目录删除端点
  app.delete('/files/delete', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { path } = body;

      if (!path) {
        return c.json({ error: 'Path is required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullPath = pathModule.resolve(path);

      // 检查文件/目录是否存在
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }

      return c.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
      console.error('File/directory delete error:', error);
      return c.json({ error: 'Failed to delete file or directory' }, 500);
    }
  });

  // 文件/目录重命名端点
  app.post('/files/rename', async (c) => {
    try {
      const [_, __, errorResponse] = getBindingCodeAndCheckFromHeader(c);
      if (errorResponse) return errorResponse;

      const body = await c.req.json();
      const { oldPath, newPath } = body;

      if (!oldPath || !newPath) {
        return c.json({ error: 'oldPath and newPath are required' }, 400);
      }

      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const fullOldPath = pathModule.resolve(oldPath);
      const fullNewPath = pathModule.resolve(newPath);

      // 检查源文件/目录是否存在
      const stats = await fs.stat(fullOldPath);

      // 尝试使用 rename，如果失败则使用 copy + delete（支持跨设备）
      try {
        await fs.rename(fullOldPath, fullNewPath);
      } catch (renameError: any) {
        // EXDEV 错误表示跨设备操作，需要使用 copy + delete
        if (renameError.code === 'EXDEV') {
          if (stats.isDirectory()) {
            // 递归复制目录
            await fs.cp(fullOldPath, fullNewPath, { recursive: true });
            // 删除原目录
            await fs.rm(fullOldPath, { recursive: true, force: true });
          } else {
            // 复制文件
            await fs.copyFile(fullOldPath, fullNewPath);
            // 删除原文件
            await fs.unlink(fullOldPath);
          }
        } else {
          throw renameError;
        }
      }

      return c.json({ success: true, message: 'Renamed successfully' });
    } catch (error) {
      console.error('File/directory rename error:', error);
      return c.json({ error: 'Failed to rename file or directory' }, 500);
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

                    try {
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
                        try {
                          ws.send(JSON.stringify({ type: 'output', data }));
                        } catch (sendError) {
                          console.error('Failed to send PTY output:', sendError);
                        }
                      });

                      // 监听 PTY 退出
                      ptyProcess.onExit(({ exitCode }) => {
                        console.log('[Server] PTY exited with code:', exitCode);
                        try {
                          ws.close();
                        } catch {
                          // 忽略关闭错误
                        }
                      });
                    } catch (ptyError) {
                      console.error('Failed to create PTY:', ptyError);
                      ws.send(
                        JSON.stringify({
                          type: 'error',
                          message: 'Failed to create terminal',
                        })
                      );
                      ws.close();
                    }
                  } else {
                    ws.send(JSON.stringify({ type: 'auth', success: false }));
                    ws.close();
                  }
                } else if (message.type === 'resize') {
                  if (ptyProcess && message.cols && message.rows) {
                    try {
                      ptyProcess.resize(message.cols, message.rows);
                      console.log('[Server] Terminal resized to:', message.cols, 'x', message.rows);
                    } catch (resizeError) {
                      console.error('Failed to resize PTY:', resizeError);
                    }
                  }
                } else if (message.type === 'input') {
                  if (authenticated && ptyProcess) {
                    try {
                      ptyProcess.write(message.data);
                    } catch (writeError) {
                      console.error('Failed to write to PTY:', writeError);
                    }
                  }
                }
              } catch (error) {
                console.error('Terminal message error:', error);
                // 不关闭连接，只记录错误
              }
            });

            ws.on('close', () => {
              console.log('[Server] Terminal WebSocket disconnected');
              if (ptyProcess) {
                try {
                  ptyProcess.kill();
                } catch (killError) {
                  console.error('Failed to kill PTY:', killError);
                }
              }
            });

            ws.on('error', (error) => {
              console.error('[Server] Terminal WebSocket error:', error);
              if (ptyProcess) {
                try {
                  ptyProcess.kill();
                } catch {
                  // 忽略
                }
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
