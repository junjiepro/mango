/**
 * useDeviceFiles Hook
 * 管理设备文件系统操作 - 使用 useDeviceClient 直接与 CLI 通信
 */

'use client';

import { DeviceBinding } from '@/services/DeviceService';
import { useState, useCallback, useEffect } from 'react';
import { useDeviceClient, DeviceClientAPI } from './useDeviceClient';

// 从 useDeviceClient 重新导出 FileNode 类型
export type { FileNode } from './useDeviceClient';

export interface WorkspaceHistoryItem {
  id: string;
  path: string;
  last_accessed_at: string;
}

interface UseDeviceFilesReturn {
  files: import('./useDeviceClient').FileNode[];
  currentPath: string;
  workspaceDir: string | null;
  recentPaths: WorkspaceHistoryItem[];
  isLoading: boolean;
  error: string | null;
  loadDirectory: (path?: string) => Promise<void>;
  changeDirectory: (path: string) => Promise<void>;
  loadWorkspaceHistory: () => Promise<void>;
  recordPathAccess: (path: string) => Promise<void>;
  clearHistory: (path?: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createFile: (path: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
  /** 设备客户端 API（供需要直接访问的组件使用） */
  deviceClient: DeviceClientAPI | null;
}

export function useDeviceFiles(device?: DeviceBinding): UseDeviceFilesReturn {
  const { client: deviceClient, isReady } = useDeviceClient(device);

  const [files, setFiles] = useState<import('./useDeviceClient').FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [workspaceDir, setWorkspaceDir] = useState<string | null>(null);
  const [recentPaths, setRecentPaths] = useState<WorkspaceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deviceId = device?.id;

  // 加载工作空间配置
  const loadWorkspaceConfig = useCallback(async () => {
    if (!deviceClient) return;

    try {
      const data = await deviceClient.config.get();
      setWorkspaceDir(data.config?.workspaceDir || null);
    } catch (err) {
      console.error('Failed to load workspace config:', err);
    }
  }, [deviceClient]);

  // 加载目录
  const loadDirectory = useCallback(
    async (path?: string) => {
      if (!deviceClient) {
        setError('设备客户端未就绪');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const targetPath = path !== undefined ? (path === '/' ? workspaceDir || '' : path) : '';
        const data = await deviceClient.files.list(targetPath);
        setFiles(data.files || []);
        setCurrentPath(data.path || targetPath);

        // 记录路径访问
        if (data.path) {
          await recordPathAccess(data.path);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
        console.error('Load directory error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [deviceClient, workspaceDir]
  );

  // 切换目录
  const changeDirectory = useCallback(
    async (path: string) => {
      await loadDirectory(path);
    },
    [loadDirectory]
  );

  // 加载工作空间历史记录
  const loadWorkspaceHistory = useCallback(async () => {
    if (!deviceId) return;

    try {
      const response = await fetch(`/api/devices/${deviceId}/workspace-history`);
      if (response.ok) {
        const data = await response.json();
        setRecentPaths(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load workspace history:', err);
    }
  }, [deviceId]);

  // 记录路径访问
  const recordPathAccess = useCallback(
    async (path: string) => {
      if (!deviceId) return;

      try {
        await fetch(`/api/devices/${deviceId}/workspace-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        // 重新加载历史记录
        await loadWorkspaceHistory();
      } catch (err) {
        console.error('Failed to record path access:', err);
      }
    },
    [deviceId, loadWorkspaceHistory]
  );

  // 清除历史记录
  const clearHistory = useCallback(
    async (path?: string) => {
      if (!deviceId) return;

      try {
        const url = path
          ? `/api/devices/${deviceId}/workspace-history?path=${encodeURIComponent(path)}`
          : `/api/devices/${deviceId}/workspace-history`;

        await fetch(url, { method: 'DELETE' });
        await loadWorkspaceHistory();
      } catch (err) {
        console.error('Failed to clear history:', err);
      }
    },
    [deviceId, loadWorkspaceHistory]
  );

  const readFile = useCallback(
    async (path: string): Promise<string> => {
      if (!deviceClient) {
        throw new Error('设备客户端未就绪');
      }

      const data = await deviceClient.files.read(path);
      return data.content;
    },
    [deviceClient]
  );

  const writeFile = useCallback(
    async (path: string, content: string) => {
      if (!deviceClient) {
        throw new Error('设备客户端未就绪');
      }

      await deviceClient.files.write(path, content);
    },
    [deviceClient]
  );

  const createFile = useCallback(
    async (path: string) => {
      if (!deviceClient) {
        throw new Error('设备客户端未就绪');
      }

      await deviceClient.files.create(path, 'file');
      await loadDirectory(currentPath);
    },
    [deviceClient, currentPath, loadDirectory]
  );

  const createDirectory = useCallback(
    async (path: string) => {
      if (!deviceClient) {
        throw new Error('设备客户端未就绪');
      }

      await deviceClient.files.create(path, 'directory');
      await loadDirectory(currentPath);
    },
    [deviceClient, currentPath, loadDirectory]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      if (!deviceClient) {
        throw new Error('设备客户端未就绪');
      }

      await deviceClient.files.delete(path);
      await loadDirectory(currentPath);
    },
    [deviceClient, currentPath, loadDirectory]
  );

  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      if (!deviceClient) {
        throw new Error('设备客户端未就绪');
      }

      await deviceClient.files.rename(oldPath, newPath);
      await loadDirectory(currentPath);
    },
    [deviceClient, currentPath, loadDirectory]
  );

  // 初始化加载配置和历史记录
  useEffect(() => {
    if (isReady) {
      loadWorkspaceConfig();
      loadWorkspaceHistory();
    }
  }, [isReady, loadWorkspaceConfig, loadWorkspaceHistory]);

  return {
    files,
    currentPath,
    workspaceDir,
    recentPaths,
    isLoading,
    error,
    loadDirectory,
    changeDirectory,
    loadWorkspaceHistory,
    recordPathAccess,
    clearHistory,
    readFile,
    writeFile,
    createFile,
    createDirectory,
    deleteFile,
    renameFile,
    deviceClient,
  };
}
