/**
 * TerminalTab Component
 * 工作区终端标签页
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import { TerminalIcon } from 'lucide-react';

interface TerminalTabProps {
  deviceId?: string;
}

export function TerminalTab({ deviceId }: TerminalTabProps) {
  if (!deviceId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-gray-400 mb-2">
          <TerminalIcon className="w-16 h-16 mx-auto" />
        </div>
        <p className="text-sm text-gray-500">请先选择设备</p>
        <p className="text-xs text-gray-400 mt-1">选择设备后可以使用终端</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-black">
      {/* 终端占位符 */}
      <div className="flex-1 p-4 text-green-400 font-mono text-sm">
        <div>终端功能将在后续实现</div>
      </div>
    </div>
  );
}
