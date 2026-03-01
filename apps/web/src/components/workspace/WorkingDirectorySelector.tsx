/**
 * WorkingDirectorySelector Component
 * 工作目录选择器组件
 * 支持显示当前工作目录、切换目录、查看历史记录
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('workspace');
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

    if (diffMins < 1) return t('workingDirSelector.justNow');
    if (diffMins < 60) return t('workingDirSelector.minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('workingDirSelector.hoursAgo', { count: diffHours });
    if (diffDays < 7) return t('workingDirSelector.daysAgo', { count: diffDays });
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
              {currentPath ? formatPath(currentPath) : t('workingDirSelector.selectDir')}
            </span>
            <ChevronDown className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-4 w-4')} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          {/* 当前路径 */}
          <div className="p-3 border-b">
            <div className="text-xs text-muted-foreground mb-1">{t('workingDirSelector.currentDir')}</div>
            <div className="text-sm font-medium truncate" title={currentPath}>
              {currentPath || t('workingDirSelector.notSet')}
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
              {t('workingDirSelector.inputPath')}
            </Button>
          </div>

          {/* 历史记录 */}
          {recentPaths.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <History className="h-3 w-3" />
                <span>{t('workingDirSelector.recentAccess')}</span>
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
            <div className="p-4 text-center text-xs text-muted-foreground">{t('workingDirSelector.noHistory')}</div>
          )}
        </PopoverContent>
      </Popover>

      {/* 路径输入对话框 */}
      <Dialog open={showInputDialog} onOpenChange={setShowInputDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('workingDirSelector.inputDirPath')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder={t('workingDirSelector.pathExample')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleInputConfirm();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {t('workingDirSelector.pathHint')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInputDialog(false)}>
              {t('workingDirSelector.cancel')}
            </Button>
            <Button onClick={handleInputConfirm} disabled={!inputPath.trim()}>
              {t('workingDirSelector.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
