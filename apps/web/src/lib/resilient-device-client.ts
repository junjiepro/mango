/**
 * Resilient Device Client
 * 带有自动重试、URL刷新和健康检查的弹性设备通信客户端
 *
 * 设计原则:
 * - 自动检测CLI端服务URL变更并刷新
 * - 请求失败时自动重试（带有最大重试次数限制，避免无限循环）
 * - 健康检查确保连接可用性
 * - 事件通知连接状态变化
 */

import { DeviceBinding } from '@/services/DeviceService';

/**
 * 弹性客户端配置
 */
export interface ResilientClientConfig {
  deviceId: string;
  bindingCode: string;
  /** 初始设备URL（可能已过期） */
  initialUrl: string;
  /** 获取最新设备URL的函数 */
  urlRefresher: () => Promise<RefreshUrlResult>;
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数（避免无限循环） */
  maxRetries?: number;
  /** 重试间隔（毫秒） */
  retryDelay?: number;
  /** 健康检查超时（毫秒） */
  healthCheckTimeout?: number;
  /** 连接状态变化回调 */
  onConnectionStatusChange?: (status: ConnectionStatus) => void;
}

/**
 * URL刷新结果
 */
export interface RefreshUrlResult {
  success: boolean;
  urls: string[];
  error?: string;
}

/**
 * 连接状态
 */
export type ConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'url_refreshing';

/**
 * 请求上下文（用于重试时传递）
 */
interface RequestContext {
  endpoint: string;
  options: RequestInit;
  retryCount: number;
  isRetry: boolean;
}

/**
 * 弹性设备客户端错误
 */
export class ResilientClientError extends Error {
  constructor(
    message: string,
    public code: ResilientErrorCode,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ResilientClientError';
  }
}

/**
 * 错误码
 */
export enum ResilientErrorCode {
  /** 网络不可达 */
  NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
  /** 请求超时 */
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  /** 达到最大重试次数 */
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
  /** URL刷新失败 */
  URL_REFRESH_FAILED = 'URL_REFRESH_FAILED',
  /** 健康检查失败 */
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  /** 设备离线 */
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  /** 认证失败 */
  AUTH_FAILED = 'AUTH_FAILED',
  /** 服务端错误 */
  SERVER_ERROR = 'SERVER_ERROR',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  timeout: 30000,
  maxRetries: 2,
  retryDelay: 1000,
  healthCheckTimeout: 5000,
};

/**
 * 弹性设备客户端
 * 处理CLI服务重启导致的URL变更，自动重试和恢复连接
 */
export class ResilientDeviceClient {
  private currentUrl: string;
  private config: Required<
    Omit<ResilientClientConfig, 'onConnectionStatusChange'>
  > & {
    onConnectionStatusChange?: (status: ConnectionStatus) => void;
  };
  private connectionStatus: ConnectionStatus = 'disconnected';
  private lastHealthCheck: number = 0;
  private isRefreshingUrl: boolean = false;
  private refreshUrlPromise: Promise<string | null> | null = null;

  constructor(config: ResilientClientConfig) {
    this.currentUrl = config.initialUrl;
    this.config = {
      deviceId: config.deviceId,
      bindingCode: config.bindingCode,
      initialUrl: config.initialUrl,
      urlRefresher: config.urlRefresher,
      timeout: config.timeout ?? DEFAULT_CONFIG.timeout,
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
      retryDelay: config.retryDelay ?? DEFAULT_CONFIG.retryDelay,
      healthCheckTimeout:
        config.healthCheckTimeout ?? DEFAULT_CONFIG.healthCheckTimeout,
      onConnectionStatusChange: config.onConnectionStatusChange,
    };
  }

  /**
   * 获取当前URL
   */
  get deviceUrl(): string {
    return this.currentUrl;
  }

  /**
   * 获取绑定码
   */
  get bindingCode(): string {
    return this.config.bindingCode;
  }

