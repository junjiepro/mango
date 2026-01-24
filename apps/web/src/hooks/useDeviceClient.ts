/**
 * useDeviceClient Hook
 * 统一的设备通信Hook - 前端直接与CLI端通信
 *
 * 使用方式:
 * const { client, isReady, error, connectionStatus, reconnect } = useDeviceClient(device);
 * const data = await client.files.list('/path');
 *
 * 特性:
 * - 自动处理CLI服务重启导致的URL变更
 * - 请求失败时自动重试（带最大重试次数限制）
 * - 健康检查确保连接可用性
 * - 连接状态实时通知
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DeviceBinding } from '@/services/DeviceService';
import {
  ResilientDeviceClient,
  createResilientConfig,
  ConnectionStatus,
  ResilientClientError,
  ResilientErrorCode,
} from '@/lib/resilient-device-client';

/**
 * 文件节点类型
 */
export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: FileNode[];
}

/**
 * ACP Agent 配置
 */
export interface ACPAgent {
  name: string;
  command: string;
  args?: string[];
  env?: Array<{
    key: string;
    required?: boolean;
    description?: string;
  }>;
  authMethodId?: string;
  meta?: {
    icon?: string;
    description?: string;
  };
}

/**
 * ACP Session 信息
 */
export interface ACPSession {
  sessionId: string;
  status: 'active' | 'idle' | 'closed';
  createdAt: string;
  lastActiveAt: string;
  agent: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
  isActivated?: boolean;
}

/**
 * 设备配置信息
 */
export interface DeviceConfig {
  workspaceDir?: string;
  [key: string]: any;
}

/**
 * 客户端接口 - 统一DeviceClient和ResilientDeviceClient的接口
 */
interface ClientInterface {
  get<T = unknown>(endpoint: string, params?: Record<string, string>): Promise<T>;
  post<T = unknown>(endpoint: string, body?: unknown): Promise<T>;
  delete<T = unknown>(endpoint: string, body?: unknown): Promise<T>;
  patch<T = unknown>(endpoint: string, body?: unknown): Promise<T>;
  readonly deviceUrl: string;
  readonly bindingCode: string;
}

/**
 * 文件操作API
 */
class FilesAPI {
  constructor(private client: ClientInterface) {}

  /**
   * 列出目录文件
   */
  async list(path: string): Promise<{ files: FileNode[]; path: string }> {
    return this.client.get('/files/list', { path });
  }

  /**
   * 读取文件内容
   */
  async read(path: string): Promise<{ content: string; modified: string; size: number }> {
    return this.client.get('/files/read', { path });
  }

  /**
   * 获取文件元数据（仅获取修改时间、大小等，不读取内容）
   */
  async stat(path: string): Promise<{
    path: string;
    type: 'file' | 'directory';
    size: number;
    modified: string;
    created: string;
    accessed: string;
  }> {
    return this.client.get('/files/stat', { path });
  }

  /**
   * 写入文件内容
   */
  async write(path: string, content: string): Promise<{ success: boolean }> {
    return this.client.post('/files/write', { path, content });
  }

  /**
   * 创建文件或目录
   */
  async create(path: string, type: 'file' | 'directory'): Promise<{ success: boolean }> {
    return this.client.post('/files/create', { path, type });
  }

  /**
   * 删除文件或目录
   */
  async delete(path: string): Promise<{ success: boolean }> {
    return this.client.delete('/files/delete', { path });
  }

  /**
   * 重命名文件或目录
   */
  async rename(oldPath: string, newPath: string): Promise<{ success: boolean }> {
    return this.client.post('/files/rename', { oldPath, newPath });
  }

