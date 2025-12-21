/**
 * Device ID Generator
 * 设备 ID 生成器
 *
 * 基于硬件信息生成唯一的设备 ID
 */

import { createHash } from 'crypto';
import os from 'os';
import { execSync } from 'child_process';

/**
 * 获取本机 IP 地址
 * 优先返回 IPv4 地址,跳过内部和虚拟接口
 */
export function getLocalIpAddress(): string {
  const networkInterfaces = os.networkInterfaces();

  for (const name of Object.keys(networkInterfaces)) {
    const interfaces = networkInterfaces[name];
    if (!interfaces) continue;

    for (const iface of interfaces) {
      // 跳过内部接口、IPv6 地址和虚拟接口
      if (iface.internal || iface.family !== 'IPv4') {
        continue;
      }

      // 跳过虚拟网卡 (VirtualBox, VMware, Docker 等)
      const lowerName = name.toLowerCase();
      if (
        lowerName.includes('virtual') ||
        lowerName.includes('vmware') ||
        lowerName.includes('vbox') ||
        lowerName.includes('docker') ||
        lowerName.includes('veth')
      ) {
        continue;
      }

      return iface.address;
    }
  }

  return 'localhost';
}

/**
 * 获取 MAC 地址
 */
function getMacAddress(): string {
  const networkInterfaces = os.networkInterfaces();

  for (const name of Object.keys(networkInterfaces)) {
    const interfaces = networkInterfaces[name];
    if (!interfaces) continue;

    for (const iface of interfaces) {
      // 跳过内部和虚拟接口
      if (iface.internal || !iface.mac || iface.mac === '00:00:00:00:00:00') {
        continue;
      }
      return iface.mac;
    }
  }

  return 'unknown-mac';
}

/**
 * 获取机器 ID（特定于操作系统）
 */
function getMachineId(): string {
  try {
    const platform = process.platform;

    if (platform === 'win32') {
      // Windows: 使用 wmic 获取主板序列号
      const output = execSync('wmic csproduct get uuid', { encoding: 'utf-8' });
      const lines = output.split('\n').filter(line => line.trim());
      if (lines.length > 1) {
        return lines[1].trim();
      }
    } else if (platform === 'darwin') {
      // macOS: 使用硬件 UUID
      const output = execSync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID', {
        encoding: 'utf-8'
      });
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (match && match[1]) {
        return match[1];
      }
    } else if (platform === 'linux') {
      // Linux: 尝试读取 machine-id
      try {
        const output = execSync('cat /etc/machine-id || cat /var/lib/dbus/machine-id', {
          encoding: 'utf-8'
        });
        return output.trim();
      } catch {
        // 如果失败，尝试使用 DMI UUID
        try {
          const output = execSync('cat /sys/class/dmi/id/product_uuid', {
            encoding: 'utf-8'
          });
          return output.trim();
        } catch {
          // 忽略错误
        }
      }
    }
  } catch (error) {
    // 忽略错误，使用备用方案
  }

  return 'unknown-machine-id';
}

/**
 * 生成设备 ID
 *
 * 基于以下信息生成唯一的设备 ID：
 * - 主机名
 * - MAC 地址
 * - 机器 ID（操作系统特定）
 * - 平台信息
 */
export function generateDeviceId(): string {
  const hostname = os.hostname();
  const macAddress = getMacAddress();
  const machineId = getMachineId();
  const platform = process.platform;
  const arch = process.arch;

  // 组合所有信息
  const deviceInfo = `${hostname}|${macAddress}|${machineId}|${platform}|${arch}`;

  // 使用 SHA-256 生成哈希
  const hash = createHash('sha256');
  hash.update(deviceInfo);

  return hash.digest('hex');
}

/**
 * 获取设备信息摘要（用于显示）
 */
export function getDeviceInfoSummary(): {
  deviceId: string;
  hostname: string;
  platform: string;
  arch: string;
  macAddress: string;
} {
  return {
    deviceId: generateDeviceId(),
    hostname: os.hostname(),
    platform: process.platform,
    arch: process.arch,
    macAddress: getMacAddress(),
  };
}
