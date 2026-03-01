/**
 * useFileTree Hook (重构版本)
 * 管理文件树的展开/折叠和懒加载
 * 使用 useDeviceClient 直接与CLI通信
 */

'use client';

import { useState, useCallback } from 'react';
import type { FileNode } from './useDeviceClient';
import type { DeviceClientAPI } from './useDeviceClient';

interface UseFileTreeReturn {
  expandedPaths: Set<string>;
  toggleExpand: (path: string) => void;
  loadChildren: (node: FileNode, client: DeviceClientAPI) => Promise<FileNode[]>;
  updateNodeChildren: (files: FileNode[], path: string, children: FileNode[]) => FileNode[];
}

export function useFileTree(): UseFileTreeReturn {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // 切换展开/折叠状态
  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // 加载子文件 (使用新的client)
  const loadChildren = useCallback(
    async (node: FileNode, client: DeviceClientAPI): Promise<FileNode[]> => {
      try {
        const result = await client.files.list(node.path);
        return result.files || [];
      } catch (error) {
        console.error('Load children error:', error);
        return [];
      }
    },
    []
  );

  // 更新节点的子文件
  const updateNodeChildren = useCallback(
    (files: FileNode[], path: string, children: FileNode[]): FileNode[] => {
      return files.map((file) => {
        if (file.path === path) {
          return { ...file, children };
        }
        if (file.children) {
          return {
            ...file,
            children: updateNodeChildren(file.children, path, children),
          };
        }
        return file;
      });
    },
    []
  );

  return {
    expandedPaths,
    toggleExpand,
    loadChildren,
    updateNodeChildren,
  };
}
