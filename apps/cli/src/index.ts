#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('mango')
  .description('Mango CLI - 智能Agent对话平台命令行工具')
  .version('0.1.0');

program
  .command('init')
  .description('初始化 Mango CLI 配置')
  .action(() => {
    console.log(chalk.green('✓ Mango CLI 初始化完成'));
    console.log(chalk.gray('使用 mango --help 查看所有可用命令'));
  });

program
  .command('auth')
  .description('认证管理')
  .option('-l, --login', '登录到 Mango 平台')
  .option('-o, --logout', '退出登录')
  .action((options) => {
    if (options.login) {
      console.log(chalk.blue('正在登录...'));
      console.log(chalk.yellow('此功能即将推出'));
    } else if (options.logout) {
      console.log(chalk.blue('正在退出...'));
      console.log(chalk.green('✓ 已退出'));
    } else {
      console.log(chalk.yellow('请使用 --login 或 --logout 选项'));
    }
  });

program.parse();
