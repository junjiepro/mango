/**
 * EditorTabManager Hook
 * 编辑器标签页管理 Hook
 * User Story 5: 富交互界面与工作区
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { FileNode } from '@/hooks/useDeviceFiles';
import type { DetectedResource } from '@mango/shared/types/resource.types';

export interface EditorTab {
  id: string;
  type: 'file' | 'resource';
  title: string;
  file?: FileNode;
  resource?: DetectedResource;
  isDirty?: boolean;
}

export interface UseEditorTabsOptions {
  initialTabs?: EditorTab[];
  initialActiveTabId?: string | null;
  onStateChange?: (tabs: EditorTab[], activeTabId: string | null) => void;
}

export function useEditorTabs(options: UseEditorTabsOptions = {}) {
  const { initialTabs, initialActiveTabId, onStateChange } = options;
  const isInitializedRef = useRef(false);

  const [tabs, setTabs] = useState<EditorTab[]>(initialTabs || []);
  const [activeTabId, setActiveTabId] = useState<string | null>(initialActiveTabId ?? null);

  // 初始化时设置状态
  useEffect(() => {
    if (!isInitializedRef.current && initialTabs !== undefined) {
      setTabs(initialTabs);
      setActiveTabId(initialActiveTabId ?? null);
      isInitializedRef.current = true;
    }
  }, [initialTabs, initialActiveTabId]);

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

  // 获取当前激活的标签页
  const activeTab = tabs.find((t) => t.id === activeTabId) || null;

  return {
    tabs,
    activeTabId,
    activeTab,
    openFileTab,
    openResourceTab,
    closeTab,
    markTabDirty,
    closeAllTabs,
    closeOtherTabs,
    setActiveTabId,
  };
}
