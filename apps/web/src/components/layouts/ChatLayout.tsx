/**
 * Chat Layout with Workspace
 * 集成工作区和资源面板的聊天布局
 * 支持响应式设计，针对不同设备尺寸动态调整布局
 */

'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { VSCodeWorkspace } from '@/components/workspace/VSCodeWorkspace';
import { useWorkspaceLayout } from '@/hooks/useWorkspaceLayout';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import type { ImperativePanelHandle } from 'react-resizable-panels';

interface ChatLayoutProps {
  children: React.ReactNode;
  resources?: DetectedResource[];
  showWorkspace?: boolean;
  onToggleWorkspace?: () => void;
  deviceId?: string;
  conversationId?: string;
  currentWorkingDirectory?: string;
  onWorkingDirectoryChange?: (path: string) => void;
  workspacePanelSize?: number;
  onWorkspacePanelSizeChange?: (size: number) => void;
}

export function ChatLayout({
  children,
  resources = [],
  showWorkspace = false,
  onToggleWorkspace,
  deviceId,
  conversationId,
  currentWorkingDirectory,
  onWorkingDirectoryChange,
  workspacePanelSize = 50,
  onWorkspacePanelSizeChange,
}: ChatLayoutProps) {
  const { config, isFullscreenMode } = useWorkspaceLayout();

  // 面板引用
  const chatPanelRef = useRef<ImperativePanelHandle>(null);
  const workspacePanelRef = useRef<ImperativePanelHandle>(null);

  // 处理面板尺寸变化，通知外部保存
  const handleLayout = useCallback(
    (sizes: number[]) => {
      if (showWorkspace && sizes.length === 2) {
        const newSize = sizes[1];
        if (newSize > 0) {
          const clampedSize = Math.min(
            Math.max(newSize, config.workspace.min),
            config.workspace.max
          );
          onWorkspacePanelSizeChange?.(clampedSize);
        }
      }
    },
    [showWorkspace, config.workspace.min, config.workspace.max, onWorkspacePanelSizeChange]
  );

  // 当 showWorkspace 变化时，动态调整面板尺寸（仅分屏模式）
  useEffect(() => {
    if (isFullscreenMode) return;

    if (showWorkspace) {
      const size = Math.min(
        Math.max(workspacePanelSize, config.workspace.min),
        config.workspace.max
      );
      chatPanelRef.current?.resize(100 - size);
      workspacePanelRef.current?.resize(size);
    } else {
      chatPanelRef.current?.resize(100);
      workspacePanelRef.current?.resize(0);
    }
  }, [showWorkspace, workspacePanelSize, config.workspace.min, config.workspace.max, isFullscreenMode]);

  // 计算初始尺寸
  const initialWorkspaceSize = Math.min(
    Math.max(workspacePanelSize, config.workspace.min),
    config.workspace.max
  );

  // 全屏切换模式
  if (isFullscreenMode) {
    return (
      <div className="h-full w-full">
        <div className={`h-full w-full ${showWorkspace ? 'hidden' : ''}`}>
          {children}
        </div>
        <div className={`h-full w-full ${showWorkspace ? '' : 'hidden'}`}>
          <VSCodeWorkspace
            resources={resources}
            deviceId={deviceId}
            conversationId={conversationId}
            currentWorkingDirectory={currentWorkingDirectory}
            onWorkingDirectoryChange={onWorkingDirectoryChange}
          />
        </div>
      </div>
    );
  }

  // 分屏模式
  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="flex-1"
      onLayout={handleLayout}
    >
      {/* 主聊天区域 */}
      <ResizablePanel
        ref={chatPanelRef}
        defaultSize={showWorkspace ? 100 - initialWorkspaceSize : 100}
        minSize={config.chat.min}
        maxSize={showWorkspace ? config.chat.max : 100}
      >
        {children}
      </ResizablePanel>

      {/* 工作区 - 始终挂载，通过尺寸控制显示/隐藏 */}
      <ResizableHandle
        withHandle
        className={`mt-2.5 ml-3 ${!showWorkspace ? 'hidden' : ''}`}
      />
      <ResizablePanel
        ref={workspacePanelRef}
        defaultSize={showWorkspace ? initialWorkspaceSize : 0}
        minSize={showWorkspace ? config.workspace.min : 0}
        maxSize={showWorkspace ? config.workspace.max : 0}
        className={!showWorkspace ? 'hidden' : ''}
      >
        <VSCodeWorkspace
          resources={resources}
          deviceId={deviceId}
          conversationId={conversationId}
          currentWorkingDirectory={currentWorkingDirectory}
          onWorkingDirectoryChange={onWorkingDirectoryChange}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
