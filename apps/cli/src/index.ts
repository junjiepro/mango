#!/usr/bin/env node

import { Command } from 'commander';
import { startDeviceService } from './commands/start.js';
import { formatter } from './lib/formatter.js';
import { configManager } from './lib/config.js';
import { deviceSecretManager } from './lib/device-secret.js';

const program = new Command();

program
  .name('mango')
  .description('Mango CLI - 智能Agent对话平台命令行工具')
  .version('0.1.0');

// Start command - 启动设备服务
program
  .command('start')
  .description('启动设备服务并创建Cloudflare Tunnel')
  .option('--port <port>', '本地服务端口', '3000')
  .option('--ignore-open-bind-url', '不自动打开绑定页面')
  .option('--app-url <url>', 'Mango Web URL', process.env.MANGO_APP_URL)
  .option('--supabase-url <url>', 'Supabase URL', process.env.SUPABASE_URL)
  .option('--supabase-anon-key <key>', 'Supabase anon key', process.env.SUPABASE_ANON_KEY)
  .option('--device-secret <secret>', 'Device secret (自动生成如果未提供)', process.env.DEVICE_SECRET)
  .action(async (options) => {
    await startDeviceService(options);
  });

// Config command - 配置管理
program
  .command('config')
  .description('管理MCP/ACP服务配置')
  .option('--list', '列出所有配置的服务')
  .option('--add <name>', '添加新服务')
  .option('--remove <name>', '删除服务')
  .action((options) => {
    if (options.list) {
      const services = configManager.loadMCPServices();
      if (services.length === 0) {
        formatter.info('No MCP services configured');
        return;
      }

      formatter.title('MCP Services');
      services.forEach((service) => {
        formatter.labeled(service.name, `${service.command} ${service.args.join(' ')}`);
        formatter.dim(`  Status: ${service.status}`);
      });
    } else if (options.add) {
      formatter.warning('Adding MCP service is in progress');
      formatter.dim('This feature will be available soon');
    } else if (options.remove) {
      const removed = configManager.removeMCPService(options.remove);
      if (removed) {
        formatter.success(`Service "${options.remove}" removed`);
      } else {
        formatter.error(`Service "${options.remove}" not found`);
      }
    } else {
      formatter.warning('Please use --list, --add, or --remove option');
    }
  });

// Status command - 查看设备服务状态
program
  .command('status')
  .description('查看设备服务状态')
  .action(() => {
    formatter.title('Device Service Status');

    try {
      const deviceInfo = deviceSecretManager.getDeviceInfo();
      const config = configManager.readConfig();

      formatter.keyValue({
        'Device ID': deviceInfo.deviceId.substring(0, 40) + '...',
        'Platform': deviceInfo.platform,
        'Config Dir': deviceSecretManager.getConfigDir(),
      });

      if (config) {
        formatter.newline();
        formatter.labeled('App URL', config.appUrl || 'Not configured');
        formatter.labeled('Port', config.port?.toString() || 'Not configured');
      }

      formatter.newline();
      const services = configManager.loadMCPServices();
      formatter.labeled('MCP Services', services.length.toString());
    } catch (error) {
      formatter.error('Failed to get device status');
      if (error instanceof Error) {
        formatter.error(error.message);
      }
    }
  });

// Help command - 显示帮助信息
program
  .command('help')
  .description('显示帮助信息')
  .action(() => {
    program.help();
  });

// 错误处理
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  formatter.error(`Error: ${err.message}`);
  process.exit(1);
});

program.parse();
