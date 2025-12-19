/**
 * MiniAppReference Component
 * 显示消息中引用的 MiniApp，支持点击打开
 */

'use client';

import React from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row'];

interface MiniAppReferenceProps {
  miniApp: MiniApp;
  installation: MiniAppInstallation;
  onOpen?: (miniApp: MiniApp, installation: MiniAppInstallation) => void;
  className?: string;
  compact?: boolean;
}

/**
 * MiniAppReference 组件
 * 在消息下方显示被引用的 MiniApp
 */
export function MiniAppReference({
  miniApp,
  installation,
  onOpen,
  className,
  compact = false,
}: MiniAppReferenceProps) {
  const handleClick = () => {
    onOpen?.(miniApp, installation);
  };

  if (compact) {
    // 紧凑模式：用于快速访问栏
    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border',
          'bg-purple-50 border-purple-200 hover:bg-purple-100',
          'dark:bg-purple-950 dark:border-purple-800 dark:hover:bg-purple-900',
          'transition-colors text-sm',
          className
        )}
        title={miniApp.description}
      >
        {miniApp.icon_url ? (
          <img
            src={miniApp.icon_url}
            alt={miniApp.display_name}
            className="h-4 w-4 rounded object-cover"
          />
        ) : (
          <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        )}
        <span className="font-medium text-purple-900 dark:text-purple-100">
          {installation.custom_name || miniApp.display_name}
        </span>
      </button>
    );
  }

  // 完整模式：用于消息下方
  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border w-full text-left',
        'bg-purple-50 border-purple-200 hover:bg-purple-100',
        'dark:bg-purple-950 dark:border-purple-800 dark:hover:bg-purple-900',
        'transition-colors',
        className
      )}
    >
      {/* MiniApp 图标 */}
      {miniApp.icon_url ? (
        <img
          src={miniApp.icon_url}
          alt={miniApp.display_name}
          className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900 flex-shrink-0">
          <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
      )}

      {/* MiniApp 信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-purple-900 dark:text-purple-100 truncate">
            {installation.custom_name || miniApp.display_name}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 flex-shrink-0">
            小应用
          </span>
        </div>
        <p className="text-xs text-purple-700 dark:text-purple-300 line-clamp-2">
          {miniApp.description}
        </p>
      </div>

      {/* 打开图标 */}
      <div className="flex-shrink-0 text-purple-600 dark:text-purple-400">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </div>
    </button>
  );
}
