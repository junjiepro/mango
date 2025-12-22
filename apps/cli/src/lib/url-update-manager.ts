/**
 * URL Update Manager
 * 设备 URL 更新管理器
 *
 * 功能：
 * 1. 监听 tunnel URL 变化
 * 2. 调用 Edge Function 更新 device_url（包含三个可能的 URL）
 * 3. 处理更新失败，标记绑定失效
 * 4. 提供绑定状态查询接口
 */

import { formatter } from './formatter.js';
import type { BindingConfig } from './binding-code-manager.js';

/**
 * 设备 URL 对象
 */
export interface DeviceUrls {
  cloudflare_url: string | null;
  localhost_url: string | null;
  hostname_url: string | null;
}

/**
 * 绑定验证状态
 */
export interface BindingValidationStatus {
  /** 绑定码 */
  bindingCode: string;
  /** 是否有效 */
  isValid: boolean;
  /** 最后验证时间 */
  lastValidatedAt: string;
  /** 失败原因（如果失败） */
  failureReason?: string;
  /** 重试次数 */
  retryCount: number;
}

/**
 * URL 更新结果
 */
interface UpdateResult {
  success: boolean;
  error?: string;
}

/**
 * URL 更新管理器类
 */
export class UrlUpdateManager {
  private supabaseUrl: string = '';
  private bindingStatuses: Map<string, BindingValidationStatus> = new Map();
  private updateInProgress: Map<string, boolean> = new Map();
  private maxRetries: number = 3;
  private retryDelay: number = 5000; // 5秒

  /**
   * 初始化管理器
   */
  initialize(supabaseUrl: string): void {
    this.supabaseUrl = supabaseUrl;
    formatter.debug('URL Update Manager initialized');
  }

  /**
   * 更新设备 URL
   * @param bindingCode 绑定码
   * @param deviceId 设备 ID
   * @param deviceUrls 设备的三个可能的 URL
   * @returns 更新结果
   */
  async updateDeviceUrl(
    bindingCode: string,
    deviceId: string,
    deviceUrls: DeviceUrls
  ): Promise<UpdateResult> {
    // 防止并发更新
    if (this.updateInProgress.get(bindingCode)) {
      formatter.debug(`Update already in progress for binding: ${bindingCode.substring(0, 10)}...`);
      return { success: false, error: 'Update already in progress' };
    }

    this.updateInProgress.set(bindingCode, true);

    try {
      // 获取当前状态
      const status = this.bindingStatuses.get(bindingCode) || {
        bindingCode,
        isValid: true,
        lastValidatedAt: new Date().toISOString(),
        retryCount: 0,
      };

      // 调用 Edge Function
      const edgeFunctionUrl = `${this.supabaseUrl}/functions/v1/update-device-url`;

      formatter.debug(`Updating device URLs...`);
      if (deviceUrls.cloudflare_url) {
        formatter.debug(`  - Cloudflare: ${deviceUrls.cloudflare_url}`);
      }
      if (deviceUrls.localhost_url) {
        formatter.debug(`  - Localhost: ${deviceUrls.localhost_url}`);
      }
      if (deviceUrls.hostname_url) {
        formatter.debug(`  - Hostname: ${deviceUrls.hostname_url}`);
      }

      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          binding_code: bindingCode,
          device_id: deviceId,
          device_urls: deviceUrls,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 更新成功
        status.isValid = true;
        status.lastValidatedAt = new Date().toISOString();
        status.retryCount = 0;
        status.failureReason = undefined;
        this.bindingStatuses.set(bindingCode, status);

        formatter.success('Device URL updated successfully');
        return { success: true };
      } else {
        // 更新失败
        const errorMsg = result.error || result.details || 'Unknown error';
        formatter.error(`Failed to update device URL: ${errorMsg}`);

        // 增加重试计数
        status.retryCount += 1;
        status.lastValidatedAt = new Date().toISOString();
        status.failureReason = errorMsg;

        // 如果超过最大重试次数，标记为无效
        if (status.retryCount >= this.maxRetries) {
          status.isValid = false;
          formatter.warning(
            `Binding marked as invalid after ${this.maxRetries} failed attempts`
          );
        }

        this.bindingStatuses.set(bindingCode, status);

        return { success: false, error: errorMsg };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      formatter.error(`Failed to update device URL: ${errorMsg}`);

      // 更新状态
      const status = this.bindingStatuses.get(bindingCode) || {
        bindingCode,
        isValid: true,
        lastValidatedAt: new Date().toISOString(),
        retryCount: 0,
      };

      status.retryCount += 1;
      status.lastValidatedAt = new Date().toISOString();
      status.failureReason = errorMsg;

      if (status.retryCount >= this.maxRetries) {
        status.isValid = false;
        formatter.warning(`Binding marked as invalid after ${this.maxRetries} failed attempts`);
      }

      this.bindingStatuses.set(bindingCode, status);

      return { success: false, error: errorMsg };
    } finally {
      this.updateInProgress.set(bindingCode, false);
    }
  }

  /**
   * 带重试的更新设备 URL
   */
  async updateDeviceUrlWithRetry(
    bindingCode: string,
    deviceId: string,
    deviceUrls: DeviceUrls
  ): Promise<UpdateResult> {
    const status = this.bindingStatuses.get(bindingCode);

    // 如果已经标记为无效，不再重试
    if (status && !status.isValid) {
      return {
        success: false,
        error: 'Binding is marked as invalid',
      };
    }

    let lastError = '';
    const currentRetryCount = status?.retryCount || 0;
    const remainingRetries = Math.max(0, this.maxRetries - currentRetryCount);

    for (let i = 0; i <= remainingRetries; i++) {
      if (i > 0) {
        formatter.info(`Retrying URL update (${i}/${remainingRetries})...`);
        await this.delay(this.retryDelay);
      }

      const result = await this.updateDeviceUrl(bindingCode, deviceId, deviceUrls);

      if (result.success) {
        return result;
      }

      lastError = result.error || 'Unknown error';
    }

    return { success: false, error: lastError };
  }

  /**
   * 获取绑定验证状态
   */
  getBindingStatus(bindingCode: string): BindingValidationStatus | null {
    return this.bindingStatuses.get(bindingCode) || null;
  }

  /**
   * 获取所有绑定状态
   */
  getAllBindingStatuses(): BindingValidationStatus[] {
    return Array.from(this.bindingStatuses.values());
  }

  /**
   * 检查绑定是否有效
   */
  isBindingValid(bindingCode: string): boolean {
    const status = this.bindingStatuses.get(bindingCode);
    return status ? status.isValid : true; // 默认为有效
  }

  /**
   * 重置绑定状态（用于手动重试）
   */
  resetBindingStatus(bindingCode: string): void {
    const status = this.bindingStatuses.get(bindingCode);
    if (status) {
      status.isValid = true;
      status.retryCount = 0;
      status.failureReason = undefined;
      status.lastValidatedAt = new Date().toISOString();
      this.bindingStatuses.set(bindingCode, status);
      formatter.success('Binding status reset');
    }
  }

  /**
   * 清理所有状态
   */
  cleanup(): void {
    this.bindingStatuses.clear();
    this.updateInProgress.clear();
    formatter.debug('URL Update Manager cleaned up');
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 设置最大重试次数
   */
  setMaxRetries(maxRetries: number): void {
    this.maxRetries = maxRetries;
  }

  /**
   * 设置重试延迟
   */
  setRetryDelay(delayMs: number): void {
    this.retryDelay = delayMs;
  }
}

// 导出单例实例
export const urlUpdateManager = new UrlUpdateManager();
