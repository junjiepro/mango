/**
 * useDeviceFiles Hook (重构版本)
 * 使用 useDeviceClient 直接与CLI通信
 */

'use client';

import { DeviceBinding } from '@/services/DeviceService';
import { useState, useCallback, useEffect } from 'react';
import { useDeviceClient, FileNode } from './useDeviceClient';

export interface WorkspaceHistoryItem {
  id: string;
  path: string;
  last_accessed_at: string;
}

interface UseDeviceFilesReturn {
  files: FileNode[];
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
}

export function useDeviceFiles(device?: DeviceBinding): UseDeviceFilesReturn {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [workspaceDir, setWorkspaceDir] = useState<string | null>(null);
  const [recentPaths, setRecentPaths] = useState<WorkspaceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 使用新的 useDeviceClient Hook
  const { client, isReady } = useDeviceClient(device);
  const deviceId = device?.id;

  // 加载工作空间配置
  const loadWorkspaceConfig = useCallback(async () => {
    if (!client) return;

    try {
      const { config } = await client.config.get();
      setWorkspaceDir(config?.workspaceDir || null);
    } catch (err) {
      console.error('Failed to load workspace config:', err);
    }
  }, [client]);

  // 加载目录
  const loadDirectory = useCallback(
    async (path?: string) => {
      if (!client) {
        setError('设备未就绪');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const targetPath = path !== undefined ? (path === '/' ? workspaceDir : path) : workspaceDir || '/';
        const result = await client.files.list(targetPath);

        setFiles(result.files || []);
        setCurrentPath(result.path || targetPath);

        if (result.path) {
          await recordPathAccess(result.path);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载目录失败');
        console.error('Load directory error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [client, workspaceDir]
  );

  // 切换目录
  const changeDirectory = useCallback(
    async (path: string) => {
      await loadDirectory(path);
    },
    [loadDirectory]
  );

  // 加载工作空间历史记录 (仍需通过Web Server API,因为涉及数据库)
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

  // 记录路径访问 (仍需通过Web Server API)
  const recordPathAccess = useCallback(
    async (path: string) => {
      if (!deviceId) return;

      try {
        await fetch(`/api/devices/${deviceId}/workspace-history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path }),
        });
        await loadWorkspaceHistory();
      } catch (err) {
        console.error('Failed to record path access:', err);
      }
    },
    [deviceId, loadWorkspaceHistory]
  );

  // 清除历史记录 (仍需通过Web Server API)
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

  // 读取文件 (使用新的client)
  const readFile = useCallback(
    async (path: string): Promise<string> => {
      if (!client) {
        throw new Error('设备未就绪');
      }

      const { content } = await client.files.read(path);
      return content;
    },
    [client]
  );

  // 写入文件 (使用新的client)
  const writeFile = useCallback(
    async (path: string, content: string) => {
      if (!client) {
        throw new Error('设备未就绪');
      }

      await client.files.write(path, content);
    },
    [client]
  );

  // 创建文件 (使用新的client)
  const createFile = useCallback(
    async (path: string) => {
      if (!client) {
        throw new Error('设备未就绪');
      }

      await client.files.create(path, 'file');
      await loadDirectory(currentPath);
    },
    [client, currentPath, loadDirectory]
  );

  // 创建目录 (使用新的client)
  const createDirectory = useCallback(
    async (path: string) => {
      if (!client) {
        throw new Error('设备未就绪');
      }

      await client.files.create(path, 'directory');
      await loadDirectory(currentPath);
    },
    [client, currentPath, loadDirectory]
  );

  // 删除文件或目录 (使用新的client)
  const deleteFile = useCallback(
    async (path: string) => {
      if (!client) {
        throw new Error('设备未就绪');
      }

      await client.files.delete(path);
      await loadDirectory(currentPath);
    },
    [client, currentPath, loadDirectory]
  );

  // 重命名文件或目录 (使用新的client)
  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      if (!client) {
        throw new Error('设备未就绪');
      }

      await client.files.rename(oldPath, newPath);
      await loadDirectory(currentPath);
    },
    [client, currentPath, loadDirectory]
  );

  // 初始化加载配置和历史记录
  useEffect(() => {
    if (isReady && client) {
      loadWorkspaceConfig();
      loadWorkspaceHistory();
    }
  }, [isReady, client, loadWorkspaceConfig, loadWorkspaceHistory]);

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
  };
}
