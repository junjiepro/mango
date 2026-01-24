/**
 * ResourceItem Component
 * 单个资源项的展示组件
 * User Story 5: 资源嗅探与管理
 */

'use client';

import React from 'react';
import type { DetectedResource, ResourceType } from '@mango/shared/types/resource.types';
import {
  FileText,
  FileCode,
  Globe,
  Package,
  Sparkles,
  PaperclipIcon,
  LinkIcon,
  ImageIcon,
  VideoIcon,
  MusicIcon,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ResourceItemProps {
  resource: DetectedResource;
  onClick?: (resource: DetectedResource) => void;
}

export function ResourceItem({ resource, onClick }: ResourceItemProps) {
  const isMiniApp = resource.type === 'miniapp';
  const isImage = resource.type === 'image';
  const isFile = resource.type === 'file';
  const isA2UI = resource.metadata?.isA2UI;

  const handleClick = () => {
    onClick?.(resource);
  };

  const displayName = resource.metadata.filename || resource.metadata.title || resource.content;
  const details = [
    resource.metadata.domain,
    resource.metadata.size ? formatFileSize(resource.metadata.size) : null,
    resource.confidence ? `${Math.round(resource.confidence * 100)}% 置信度` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  // MiniApp 资源 - 紫色主题
  if (isMiniApp) {
    return (
      <div className="w-full min-w-0 max-w-full">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={handleClick}
                className={cn(
                  'flex items-center w-full gap-2 px-2 py-1.5 rounded cursor-pointer overflow-hidden',
                  'bg-purple-50 hover:bg-purple-100',
                  'dark:bg-purple-950 dark:hover:bg-purple-900'
                )}
              >
                <Package className="h-4 w-4 flex-shrink-0 text-purple-600 dark:text-purple-400" />
                <span className="text-sm truncate flex-1 min-w-0 text-purple-900 dark:text-purple-100">
                  {displayName}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">{displayName}</p>
                {details && <p className="text-xs text-muted-foreground">{details}</p>}
                <p className="text-xs text-muted-foreground">小应用</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // A2UI 资源
  if (isA2UI) {
    return (
      <div className="w-full min-w-0">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={handleClick}
                className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent rounded cursor-pointer overflow-hidden"
              >
                <Sparkles className="h-4 w-4 flex-shrink-0 text-blue-500" />
                <span className="text-sm truncate flex-1 min-w-0">A2UI Component</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">A2UI Component</p>
                <p className="text-xs text-muted-foreground">交互式组件</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // 图片资源 - 显示缩略图 + 文件名
  if (isImage && resource.metadata?.url) {
    return (
      <div className="w-full min-w-0">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                onClick={handleClick}
                className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent rounded cursor-pointer overflow-hidden"
              >
                <div className="relative size-8 overflow-hidden rounded border border-border flex-shrink-0">
                  <img
                    src={resource.metadata.url}
                    alt={displayName}
                    className="size-full object-cover"
                  />
                </div>
                <span className="text-sm truncate flex-1 min-w-0">{displayName}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-medium">{displayName}</p>
                {details && <p className="text-xs text-muted-foreground">{details}</p>}
                <p className="text-xs text-muted-foreground">图片</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // 其他资源类型 - 默认样式
  const Icon = getResourceIcon(resource.type);
  const label = getResourceLabel(resource.type);

  return (
    <div className="w-full min-w-0">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              onClick={handleClick}
              className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-accent rounded cursor-pointer overflow-hidden"
            >
              <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-sm truncate flex-1 min-w-0">{displayName}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{displayName}</p>
              {details && <p className="text-xs text-muted-foreground">{details}</p>}
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function getResourceIcon(type: ResourceType) {
  const icons = {
    file: PaperclipIcon,
    link: LinkIcon,
    miniapp: Package,
    code: FileCode,
    image: ImageIcon,
    video: VideoIcon,
    audio: MusicIcon,
  };
  return icons[type] || FileText;
}

function getResourceLabel(type: ResourceType): string {
  const labels = {
    file: '文件',
    link: '链接',
    miniapp: '小应用',
    code: '代码',
    image: '图片',
    video: '视频',
    audio: '音频',
  };
  return labels[type] || '资源';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
