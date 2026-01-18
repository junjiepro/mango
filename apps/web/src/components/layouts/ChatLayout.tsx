/**
 * Chat Layout with Workspace
 * 集成工作区和资源面板的聊天布局
 */

'use client';

import React, { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { VSCodeWorkspace } from '@/components/workspace/VSCodeWorkspace';
import type { DetectedResource } from '@mango/shared/types/resource.types';

interface ChatLayoutProps {
  children: React.ReactNode;
  resources?: DetectedResource[];
  showWorkspace?: boolean;
  onToggleWorkspace?: () => void;
  deviceId?: string;
  conversationId?: string;
}

export function ChatLayout({
  children,
  resources = [],
  showWorkspace = false,
  onToggleWorkspace,
  deviceId,
  conversationId,
}: ChatLayoutProps) {
  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      {/* 主聊天区域 */}
      <ResizablePanel defaultSize={showWorkspace ? 50 : 100} minSize={20}>
        {children}
      </ResizablePanel>

      {/* 工作区 */}
      {showWorkspace && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30}>
            <VSCodeWorkspace resources={resources} deviceId={deviceId} conversationId={conversationId} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
