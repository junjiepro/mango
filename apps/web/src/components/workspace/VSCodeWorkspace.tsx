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
import { EditorTabs } from './EditorTabs';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import { DeviceBinding } from '@/services/DeviceService';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { EnhancedEditorTabs } from './EnhancedEditorTabs';

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
  const [selectedDevice, setSelectedDevice] = useState<DeviceBinding>(undefined);
  const [activeItem, setActiveItem] = useState<ActivityBarItem>('resources');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [editorTabs, setEditorTabs] = useState<
    Array<{ id: string; resource: DetectedResource; title: string }>
  >([]);
  // const [activeTabId, setActiveTabId] = useState<string>('');

  const {
    tabs,
    activeTabId,
    openFileTab,
    openResourceTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    setActiveTabId,
  } = useEditorTabs();

  const loadDevice = async (id: string) => {
    try {
      const response = await fetch(`/api/devices/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('设备未找到');
        }
        throw new Error('加载设备信息失败');
      }

      const data = await response.json();
      setSelectedDevice(data.device);
    } catch (err) {
      console.error('Failed to load device:', id, err);
    }
  };

  React.useEffect(() => {
    if (deviceId) loadDevice(deviceId);
  }, [deviceId]);

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
    const tabId = resource.id;
    const existingTab = editorTabs.find((tab) => tab.id === tabId);

    if (existingTab) {
      // 如果标签页已存在，切换到该标签页
      setActiveTabId(tabId);
    } else {
      // 创建新标签页
      const title =
        resource.metadata?.filename ||
        resource.metadata?.title ||
        resource.content.substring(0, 20);
      const newTab = { id: tabId, resource, title };
      setEditorTabs([...editorTabs, newTab]);
      setActiveTabId(tabId);
    }
  };

  // 处理标签页关闭
  const handleTabClose = (tabId: string) => {
    const newTabs = editorTabs.filter((tab) => tab.id !== tabId);
    setEditorTabs(newTabs);

    // 如果关闭的是当前活动标签页，切换到最后一个标签页
    if (activeTabId === tabId && newTabs.length > 0) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    } else if (newTabs.length === 0) {
      setActiveTabId('');
    }
  };

  // 渲染侧边栏内容
  const renderSidebarContent = () => {
    switch (activeItem) {
      case 'resources':
        return <ResourceTab resources={resources} onResourceClick={openResourceTab} />;
      case 'devices':
        return <DeviceTab />;
      case 'files':
        return (
          <FileExplorerTab deviceId={deviceId} device={selectedDevice} onFileClick={openFileTab} />
        );
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
      {/* 主要内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ResizablePanelGroup direction="vertical" className="flex-1">
          {/* 上半部分：侧边栏 + 编辑区 */}
          <ResizablePanel defaultSize={showBottomPanel ? 70 : 100} minSize={30}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* 编辑区/预览区 */}
              <ResizablePanel defaultSize={showSidebar ? 80 : 100} minSize={30}>
                <EditorArea className="h-full">
                  <EnhancedEditorTabs
                    tabs={tabs}
                    activeTabId={activeTabId}
                    deviceId={deviceId}
                    onlineUrl={selectedDevice?.online_urls?.[0]}
                    onTabChange={setActiveTabId}
                    onTabClose={closeTab}
                    onCloseAll={closeAllTabs}
                    onCloseOthers={closeOtherTabs}
                  />
                </EditorArea>
              </ResizablePanel>

              {/* 侧边栏 */}
              {showSidebar && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={20} minSize={15} maxSize={40}>
                    <Sidebar title={getSidebarTitle()}>{renderSidebarContent()}</Sidebar>
                  </ResizablePanel>
                </>
              )}
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
                  device={selectedDevice}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* 活动栏 */}
      <ActivityBar activeItem={activeItem} onItemClick={handleActivityBarClick} />
    </div>
  );
}
