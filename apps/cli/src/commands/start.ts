/**
 * Start Command
 * 启动设备服务并创建Cloudflare Tunnel
 * 使用新的绑定流程：临时绑定码 + Realtime Channel + 正式绑定码
 */

import { formatter } from '../lib/formatter.js';
import { configManager } from '../lib/config.js';
import { startServer } from '../server/index.js';
import { tunnelManager } from '../lib/tunnel-manager.js';
import { serviceInitializer } from '../lib/service-initializer.js';
import { tempBindingManager } from '../lib/temp-binding-manager.js';
import { bindingCodeManager } from '../lib/binding-code-manager.js';
import { generateDeviceId, getDeviceInfoSummary, getLocalIpAddress } from '../lib/device-id.js';
import open from 'open';
import os from 'os';
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

    // 2. 生成设备 ID
    const deviceInfo = getDeviceInfoSummary();
    formatter.success(`Device ID: ${formatter.highlight(deviceInfo.deviceId.substring(0, 20) + '...')}`);
    formatter.dim(`Platform: ${deviceInfo.platform} (${deviceInfo.arch})`);
    formatter.dim(`Hostname: ${deviceInfo.hostname}`);

    // 2.5 检查是否已有正式绑定码
    const existingConfig = bindingCodeManager.readConfig();
    const hasBindingCode = existingConfig !== null;

    if (hasBindingCode) {
      formatter.newline();
      formatter.success('Device is already bound');
      formatter.labeled('Binding Code', existingConfig!.bindingCode.substring(0, 20) + '...');
      formatter.labeled('Device Name', existingConfig!.deviceName);
      formatter.labeled('Bound At', new Date(existingConfig!.boundAt).toLocaleString());

      // 更新最后使用时间
      bindingCodeManager.updateLastUsedAt();
    }

    // 3. 启动 HTTP 服务
    formatter.newline();
    const serverSpinner = formatter.spinner('Starting HTTP server...');
    let actualPort: number;
    try {
      actualPort = await startServer(config);
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

    // 4. 创建 Cloudflare Tunnel
    formatter.newline();
    let tunnelUrl: string | null = null;

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
        tunnelUrl = await tunnelManager.createTunnel(config.port);
        tunnelSpinner.succeed('Cloudflare Tunnel created');
        formatter.labeled('  - Cloudflare URL', tunnelUrl);
      } catch (error) {
        tunnelSpinner.fail('Failed to create tunnel');
        if (error instanceof Error) {
          formatter.warning(error.message);
        }
        formatter.info('Continuing without tunnel...');
      }
    }

    // 5. 生成临时绑定码（仅在未绑定时）
    let tempCode: string | null = null;
    if (!hasBindingCode) {
      formatter.newline();
      tempCode = tempBindingManager.generateTempCode();
      formatter.success(`Temporary binding code generated: ${formatter.highlight(tempCode)}`);

      // 6. 初始化 Supabase 客户端并建立 Realtime Channel
      const channelSpinner = formatter.spinner('Establishing Realtime Channel...');
      try {
        tempBindingManager.initialize(config.supabaseUrl, config.supabaseAnonKey);

        // 准备设备 URL 信息
        const localIp = getLocalIpAddress();
        const deviceUrls = {
          cloudflare_url: tunnelUrl,
          localhost_url: `http://localhost:${actualPort}`,
          hostname_url: `http://${localIp}:${actualPort}`,
        };

        // 准备设备信息
        const deviceInfoPayload = {
          platform: deviceInfo.platform,
          hostname: deviceInfo.hostname,
          deviceId: deviceInfo.deviceId,
        };

        // 发送设备 URL 到 Channel
        await tempBindingManager.publishDeviceUrls(deviceUrls, deviceInfoPayload);
        channelSpinner.succeed(`Realtime Channel established: binding:${tempCode}`);
        formatter.success('Device URLs published to channel');
      } catch (error) {
        channelSpinner.fail('Failed to establish Realtime Channel');
        if (error instanceof Error) {
          formatter.error(error.message);
        }
        formatter.warning('Binding may not work without Realtime Channel');
      }
    }

    // 7. 初始化 MCP/ACP 服务
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

    // 8. 显示绑定信息
    formatter.newline();
    formatter.success('Device service is ready!');
    formatter.newline();

    const localIp = getLocalIpAddress();
    if (tunnelUrl) {
      formatter.labeled('Cloudflare URL', tunnelUrl);
    }
    formatter.labeled('Localhost URL', `http://localhost:${actualPort}`);
    formatter.labeled('Hostname URL', `http://${localIp}:${actualPort}`);

    // 只在未绑定时显示绑定 URL
    if (!hasBindingCode && tempCode) {
      formatter.newline();
      formatter.labeled('Bind URL', `${config.appUrl}/devices/bind?code=${tempCode}`);
    }

    formatter.newline();
    formatter.dim('Press Ctrl+C to stop the service');

    // 9. 自动打开浏览器（仅在未绑定且未禁用时）
    if (!hasBindingCode && !options.ignoreOpenBindUrl && tempCode) {
      formatter.newline();
      const bindUrl = `${config.appUrl}/devices/bind?code=${tempCode}`;

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
    await cleanup();
    process.exit(1);
  }
}

/**
 * 清理资源
 */
async function cleanup(): Promise<void> {
  await serviceInitializer.cleanup();
  await tempBindingManager.cleanup();
  tunnelManager.cleanup();
}

// 处理进程退出信号
process.on('SIGINT', async () => {
  formatter.newline();
  formatter.info('Shutting down device service...');
  await cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  formatter.newline();
  formatter.info('Shutting down device service...');
  await cleanup();
  process.exit(0);
});
