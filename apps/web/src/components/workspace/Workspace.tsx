/**
 * Workspace Component
 * 工作区容器组件
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState } from 'react';
import type { WorkspaceTab } from '@mango/shared/types/workspace.types';
import { X } from 'lucide-react';

interface WorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

export function Workspace({ isOpen, onClose, children }: WorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('resources');

  if (!isOpen) {
    return null;
  }

  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'resources', label: '资源' },
    { id: 'devices', label: '设备' },
    { id: 'files', label: '文件' },
    { id: 'terminal', label: '终端' },
    { id: 'git', label: 'Git' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <h2 className="text-sm font-semibold">工作区</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
          aria-label="关闭工作区"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
