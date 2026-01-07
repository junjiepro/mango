/**
 * FileExplorerTab Component
 * 工作区文件浏览器标签页
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import { FolderIcon } from 'lucide-react';
import { FileExplorer } from '@/components/workspace/FileExplorer';

interface FileExplorerTabProps {
  deviceId?: string;
}

export function FileExplorerTab({ deviceId }: FileExplorerTabProps) {
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

  return (
    <div className="h-full">
      <FileExplorer deviceId={deviceId} />
    </div>
  );
}
