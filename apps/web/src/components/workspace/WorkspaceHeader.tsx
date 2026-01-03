/**
 * WorkspaceHeader Component
 * 工作区头部组件
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
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
  title = '工作区',
  isFullscreen = false,
  onClose,
  onToggleFullscreen,
  onRefresh,
  onSettings,
  showActions = true
}: WorkspaceHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
      {/* 标题 */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>

      {/* 操作按钮 */}
      {showActions && (
        <div className="flex items-center gap-1">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="刷新"
              aria-label="刷新工作区"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          )}

          {onSettings && (
            <button
              onClick={onSettings}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="设置"
              aria-label="工作区设置"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          )}

          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title={isFullscreen ? '退出全屏' : '全屏'}
              aria-label={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-gray-600" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="关闭"
              aria-label="关闭工作区"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