  /**
   * 上传文件
   */
  async upload(
    file: File,
    targetPath: string
  ): Promise<{ success: boolean; path: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', targetPath);

    const response = await fetch(`${this.client.deviceUrl}/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.client.bindingCode}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Upload failed');
    }

    return response.json();
  }

  /**
   * 下载文件
   */
  async download(path: string): Promise<Blob> {
    const response = await fetch(
      `${this.client.deviceUrl}/files/download?path=${encodeURIComponent(path)}`,
      {
        headers: {
          Authorization: `Bearer ${this.client.bindingCode}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  }

  /**
   * 下载文件并触发浏览器下载
   */
  async downloadAndSave(path: string, filename?: string): Promise<void> {
    const blob = await this.download(path);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || path.split('/').pop() || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * ACP会话操作API
 */
class ACPAPI {
  constructor(private client: ClientInterface) {}

  /**
   * 创建ACP会话
   */
  async createSession(
    agent: ACPAgent,
    envVars: Record<string, string>,
    workingDirectory?: string
  ): Promise<{ sessionId: string; workingDirectory?: string }> {
    return this.client.post('/acp/sessions', { agent, envVars, workingDirectory });
  }

  /**
   * 获取会话列表
   */
  async listSessions(): Promise<{ sessions: ACPSession[] }> {
    return this.client.get('/acp/sessions');
  }

  /**
   * 删除会话
   */
  async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    return this.client.delete(`/acp/sessions/${sessionId}`);
  }

  /**
   * 发送聊天消息
   */
  async sendMessage(sessionId: string, message: string): Promise<{ response: string }> {
    return this.client.post('/acp/chat', { sessionId, message });
  }

  /**
   * 获取会话历史消息
   */
  async getSessionMessages(
    sessionId: string
  ): Promise<{ messages: any[]; isActivated: boolean }> {
    return this.client.get(`/acp/sessions/${sessionId}/messages`);
  }

  /**
   * 激活会话（初始化ACP连接）
   */
  async activateSession(
    sessionId: string
  ): Promise<{ success: boolean; isActivated: boolean }> {
    return this.client.post(`/acp/sessions/${sessionId}/activate`, {});
  }
}

/**
 * 配置操作API
 */
class ConfigAPI {
  constructor(private client: ClientInterface) {}

  /**
   * 获取设备配置
   */
  async get(): Promise<{ config: DeviceConfig }> {
    return this.client.get('/setting');
  }

  /**
   * 更新设备配置
   */
  async update(config: Partial<DeviceConfig>): Promise<{ success: boolean; message: string }> {
    return this.client.post('/setting', config);
  }
}

/**
 * 终端操作API
 */
class TerminalAPI {
  constructor(private client: ClientInterface) {}

  /**
   * 获取WebSocket连接URL
   */
  getWebSocketUrl(): string {
    const wsUrl = this.client.deviceUrl.replace(/^http/, 'ws');
    return `${wsUrl}/terminal`;
  }

  /**
   * 获取认证Token
   */
  getAuthToken(): string {
    return this.client.bindingCode;
  }
}

/**
 * 设备客户端API集合
 */
export interface DeviceClientAPI {
  files: FilesAPI;
  acp: ACPAPI;
  config: ConfigAPI;
  terminal: TerminalAPI;
  deviceUrl: string;
  deviceBindingCode: string;
  /** 手动重连 */
  reconnect: () => Promise<boolean>;
}

/**
 * useDeviceClient Hook返回值
 */
export interface UseDeviceClientReturn {
  client: DeviceClientAPI | null;
  isReady: boolean;
  error: string | null;
  /** 当前连接状态 */
  connectionStatus: ConnectionStatus;
  /** 手动触发重连 */
  reconnect: () => Promise<boolean>;
}

/**
 * 扩展的设备绑定类型（包含online_urls）
 */
interface ExtendedDeviceBinding extends DeviceBinding {
  online_urls?: string[];
}

/**
 * useDeviceClient Hook
 * 统一的设备通信Hook - 支持自动重试和URL刷新
 */
export function useDeviceClient(device?: DeviceBinding): UseDeviceClientReturn {
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const resilientClientRef = useRef<ResilientDeviceClient | null>(null);

  // 连接状态变化回调
  const handleConnectionStatusChange = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
  }, []);

  // 创建弹性客户端
  useEffect(() => {
    if (!device) {
      resilientClientRef.current = null;
      setConnectionStatus('disconnected');
      return;
    }

    const extendedDevice = device as ExtendedDeviceBinding;
    const config = createResilientConfig(extendedDevice, {
      onConnectionStatusChange: handleConnectionStatusChange,
    });

    if (!config) {
      setError('设备配置无效或设备不在线');
      setConnectionStatus('disconnected');
      resilientClientRef.current = null;
      return;
    }

    setError(null);
    const resilientClient = new ResilientDeviceClient(config);
    resilientClientRef.current = resilientClient;
    setConnectionStatus('connected');

    return () => {
      resilientClientRef.current = null;
    };
  }, [device?.id, (device as ExtendedDeviceBinding)?.online_urls?.[0], device?.binding_code, handleConnectionStatusChange]);

  // 手动重连函数
  const reconnect = useCallback(async (): Promise<boolean> => {
    if (!resilientClientRef.current) {
      return false;
    }
    try {
      return await resilientClientRef.current.reconnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : '重连失败');
      return false;
    }
  }, []);

  // 创建设备客户端API
  const client = useMemo((): DeviceClientAPI | null => {
    const resilientClient = resilientClientRef.current;
    if (!resilientClient) {
      return null;
    }

    // 创建符合ClientInterface的包装对象
    const clientInterface: ClientInterface = {
      get: resilientClient.get.bind(resilientClient),
      post: resilientClient.post.bind(resilientClient),
      delete: resilientClient.delete.bind(resilientClient),
      patch: resilientClient.patch.bind(resilientClient),
      get deviceUrl() {
        return resilientClient.deviceUrl;
      },
      get bindingCode() {
        return resilientClient.bindingCode;
      },
    };

    return {
      files: new FilesAPI(clientInterface),
      acp: new ACPAPI(clientInterface),
      config: new ConfigAPI(clientInterface),
      terminal: new TerminalAPI(clientInterface),
      deviceUrl: resilientClient.deviceUrl,
      deviceBindingCode: resilientClient.bindingCode,
      reconnect: () => resilientClient.reconnect(),
    };
  }, [resilientClientRef.current?.deviceUrl, resilientClientRef.current?.bindingCode]);

  const isReady = client !== null && connectionStatus === 'connected';

  return {
    client,
    isReady,
    error,
    connectionStatus,
    reconnect,
  };
}

// 导出错误类型和状态类型供外部使用
export { ResilientClientError, ResilientErrorCode };
export type { ConnectionStatus };
