/**
 * Start Command
 * 启动设备服务并创建Cloudflare Tunnel
 */

import { formatter } from '../lib/formatter.js';
import { deviceSecretManager } from '../lib/device-secret.js';
import { configManager } from '../lib/config.js';
import { startServer } from '../server/index.js';
import { tunnelManager } from '../lib/tunnel-manager.js';
import { serviceInitializer } from '../lib/service-initializer.js';
import open from 'open';
import type { StartCommandOptions } from '../types/index.js';

/**
 * 启动设备服务
 */
export async function startDeviceService(options: StartCommandOptions): Promise<void> {
  try {
    formatter.title('Mango Device Service');

    // 1. 加载配置
    const spinner = formatter.spinner('Loading configuration...');
    let config;
    try {
      config = await configManager.loadConfig(options);
      spinner.succeed('Configuration loaded');
    } catch (error) {
      spinner.fail('Configuration error');
      if (error instanceof Error) {
        formatter.error(error.message);
      }
      process.exit(1);
    }

    // 2. 生成或加载 device_secret
    const deviceInfo = deviceSecretManager.getDeviceInfo();
    formatter.success(`Device ID: ${formatter.highlight(deviceInfo.deviceId.substring(0, 20) + '...')}`);
    formatter.success(`Device secret: ${formatter.highlight(deviceInfo.deviceSecret.substring(0, 16) + '...')}`);
    formatter.dim(`Platform: ${deviceInfo.platform}`);

    // 3. 启动 HTTP 服务
    formatter.newline();
    const serverSpinner = formatter.spinner('Starting HTTP server...');
    let actualPort: number;
    try {
      actualPort = await startServer(config, deviceInfo.deviceSecret);
      if (actualPort !== config.port) {
        serverSpinner.succeed(`Server running on port ${actualPort} (port ${config.port} was in use)`);
      } else {
        serverSpinner.succeed(`Server running on port ${actualPort}`);
      }
      // 更新配置中的端口为实际使用的端口
      config.port = actualPort;
    } catch (error) {
      serverSpinner.fail('Failed to start HTTP server');
      if (error instanceof Error) {
        formatter.error(error.message);
      }
      process.exit(1);
    }

    // 4. 初始化 MCP/ACP 服务
    formatter.newline();
    const serviceSpinner = formatter.spinner('Initializing MCP/ACP services...');
    try {
      await serviceInitializer.initializeServices(config.mcpServices || []);
      serviceSpinner.succeed('MCP/ACP services initialized');
    } catch (error) {
      serviceSpinner.fail('Failed to initialize services');
      if (error instanceof Error) {
        formatter.warning(error.message);
      }
      formatter.info('Continuing without MCP/ACP services...');
    }

    // 5. 创建 Cloudflare Tunnel
    formatter.newline();

    // 检查cloudflared是否已安装
    const cloudflaredInstalled = await tunnelManager.checkCloudflared();
    if (!cloudflaredInstalled) {
      formatter.warning('cloudflared is not installed');
      formatter.info('Please install cloudflared to enable tunnel functionality:');
      formatter.dim('  macOS: brew install cloudflare/cloudflare/cloudflared');
      formatter.dim('  Windows: choco install cloudflared');
      formatter.dim('  Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/');
      formatter.newline();
      formatter.info('Continuing without tunnel...');
    } else {
      const tunnelSpinner = formatter.spinner('Creating Cloudflare Tunnel...');
      try {
        const tunnelUrl = await tunnelManager.createTunnel(config.port);
        tunnelSpinner.succeed(`Tunnel URL: ${tunnelUrl}`);
      } catch (error) {
        tunnelSpinner.fail('Failed to create tunnel');
        if (error instanceof Error) {
          formatter.warning(error.message);
        }
        formatter.info('Continuing without tunnel...');
      }
    }

    // 6. 显示绑定信息
    formatter.newline();
    formatter.success('Device service is ready!');
    formatter.newline();

    const tunnelUrl = tunnelManager.getTunnelUrl();
    if (tunnelUrl) {
      formatter.labeled('Tunnel URL', tunnelUrl);
      formatter.labeled('Bind URL', `${config.appUrl}/devices/bind?secret=${deviceInfo.deviceSecret}&tunnel=${encodeURIComponent(tunnelUrl)}`);
    } else {
      formatter.labeled('Local URL', `http://localhost:${config.port}`);
      formatter.labeled('Bind URL', `${config.appUrl}/devices/bind?secret=${deviceInfo.deviceSecret}`);
      formatter.warning('Running without tunnel - device will only be accessible locally');
    }

    formatter.newline();
    formatter.dim('Press Ctrl+C to stop the service');

    // 7. 自动打开浏览器（如果未禁用）
    if (!options.ignoreOpenBindUrl) {
      formatter.newline();
      const bindUrl = tunnelUrl
        ? `${config.appUrl}/devices/bind?secret=${deviceInfo.deviceSecret}&tunnel=${encodeURIComponent(tunnelUrl)}`
        : `${config.appUrl}/devices/bind?secret=${deviceInfo.deviceSecret}`;

      try {
        formatter.info('Opening bind URL in browser...');
        await open(bindUrl);
        formatter.success('Browser opened successfully');
      } catch (error) {
        formatter.warning('Failed to open browser automatically');
        formatter.info(`Please manually open: ${bindUrl}`);
      }
    }

    // 保持进程运行
    await new Promise(() => {
      // 进程将一直运行直到用户按 Ctrl+C
    });
  } catch (error) {
    formatter.error('Failed to start device service');
    if (error instanceof Error) {
      formatter.error(error.message);
      formatter.errorStack(error);
    }
    await serviceInitializer.cleanup();
    tunnelManager.cleanup();
    process.exit(1);
  }
}

// 处理进程退出信号
process.on('SIGINT', async () => {
  formatter.newline();
  formatter.info('Shutting down device service...');
  await serviceInitializer.cleanup();
  tunnelManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  formatter.newline();
  formatter.info('Shutting down device service...');
  await serviceInitializer.cleanup();
  tunnelManager.cleanup();
  process.exit(0);
});