  /**
   * 获取当前连接状态
   */
  get status(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * 更新连接状态
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.config.onConnectionStatusChange?.(status);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(url?: string): Promise<boolean> {
    const targetUrl = url ?? this.currentUrl;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.config.healthCheckTimeout
    );

    try {
      const response = await fetch(`${targetUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        this.lastHealthCheck = Date.now();
        return true;
      }
      return false;
    } catch {
      clearTimeout(timeoutId);
      return false;
    }
  }

  /**
   * 刷新设备URL
   * 使用Promise缓存避免并发刷新
   */
  private async refreshUrl(): Promise<string | null> {
    // 如果正在刷新，等待现有刷新完成
    if (this.isRefreshingUrl && this.refreshUrlPromise) {
      return this.refreshUrlPromise;
    }

    this.isRefreshingUrl = true;
    this.setConnectionStatus('url_refreshing');

    this.refreshUrlPromise = this.doRefreshUrl();

    try {
      const result = await this.refreshUrlPromise;
      return result;
    } finally {
      this.isRefreshingUrl = false;
      this.refreshUrlPromise = null;
    }
  }

  /**
   * 实际执行URL刷新
   */
  private async doRefreshUrl(): Promise<string | null> {
    try {
      const result = await this.config.urlRefresher();

      if (!result.success || result.urls.length === 0) {
        this.setConnectionStatus('disconnected');
        return null;
      }

      // 并行检查所有URL的健康状态
      const healthChecks = result.urls.map(async (url) => {
        const isHealthy = await this.healthCheck(url);
        return { url, isHealthy };
      });

      const results = await Promise.all(healthChecks);
      const healthyUrl = results.find((r) => r.isHealthy)?.url;

      if (healthyUrl) {
        this.currentUrl = healthyUrl;
        this.setConnectionStatus('connected');
        return healthyUrl;
      }

      this.setConnectionStatus('disconnected');
      return null;
    } catch (error) {
      this.setConnectionStatus('disconnected');
      throw new ResilientClientError(
        'URL刷新失败',
        ResilientErrorCode.URL_REFRESH_FAILED,
        undefined,
        error
      );
    }
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: unknown): boolean {
    // 网络错误（连接被拒绝、DNS解析失败等）
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // AbortError（超时）
    if (error instanceof Error && error.name === 'AbortError') {
      return true;
    }

    // ResilientClientError 的特定错误码
    if (error instanceof ResilientClientError) {
      const retryableCodes = [
        ResilientErrorCode.NETWORK_UNREACHABLE,
        ResilientErrorCode.REQUEST_TIMEOUT,
      ];
      return retryableCodes.includes(error.code);
    }

    return false;
  }

  /**
   * 通用请求方法（带重试和URL刷新）
   */
  private async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    context?: RequestContext
  ): Promise<T> {
    const ctx: RequestContext = context ?? {
      endpoint,
      options,
      retryCount: 0,
      isRetry: false,
    };

    // 检查是否超过最大重试次数
    if (ctx.retryCount > this.config.maxRetries) {
      throw new ResilientClientError(
        `请求失败，已达到最大重试次数 (${this.config.maxRetries})`,
        ResilientErrorCode.MAX_RETRIES_EXCEEDED
      );
    }

    const url = `${this.currentUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.bindingCode}`,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 成功响应，更新连接状态
      if (response.ok) {
        this.setConnectionStatus('connected');
        return await response.json();
      }

      // 处理HTTP错误
      const errorData = await response.json().catch(() => ({}));

      // 认证失败不重试
      if (response.status === 401 || response.status === 403) {
        throw new ResilientClientError(
          errorData.error || '认证失败',
          ResilientErrorCode.AUTH_FAILED,
          response.status,
          errorData
        );
      }

      // 服务端错误可以重试
      if (response.status >= 500) {
        throw new ResilientClientError(
          errorData.error || `服务端错误: ${response.status}`,
          ResilientErrorCode.SERVER_ERROR,
          response.status,
          errorData
        );
      }

      // 其他错误直接抛出
      throw new ResilientClientError(
        errorData.error || `请求失败: ${response.status}`,
        ResilientErrorCode.UNKNOWN,
        response.status,
        errorData
      );
    } catch (error) {
      clearTimeout(timeoutId);

      // 已经是 ResilientClientError 且不可重试
      if (error instanceof ResilientClientError) {
        if (!this.isRetryableError(error)) {
          throw error;
        }
      }

      // 超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ResilientClientError(
          '请求超时',
          ResilientErrorCode.REQUEST_TIMEOUT,
          408,
          error
        );

        // 超时可以重试
        return this.handleRetry(ctx, timeoutError);
      }

      // 网络错误（可能是URL变更导致）
      if (error instanceof TypeError) {
        const networkError = new ResilientClientError(
          '网络不可达',
          ResilientErrorCode.NETWORK_UNREACHABLE,
          undefined,
          error
        );

        // 网络错误触发重试
        return this.handleRetry(ctx, networkError);
      }

      // 服务端错误重试
      if (
        error instanceof ResilientClientError &&
        error.code === ResilientErrorCode.SERVER_ERROR
      ) {
        return this.handleRetry(ctx, error);
      }

      throw error;
    }
  }

  /**
   * 处理重试逻辑
   */
  private async handleRetry<T>(
    ctx: RequestContext,
    error: ResilientClientError
  ): Promise<T> {
    // 检查是否超过最大重试次数
    if (ctx.retryCount >= this.config.maxRetries) {
      throw new ResilientClientError(
        `请求失败，已达到最大重试次数 (${this.config.maxRetries}): ${error.message}`,
        ResilientErrorCode.MAX_RETRIES_EXCEEDED,
        error.statusCode,
        error
      );
    }

    this.setConnectionStatus('reconnecting');

    // 尝试刷新URL
    const newUrl = await this.refreshUrl();

    if (!newUrl) {
      throw new ResilientClientError(
        '设备离线，无法获取可用URL',
        ResilientErrorCode.DEVICE_OFFLINE,
        undefined,
        error
      );
    }

    // 等待重试延迟
    await this.delay(this.config.retryDelay);

    // 增加重试计数并重试
    return this.request<T>(ctx.endpoint, ctx.options, {
      ...ctx,
      retryCount: ctx.retryCount + 1,
      isRetry: true,
    });
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET 请求
   */
  async get<T = unknown>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
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
  async post<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE 请求
   */
  async delete<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH 请求
   */
  async patch<T = unknown>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * 手动刷新URL并验证连接
   */
  async reconnect(): Promise<boolean> {
    const newUrl = await this.refreshUrl();
    return newUrl !== null;
  }
}

/**
 * 创建URL刷新函数
 * 通过Web API获取设备最新URL并进行健康检查
 */
export function createUrlRefresher(deviceId: string): () => Promise<RefreshUrlResult> {
  return async (): Promise<RefreshUrlResult> => {
    try {
      const response = await fetch(`/api/devices/${deviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          urls: [],
          error: `获取设备信息失败: ${response.status}`,
        };
      }

      const data = await response.json();
      const device = data.device;

      if (!device || !device.is_online) {
        return {
          success: false,
          urls: [],
          error: '设备离线',
        };
      }

      return {
        success: true,
        urls: device.online_urls || [],
      };
    } catch (error) {
      return {
        success: false,
        urls: [],
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  };
}

/**
 * 从DeviceBinding创建弹性客户端配置
 */
export function createResilientConfig(
  device: DeviceBinding,
  options?: Partial<ResilientClientConfig>
): ResilientClientConfig | null {
  // 使用类型断言来访问扩展属性
  const extendedDevice = device as DeviceBinding & {
    online_urls?: string[];
  };

  const deviceUrl = extendedDevice.online_urls?.[0];

  if (!deviceUrl || !device.binding_code) {
    return null;
  }

  return {
    deviceId: device.id,
    bindingCode: device.binding_code,
    initialUrl: deviceUrl,
    urlRefresher: createUrlRefresher(device.id),
    ...options,
  };
}
