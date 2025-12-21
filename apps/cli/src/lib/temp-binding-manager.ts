/**
 * Temporary Binding Code Manager
 * 临时绑定码管理器（运行时内存）
 *
 * 临时绑定码仅存在于 CLI 运行时内存中，不持久化到数据库
 * 用于建立 Realtime Channel 和完成设备绑定
 */

import { randomBytes } from 'crypto';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { formatter } from './formatter.js';
import os from 'os';

export interface DeviceUrls {
  cloudflare_url: string | null;
  localhost_url: string;
  hostname_url: string;
}

export interface DeviceInfo {
  platform: string;
  hostname: string;
  deviceId: string;
}

/**
 * 临时绑定码管理器类
 */
export class TempBindingManager {
  private supabase: SupabaseClient | null = null;
  private tempCode: string | null = null;
  private channel: RealtimeChannel | null = null;
  private deviceUrls: DeviceUrls | null = null;
  private deviceInfo: DeviceInfo | null = null;

  /**
   * 初始化 Supabase 客户端
   */
  initialize(supabaseUrl: string, supabaseAnonKey: string): void {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  /**
   * 生成临时绑定码（8位随机字符串，仅存在于内存中）
   */
  generateTempCode(): string {
    this.tempCode = randomBytes(4).toString('hex'); // 8位十六进制
    return this.tempCode;
  }

  /**
   * 获取当前临时绑定码
   */
  getTempCode(): string | null {
    return this.tempCode;
  }

  /**
   * 建立 Realtime Channel 并发送设备 URL
   */
  async publishDeviceUrls(
    deviceUrls: DeviceUrls,
    deviceInfo: DeviceInfo
  ): Promise<void> {
    if (!this.supabase) {
      throw new Error('Supabase client not initialized');
    }

    if (!this.tempCode) {
      throw new Error('Temp code not generated');
    }

    // 保存设备信息,用于响应请求
    this.deviceUrls = deviceUrls;
    this.deviceInfo = deviceInfo;

    try {
      // 建立 Realtime Channel
      this.channel = this.supabase.channel(`binding:${this.tempCode}`);

      // 监听 Web 端的 URL 请求
      this.channel.on('broadcast', { event: 'request_urls' }, async (payload) => {
        formatter.info('Received URL request from Web, resending device URLs...');
        await this.sendDeviceUrls();
      });

      // 订阅 Channel
      await new Promise<void>((resolve, reject) => {
        if (!this.channel) {
          reject(new Error('Channel not created'));
          return;
        }

        this.channel
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              resolve();
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              reject(new Error(`Channel subscription failed: ${status}`));
            }
          });
      });

      // 首次发送设备 URL 到 Channel
      await this.sendDeviceUrls();

      formatter.success(`Realtime Channel established: binding:${this.tempCode}`);
      formatter.success('Device URLs published to channel');
      formatter.info('Listening for URL requests from Web...');
    } catch (error) {
      throw new Error(
        `Failed to publish device URLs: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * 发送设备 URL 到 Channel
   */
  private async sendDeviceUrls(): Promise<void> {
    if (!this.channel || !this.deviceUrls || !this.deviceInfo) {
      return;
    }

    await this.channel.send({
      type: 'broadcast',
      event: 'device_urls',
      payload: {
        device_urls: this.deviceUrls,
        device_info: this.deviceInfo,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * 清理 Channel（绑定完成后调用）
   */
  async cleanup(): Promise<void> {
    if (this.channel && this.supabase) {
      try {
        await this.supabase.removeChannel(this.channel);
        formatter.info('Realtime Channel closed');
      } catch (error) {
        formatter.warning('Failed to close Realtime Channel');
      }
      this.channel = null;
    }
    this.tempCode = null;
    this.deviceUrls = null;
    this.deviceInfo = null;
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
}

// 导出单例实例
export const tempBindingManager = new TempBindingManager();
