/**
 * useDeviceFiles Hook
 * 管理设备文件系统操作
 */

'use client';

import { DeviceBinding } from '@/services/DeviceService';
import { useState, useCallback, useEffect } from 'react';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: FileNode[];
}

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

  const deviceId = device?.id;
  const onlineUrl = device?.online_urls?.[0] || '';

  // 加载工作空间配置
  const loadWorkspaceConfig = useCallback(async () => {
    if (!device) return;

    try {
      const response = await fetch(`/api/devices/${device.id}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cli-Url': onlineUrl,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setWorkspaceDir(data.config?.workspaceDir || null);
      }
    } catch (err) {
      console.error('Failed to load workspace config:', err);
    }
  }, [device?.id, onlineUrl]);

  // 加载目录
  const loadDirectory = useCallback(
    async (path?: string) => {
      if (!deviceId) {
        setError('未选择设备');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 如果没有提供path,使用空字符串让服务端使用workspaceDir
        const targetPath = path !== undefined ? (path === '/' ? workspaceDir : path) : '';
        const url = targetPath
          ? `/api/devices/${deviceId}/files?path=${encodeURIComponent(targetPath)}`
          : `/api/devices/${deviceId}/files`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cli-Url': onlineUrl,
          },
        });

        if (!response.ok) {
          throw new Error('加载目录失败');
        }

        const data = await response.json();
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
    [deviceId, workspaceDir, onlineUrl]
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
      if (!deviceId) {
        throw new Error('未选择设备');
      }

      const response = await fetch(
        `/api/devices/${deviceId}/files/read?path=${encodeURIComponent(path)}`
      );

      if (!response.ok) {
        throw new Error('读取文件失败');
      }

      const data = await response.json();
      return data.content;
    },
    [deviceId]
  );

  const writeFile = useCallback(
    async (path: string, content: string) => {
      if (!deviceId) {
        throw new Error('未选择设备');
      }

      const response = await fetch(`/api/devices/${deviceId}/files/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });

      if (!response.ok) {
        throw new Error('写入文件失败');
      }
    },
    [deviceId]
  );

  const createFile = useCallback(
    async (path: string) => {
      if (!deviceId) {
        throw new Error('未选择设备');
      }

      const response = await fetch(`/api/devices/${deviceId}/files/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type: 'file' }),
      });

      if (!response.ok) {
        throw new Error('创建文件失败');
      }

      // 重新加载当前目录
      await loadDirectory(currentPath);
    },
    [deviceId, currentPath, loadDirectory]
  );

  const createDirectory = useCallback(
    async (path: string) => {
      if (!deviceId) {
        throw new Error('未选择设备');
      }

      const response = await fetch(`/api/devices/${deviceId}/files/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, type: 'directory' }),
      });

      if (!response.ok) {
        throw new Error('创建目录失败');
      }

      await loadDirectory(currentPath);
    },
    [deviceId, currentPath, loadDirectory]
  );

  const deleteFile = useCallback(
    async (path: string) => {
      if (!deviceId) {
        throw new Error('未选择设备');
      }

      const response = await fetch(`/api/devices/${deviceId}/files/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        throw new Error('删除失败');
      }

      await loadDirectory(currentPath);
    },
    [deviceId, currentPath, loadDirectory]
  );

  const renameFile = useCallback(
    async (oldPath: string, newPath: string) => {
      if (!deviceId) {
        throw new Error('未选择设备');
      }

      const response = await fetch(`/api/devices/${deviceId}/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath, newPath }),
      });

      if (!response.ok) {
        throw new Error('重命名失败');
      }

      await loadDirectory(currentPath);
    },
    [deviceId, currentPath, loadDirectory]
  );

  // 初始化加载配置和历史记录
  useEffect(() => {
    if (deviceId) {
      loadWorkspaceConfig();
      loadWorkspaceHistory();
    }
  }, [deviceId, loadWorkspaceConfig, loadWorkspaceHistory]);

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
