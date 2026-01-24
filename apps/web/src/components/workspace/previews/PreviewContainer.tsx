/**
 * Preview Container Component
 * 预览容器组件 - 提供统一的预览器外壳
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PreviewContainerProps {
  title: string;
  icon?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PreviewContainer({
  title,
  icon,
  toolbar,
  children,
  className = '',
  contentClassName = '',
}: PreviewContainerProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 头部 */}
      <div className="px-4 py-2 border-b bg-muted/20 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="text-sm font-medium truncate">{title}</span>
        </div>
        {toolbar && <div className="flex items-center gap-1 shrink-0">{toolbar}</div>}
      </div>
      {/* 内容区 */}
      <div className={cn('flex-1 min-h-0 flex flex-col', contentClassName)}>{children}</div>
    </div>
  );
}

/**
 * 预览错误组件
 */
interface PreviewErrorProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
}

export function PreviewError({
  message = '无法预览此文件',
  description,
  onRetry,
}: PreviewErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
      <div className="text-center">
        <p className="text-sm font-medium">{message}</p>
        {description && <p className="text-xs mt-2 text-muted-foreground/70">{description}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            重试
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 预览加载组件
 */
interface PreviewLoadingProps {
  message?: string;
}

export function PreviewLoading({ message = '加载中...' }: PreviewLoadingProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    </div>
  );
}

/**
 * 不支持预览组件
 */
interface UnsupportedPreviewProps {
  filename: string;
  extension?: string;
  onDownload?: () => void;
}

export function UnsupportedPreview({ filename, extension, onDownload }: UnsupportedPreviewProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <span className="text-2xl">📄</span>
        </div>
        <p className="text-sm font-medium">{filename}</p>
        {extension && (
          <p className="text-xs mt-1 text-muted-foreground/70">
            .{extension.toUpperCase()} 文件暂不支持预览
          </p>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="mt-4 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            下载文件
          </button>
        )}
      </div>
    </div>
  );
}
