/**
 * ActivityBar Component
 * VS Code 风格的最左侧图标栏
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Laptop,
  FolderTree,
  Terminal as TerminalIcon,
  GitBranch,
  Settings,
  Package,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type ActivityBarItem = 'resources' | 'devices' | 'files' | 'terminal' | 'git' | 'apps' | 'settings';

interface ActivityBarProps {
  activeItem: ActivityBarItem;
  onItemClick: (item: ActivityBarItem) => void;
  className?: string;
}

const activityItems: Array<{
  id: ActivityBarItem;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
}> = [
  { id: 'resources', icon: FileText, labelKey: 'activityBar.sessionResources' },
  { id: 'devices', icon: Laptop, labelKey: 'activityBar.deviceManager' },
  { id: 'files', icon: FolderTree, labelKey: 'activityBar.fileExplorer' },
  { id: 'git', icon: GitBranch, labelKey: 'activityBar.sourceControl' },
  { id: 'terminal', icon: TerminalIcon, labelKey: 'activityBar.terminal' },
  { id: 'apps', icon: Package, labelKey: 'activityBar.appManager' },
];

export function ActivityBar({ activeItem, onItemClick, className = '' }: ActivityBarProps) {
  const t = useTranslations('workspace');
  return (
    <div className={`flex flex-col w-12 bg-muted/40 ${className}`}>
      <TooltipProvider delayDuration={300}>
        {/* 主要功能图标 */}
        <div className="flex-1 flex flex-col items-center py-2 gap-1">
          {activityItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onItemClick(item.id)}
                    className={`w-10 h-10 relative ${
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{t(item.labelKey)}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* 底部设置图标 */}
        <div className="flex flex-col items-center py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onItemClick('settings')}
                className={`w-10 h-10 ${
                  activeItem === 'settings'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{t('activityBar.settings')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
