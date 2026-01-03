/**
 * ResourceItem Component
 * 单个资源项的展示组件
 * User Story 5: 资源嗅探与管理
 */

'use client';

import React from 'react';
import type { DetectedResource, ResourceType } from '@mango/shared/types/resource.types';
import {
  FileIcon,
  LinkIcon,
  ImageIcon,
  VideoIcon,
  MusicIcon,
  CodeIcon,
  AppWindowIcon,
  DownloadIcon,
  ExternalLinkIcon
} from 'lucide-react';

interface ResourceItemProps {
  resource: DetectedResource;
  onClick?: (resource: DetectedResource) => void;
  showActions?: boolean;
}

const RESOURCE_ICONS: Record<ResourceType, React.ComponentType<any>> = {
  file: FileIcon,
  link: LinkIcon,
  miniapp: AppWindowIcon,
  code: CodeIcon,
  image: ImageIcon,
  video: VideoIcon,
  audio: MusicIcon,
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  file: '文件',
  link: '链接',
  miniapp: '小应用',
  code: '代码',
  image: '图片',
  video: '视频',
  audio: '音频',
};

export function ResourceItem({ resource, onClick, showActions = true }: ResourceItemProps) {
  const Icon = RESOURCE_ICONS[resource.type];
  const label = RESOURCE_LABELS[resource.type];

  const handleClick = () => {
    onClick?.(resource);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 触发下载逻辑
    if (resource.metadata.url) {
      window.open(resource.metadata.url, '_blank');
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 打开资源
    if (resource.type === 'link' && resource.metadata.url) {
      window.open(resource.metadata.url, '_blank');
    } else if (resource.type === 'miniapp') {
      // 触发小应用打开逻辑
      onClick?.(resource);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
    >
      {/* 图标 */}
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
          {resource.confidence && (
            <span className="text-xs text-gray-400">
              {Math.round(resource.confidence * 100)}%
            </span>
          )}
        </div>
        <div className="text-sm font-medium text-gray-900 truncate">
          {resource.metadata.filename || resource.metadata.title || resource.content}
        </div>
        {resource.metadata.domain && (
          <div className="text-xs text-gray-500 truncate">
            {resource.metadata.domain}
          </div>
        )}
        {resource.metadata.size && (
          <div className="text-xs text-gray-500">
            {formatFileSize(resource.metadata.size)}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {showActions && (
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(resource.type === 'file' || resource.type === 'image' || resource.type === 'video' || resource.type === 'audio') && (
            <button
              onClick={handleDownload}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="下载"
            >
              <DownloadIcon className="w-4 h-4 text-gray-600" />
            </button>
          )}
          {(resource.type === 'link' || resource.type === 'miniapp') && (
            <button
              onClick={handleOpen}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="打开"
            >
              <ExternalLinkIcon className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
