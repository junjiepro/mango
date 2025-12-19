/**
 * Device Secret Manager
 * 管理设备密钥的生成、存储和读取
 */

import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, hostname } from 'os';
import type { DeviceInfo } from '../types/index.js';

export class DeviceSecretManager {
  private configDir: string;
  private secretPath: string;
  private deviceIdPath: string;

  constructor() {
    // 存储在用户目录下的隐藏文件夹
    this.configDir = join(homedir(), '.mango');
    this.secretPath = join(this.configDir, 'device_secret');
    this.deviceIdPath = join(this.configDir, 'device_id');
  }

  /**
   * 获取或创建设备密钥
   */
  getOrCreateSecret(): string {
    if (existsSync(this.secretPath)) {
      return readFileSync(this.secretPath, 'utf-8').trim();
    }

    // 生成 256 位随机密钥
    const secret = randomBytes(32).toString('base64url');

    // 确保配置目录存在
    this.ensureConfigDir();

    // 安全存储（仅当前用户可读）
    writeFileSync(this.secretPath, secret, { mode: 0o600 });

    return secret;
  }

  /**
   * 获取设备密钥（如果不存在则抛出错误）
   */
  getSecret(): string {
    if (!existsSync(this.secretPath)) {
      throw new Error('Device secret not found. Please run the service first.');
    }
    return readFileSync(this.secretPath, 'utf-8').trim();
  }

  /**
   * 生成设备ID（基于硬件信息）
   */
  generateDeviceId(): string {
    if (existsSync(this.deviceIdPath)) {
      return readFileSync(this.deviceIdPath, 'utf-8').trim();
    }

    // 基于主机名和平台生成设备ID
    const hostName = hostname();
    const platform = process.platform;
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    const deviceId = `${platform}-${hostName}-${timestamp}-${random}`;

    // 存储设备ID
    this.ensureConfigDir();
    writeFileSync(this.deviceIdPath, deviceId, { mode: 0o600 });

    return deviceId;
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo(): DeviceInfo {
    const deviceId = this.generateDeviceId();
    const deviceSecret = this.getOrCreateSecret();
    const platform = this.getPlatform();

    return {
      deviceId,
      deviceSecret,
      platform,
    };
  }

  /**
   * 获取平台信息
   */
  private getPlatform(): 'windows' | 'macos' | 'linux' {
    const platform = process.platform;
    if (platform === 'win32') return 'windows';
    if (platform === 'darwin') return 'macos';
    return 'linux';
  }

  /**
   * 确保配置目录存在
   */
  private ensureConfigDir(): void {
    if (!existsSync(this.configDir)) {
      mkdirSync(this.configDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * 获取配置目录路径
   */
  getConfigDir(): string {
    return this.configDir;
  }

  /**
   * 删除设备密钥和ID（用于重置）
   */
  reset(): void {
    if (existsSync(this.secretPath)) {
      writeFileSync(this.secretPath, '', { mode: 0o600 });
    }
    if (existsSync(this.deviceIdPath)) {
      writeFileSync(this.deviceIdPath, '', { mode: 0o600 });
    }
  }
}

// 导出单例实例
export const deviceSecretManager = new DeviceSecretManager();
