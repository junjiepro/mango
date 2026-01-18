/**
 * useWorkspaceState Hook
 * 工作区状态持久化管理
 *
 * 功能:
 * - 保存/恢复侧边栏状态
 * - 保存/恢复编辑器标签页
 * - 保存/恢复终端会话
 * - 基于会话ID隔离存储
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { EditorTab } from './useEditorTabs';
import type { ActivityBarItem } from '@/components/workspace/ActivityBar';

// 终端会话状态
export interface TerminalSessionState {
  id: string;
  title: string;
}

// 工作区状态
export interface WorkspaceState {
  // 侧边栏状态
  activeItem: ActivityBarItem;
  showSidebar: boolean;

  // 底部面板状态
  showBottomPanel: boolean;
  terminals: TerminalSessionState[];
  activeTerminalId: string;

  // 编辑器标签页状态
  tabs: EditorTab[];
  activeTabId: string | null;

  // 文件浏览器状态
  fileExplorerExpandedPaths: string[];

  // 时间戳
  savedAt: number;
}

// 默认状态
const DEFAULT_STATE: WorkspaceState = {
  activeItem: 'resources',
  showSidebar: true,
  showBottomPanel: false,
  terminals: [{ id: '1', title: '终端 1' }],
  activeTerminalId: '1',
  tabs: [],
  activeTabId: null,
  fileExplorerExpandedPaths: [],
  savedAt: 0,
};

// 存储键前缀
const STORAGE_KEY_PREFIX = 'mango_workspace_';

/**
 * 获取存储键
 */
function getStorageKey(conversationId: string): string {
  return `${STORAGE_KEY_PREFIX}${conversationId}`;
}

/**
 * 工作区状态持久化 Hook
 */
export function useWorkspaceState(conversationId: string | undefined) {
  const isInitializedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  /**
   * 从 localStorage 加载状态
   */
  const loadState = useCallback((): WorkspaceState | null => {
    if (!conversationId) return null;

    try {
      const key = getStorageKey(conversationId);
      const stored = localStorage.getItem(key);

      if (!stored) return null;

      const state = JSON.parse(stored) as WorkspaceState;
      console.log(`[WorkspaceState] 加载状态: ${conversationId}`, state);
      return state;
    } catch (error) {
      console.error('[WorkspaceState] 加载状态失败:', error);
      return null;
    }
  }, [conversationId]);

  /**
   * 保存状态到 localStorage
   */
  const saveState = useCallback((state: Partial<WorkspaceState>) => {
    if (!conversationId) return;

    // 防抖：延迟保存
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const key = getStorageKey(conversationId);
        const existingState = loadState() || DEFAULT_STATE;

        const newState: WorkspaceState = {
          ...existingState,
          ...state,
          savedAt: Date.now(),
        };

        localStorage.setItem(key, JSON.stringify(newState));
        console.log(`[WorkspaceState] 保存状态: ${conversationId}`);
      } catch (error) {
        console.error('[WorkspaceState] 保存状态失败:', error);
      }
    }, 300);
  }, [conversationId, loadState]);

  /**
   * 清除状态
   */
  const clearState = useCallback(() => {
    if (!conversationId) return;

    try {
      const key = getStorageKey(conversationId);
      localStorage.removeItem(key);
      console.log(`[WorkspaceState] 清除状态: ${conversationId}`);
    } catch (error) {
      console.error('[WorkspaceState] 清除状态失败:', error);
    }
  }, [conversationId]);

  /**
   * 获取初始状态（用于组件初始化）
   */
  const getInitialState = useCallback((): WorkspaceState => {
    const saved = loadState();
    return saved || DEFAULT_STATE;
  }, [loadState]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    loadState,
    saveState,
    clearState,
    getInitialState,
    isInitializedRef,
  };
}
