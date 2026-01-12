/**
 * ResourceQuickAccess Component
 * 资源快速访问栏 - 显示对话中的所有资源（文件、代码、MiniApp等）
 */

'use client';

import React, { useMemo } from 'react';
import {
  X,
  FileText,
  Code,
  Link as LinkIcon,
  Package,
  ChevronRight,
  FileCode,
  FileJson,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  File,
  Globe,
  Sparkles,
  PaperclipIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row'];

interface ResourceQuickAccessProps {
  resources: DetectedResource[];
  installations?: any[];
  onOpenMiniApp?: (miniApp: MiniApp, installation: MiniAppInstallation) => void;
  onOpenWorkspace?: () => void;
  onClose?: () => void;
  className?: string;
  // 新增：资源点击处理
  onResourceClick?: (resource: DetectedResource) => void;
  // 新增：工作区激活状态
  isWorkspaceActive?: boolean;
}

/**
 * 资源项组件 - 根据资源类型渲染不同样式
 */
interface ResourceItemProps {
  resource: DetectedResource;
  installations?: any[];
  onOpenMiniApp?: (miniApp: MiniApp, installation: MiniAppInstallation) => void;
  // 新增：资源点击处理
  onResourceClick?: (resource: DetectedResource) => void;
  // 新增：工作区激活状态
  isWorkspaceActive?: boolean;
}

function ResourceItem({ resource, installations, onOpenMiniApp, onResourceClick, isWorkspaceActive }: ResourceItemProps) {
  const isMiniApp = resource.type === 'miniapp';
  const isImage = resource.type === 'image';
  const isFile = resource.type === 'file';
  const isA2UI = resource.metadata?.isA2UI;

  // 判断资源是否可以弹窗预览
  const canPreviewInDialog = () => {
    // 可弹窗预览类型：图片、链接、MiniApp、A2UI组件、html代码
    return (
      resource.type === 'image' ||
      resource.type === 'link' ||
      resource.type === 'miniapp' ||
      resource.type === 'html' ||
      isA2UI
    );
  };

  // 处理资源点击
  const handleClick = () => {
    // MiniApp 特殊处理
    if (isMiniApp) {
      const installation = installations?.find(
        (inst) => inst.id === resource.metadata?.installationId
      );
      const miniApp = installation?.mini_app;
      if (miniApp && installation && onOpenMiniApp) {
        onOpenMiniApp(miniApp, installation);
      }
      return;
    }

    // 其他资源类型
    if (onResourceClick) {
      onResourceClick(resource);
    }
  };

  // MiniApp 资源 - 使用紫色主题，类似 MiniAppReference
  if (isMiniApp) {
    const installation = installations?.find(
      (inst) => inst.id === resource.metadata?.installationId
    );
    const miniApp = installation?.mini_app;

    // 显示名称优先级：自定义名称 > 应用显示名称 > 资源内容
    const displayName = installation?.custom_name || miniApp?.display_name || resource.content;

    return (
      <button
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border',
          'bg-purple-50 border-purple-200 hover:bg-purple-100',
          'dark:bg-purple-950 dark:border-purple-800 dark:hover:bg-purple-900',
          'transition-colors flex-shrink-0'
        )}
        title={miniApp?.description || resource.content}
      >
        {miniApp?.icon_url ? (
          <img src={miniApp.icon_url} alt={displayName} className="h-4 w-4 rounded object-cover" />
        ) : (
          <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        )}
        <span className="text-xs font-medium text-purple-900 dark:text-purple-100 truncate max-w-[120px]">
          {displayName}
        </span>
      </button>
    );
  }

  // A2UI 资源 - 使用特殊图标
  if (isA2UI) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-md hover:bg-accent transition-colors flex-shrink-0"
        title="A2UI Component"
      >
        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-xs truncate max-w-[120px]">A2UI Component</span>
      </button>
    );
  }

  // 图片资源 - 显示缩略图
  if (isImage && resource.metadata?.url) {
    return (
      <button
        onClick={handleClick}
        className="relative size-8 overflow-hidden rounded-lg border border-border hover:border-primary transition-colors flex-shrink-0"
        title={resource.metadata.filename || 'Image'}
      >
        <img
          src={resource.metadata.url}
          alt={resource.metadata.filename || 'image'}
          className="size-full object-cover"
        />
      </button>
    );
  }

  // 文件资源 - 类似 MessageAttachment 样式
  if (isFile) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-md hover:bg-accent transition-colors flex-shrink-0"
        title={resource.metadata?.filename || resource.content}
      >
        <PaperclipIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs truncate max-w-[120px]">
          {resource.metadata?.filename || resource.content}
        </span>
      </button>
    );
  }

  // 其他资源类型 - 默认样式
  const Icon = RESOURCE_ICONS[resource.type] || FileText;
  const isHtml = resource.type === 'html' || resource.metadata?.language === 'html';

  let displayName = resource.metadata?.filename || resource.content;
  if (resource.type === 'code') {
    displayName = `${resource.metadata?.language || 'code'} 代码`;
  } else if (isHtml) {
    displayName = 'HTML 代码';
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-md hover:bg-accent transition-colors flex-shrink-0"
      title={resource.content}
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs truncate max-w-[120px]">{displayName}</span>
    </button>
  );
}

// 资源类型图标映射
const RESOURCE_ICONS = {
  file: FileText,
  code: FileCode,
  html: Globe,
  link: LinkIcon,
  miniapp: Package,
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  archive: FileArchive,
};

/**
 * ResourceQuickAccess 组件
 * 显示总资源数和最近的几个资源供快速访问
 */
export function ResourceQuickAccess({
  resources,
  installations,
  onOpenMiniApp,
  onOpenWorkspace,
  onClose,
  className,
  onResourceClick,
  isWorkspaceActive = false,
}: ResourceQuickAccessProps) {
  // 获取最近的资源（最多显示10个）
  const recentResources = useMemo(() => {
    // 按时间排序（最新的在前）
    return [...resources]
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 10);
  }, [resources]);

  // 如果没有资源，不显示
  if (resources.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-start gap-3 px-4 py-3 bg-muted/30', className)}>
      {/* 资源统计 */}
      <div className="py-[5px] flex items-center gap-2 text-sm font-medium text-foreground flex-shrink-0">
        <FileText className="h-4 w-4 text-primary" />
        <span>资源</span>
        <span className="text-muted-foreground">({resources.length})</span>
      </div>

      {/* 最近资源列表 - 横向滚动 */}
      <div
        className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        style={{
          scrollbarGutter: 'stable',
          overflowY: 'hidden',
        }}
      >
        <div className="flex items-center gap-2 pb-1">
          {recentResources.map((resource) => (
            <ResourceItem
              key={resource.id}
              resource={resource}
              installations={installations}
              onOpenMiniApp={onOpenMiniApp}
              onResourceClick={onResourceClick}
              isWorkspaceActive={isWorkspaceActive}
            />
          ))}
        </div>
      </div>

      {/* 更多按钮 */}
      {onOpenWorkspace && (
        <button
          onClick={onOpenWorkspace}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-accent rounded-md transition-colors flex-shrink-0"
        >
          <span>更多</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
