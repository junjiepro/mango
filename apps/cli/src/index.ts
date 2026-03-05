#!/usr/bin/env node

import { Command } from 'commander';
import { startDeviceService } from './commands/start.js';
import { showHelp } from './commands/help.js';
import { showVersion } from './commands/version.js';
import { showStatus } from './commands/status.js';
import { formatter } from './lib/formatter.js';
import { initLocale, t } from './i18n/index.js';

// Initialize locale from environment
initLocale();

// 全局错误处理 - 防止进程崩溃
process.on('uncaughtException', (error) => {
  formatter.error('Uncaught Exception:');
  formatter.error(error.message);
  if (error.stack) {
    formatter.errorStack(error);
  }
  // 不退出进程，让服务继续运行
});

process.on('unhandledRejection', (reason, promise) => {
  formatter.error('Unhandled Promise Rejection:');
  if (reason instanceof Error) {
    formatter.error(reason.message);
    if (reason.stack) {
      formatter.errorStack(reason);
    }
  } else {
    formatter.error(String(reason));
  }
  // 不退出进程，让服务继续运行
});

const program = new Command();

program.name('mango-ai-cli').description(t('app.description')).version('0.1.0');

// Start command
program
  .command('start')
  .description(t('commands.start'))
  .option('--port <port>', t('options.port'), '3000')
  .option('--ignore-open-bind-url', t('options.ignoreOpenBind'))
  .option('--app-url <url>', 'Mango Web URL', process.env.MANGO_APP_URL)
  .option('--supabase-url <url>', 'Supabase URL', process.env.SUPABASE_URL)
  .option('--supabase-anon-key <key>', 'Supabase anon key', process.env.SUPABASE_ANON_KEY)
  .option('--device-secret <secret>', t('options.deviceSecret'), process.env.DEVICE_SECRET)
  .action(async (options) => {
    await startDeviceService(options);
  });

// Config command
program
  .command('config')
  .description(t('commands.config'))
  .option('--list', t('options.configList'))
  .option('--add <name>', t('options.configAdd'))
  .option('--remove <name>', t('options.configRemove'))
  .action((options) => {
    if (options.list) {
      formatter.dim('This feature will be available soon');
    } else if (options.add) {
      formatter.warning('Adding MCP service is in progress');
      formatter.dim('This feature will be available soon');
    } else if (options.remove) {
      formatter.dim('This feature will be available soon');
    } else {
      formatter.warning('Please use --list, --add, or --remove option');
    }
  });

// Status command
program
  .command('status')
  .description(t('commands.status'))
  .action(() => {
    showStatus();
  });

// Version command
program
  .command('version')
  .description(t('commands.version'))
  .action(() => {
    showVersion();
  });

// Help command
program
  .command('help')
  .description(t('commands.help'))
  .action(() => {
    showHelp();
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
