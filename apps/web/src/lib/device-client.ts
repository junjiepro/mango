/**
 * Device Client Library
 * 前端直接与CLI设备通信的工具库
 *
 * 设计原则:
 * - 前端直接与CLI端通信,避免Web Server中转
 * - 统一的错误处理和重试机制
 * - 类型安全的API调用
 */

import { DeviceBinding } from '@/services/DeviceService';

/**
 * 设备客户端配置
 */
export interface DeviceClientConfig {
  deviceId: string;
  deviceUrl: string;
  bindingCode: string;
  timeout?: number;
}

/**
 * 设备API响应类型
 */
export interface DeviceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 设备客户端错误
 */
export class DeviceClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'DeviceClientError';
  }
}

/**
 * 创建设备客户端配置
 */
export function createDeviceConfig(device: DeviceBinding): DeviceClientConfig | null {
  const deviceUrl = device.online_urls?.[0];

  if (!deviceUrl || !device.binding_code) {
    return null;
  }

  return {
    deviceId: device.id,
    deviceUrl,
    bindingCode: device.binding_code,
    timeout: 30000,
  };
}

/**
 * 设备客户端 - 直接与CLI端通信
 */
export class DeviceClient {
  constructor(private config: DeviceClientConfig) {}

  /**
   * 通用请求方法
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.deviceUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.timeout || 30000
    );

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.bindingCode}`,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new DeviceClientError(
          errorData.error || `请求失败: ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DeviceClientError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new DeviceClientError('请求超时', 408, error);
        }
        throw new DeviceClientError(error.message, undefined, error);
      }

      throw new DeviceClientError('未知错误', undefined, error);
    }
  }

  /**
   * GET 请求
   */
  async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const queryString = params
      ? '?' + new URLSearchParams(params).toString()
      : '';

    return this.request<T>(`${endpoint}${queryString}`, {
      method: 'GET',
    });
  }

  /**
   * POST 请求
   */
  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH 请求
   */
  async patch<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}
