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
 * 检查 MAC 地址是否为虚拟网卡
 * 基于常见虚拟化软件的 MAC 地址前缀
 */
function isVirtualMac(mac: string): boolean {
  const virtualPrefixes = [
    '00:05:69', // VMware
    '00:0c:29', // VMware
    '00:1c:14', // VMware
    '00:50:56', // VMware
    '08:00:27', // VirtualBox
    '0a:00:27', // VirtualBox
    '00:15:5d', // Hyper-V
    '00:16:3e', // Xen
    '52:54:00', // QEMU/KVM
    '02:00:00', // Docker
  ];

  const macPrefix = mac.substring(0, 8).toLowerCase();
  return virtualPrefixes.some((prefix) => macPrefix.startsWith(prefix.toLowerCase()));
}

/**
 * 获取 MAC 地址
 * 优先获取物理网卡的 MAC 地址，跳过虚拟网卡
 */
function getMacAddress(): string {
  const networkInterfaces = os.networkInterfaces();
  const validMacs: Array<{ name: string; mac: string; priority: number }> = [];

  for (const name of Object.keys(networkInterfaces)) {
    const interfaces = networkInterfaces[name];
    if (!interfaces) continue;

    const lowerName = name.toLowerCase();

    // 跳过虚拟网卡和 VPN（按名称）
    if (
      lowerName.includes('virtual') ||
      lowerName.includes('vmware') ||
      lowerName.includes('vbox') ||
      lowerName.includes('docker') ||
      lowerName.includes('veth') ||
      lowerName.includes('hyper-v') ||
      lowerName.includes('wsl') ||
      lowerName.includes('tailscale') ||
      lowerName.includes('loopback')
    ) {
      continue;
    }

    for (const iface of interfaces) {
      // 跳过内部接口和无效 MAC
      if (iface.internal || !iface.mac || iface.mac === '00:00:00:00:00:00') {
        continue;
      }

      // 跳过虚拟网卡（按 MAC 地址前缀）
      if (isVirtualMac(iface.mac)) {
        continue;
      }

      // 计算优先级：物理网卡 > 其他
      let priority = 0;
      if (lowerName.includes('eth') || lowerName.includes('以太网')) {
        priority = 100; // 有线网卡最高优先级
      } else if (lowerName.includes('wlan') || lowerName.includes('wi-fi') || lowerName.includes('无线')) {
        priority = 90; // 无线网卡次优先级
      }

      validMacs.push({ name, mac: iface.mac, priority });
    }
  }

  // 按优先级排序，优先级相同则按 MAC 地址字典序排序（确保稳定性）
  validMacs.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.mac.localeCompare(b.mac);
  });

  return validMacs.length > 0 ? validMacs[0].mac : 'unknown-mac';
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
      const lines = output.split('\n').filter((line) => line.trim());
      if (lines.length > 1) {
        return lines[1].trim();
      }
    } else if (platform === 'darwin') {
      // macOS: 使用硬件 UUID
      const output = execSync('ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID', {
        encoding: 'utf-8',
      });
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (match && match[1]) {
        return match[1];
      }
    } else if (platform === 'linux') {
      // Linux: 尝试读取 machine-id
      try {
        const output = execSync('cat /etc/machine-id || cat /var/lib/dbus/machine-id', {
          encoding: 'utf-8',
        });
        return output.trim();
      } catch {
        // 如果失败，尝试使用 DMI UUID
        try {
          const output = execSync('cat /sys/class/dmi/id/product_uuid', {
            encoding: 'utf-8',
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

/**
 * 判断 IP 是否属于 Tailscale CGNAT 地址段 100.64.0.0/10
 */
export function isTailscaleIp(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const first = parseInt(parts[0], 10);
  const second = parseInt(parts[1], 10);
  // 100.64.0.0/10 => first octet = 100, second octet 64-127
  return first === 100 && second >= 64 && second <= 127;
}

/**
 * 获取 Tailscale 地址（MagicDNS 域名优先，IP 回退）
 *
 * 检测优先级：
 * 1. `tailscale status --json` → Self.DNSName（MagicDNS 域名）
 * 2. 同一 JSON → Self.TailscaleIPs[0]（IPv4）
 * 3. 网络接口名称含 "tailscale" 的 IPv4 地址
 * 4. 所有接口中匹配 CGNAT 100.64.0.0/10 的 IPv4 地址
 * 5. 未安装/未运行时返回 null
 */
export function getTailscaleAddress(): string | null {
  // 策略 1 & 2: 通过 tailscale CLI 获取
  try {
    const output = execSync('tailscale status --json', {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const status = JSON.parse(output);

    // 优先使用 MagicDNS 域名
    if (status.Self?.DNSName) {
      const dnsName = status.Self.DNSName.replace(/\.$/, '');
      if (dnsName) return dnsName;
    }

    // 回退到 Tailscale IP
    const ips: string[] = status.Self?.TailscaleIPs || [];
    const ipv4 = ips.find((ip: string) => ip.includes('.'));
    if (ipv4) return ipv4;
  } catch {
    // tailscale 未安装或未运行，继续尝试网络接口检测
  }

  // 策略 3: 通过网络接口名称检测
  const networkInterfaces = os.networkInterfaces();
  for (const name of Object.keys(networkInterfaces)) {
    if (name.toLowerCase().includes('tailscale')) {
      const interfaces = networkInterfaces[name];
      if (!interfaces) continue;
      for (const iface of interfaces) {
        if (!iface.internal && iface.family === 'IPv4') {
          return iface.address;
        }
      }
    }
  }

  // 策略 4: 扫描所有接口匹配 CGNAT 地址段
  for (const name of Object.keys(networkInterfaces)) {
    const interfaces = networkInterfaces[name];
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (!iface.internal && iface.family === 'IPv4' && isTailscaleIp(iface.address)) {
        return iface.address;
      }
    }
  }

  return null;
}
