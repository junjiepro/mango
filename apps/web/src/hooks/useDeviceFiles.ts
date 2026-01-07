/**
 * useDeviceFiles Hook
 * 管理设备文件系统操作
 */

'use client';

import { useState, useCallback } from 'react';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
  children?: FileNode[];
}

interface UseDeviceFilesReturn {
  files: FileNode[];
  currentPath: string;
  isLoading: boolean;
  error: string | null;
  loadDirectory: (path: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createFile: (path: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  renameFile: (oldPath: string, newPath: string) => Promise<void>;
}

export function useDeviceFiles(deviceId?: string): UseDeviceFilesReturn {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = useCallback(
    async (path: string) => {
      if (!deviceId) {
        setError('未选择设备');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/devices/${deviceId}/files?path=${encodeURIComponent(path)}`);

        if (!response.ok) {
          throw new Error('加载目录失败');
        }

        const data = await response.json();
        setFiles(data.files || []);
        setCurrentPath(path);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
        console.error('Load directory error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [deviceId]
  );

  const readFile = useCallback(
    async (path: string): Promise<string> => {
      if (!deviceId) {
        throw new Error('未选择设备');
      }

      const response = await fetch(`/api/devices/${deviceId}/files/read?path=${encodeURIComponent(path)}`);

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

  return {
    files,
    currentPath,
    isLoading,
    error,
    loadDirectory,
    readFile,
    writeFile,
    createFile,
    createDirectory,
    deleteFile,
    renameFile,
  };
}
