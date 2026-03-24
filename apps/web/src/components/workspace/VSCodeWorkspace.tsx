/**
 * VSCodeWorkspace Component
 * VS Code 风格的工作区主容器
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { ActivityBar, type ActivityBarItem } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { EditorArea } from './EditorArea';
import { BottomPanel, type TerminalSession } from './BottomPanel';
import { ResourceTab } from './tabs/ResourceTab';
import { DeviceTab } from './tabs/DeviceTab';
import { FileExplorerTab } from './tabs/FileExplorerTab';
import { GitTab } from './tabs/GitTab';
import { MiniAppTab } from './tabs/MiniAppTab';
import dynamic from 'next/dynamic';

const Terminal = dynamic(
  () => import('./Terminal').then(mod => mod.Terminal),
  { ssr: false }
);
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
  pendingResource?: DetectedResource | null;
  onPendingResourceHandled?: () => void;
}

export function VSCodeWorkspace({
  resources = [],
  deviceId,
  conversationId,
  className = '',
  currentWorkingDirectory,
  onWorkingDirectoryChange,
  pendingResource,
  onPendingResourceHandled,
}: VSCodeWorkspaceProps) {
  const t = useTranslations('workspace');
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
    openMiniAppTab,
    openCreateMiniAppTab,
    openWebServiceTab,
    updateAllWebServiceUrls,
    closeTab,
    closeAllTabs,
    closeOtherTabs,
    closeAllFileTabs,
    setActiveTabId,
    markTabDirty,
    resetState: resetEditorState,
    updateMiniAppInTab,
  } = useEditorTabs({
    initialTabs: initialState.current.tabs,
    initialActiveTabId: initialState.current.activeTabId,
    onStateChange: handleEditorStateChange,
  });

  // 标记初始化完成
  useEffect(() => {
    isInitializedRef.current = true;
  }, []);

  // 消费外部传入的待打开资源
  useEffect(() => {
    if (pendingResource) {
      openResourceTab(pendingResource);
      onPendingResourceHandled?.();
    }
  }, [pendingResource, openResourceTab, onPendingResourceHandled]);

  // 当 conversationId 变化时，恢复工作区状态
  const prevConversationIdRef = useRef<string | undefined>(undefined);
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    // 首次有效 conversationId 或 conversationId 变化时恢复状态
    if (
      conversationId &&
      (!hasRestoredRef.current || conversationId !== prevConversationIdRef.current)
    ) {
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

        // 异步刷新 miniapp 标签页的数据，确保内容是最新的
        const miniAppTabs = savedState.tabs.filter(
          (t) => t.type === 'miniapp' && t.miniApp?.id
        );
        for (const tab of miniAppTabs) {
          fetch(`/api/miniapps/${tab.miniApp!.id}`)
            .then((res) => res.json())
            .then((result) => {
              if (result.success && result.data) {
                updateMiniAppInTab(tab.miniApp!.id, result.data);
              }
            })
            .catch((err) => {
              console.error('[VSCodeWorkspace] 刷新 MiniApp 数据失败:', tab.miniApp!.id, err);
            });
        }
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
      const wasEmpty = !prevExternalWorkingDirectoryRef.current;
      prevExternalWorkingDirectoryRef.current = currentWorkingDirectory;

      // 初始加载（旧值为空）不清理；用户主动切换（旧值非空）才清理
      if (!wasEmpty) {
        setFileExplorerExpandedPaths([]);
        if (isInitializedRef.current) {
          saveState({ fileExplorerExpandedPaths: [] });
        }
        closeAllFileTabs();
      }
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

  // 定期检查设备 URL 可达性，不可达时重新加载设备数据
  React.useEffect(() => {
    if (!deviceId || !selectedDevice?.online_urls?.length) return;
    const timer = setInterval(async () => {
      const urls = selectedDevice.online_urls || [];
      for (const url of urls) {
        try {
          const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
          if (resp.ok) return;
        } catch { /* 继续 */ }
      }
      loadDevice(deviceId);
    }, 15000);
    return () => clearInterval(timer);
  }, [deviceId, selectedDevice?.online_urls]);

  // 获取侧边栏标题
  const getSidebarTitle = () => {
    switch (activeItem) {
      case 'resources':
        return t('activityBar.sessionResources');
      case 'devices':
        return t('activityBar.deviceManager');
      case 'files':
        return t('activityBar.fileExplorer');
      case 'git':
        return t('activityBar.sourceControl');
      case 'terminal':
        return t('activityBar.terminal');
      case 'settings':
        return t('activityBar.settings');
      case 'apps':
        return t('activityBar.appManager');
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
          <DeviceTab
            device={selectedDevice}
            onRefresh={() => deviceId && loadDevice(deviceId)}
            onOpenWebService={(service, proxyUrl) => {
              openWebServiceTab(service, proxyUrl);
            }}
            onDeviceUrlChange={async (newOnlineUrl) => {
              // When device URL changes (e.g. tunnel restart), refresh tokens for open webservice tabs
              const bindingCode = selectedDevice?.binding_code;
              if (!bindingCode) return;
              const wsTabs = tabs.filter((t) => t.type === 'webservice' && t.webService);
              if (wsTabs.length === 0) return;

              // Fetch new preview tokens for each open service
              for (const tab of wsTabs) {
                const sid = tab.webService!.id;
                try {
                  const resp = await fetch(`${newOnlineUrl}/web-services/${sid}/preview-session`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${bindingCode}` },
                  });
                  if (resp.ok) {
                    const data = await resp.json();
                    const newProxyUrl = `${newOnlineUrl}${data.previewUrl}`;
                    updateAllWebServiceUrls((_, id) => (id === sid ? newProxyUrl : _));
                  }
                } catch {
                  // Ignore - tab will show error state if service unreachable
                }
              }
            }}
          />
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
      case 'apps':
        return (
          <MiniAppTab
            conversationId={conversationId}
            onMiniAppClick={(miniApp, isOwner) => openMiniAppTab(miniApp, isOwner)}
            onCreateNew={openCreateMiniAppTab}
          />
        );
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
