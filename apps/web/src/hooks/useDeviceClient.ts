/**
 * useDeviceClient Hook
 * 统一的设备通信Hook - 前端直接与CLI端通信
 *
 * 使用方式:
 * const { client, isReady, error } = useDeviceClient(device);
 * const data = await client.files.list('/path');
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { DeviceBinding } from '@/services/DeviceService';
import {
  DeviceClient,
  createDeviceConfig,
  DeviceClientError,
} from '@/lib/device-client';

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
}

/**
 * 设备配置信息
 */
export interface DeviceConfig {
  workspaceDir?: string;
  [key: string]: any;
}

/**
 * 文件操作API
 */
class FilesAPI {
  constructor(private client: DeviceClient) {}

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
}

/**
 * ACP会话操作API
 */
class ACPAPI {
  constructor(private client: DeviceClient) {}

  /**
   * 创建ACP会话
   */
  async createSession(
    agent: ACPAgent,
    envVars: Record<string, string>
  ): Promise<{ sessionId: string }> {
    return this.client.post('/acp/sessions', { agent, envVars });
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
  async sendMessage(
    sessionId: string,
    message: string
  ): Promise<{ response: string }> {
    return this.client.post('/acp/chat', { sessionId, message });
  }
}

/**
 * 配置操作API
 */
class ConfigAPI {
  constructor(private client: DeviceClient) {}

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
  constructor(private client: DeviceClient, private bindingCode: string) {}

  /**
   * 获取WebSocket连接URL
   */
  getWebSocketUrl(): string {
    const wsUrl = this.client['config'].deviceUrl.replace(/^http/, 'ws');
    return `${wsUrl}/terminal`;
  }

  /**
   * 获取认证Token
   */
  getAuthToken(): string {
    return this.bindingCode;
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
}

/**
 * useDeviceClient Hook返回值
 */
export interface UseDeviceClientReturn {
  client: DeviceClientAPI | null;
  isReady: boolean;
  error: string | null;
}

/**
 * useDeviceClient Hook
 * 统一的设备通信Hook
 */
export function useDeviceClient(device?: DeviceBinding): UseDeviceClientReturn {
  const [error, setError] = useState<string | null>(null);

  // 创建设备客户端API
  const client = useMemo(() => {
    if (!device) {
      return null;
    }

    const config = createDeviceConfig(device);
    if (!config) {
      setError('设备配置无效或设备不在线');
      return null;
    }

    setError(null);
    const deviceClient = new DeviceClient(config);

    return {
      files: new FilesAPI(deviceClient),
      acp: new ACPAPI(deviceClient),
      config: new ConfigAPI(deviceClient),
      terminal: new TerminalAPI(deviceClient, config.bindingCode),
    };
  }, [device?.id, device?.online_urls?.[0], device?.binding_code]);

  const isReady = client !== null;

  return {
    client,
    isReady,
    error,
  };
}
