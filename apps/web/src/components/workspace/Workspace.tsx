/**
 * Workspace Component
 * 工作区容器组件
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState } from 'react';
import type { WorkspaceTab } from '@mango/shared/types/workspace.types';
import { WorkspaceHeader } from './WorkspaceHeader';
import { MiniAppManager } from './MiniAppManager';

interface WorkspaceProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  conversationId?: string;
  selectedMiniAppId?: string | null;
  onMiniAppSelect?: (miniAppId: string | null) => void;
  defaultTab?: WorkspaceTab;
}

export function Workspace({
  isOpen,
  onClose,
  children,
  conversationId,
  selectedMiniAppId,
  onMiniAppSelect,
  defaultTab = 'resources',
}: WorkspaceProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(defaultTab);

  if (!isOpen) {
    return null;
  }

  const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'resources', label: '资源' },
    { id: 'devices', label: '设备' },
    { id: 'files', label: '文件' },
    { id: 'terminal', label: '终端' },
    { id: 'git', label: 'Git' },
    { id: 'apps', label: '应用' },
  ];

  // 渲染标签页内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'apps':
        return (
          <MiniAppManager
            conversationId={conversationId}
            selectedMiniAppId={selectedMiniAppId}
            onMiniAppSelect={onMiniAppSelect}
          />
        );
      default:
        return children;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border">
      {/* Header */}
      <WorkspaceHeader
        title="工作区"
        onClose={onClose}
      />

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>
    </div>
  );
}
