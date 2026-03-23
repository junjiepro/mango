/**
 * EditorTabManager Hook
 * 编辑器标签页管理 Hook
 * User Story 5: 富交互界面与工作区
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { FileNode } from '@/hooks/useDeviceFiles';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import type { Database } from '@/types/database.types';
import type { DiscoveredWebService } from '@mango/shared/types/web-service.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

export interface EditorTab {
  id: string;
  type: 'file' | 'resource' | 'miniapp' | 'webservice';
  title: string;
  file?: FileNode;
  resource?: DetectedResource;
  miniApp?: MiniApp;
  webService?: { id: string; port: number; protocol: string; title?: string; proxyUrl: string };
  isDirty?: boolean;
  isCreateMode?: boolean;
  isOwner?: boolean;
}

export interface UseEditorTabsOptions {
  initialTabs?: EditorTab[];
  initialActiveTabId?: string | null;
  onStateChange?: (tabs: EditorTab[], activeTabId: string | null) => void;
}

export function useEditorTabs(options: UseEditorTabsOptions = {}) {
  const { initialTabs, initialActiveTabId, onStateChange } = options;
  const isInitializedRef = useRef(false);

  // 使用函数初始化，确保只在首次渲染时读取 initialTabs
  const [tabs, setTabs] = useState<EditorTab[]>(() => {
    return initialTabs || [];
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    return initialActiveTabId ?? null;
  });

  // 标记初始化完成
  useEffect(() => {
    isInitializedRef.current = true;
  }, []);

  // 重置状态（用于 conversationId 变化后恢复状态）
  const resetState = useCallback((newTabs: EditorTab[], newActiveTabId: string | null) => {
    setTabs(newTabs || []);
    setActiveTabId(newActiveTabId ?? null);
  }, []);

  // 状态变化时通知外部
  useEffect(() => {
    if (isInitializedRef.current && onStateChange) {
      onStateChange(tabs, activeTabId);
    }
  }, [tabs, activeTabId, onStateChange]);

  // 打开文件标签页
  const openFileTab = useCallback((file: FileNode) => {
    const tabId = `file-${file.path}`;

    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((t) => t.id === tabId);
      if (existingTab) {
        setActiveTabId(tabId);
        return prevTabs;
      }

      const newTab: EditorTab = {
        id: tabId,
        type: 'file',
        title: file.name,
        file,
        isDirty: false,
      };

      return [...prevTabs, newTab];
    });

    setActiveTabId(tabId);
  }, []);

  // 打开资源标签页
  const openResourceTab = useCallback((resource: DetectedResource) => {
    const tabId = `resource-${resource.id}`;

    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((t) => t.id === tabId);
      if (existingTab) {
        setActiveTabId(tabId);
        return prevTabs;
      }

      const newTab: EditorTab = {
        id: tabId,
        type: 'resource',
        title: resource.metadata?.filename || resource.type,
        resource,
      };

      return [...prevTabs, newTab];
    });

    setActiveTabId(tabId);
  }, []);

  // 打开 MiniApp 标签页
  const openMiniAppTab = useCallback((miniApp: MiniApp, isOwner?: boolean) => {
    const tabId = `miniapp-${miniApp.id}`;

    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((t) => t.id === tabId);
      if (existingTab) {
        setActiveTabId(tabId);
        return prevTabs;
      }

      const newTab: EditorTab = {
        id: tabId,
        type: 'miniapp',
        title: miniApp.display_name,
        miniApp,
        isDirty: false,
        isOwner,
      };

      return [...prevTabs, newTab];
    });

    setActiveTabId(tabId);
  }, []);

  // 打开创建 MiniApp 标签页
  const openCreateMiniAppTab = useCallback(() => {
    const tabId = 'miniapp-create-new';

    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((t) => t.id === tabId);
      if (existingTab) {
        setActiveTabId(tabId);
        return prevTabs;
      }

      const newTab: EditorTab = {
        id: tabId,
        type: 'miniapp',
        title: '新建应用',
        isDirty: false,
        isCreateMode: true,
      };

      return [...prevTabs, newTab];
    });

    setActiveTabId(tabId);
  }, []);

  // 打开 Web 服务预览标签页
  const openWebServiceTab = useCallback(
    (service: DiscoveredWebService, proxyUrl: string) => {
      const tabId = `webservice-${service.id}`;

      setTabs((prevTabs) => {
        const existingTab = prevTabs.find((t) => t.id === tabId);
        if (existingTab) {
          // Update proxyUrl in case token refreshed
          const updated = prevTabs.map((t) =>
            t.id === tabId ? { ...t, webService: { ...t.webService!, proxyUrl } } : t
          );
          setActiveTabId(tabId);
          return updated;
        }

        const newTab: EditorTab = {
          id: tabId,
          type: 'webservice',
          title: service.title || `:${service.port}`,
          webService: {
            id: service.id,
            port: service.port,
            protocol: service.protocol,
            title: service.title,
            proxyUrl,
          },
        };

        return [...prevTabs, newTab];
      });

      setActiveTabId(tabId);
    },
    []
  );

  // 关闭标签页
  const closeTab = useCallback((tabId: string) => {
    setTabs((prevTabs) => {
      const tabIndex = prevTabs.findIndex((t) => t.id === tabId);
      if (tabIndex === -1) return prevTabs;

      const newTabs = prevTabs.filter((t) => t.id !== tabId);

      // 如果关闭的是当前激活的标签页,切换到相邻标签页
      if (activeTabId === tabId) {
        if (newTabs.length === 0) {
          setActiveTabId(null);
        } else if (tabIndex < newTabs.length) {
          setActiveTabId(newTabs[tabIndex].id);
        } else {
          setActiveTabId(newTabs[newTabs.length - 1].id);
        }
      }

      return newTabs;
    });
  }, [activeTabId]);

  // 标记标签页为已修改
  const markTabDirty = useCallback((tabId: string, isDirty: boolean) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === tabId ? { ...tab, isDirty } : tab
      )
    );
  }, []);

  // 更新已打开标签页中的 MiniApp 数据（用于恢复时刷新缓存）
  const updateMiniAppInTab = useCallback((miniAppId: string, miniApp: MiniApp) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) =>
        tab.id === `miniapp-${miniAppId}`
          ? { ...tab, miniApp, title: miniApp.display_name }
          : tab
      )
    );
  }, []);

  // 关闭所有标签页
  const closeAllTabs = useCallback(() => {
    setTabs([]);
    setActiveTabId(null);
  }, []);

  // 关闭其他标签页
  const closeOtherTabs = useCallback((tabId: string) => {
    setTabs((prevTabs) => prevTabs.filter((t) => t.id === tabId));
    setActiveTabId(tabId);
  }, []);

  // 关闭所有文件类型的标签页（用于工作目录切换时）
  const closeAllFileTabs = useCallback(() => {
    setTabs((prevTabs) => {
      const nonFileTabs = prevTabs.filter((t) => t.type !== 'file');
      // 如果当前激活的是文件标签页，切换到第一个非文件标签页或设为 null
      if (activeTabId?.startsWith('file-')) {
        if (nonFileTabs.length > 0) {
          setActiveTabId(nonFileTabs[0].id);
        } else {
          setActiveTabId(null);
        }
      }
      return nonFileTabs;
    });
  }, [activeTabId]);

  // 获取当前激活的标签页
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  return {
    tabs,
    activeTabId,
    activeTab,
    openFileTab,
    openResourceTab,
    openMiniAppTab,
    openCreateMiniAppTab,
    openWebServiceTab,
    closeTab,
    markTabDirty,
    closeAllTabs,
    closeOtherTabs,
    closeAllFileTabs,
    setActiveTabId,
    resetState,
    updateMiniAppInTab,
  };
}
