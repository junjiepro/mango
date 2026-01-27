/**
 * VSCodeWorkspace Component
 * VS Code 风格的工作区主容器
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ActivityBar, type ActivityBarItem } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { EditorArea } from './EditorArea';
import { BottomPanel, type TerminalSession } from './BottomPanel';
import { ResourceTab } from './tabs/ResourceTab';
import { DeviceTab } from './tabs/DeviceTab';
import { FileExplorerTab } from './tabs/FileExplorerTab';
import { GitTab } from './tabs/GitTab';
import { Terminal } from './Terminal';
import { EditorTabs } from './EditorTabs';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import { DeviceBinding } from '@/services/DeviceService';
import { useEditorTabs, type EditorTab } from '@/hooks/useEditorTabs';
import { useWorkspaceState } from '@/hooks/useWorkspaceState';
import { EnhancedEditorTabs } from './EnhancedEditorTabs';

interface VSCodeWorkspaceProps {
  resources?: DetectedResource[];
  deviceId?: string;
  conversationId?: string;
  className?: string;
  currentWorkingDirectory?: string;
  onWorkingDirectoryChange?: (path: string) => void;
}

export function VSCodeWorkspace({
  resources = [],
  deviceId,
  conversationId,
  className = '',
  currentWorkingDirectory,
  onWorkingDirectoryChange,
}: VSCodeWorkspaceProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceBinding | undefined>(undefined);
  const isInitializedRef = useRef(false);
  const isRestoringRef = useRef(false); // 标记是否正在恢复状态

  // 工作区状态持久化
  const { getInitialState, saveState } = useWorkspaceState(conversationId);
  const initialState = useRef(getInitialState());

  // 侧边栏状态
  const [activeItem, setActiveItem] = useState<ActivityBarItem>(initialState.current.activeItem);
  const [showSidebar, setShowSidebar] = useState(initialState.current.showSidebar);

  // 底部面板状态
  const [showBottomPanel, setShowBottomPanel] = useState(initialState.current.showBottomPanel);
  const [terminals, setTerminals] = useState<TerminalSession[]>(initialState.current.terminals);
  const [activeTerminalId, setActiveTerminalId] = useState(initialState.current.activeTerminalId);

  const [editorTabs, setEditorTabs] = useState<
    Array<{ id: string; resource: DetectedResource; title: string }>
  >([]);

  // 编辑器标签页状态变化回调
  const handleEditorStateChange = useCallback(
    (tabs: EditorTab[], activeTabId: string | null) => {
      if (isInitializedRef.current && !isRestoringRef.current) {
        saveState({ tabs, activeTabId });
      }
    },
    [saveState]
  );

  const {
    tabs,
    activeTabId,
    openFileTab,
    openResourceTab,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    closeAllFileTabs,
    setActiveTabId,
    markTabDirty,
    resetState: resetEditorState,
  } = useEditorTabs({
    initialTabs: initialState.current.tabs,
    initialActiveTabId: initialState.current.activeTabId,
    onStateChange: handleEditorStateChange,
  });

  // 标记初始化完成
  useEffect(() => {
    isInitializedRef.current = true;
  }, []);

  // 当 conversationId 变化时，恢复工作区状态
  const prevConversationIdRef = useRef<string | undefined>(undefined);
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    // 首次有效 conversationId 或 conversationId 变化时恢复状态
    if (conversationId && (!hasRestoredRef.current || conversationId !== prevConversationIdRef.current)) {
      prevConversationIdRef.current = conversationId;
      hasRestoredRef.current = true;
      isRestoringRef.current = true; // 开始恢复，禁止保存

      const savedState = getInitialState();
      console.log('[VSCodeWorkspace] 恢复状态:', {
        conversationId,
        tabs: savedState.tabs?.length,
        activeTabId: savedState.activeTabId,
        fileExplorerExpandedPaths: savedState.fileExplorerExpandedPaths,
      });

      // 恢复编辑器标签页状态
      if (savedState.tabs && savedState.tabs.length > 0) {
        resetEditorState(savedState.tabs, savedState.activeTabId);
      }

      // 恢复侧边栏状态
      setActiveItem(savedState.activeItem);
      setShowSidebar(savedState.showSidebar);

      // 恢复底部面板状态
      setShowBottomPanel(savedState.showBottomPanel);
      setTerminals(savedState.terminals);
      setActiveTerminalId(savedState.activeTerminalId);

      // 恢复文件浏览器展开状态
      setFileExplorerExpandedPaths(savedState.fileExplorerExpandedPaths || []);

      // 延迟解除恢复标记，需要大于保存防抖时间(300ms)
      setTimeout(() => {
        isRestoringRef.current = false;
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // 只依赖 conversationId，其他函数通过 ref 或闭包访问

  // 保存侧边栏状态
  useEffect(() => {
    if (isInitializedRef.current && !isRestoringRef.current) {
      saveState({ activeItem, showSidebar });
    }
  }, [activeItem, showSidebar, saveState]);

  // 保存底部面板状态
  useEffect(() => {
    if (isInitializedRef.current && !isRestoringRef.current) {
      saveState({ showBottomPanel, terminals, activeTerminalId });
    }
  }, [showBottomPanel, terminals, activeTerminalId, saveState]);

  // 终端状态变化回调
  const handleTerminalStateChange = useCallback(
    (newTerminals: TerminalSession[], newActiveId: string) => {
      setTerminals(newTerminals);
      setActiveTerminalId(newActiveId);
    },
    []
  );

  // 文件浏览器展开路径状态
  const [fileExplorerExpandedPaths, setFileExplorerExpandedPaths] = useState<string[]>(
    initialState.current.fileExplorerExpandedPaths || []
  );

  // 文件浏览器状态变化回调
  const handleFileExplorerExpandedPathsChange = useCallback(
    (paths: string[]) => {
      setFileExplorerExpandedPaths(paths);
      if (isInitializedRef.current && !isRestoringRef.current) {
        saveState({ fileExplorerExpandedPaths: paths });
      }
    },
    [saveState]
  );

  // 内部工作目录变更处理器（用于清理文件浏览器和编辑器状态）
  const handleInternalWorkingDirectoryChange = useCallback(
    (path: string) => {
      // 清空文件浏览器展开状态
      setFileExplorerExpandedPaths([]);
      if (isInitializedRef.current) {
        saveState({ fileExplorerExpandedPaths: [] });
      }
      // 关闭所有从文件浏览器打开的文件标签页
      closeAllFileTabs();
      // 调用外部的工作目录变更回调
      onWorkingDirectoryChange?.(path);
    },
    [saveState, closeAllFileTabs, onWorkingDirectoryChange]
  );

  // 监听外部工作目录变化（当从页面级别切换工作目录时）
  const prevExternalWorkingDirectoryRef = React.useRef(currentWorkingDirectory);
  React.useEffect(() => {
    if (currentWorkingDirectory !== prevExternalWorkingDirectoryRef.current) {
      prevExternalWorkingDirectoryRef.current = currentWorkingDirectory;
      // 清空文件浏览器展开状态
      setFileExplorerExpandedPaths([]);
      if (isInitializedRef.current) {
        saveState({ fileExplorerExpandedPaths: [] });
      }
      // 关闭所有从文件浏览器打开的文件标签页
      closeAllFileTabs();
    }
  }, [currentWorkingDirectory, saveState, closeAllFileTabs]);

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
        (resource.metadata as any)?.title ||
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
        return (
          <DeviceTab device={selectedDevice} onRefresh={() => deviceId && loadDevice(deviceId)} />
        );
      case 'files':
        return (
          <FileExplorerTab
            deviceId={deviceId}
            device={selectedDevice}
            onFileClick={openFileTab}
            initialExpandedPaths={fileExplorerExpandedPaths}
            onExpandedPathsChange={handleFileExplorerExpandedPathsChange}
            currentWorkingDirectory={currentWorkingDirectory}
            onWorkingDirectoryChange={handleInternalWorkingDirectoryChange}
          />
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
          <ResizablePanel defaultSize={showBottomPanel ? 70 : 100} minSize={10}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* 编辑区/预览区 */}
              <ResizablePanel defaultSize={showSidebar ? 80 : 100} minSize={10}>
                <EditorArea className="h-full m-2 p-1 shadow-md border rounded-md">
                  <EnhancedEditorTabs
                    tabs={tabs}
                    activeTabId={activeTabId}
                    device={selectedDevice}
                    currentWorkingDirectory={currentWorkingDirectory}
                    onTabChange={setActiveTabId}
                    onTabClose={closeTab}
                    onCloseAll={closeAllTabs}
                    onCloseOthers={closeOtherTabs}
                    onMarkTabDirty={markTabDirty}
                  />
                </EditorArea>
              </ResizablePanel>

              {/* 侧边栏 - 始终渲染以保留状态 */}
              <>
                <ResizableHandle
                  withHandle
                  className="my-2.5 bg-background hover:bg-border"
                  style={{ display: showSidebar ? 'flex' : 'none' }}
                />
                <ResizablePanel
                  defaultSize={20}
                  minSize={10}
                  maxSize={90}
                  style={{ display: showSidebar ? 'flex' : 'none' }}
                >
                  <Sidebar
                    className="m-2 mr-1 p-1 shadow-md border rounded-md"
                    title={getSidebarTitle()}
                  >
                    {renderSidebarContent()}
                  </Sidebar>
                </ResizablePanel>
              </>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* 底部面板：终端 - 始终渲染，通过 display 控制可见性 */}
          <>
            <ResizableHandle
              withHandle
              className="mx-2.5"
              style={{ display: showBottomPanel ? 'flex' : 'none' }}
            />
            <ResizablePanel
              defaultSize={40}
              minSize={10}
              maxSize={90}
              style={{ display: showBottomPanel ? 'flex' : 'none' }}
            >
              <BottomPanel
                className="m-2 p-1 shadow-md border rounded-md"
                isOpen={showBottomPanel}
                onClose={() => setShowBottomPanel(false)}
                deviceId={deviceId}
                device={selectedDevice}
                initialTerminals={terminals}
                initialActiveTerminalId={activeTerminalId}
                onStateChange={handleTerminalStateChange}
              />
            </ResizablePanel>
          </>
        </ResizablePanelGroup>
      </div>

      {/* 活动栏 */}
      <ActivityBar activeItem={activeItem} onItemClick={handleActivityBarClick} />
    </div>
  );
}
