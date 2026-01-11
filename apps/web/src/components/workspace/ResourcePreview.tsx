/**
 * ResourcePreview Component
 * 资源预览组件 - 在编辑区显示资源内容
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import { FileText, Image as ImageIcon, Video, Music, Code, Link as LinkIcon } from 'lucide-react';

interface ResourcePreviewProps {
  resource: DetectedResource;
  className?: string;
}

export function ResourcePreview({ resource, className = '' }: ResourcePreviewProps) {
  // 图片预览
  if (resource.type === 'image' && resource.metadata?.url) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b">
          <h3 className="font-semibold">{resource.metadata.filename || '图片'}</h3>
          {resource.metadata.size && (
            <p className="text-sm text-muted-foreground">
              {formatFileSize(resource.metadata.size)}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/20">
          <img
            src={resource.metadata.url}
            alt={resource.metadata.filename || 'image'}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    );
  }

  // 视频预览
  if (resource.type === 'video' && resource.metadata?.url) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b">
          <h3 className="font-semibold">{resource.metadata.filename || '视频'}</h3>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black">
          <video controls className="max-w-full max-h-full">
            <source src={resource.metadata.url} />
            您的浏览器不支持视频播放
          </video>
        </div>
      </div>
    );
  }

  // 音频预览
  if (resource.type === 'audio' && resource.metadata?.url) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b">
          <h3 className="font-semibold">{resource.metadata.filename || '音频'}</h3>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <audio controls className="w-full max-w-md">
            <source src={resource.metadata.url} />
            您的浏览器不支持音频播放
          </audio>
        </div>
      </div>
    );
  }

  // 代码预览
  if (resource.type === 'code') {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b">
          <h3 className="font-semibold">代码片段</h3>
          {resource.metadata?.language && (
            <p className="text-sm text-muted-foreground">{resource.metadata.language}</p>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          <pre className="p-4 text-sm">
            <code>{resource.content}</code>
          </pre>
        </div>
      </div>
    );
  }

  // 链接预览
  if (resource.type === 'link' && resource.metadata?.url) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="p-4 border-b">
          <h3 className="font-semibold">{resource.metadata.title || '链接'}</h3>
          {resource.metadata.domain && (
            <p className="text-sm text-muted-foreground">{resource.metadata.domain}</p>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4">
          <a
            href={resource.metadata.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {resource.metadata.url}
          </a>
          {resource.metadata.description && (
            <p className="mt-4 text-sm">{resource.metadata.description}</p>
          )}
        </div>
      </div>
    );
  }

  // 默认预览
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-4 border-b">
        <h3 className="font-semibold">
          {resource.metadata?.filename || resource.metadata?.title || '资源'}
        </h3>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <p className="text-sm text-muted-foreground">{resource.content}</p>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
