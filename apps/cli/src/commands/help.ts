/**
 * CLI Help Command
 * 显示帮助信息
 */

import { formatter } from '../lib/formatter.js';

export function showHelp(): void {
  formatter.info('Mango CLI - 智能Agent对话平台设备服务工具\n');

  console.log('用法:');
  console.log('  mango-cli <command> [options]\n');

  console.log('命令:');
  console.log('  start       启动设备服务');
  console.log('  status      显示设备服务状态');
  console.log('  version     显示版本信息');
  console.log('  help        显示帮助信息\n');

  console.log('start 命令选项:');
  console.log('  --port <port>                  指定服务端口 (默认: 3100)');
  console.log('  --app-url <url>                指定 Mango Web 应用 URL');
  console.log('  --supabase-url <url>           指定 Supabase URL');
  console.log('  --supabase-anon-key <key>      指定 Supabase 匿名密钥');
  console.log('  --ignore-open-bind-url         不自动打开绑定页面');
  console.log('  --no-tunnel                    不创建 Cloudflare Tunnel\n');

  console.log('示例:');
  console.log('  # 启动设备服务（默认配置）');
  console.log('  mango-cli start\n');

  console.log('  # 启动设备服务并指定端口');
  console.log('  mango-cli start --port 3200\n');

  console.log('  # 启动设备服务但不自动打开浏览器');
  console.log('  mango-cli start --ignore-open-bind-url\n');

  console.log('  # 查看设备服务状态');
  console.log('  mango-cli status\n');

  console.log('更多信息:');
  console.log('  文档: https://github.com/your-org/mango');
  console.log('  问题反馈: https://github.com/your-org/mango/issues');
}
