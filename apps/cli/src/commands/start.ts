/**
 * Start Command
 * 启动设备服务并创建Cloudflare Tunnel
 * 使用新的绑定流程：临时绑定码 + Realtime Channel + 正式绑定码
 */

import { formatter } from '../lib/formatter.js';
import { configManager } from '../lib/config.js';
import { startServer, type TlsOptions } from '../server/index.js';
import { tunnelManager } from '../lib/tunnel-manager.js';
import { obtainCertificate } from '../lib/cert-manager.js';
import { serviceInitializer } from '../lib/service-initializer.js';
import { tempBindingManager } from '../lib/temp-binding-manager.js';
import { bindingCodeManager } from '../lib/binding-code-manager.js';
import { urlUpdateManager } from '../lib/url-update-manager.js';
import { getDeviceInfoSummary, getLocalIpAddress, getTailscaleAddress } from '../lib/device-id.js';
import { acpConnector } from '../lib/connectors/acp-connector.js';
import {
  buildDeviceUrls,
  hasReachableDeviceUrl,
  requiresSecureDeviceUrls,
} from '../lib/device-urls.js';
import open from 'open';
import type { StartCommandOptions } from '../types/index.js';
import { deviceSecretManager } from '../lib/device-secret.js';

export let actualPort: number;
export let actualHttpsPort: number | undefined;

