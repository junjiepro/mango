/**
 * WorkingDirectorySelector Component
 * 工作目录选择器组件
 * 支持显示当前工作目录、切换目录、查看历史记录
 */

'use client';

import React, { useState, useEffect } from 'react';
import { FolderOpen, ChevronDown, History, FolderInput, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface WorkspaceHistoryItem {
  id: string;
  path: string;
  last_accessed_at: string;
}

interface WorkingDirectorySelectorProps {
  currentPath: string;
  recentPaths?: WorkspaceHistoryItem[];
  onPathChange: (path: string) => void;
  onLoadHistory?: () => Promise<void>;
  className?: string;
  compact?: boolean;
}

export function WorkingDirectorySelector({
  currentPath,
  recentPaths = [],
  onPathChange,
  onLoadHistory,
  className,
  compact = false,
}: WorkingDirectorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showInputDialog, setShowInputDialog] = useState(false);
  const [inputPath, setInputPath] = useState('');

  // 加载历史记录
  useEffect(() => {
    if (isOpen && onLoadHistory) {
      onLoadHistory();
    }
  }, [isOpen]);

  // 处理路径选择
  const handleSelectPath = (path: string) => {
    onPathChange(path);
    setIsOpen(false);
  };

  // 处理手动输入路径
  const handleInputConfirm = () => {
    if (inputPath.trim()) {
      onPathChange(inputPath.trim());
      setInputPath('');
      setShowInputDialog(false);
    }
  };

  // 格式化路径显示
  const formatPath = (path: string, maxLength: number = 30) => {
    if (path.length <= maxLength) return path;

    // 显示路径的开头和结尾
    const parts = path.split(/[/\\]/);
    if (parts.length <= 2) return path;

    const start = parts.slice(0, 2).join('/');
    const end = parts.slice(-1)[0];
    return `${start}/.../${end}`;
  };

  // 格式化时间显示
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size={compact ? 'sm' : 'default'}
            className={cn(
              'flex items-center gap-2 max-w-48',
              compact && 'h-7 px-2 text-xs',
              className
            )}
          >
            <FolderOpen className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-4 w-4')} />
            <span className="truncate">
              {currentPath ? formatPath(currentPath) : '选择工作目录'}
            </span>
            <ChevronDown className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-4 w-4')} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {/* 当前路径 */}
          <div className="p-3 border-b">
            <div className="text-xs text-muted-foreground mb-1">当前工作目录</div>
            <div className="text-sm font-medium truncate" title={currentPath}>
              {currentPath || '未设置'}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="p-2 border-b flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setInputPath(currentPath);
                setShowInputDialog(true);
                setIsOpen(false);
              }}
            >
              <FolderInput className="h-3 w-3 mr-1" />
              输入路径
            </Button>
          </div>

          {/* 历史记录 */}
          {recentPaths.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <History className="h-3 w-3" />
                <span>最近访问</span>
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1">
                  {recentPaths.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectPath(item.path)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent transition-colors',
                        item.path === currentPath && 'bg-accent'
                      )}
                    >
                      <div className="truncate font-medium" title={item.path}>
                        {item.path}
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        {formatTime(item.last_accessed_at)}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {recentPaths.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">暂无访问记录</div>
          )}
        </PopoverContent>
      </Popover>

      {/* 路径输入对话框 */}
      <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>输入工作目录路径</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="例如: /home/user/projects 或 D:\Projects"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInputConfirm();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-2">
              输入设备上的绝对路径，按 Enter 确认
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInputDialog(false)}>
              取消
            </Button>
            <Button onClick={handleInputConfirm} disabled={!inputPath.trim()}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
