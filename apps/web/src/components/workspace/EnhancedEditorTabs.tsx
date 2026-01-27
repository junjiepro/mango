/**
 * EnhancedEditorTabs Component
 * 增强版编辑器标签页组件 - 集成 Monaco Editor 和文件预览
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { clearFileCache } from './FileEditor.optimized';
import { UnifiedFileViewer } from './UnifiedFileViewer';
import { ResourcePreview } from './ResourcePreview';
import { clearModelCache } from './MonacoEditor';
import { useFileWatcher, type FileChangeEvent } from '@/hooks/useFileWatcher';
import type { EditorTab } from '@/hooks/useEditorTabs';
import type { DeviceBinding } from '@/services/DeviceService';

interface EnhancedEditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  device?: DeviceBinding;
  currentWorkingDirectory?: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onCloseAll?: () => void;
  onCloseOthers?: (tabId: string) => void;
  onMarkTabDirty?: (tabId: string, isDirty: boolean) => void;
  className?: string;
}

export function EnhancedEditorTabs({
  tabs,
  activeTabId,
  device,
  currentWorkingDirectory,
  onTabChange,
  onTabClose,
  onCloseAll,
  onCloseOthers,
  onMarkTabDirty,
  className = '',
}: EnhancedEditorTabsProps) {
  // 关闭确认对话框状态
  const [closeConfirmTab, setCloseConfirmTab] = useState<EditorTab | null>(null);

  // 文件刷新 key（用于强制刷新编辑器）
  const [fileRefreshKeys, setFileRefreshKeys] = useState<Map<string, number>>(new Map());

  // 文件变化处理
  const handleFileChange = useCallback((event: FileChangeEvent) => {
    // 检查变化的文件是否在打开的标签页中
    const changedPath = event.path;
    const matchingTab = tabs.find(tab =>
      tab.type === 'file' && tab.file?.path === changedPath
    );

    if (matchingTab && event.changeType === 'change') {
      console.log('[EnhancedEditorTabs] File changed, refreshing:', changedPath);
      // 更新刷新 key 强制重新加载
      setFileRefreshKeys(prev => {
        const next = new Map(prev);
        next.set(changedPath, Date.now());
        return next;
      });
    }
  }, [tabs]);

  // 使用文件监听 Hook
  useFileWatcher({
    device,
    watchPath: currentWorkingDirectory,
    onFileChange: handleFileChange,
    enabled: !!device && !!currentWorkingDirectory,
  });

  // 滚动相关状态
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 检查滚动状态
  const checkScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  // 监听滚动和尺寸变化
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollState();
    container.addEventListener('scroll', checkScrollState);

    const resizeObserver = new ResizeObserver(checkScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', checkScrollState);
      resizeObserver.disconnect();
    };
  }, [checkScrollState, tabs.length]);

  // 滚动函数
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 150;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // 清理文件缓存的辅助函数
  const cleanupFileCache = (tab: EditorTab) => {
    if (tab.type === 'file' && tab.file) {
      clearFileCache(tab.file.path);
      clearModelCache(tab.file.path);
    }
  };

  // 处理关闭标签页
  const handleCloseTab = (tab: EditorTab) => {
    // 如果文件未保存,显示确认对话框
    if (tab.isDirty) {
      setCloseConfirmTab(tab);
    } else {
      cleanupFileCache(tab);
      onTabClose(tab.id);
    }
  };

  // 确认关闭
  const confirmClose = () => {
    if (closeConfirmTab) {
      cleanupFileCache(closeConfirmTab);
      onTabClose(closeConfirmTab.id);
      setCloseConfirmTab(null);
    }
  };
  // 处理关闭当前标签页（从菜单）
  const handleCloseCurrentTab = () => {
    if (!activeTabId) return;
    const tab = tabs.find((t) => t.id === activeTabId);
    if (tab) {
      if (tab.isDirty) {
        setCloseConfirmTab(tab);
      } else {
        cleanupFileCache(tab);
        onTabClose(activeTabId);
      }
    }
  };

  // 处理关闭其他标签页
  const handleCloseOthers = () => {
    if (!activeTabId) return;
    tabs.forEach((tab) => {
      if (tab.id !== activeTabId && !tab.isDirty) {
        cleanupFileCache(tab);
      }
    });
    onCloseOthers?.(activeTabId);
  };

  // 处理关闭所有标签页
  const handleCloseAll = () => {
    tabs.forEach((tab) => {
      if (!tab.isDirty) {
        cleanupFileCache(tab);
      }
    });
    onCloseAll?.();
  };

  if (tabs.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full text-muted-foreground ${className}`}>
        <div className="text-center">
          <p className="text-sm">选择右侧的资源或文件以查看内容</p>
          <p className="text-xs mt-2">点击文件可在编辑器中打开</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Tabs
        value={activeTabId || undefined}
        onValueChange={onTabChange}
        className="flex flex-col h-full"
      >
        {/* 标签页列表 */}
        <div className="border-b bg-muted/20 shrink-0 flex items-center h-9 relative">
          {/* 左侧渐变遮罩和滚动按钮 */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center">
              <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0 relative z-10 ml-0.5"
                onClick={() => scroll('left')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          )}
          {/* 可滚动的标签区域 */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto overflow-y-hidden flex-1 min-w-0 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]"
          >
            <TabsList className="h-9 bg-transparent inline-flex justify-start rounded-none p-0 w-auto min-w-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="group h-9 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background shrink-0 relative"
                >
                  <span className="truncate max-w-[120px] text-xs">
                    {tab.title}
                    {tab.isDirty && <span className="ml-1 text-orange-500">●</span>}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab);
                    }}
                    className="h-3 w-3 ml-1.5 p-0 hover:bg-destructive/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </Button>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* 右侧渐变遮罩和滚动按钮 */}
          {canScrollRight && (
            <div className="absolute right-8 top-0 bottom-0 z-10 flex items-center">
              <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0 relative z-10 mr-0.5"
                onClick={() => scroll('right')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {/* 更多操作菜单 - 固定在右侧 */}
          {tabs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 mx-1">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeTabId && (
                  <>
                    <DropdownMenuItem onClick={handleCloseCurrentTab}>
                      关闭当前标签页
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCloseOthers}>关闭其他标签页</DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleCloseAll}>关闭所有标签页</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* 标签页内容 */}
        <div className="flex-1 overflow-hidden">
          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              forceMount
              className="h-full m-0 data-[state=inactive]:hidden"
            >
              {tab.type === 'file' && tab.file && device ? (
                <UnifiedFileViewer
                  file={tab.file}
                  device={device}
                  tabId={tab.id}
                  isActive={tab.id === activeTabId}
                  onMarkDirty={onMarkTabDirty}
                  externalChangeTimestamp={fileRefreshKeys.get(tab.file.path)}
                />
              ) : tab.type === 'resource' && tab.resource ? (
                <ResourcePreview resource={tab.resource} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">无法显示此内容</p>
                </div>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>

      {/* 关闭确认对话框 */}
      <AlertDialog open={!!closeConfirmTab} onOpenChange={() => setCloseConfirmTab(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>未保存的更改</AlertDialogTitle>
            <AlertDialogDescription>
              文件 "{closeConfirmTab?.title}" 有未保存的更改。关闭后这些更改将丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>关闭</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
