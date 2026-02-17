/**
 * WorkspaceHeader Component
 * 工作区头部组件
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  X,
  Maximize2,
  Minimize2,
  Settings,
  RefreshCw
} from 'lucide-react';

interface WorkspaceHeaderProps {
  title?: string;
  isFullscreen?: boolean;
  onClose?: () => void;
  onToggleFullscreen?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
  showActions?: boolean;
}

export function WorkspaceHeader({
  title,
  isFullscreen = false,
  onClose,
  onToggleFullscreen,
  onRefresh,
  onSettings,
  showActions = true
}: WorkspaceHeaderProps) {
  const t = useTranslations('workspace');

  const resolvedTitle = title ?? t('header.title');

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">{resolvedTitle}</h2>
      </div>

      {/* 操作按钮 */}
      {showActions && (
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 hover:bg-accent rounded transition-colors"
              title={t('header.refresh')}
              aria-label={t('header.refreshWorkspace')}
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          {onSettings && (
            <button
              onClick={onSettings}
              className="p-1.5 hover:bg-accent rounded transition-colors"
              title={t('header.settings')}
              aria-label={t('header.workspaceSettings')}
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          )}

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 hover:bg-accent rounded transition-colors"
              title={isFullscreen ? t('header.exitFullscreen') : t('header.fullscreen')}
              aria-label={isFullscreen ? t('header.exitFullscreen') : t('header.fullscreen')}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-accent rounded transition-colors"
              title={t('header.close')}
              aria-label={t('header.closeWorkspace')}
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