/** 生成 Tailscale URL，HTTPS 可用时使用 https 协议和 HTTPS 端口 */

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
      config.deviceSecret = deviceSecretManager.getOrCreateSecret(config.deviceSecret);
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
    formatter.success(
      `Device ID: ${formatter.highlight(deviceInfo.deviceId.substring(0, 20) + '...')}`
    );
    formatter.dim(`Platform: ${deviceInfo.platform} (${deviceInfo.arch})`);
    formatter.dim(`Hostname: ${deviceInfo.hostname}`);

    // 2.5 初始化 URL 更新管理器
    urlUpdateManager.initialize(config.supabaseUrl);

    // 2.6 检查是否已有正式绑定码
    const existingConfig = bindingCodeManager.readConfig();
    const bindingCodes: string[] = Object.keys(existingConfig || {});
    const hasBindingCode = bindingCodes.length > 0;

    if (hasBindingCode) {
      formatter.newline();
      formatter.success('Device is already bound');
      // 更新最后使用时间
      bindingCodeManager.updateLastUsedAt();
    }

    // 3. 获取 HTTPS 证书（多策略降级：Tailscale → mkcert）
    formatter.newline();
    const tailscaleAddr = getTailscaleAddress();
    const localIpForCert = getLocalIpAddress();
    let tlsOptions: TlsOptions | undefined;

    // 构建需要覆盖的域名列表
    const certDomains = ['localhost', localIpForCert];
    if (tailscaleAddr) certDomains.push(tailscaleAddr);

    // Tailscale 域名（非纯 IP 时才传给 Tailscale 策略）
    const tailscaleDomain =
      tailscaleAddr && /[a-zA-Z]/.test(tailscaleAddr) ? tailscaleAddr : undefined;

    const certSpinner = formatter.spinner('Obtaining HTTPS certificate...');
    const certResult = await obtainCertificate(certDomains, tailscaleDomain);

    if (certResult) {
      tlsOptions = {
        cert: certResult.cert,
        key: certResult.key,
        httpsPort: config.port + 1,
      };
      const sourceHints: Record<string, string> = {
        tailscale: 'Tailscale trusted certificate',
        mkcert: 'mkcert trusted certificate',
      };
      certSpinner.succeed(`HTTPS certificate obtained (${sourceHints[certResult.source]})`);
    } else {
      certSpinner.fail('Failed to obtain HTTPS certificate, falling back to HTTP only');
    }

    const serverSpinner = formatter.spinner('Starting HTTP server...');
    try {
      const serverResult = await startServer(config, tlsOptions);
      actualPort = serverResult.httpPort;
      actualHttpsPort = serverResult.httpsPort;

      if (actualPort !== config.port) {
        serverSpinner.succeed(
          `Server running on port ${actualPort} (port ${config.port} was in use)`
        );
      } else {
        serverSpinner.succeed(`Server running on port ${actualPort}`);
      }
      if (actualHttpsPort) {
        formatter.success(`HTTPS server running on port ${actualHttpsPort}`);
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
    // 初始化临时绑定管理器
    tempBindingManager.initialize(config.supabaseUrl, config.supabaseAnonKey);

    // 4. 创建 Cloudflare Tunnel
    formatter.newline();
    let tunnelUrl: string | null = null;
    const localIp = localIpForCert;
    const getCurrentDeviceUrls = (currentTunnelUrl: string | null = tunnelUrl) =>
      buildDeviceUrls({
        appUrl: config.appUrl,
        tunnelUrl: currentTunnelUrl,
        httpPort: actualPort,
        httpsPort: actualHttpsPort,
        localIp,
        tailscaleAddr,
      });

    const cloudflaredInstalled = await tunnelManager.checkCloudflared();
    if (!cloudflaredInstalled) {
      formatter.warning('cloudflared is not installed');
      formatter.info('Please install cloudflared to enable tunnel functionality:');
      formatter.dim('  macOS: brew install cloudflare/cloudflare/cloudflared');
      formatter.dim('  Windows: choco install cloudflared');
      formatter.dim(
        '  Linux: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/'
      );
      formatter.newline();
      formatter.info('Continuing without tunnel...');
    } else {
      const tunnelSpinner = formatter.spinner('Creating Cloudflare Tunnel...');
      try {
        tunnelUrl = await tunnelManager.createTunnel(config.port);
        tunnelSpinner.succeed('Cloudflare Tunnel created');
        formatter.labeled('  - Cloudflare URL', tunnelUrl);

        // 设置 URL 变化监听（仅在已绑定时）
        if (tunnelUrl) {
          tunnelManager.onUrlChange(async (newTunnelUrl) => {
            formatter.newline();
            formatter.info('Tunnel URL changed, updating device bindings...');

            // 准备新的设备 URL 信息
            const newDeviceUrls = getCurrentDeviceUrls(newTunnelUrl);

            const existingConfig = bindingCodeManager.readConfig();
            const bindingCodes: string[] = Object.keys(existingConfig || {});

            // 更新所有绑定的 device_url
            for (const bindingCode of bindingCodes) {
              urlUpdateManager
                .updateDeviceUrlWithRetry(bindingCode, deviceInfo.deviceId, newDeviceUrls)
                .then((result) => {
                  if (!result.success) {
                    formatter.error(
                      `Failed to update device URLs for binding ${bindingCode.substring(0, 10)}...`
                    );
                    formatter.warning('This binding will be marked as invalid');
                  }
                });
            }
          });
        }
      } catch (error) {
        tunnelSpinner.fail('Failed to create tunnel');
        if (error instanceof Error) {
          formatter.warning(error.message);
        }
        formatter.info('Continuing without tunnel...');
      }
    }

    // 5. 初始 URL 更新（如果已绑定）
    const currentDeviceUrls = getCurrentDeviceUrls();
    if (requiresSecureDeviceUrls(config.appUrl) && !hasReachableDeviceUrl(currentDeviceUrls)) {
      formatter.error(
        `App URL ${config.appUrl} uses HTTPS, but no HTTPS device URL is available for binding`
      );
      formatter.error(
        'Enable the CLI HTTPS endpoint or Cloudflare Tunnel before using the web app over HTTPS'
      );
      await cleanup();
      process.exit(1);
    }

    const updateUrl = async () => {
      formatter.newline();
      const updateSpinner = formatter.spinner('Updating device URLs in database...');
      let allUpdatesSucceeded = true;

      // 准备设备 URL 信息
      const deviceUrls = getCurrentDeviceUrls();

      for (const bindingCode of bindingCodes) {
        const result = await urlUpdateManager.updateDeviceUrlWithRetry(
          bindingCode,
          deviceInfo.deviceId,
          deviceUrls
        );

        if (!result.success) {
          allUpdatesSucceeded = false;
          updateSpinner.fail(`Failed to update device URLs: ${result.error}`);
          formatter.warning(`Binding ${bindingCode.substring(0, 10)}... marked as invalid`);
        }
      }

      if (allUpdatesSucceeded) {
        updateSpinner.succeed('Device URLs updated successfully');
      }
    };

    updateUrl();

    // 6. 生成临时绑定码（仅在未绑定时）
    let tempCode: string | null = null;
    if (!hasBindingCode) {
      formatter.newline();
      tempCode = tempBindingManager.generateTempCode();
      formatter.success(`Temporary binding code generated: ${formatter.highlight(tempCode)}`);

      // 6. 初始化 Supabase 客户端并建立 Realtime Channel
      const channelSpinner = formatter.spinner('Establishing Realtime Channel...');
      try {
        // 准备设备 URL 信息
        const deviceUrls = getCurrentDeviceUrls();

        // 准备设备信息
        const deviceInfoPayload = {
          platform: deviceInfo.platform,
          hostname: deviceInfo.hostname,
          deviceId: deviceInfo.deviceId,
        };

        // 发送设备 URL 到 Channel（使用新的 API）
        await tempBindingManager.publishDeviceUrls(tempCode, deviceUrls, deviceInfoPayload);
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

    // 7. 显示 Device Secret（用于创建新的绑定）
    formatter.newline();
    if (config.deviceSecret) {
      formatter.dim('Use this secret to create new bindings via /new-binding endpoint');
    } else {
      formatter.warning('Device Secret not configured');
      formatter.dim('Set --device-secret parameter to enable /new-binding endpoint');
    }

    // 8. 初始化 MCP/ACP 服务（后台非阻塞）
    formatter.newline();
    if (hasBindingCode) {
      formatter.info('MCP/ACP services initializing in background...');
      acpConnector
        .initialize()
        .then(() => {
          const initPromises = bindingCodes.map((code) => {
            const servers = existingConfig?.[code]?.mcpServices || {};
            if (Object.keys(servers).length > 0) {
              return serviceInitializer.initializeServices(Object.values(servers), code);
            }
            return Promise.resolve();
          });
          return Promise.all(initPromises);
        })
        .then(() => {
          formatter.success('All MCP/ACP services initialized');
        })
        .catch((error) => {
          formatter.warning(
            `MCP/ACP initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        });
    } else {
      formatter.dim('No binding codes found, skipping MCP/ACP initialization');
    }

    // 9. 显示绑定信息
    formatter.newline();
    formatter.success('Device service is ready!');
    formatter.newline();

    if (currentDeviceUrls.cloudflare_url) {
      formatter.labeled('Cloudflare URL', currentDeviceUrls.cloudflare_url);
    }
    if (currentDeviceUrls.localhost_url) {
      formatter.labeled('Localhost URL', currentDeviceUrls.localhost_url);
    }
    if (currentDeviceUrls.hostname_url) {
      formatter.labeled('Hostname URL', currentDeviceUrls.hostname_url);
    }
    if (currentDeviceUrls.tailscale_url) {
      formatter.labeled('Tailscale URL', currentDeviceUrls.tailscale_url);
    }

    // 只在未绑定时显示绑定 URL
    if (!hasBindingCode && tempCode) {
      formatter.newline();
      formatter.labeled('Bind URL', `${config.appUrl}/devices/bind?code=${tempCode}`);
    }

    formatter.newline();
    formatter.dim('Press Ctrl+C to stop the service');

    // 10. 自动打开浏览器（仅在未绑定且未禁用时）
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
  urlUpdateManager.cleanup();
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
