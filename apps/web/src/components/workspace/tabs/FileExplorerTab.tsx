/**
 * FileExplorerTab Component
 * 工作区文件浏览器标签页
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useEffect } from 'react';
import { FolderIcon, Plus } from 'lucide-react';
import { useDeviceFiles, type FileNode } from '@/hooks/useDeviceFiles';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileTree } from '@/components/workspace/FileTree';
import { DeviceBinding } from '@/services/DeviceService';

interface FileExplorerTabProps {
  deviceId?: string;
  device?: DeviceBinding;
  onFileClick?: (file: FileNode) => void;
}

export function FileExplorerTab({ deviceId, device, onFileClick }: FileExplorerTabProps) {
  const { files, isLoading, error, loadDirectory } = useDeviceFiles(device);

  // 初始加载根目录
  useEffect(() => {
    if (deviceId) {
      loadDirectory('/');
    }
  }, [deviceId, loadDirectory]);

  if (!deviceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-gray-400 mb-2">
          <FolderIcon className="w-16 h-16 mx-auto" />
        </div>
        <p className="text-sm text-gray-500">请先选择设备</p>
        <p className="text-xs text-gray-400 mt-1">选择设备后可以浏览设备上的文件</p>
      </div>
    );
  }

  const handleFileClick = (file: FileNode) => {
    if (file.type === 'file') {
      onFileClick?.(file);
    }
  };

  const handleDirectoryClick = async (directory: FileNode) => {
    await loadDirectory(directory.path);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* 文件树标题 */}
      <div className="p-2 border-b shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold truncate">文件</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 文件树内容 */}
      <ScrollArea className="flex-1">
        {isLoading && <div className="p-4 text-sm text-muted-foreground">加载中...</div>}
        {error && <div className="p-4 text-sm text-destructive">{error}</div>}
        {!isLoading && !error && (
          <FileTree
            files={files}
            onFileClick={handleFileClick}
            onDirectoryClick={handleDirectoryClick}
          />
        )}
      </ScrollArea>
    </div>
  );
}
