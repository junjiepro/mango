/**
 * EnhancedEditorTabs Component
 * 增强版编辑器标签页组件 - 集成 Monaco Editor 和文件预览
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import { X, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileEditor } from './FileEditor';
import { FilePreview } from './FilePreview';
import { ResourcePreview } from './ResourcePreview';
import type { EditorTab } from '@/hooks/useEditorTabs';

interface EnhancedEditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  deviceId?: string;
  onlineUrl?: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onCloseAll?: () => void;
  onCloseOthers?: (tabId: string) => void;
  className?: string;
}

export function EnhancedEditorTabs({
  tabs,
  activeTabId,
  deviceId,
  onlineUrl,
  onTabChange,
  onTabClose,
  onCloseAll,
  onCloseOthers,
  className = '',
}: EnhancedEditorTabsProps) {
  // 判断文件是否可编辑
  const isEditable = (filename: string) => {
    // const editableExts = [
    //   'txt',
    //   'md',
    //   'json',
    //   'js',
    //   'jsx',
    //   'ts',
    //   'tsx',
    //   'html',
    //   'css',
    //   'scss',
    //   'less',
    //   'xml',
    //   'yaml',
    //   'yml',
    //   'py',
    //   'java',
    //   'cpp',
    //   'c',
    //   'cs',
    //   'go',
    //   'rs',
    //   'php',
    //   'rb',
    //   'sh',
    //   'bash',
    //   'sql',
    //   'env',
    //   'gitignore',
    //   'dockerfile',
    // ];
    // const ext = filename.split('.').pop()?.toLowerCase() || '';
    // return editableExts.includes(ext);
    return true;
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
        <div className="border-b bg-muted/20 overflow-x-auto overflow-y-hidden shrink-0 flex items-center">
          <TabsList className="h-9 bg-transparent inline-flex justify-start rounded-none p-0 w-auto min-w-0 flex-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-9 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-background shrink-0 relative"
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
                    onTabClose(tab.id);
                  }}
                  className="h-3 w-3 ml-1.5 p-0 hover:bg-destructive/20"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 更多操作菜单 */}
          {tabs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0 mr-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeTabId && (
                  <>
                    <DropdownMenuItem onClick={() => onTabClose(activeTabId)}>
                      关闭当前标签页
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onCloseOthers?.(activeTabId)}>
                      关闭其他标签页
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={onCloseAll}>关闭所有标签页</DropdownMenuItem>
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
              className="h-full m-0 data-[state=inactive]:hidden"
            >
              {tab.type === 'file' && tab.file && deviceId && onlineUrl ? (
                isEditable(tab.file.name) ? (
                  <FileEditor file={tab.file} deviceId={deviceId} onlineUrl={onlineUrl} />
                ) : (
                  <FilePreview file={tab.file} deviceId={deviceId} onlineUrl={onlineUrl} />
                )
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
    </div>
  );
}
