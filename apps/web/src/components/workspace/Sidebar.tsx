/**
 * Sidebar Component
 * VS Code 风格的左侧栏，显示对应标签的功能列表
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ActivityBarItem } from './ActivityBar';

interface SidebarProps {
  activeItem: ActivityBarItem;
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Sidebar({ activeItem, title, children, onClose, className = '' }: SidebarProps) {
  return (
    <div className={`flex flex-col w-64 bg-background border-r ${className}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between h-12 px-4 border-b">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 内容区域 */}
      <ScrollArea className="flex-1">
        <div className="p-2">{children}</div>
      </ScrollArea>
    </div>
  );
}
