/**
 * CLI Status Command
 * 显示设备服务状态
 */

import { formatter } from '../lib/formatter.js';
import { bindingCodeManager } from '../lib/binding-code-manager.js';
import { tunnelManager } from '../lib/tunnel-manager.js';
import os from 'os';

export function showStatus(): void {
  formatter.info('设备服务状态\n');

  // 显示系统信息
  console.log('系统信息:');
  console.log(`  平台: ${process.platform}`);
  console.log(`  主机名: ${os.hostname()}`);
  console.log(`  架构: ${os.arch()}`);
  console.log(`  Node.js: ${process.version}\n`);

  // 显示绑定信息
  const config = bindingCodeManager.readConfig();
  const bindingCount = config ? Object.keys(config).length : 0;

  console.log('绑定状态:');
  if (bindingCount === 0) {
    console.log('  未绑定任何设备\n');
  } else {
    console.log(`  已绑定设备数: ${bindingCount}\n`);

    console.log('绑定详情:');
    for (const [code, binding] of Object.entries(config || {})) {
      console.log(`  - ${binding.deviceName || '未命名设备'}`);
      console.log(`    设备ID: ${binding.deviceId}`);
      console.log(`    绑定时间: ${binding.boundAt}`);
      console.log(`    最后使用: ${binding.lastUsedAt}`);

      if (binding.mcpServices && binding.mcpServices.length > 0) {
        console.log(`    MCP服务: ${binding.mcpServices.length} 个`);
        binding.mcpServices.forEach((service: any) => {
          console.log(`      - ${service.name}`);
        });
      }
      console.log('');
    }
  }

  // 显示 Tunnel 状态
  const tunnelUrl = tunnelManager.getTunnelUrl();
  console.log('Tunnel 状态:');
  if (tunnelUrl) {
    console.log(`  状态: 运行中`);
    console.log(`  URL: ${tunnelUrl}\n`);
  } else {
    console.log('  状态: 未运行\n');
  }

  // 提示信息
  if (bindingCount === 0) {
    formatter.info('提示: 运行 "mango-cli start" 启动设备服务并完成绑定');
  }
}
