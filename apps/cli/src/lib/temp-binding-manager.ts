/**
 * Temporary Binding Code Manager
 * 临时绑定码管理器（运行时内存）
 *
 * 临时绑定码仅存在于 CLI 运行时内存中，不持久化到数据库
 * 用于建立 Realtime Channel 和完成设备绑定
 * 支持多个临时绑定码同时存在，每个绑定码对应一个独立的 Channel
 */

import { randomBytes } from 'crypto';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { formatter } from './formatter.js';
import os from 'os';

export interface DeviceUrls {
  cloudflare_url: string | null;
  localhost_url: string;
  hostname_url: string;
  tailscale_url?: string | null;
}

export interface DeviceInfo {
  platform: string;
  hostname: string;
  deviceId: string;
}

/**
 * 临时绑定信息
 */
interface TempBindingInfo {
  tempCode: string;
  channel: RealtimeChannel;
  deviceUrls: DeviceUrls;
  deviceInfo: DeviceInfo;
  createdAt: Date;
  isUsed: boolean;
}

/**
 * 临时绑定码管理器类
 */
export class TempBindingManager {
  private supabase: SupabaseClient | null = null;
  private bindings: Map<string, TempBindingInfo> = new Map();

  /**
   * 初始化 Supabase 客户端
   */
  initialize(supabaseUrl: string, supabaseAnonKey: string): void {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        timeout: 30000,
        heartbeatIntervalMs: 30000,
      },
    });
  }

  /**
   * 生成临时绑定码（8位随机字符串，仅存在于内存中）
   */
  generateTempCode(): string {
    const tempCode = randomBytes(4).toString('hex'); // 8位十六进制
    return tempCode;
  }

  /**
   * 获取所有活跃的临时绑定码
   */
  getActiveTempCodes(): string[] {
    return Array.from(this.bindings.keys()).filter((code) => !this.bindings.get(code)?.isUsed);
  }

  /**
   * 检查临时绑定码是否存在且未使用
   */
  isValidTempCode(tempCode: string): boolean {
    const binding = this.bindings.get(tempCode);
    return binding !== undefined && !binding.isUsed;
  }

  /**
   * 标记临时绑定码为已使用（绑定完成后调用）
   */
  markAsUsed(tempCode: string): void {
    const binding = this.bindings.get(tempCode);
    if (binding) {
      binding.isUsed = true;
      formatter.info(`Temp code ${tempCode} marked as used`);
    }
  }

  /**
   * 建立 Realtime Channel 并发送设备 URL（含重试）
   */
  async publishDeviceUrls(
    tempCode: string,
    deviceUrls: DeviceUrls,
    deviceInfo: DeviceInfo
  ): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    const SUBSCRIBE_TIMEOUT_MS = 30000;
    const MAX_RETRIES = 3;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const channel = this.supabase.channel(`binding:${tempCode}`);

      try {
        // 监听 Web 端的 URL 请求
        channel.on('broadcast', { event: 'request_urls' }, async () => {
          formatter.info(
            `Received URL request for temp code ${tempCode}, resending device URLs...`
          );
          await this.sendDeviceUrls(tempCode);
        });

        // 订阅 Channel，加外部超时保护
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            channel.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                resolve();
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                reject(new Error(`Channel subscription failed: ${status}`));
              }
            });
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Channel subscription timed out')),
              SUBSCRIBE_TIMEOUT_MS
            )
          ),
        ]);

        // 保存绑定信息
        const bindingInfo: TempBindingInfo = {
          tempCode,
          channel,
          deviceUrls,
          deviceInfo,
          createdAt: new Date(),
          isUsed: false,
        };
        this.bindings.set(tempCode, bindingInfo);

        // 首次发送设备 URL 到 Channel
        await this.sendDeviceUrls(tempCode);

        formatter.success(`Realtime Channel established: binding:${tempCode}`);
        formatter.success('Device URLs published to channel');
        formatter.info('Listening for URL requests from Web...');
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        formatter.warning(
          `Realtime Channel attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`
        );

        // 清理失败的 channel，避免泄漏
        try {
          await this.supabase.removeChannel(channel);
        } catch {
          // 忽略清理错误
        }

        if (attempt < MAX_RETRIES) {
          const delay = 1000 * attempt;
          formatter.info(`Retrying in ${delay / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to publish device URLs after ${MAX_RETRIES} attempts: ${lastError?.message}`
    );
  }

  /**
   * 发送设备 URL 到指定的 Channel
   */
  private async sendDeviceUrls(tempCode: string): Promise<void> {
    const binding = this.bindings.get(tempCode);
    if (!binding) {
      return;
    }

    await binding.channel.send({
      type: 'broadcast',
      event: 'device_urls',
      payload: {
        device_urls: binding.deviceUrls,
        device_info: binding.deviceInfo,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * 清理指定的临时绑定码和 Channel
   */
  async cleanupTempCode(tempCode: string): Promise<void> {
    const binding = this.bindings.get(tempCode);
    if (!binding) {
      return;
    }

    if (this.supabase) {
      try {
        await this.supabase.removeChannel(binding.channel);
        formatter.info(`Realtime Channel closed for temp code: ${tempCode}`);
      } catch (error) {
        formatter.warning(`Failed to close Realtime Channel for temp code: ${tempCode}`);
      }
    }

    this.bindings.delete(tempCode);
  }

  /**
   * 清理所有 Channel（进程退出时调用）
   */
  async cleanup(): Promise<void> {
    const tempCodes = Array.from(this.bindings.keys());
    for (const tempCode of tempCodes) {
      await this.cleanupTempCode(tempCode);
    }
    formatter.info('All Realtime Channels closed');
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo(deviceId: string): DeviceInfo {
    return {
      platform: process.platform,
      hostname: os.hostname(),
      deviceId,
    };
  }

  /**
   * 获取绑定信息统计
   */
  getStats(): { total: number; active: number; used: number } {
    const total = this.bindings.size;
    const used = Array.from(this.bindings.values()).filter((b) => b.isUsed).length;
    const active = total - used;
    return { total, active, used };
  }
}

// 导出单例实例
export const tempBindingManager = new TempBindingManager();
