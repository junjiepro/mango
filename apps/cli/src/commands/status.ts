/**
 * CLI Status Command
 * 显示设备服务状态
 */

import { formatter } from '../lib/formatter.js';
import { bindingCodeManager } from '../lib/binding-code-manager.js';
import { tunnelManager } from '../lib/tunnel-manager.js';
import { t } from '../i18n/index.js';
import os from 'os';

export function showStatus(): void {
  formatter.info(t('status.title') + '\n');

  console.log(t('status.systemInfo'));
  console.log(t('status.platform', { value: process.platform }));
  console.log(t('status.hostname', { value: os.hostname() }));
  console.log(t('status.arch', { value: os.arch() }));
  console.log(`  Node.js: ${process.version}\n`);

  const config = bindingCodeManager.readConfig();
  const bindingCount = config ? Object.keys(config).length : 0;

  console.log(t('status.bindingStatus'));
  if (bindingCount === 0) {
    console.log(t('status.noBindings') + '\n');
  } else {
    console.log(t('status.boundCount', { count: bindingCount }) + '\n');

    console.log(t('status.bindingDetails'));
    for (const [code, binding] of Object.entries(config || {})) {
      console.log(`  - ${binding.deviceName || t('status.unnamedDevice')}`);
      console.log(t('status.deviceId', { id: binding.deviceId }));
      console.log(t('status.boundAt', { time: binding.boundAt }));
      console.log(t('status.lastUsed', { time: binding.lastUsedAt }));

      if (binding.mcpServices && binding.mcpServices.length > 0) {
        console.log(t('status.mcpServices', { count: binding.mcpServices.length }));
        binding.mcpServices.forEach((service: any) => {
          console.log(`      - ${service.name}`);
        });
      }
      console.log('');
    }
  }

  const tunnelUrl = tunnelManager.getTunnelUrl();
  console.log(t('status.tunnelStatus'));
  if (tunnelUrl) {
    console.log(t('status.tunnelRunning'));
    console.log(t('status.tunnelUrl', { url: tunnelUrl }) + '\n');
  } else {
    console.log(t('status.tunnelStopped') + '\n');
  }

  if (bindingCount === 0) {
    formatter.info(t('status.hint'));
  }
}
