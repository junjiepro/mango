/**
 * VSCodeWorkspace Component
 * VS Code 风格的工作区主容器
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ActivityBar, type ActivityBarItem } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { EditorArea } from './EditorArea';
import { BottomPanel } from './BottomPanel';
import { ResourceTab } from './tabs/ResourceTab';
import { DeviceTab } from './tabs/DeviceTab';
import { FileExplorerTab } from './tabs/FileExplorerTab';
import { GitTab } from './tabs/GitTab';
import { Terminal } from './Terminal';
import { ResourcePreview } from './ResourcePreview';
import type { DetectedResource } from '@mango/shared/types/resource.types';

interface VSCodeWorkspaceProps {
  resources?: DetectedResource[];
  deviceId?: string;
  className?: string;
}

export function VSCodeWorkspace({
  resources = [],
  deviceId,
  className = '',
}: VSCodeWorkspaceProps) {
  const [activeItem, setActiveItem] = useState<ActivityBarItem>('resources');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [selectedResource, setSelectedResource] = useState<DetectedResource | null>(null);

  // 获取侧边栏标题
  const getSidebarTitle = () => {
    switch (activeItem) {
      case 'resources':
        return '会话资源';
      case 'devices':
        return '设备管理';
      case 'files':
        return '文件浏览器';
      case 'git':
        return '源代码管理';
      case 'terminal':
        return '终端';
      case 'settings':
        return '设置';
      default:
        return '';
    }
  };

  // 处理活动栏点击
  const handleActivityBarClick = (item: ActivityBarItem) => {
    if (item === 'terminal') {
      setShowBottomPanel(!showBottomPanel);
    } else {
      if (activeItem === item && showSidebar) {
        setShowSidebar(false);
      } else {
        setActiveItem(item);
        setShowSidebar(true);
      }
    }
  };

  // 处理资源点击
  const handleResourceClick = (resource: DetectedResource) => {
    setSelectedResource(resource);
  };

  // 渲染侧边栏内容
  const renderSidebarContent = () => {
    switch (activeItem) {
      case 'resources':
        return <ResourceTab resources={resources} onResourceClick={handleResourceClick} />;
      case 'devices':
        return <DeviceTab />;
      case 'files':
        return <FileExplorerTab deviceId={deviceId} />;
      case 'git':
        return <GitTab deviceId={deviceId} />;
      case 'settings':
        return <div className="p-4 text-sm text-muted-foreground">设置功能开发中...</div>;
      default:
        return null;
    }
  };

  return (
    <div className={`flex h-full ${className}`}>
      {/* 活动栏 */}
      <ActivityBar activeItem={activeItem} onItemClick={handleActivityBarClick} />

      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="vertical" className="flex-1">
          {/* 上半部分：侧边栏 + 编辑区 */}
          <ResizablePanel defaultSize={showBottomPanel ? 70 : 100} minSize={30}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* 侧边栏 */}
              {showSidebar && (
                <>
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                    <Sidebar
                      activeItem={activeItem}
                      title={getSidebarTitle()}
                      onClose={() => setShowSidebar(false)}
                    >
                      {renderSidebarContent()}
                    </Sidebar>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              )}

              {/* 编辑区/预览区 */}
              <ResizablePanel defaultSize={showSidebar ? 80 : 100} minSize={30}>
                <EditorArea className="h-full">
                  {selectedResource ? (
                    <ResourcePreview resource={selectedResource} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <p className="text-sm">选择左侧的资源或文件以查看内容</p>
                        <p className="text-xs mt-2">或在终端中执行命令</p>
                      </div>
                    </div>
                  )}
                </EditorArea>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* 底部面板：终端 */}
          {showBottomPanel && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={15} maxSize={70}>
                <BottomPanel
                  isOpen={showBottomPanel}
                  onClose={() => setShowBottomPanel(false)}
                  deviceId={deviceId}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
