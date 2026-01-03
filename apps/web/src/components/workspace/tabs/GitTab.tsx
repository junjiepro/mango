/**
 * GitTab Component
 * 工作区 Git 标签页
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import { GitBranchIcon } from 'lucide-react';

interface GitTabProps {
  deviceId?: string;
}

export function GitTab({ deviceId }: GitTabProps) {
  if (!deviceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-gray-400 mb-2">
          <GitBranchIcon className="w-16 h-16 mx-auto" />
        </div>
        <p className="text-sm text-gray-500">请先选择设备</p>
        <p className="text-xs text-gray-400 mt-1">选择设备后可以查看 Git 状态</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Git 面板占位符 */}
      <div className="flex-1 p-4">
        <div className="text-sm text-gray-500">
          Git 集成功能将在后续实现
        </div>
      </div>
    </div>
  );
}
