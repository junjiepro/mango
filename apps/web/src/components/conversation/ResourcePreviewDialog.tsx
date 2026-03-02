/**
 * ResourcePreviewDialog Component
 * 资源预览弹窗 - 支持可弹窗预览的资源类型
 * 可弹窗预览类型：图片、链接、MiniApp、A2UI组件、html代码
 */

'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, EyeIcon, CodeIcon, CopyIcon, CheckIcon, ExternalLinkIcon } from 'lucide-react';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import { cn } from '@/lib/utils';
import { A2UIRenderer } from '@/components/a2ui/A2UIRenderer';
import { MiniAppWindow } from '@/components/miniapp/MiniAppWindow';
import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewBody,
} from '@/components/ai-elements/web-preview';

interface ResourcePreviewDialogProps {
  resource: DetectedResource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

/**
 * 判断资源是否支持弹窗预览
 */
export function canPreviewInDialog(resource: DetectedResource): boolean {
  // 可弹窗预览类型：图片、链接、MiniApp、A2UI组件、html代码
  if (resource.type === 'image') return true;
  if (resource.type === 'link') return true;
  if (resource.type === 'miniapp') return true;
  if (resource.type === 'html') return true;
  if (resource.metadata?.isA2UI) return true;

  return false;
}

/**
 * ResourcePreviewDialog 组件
 */
export function ResourcePreviewDialog({
  resource,
  open,
  onOpenChange,
  className,
}: ResourcePreviewDialogProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);
  const t = useTranslations('conversations');

  // HTML preview URL memoization
  const htmlPreviewUrl = useMemo(() => {
    if (!resource || resource.type !== 'html' || viewMode !== 'preview') return '';
    const blob = new Blob([resource.content], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [resource, viewMode]);

  // 清理 blob URL
  useEffect(() => {
    return () => {
      if (htmlPreviewUrl) {
        URL.revokeObjectURL(htmlPreviewUrl);
      }
    };
  }, [htmlPreviewUrl]);

  if (!resource) return null;

  // 获取资源标题
  const getResourceTitle = () => {
    if (resource.metadata?.filename) return resource.metadata.filename;
    if (resource.metadata?.title) return resource.metadata.title;
    if (resource.type === 'image') return t('resourcePreview.imagePreview');
    if (resource.type === 'link') return t('resourcePreview.linkPreview');
    if (resource.type === 'miniapp') return resource.metadata?.name || t('resourcePreview.miniApp');
    if (resource.type === 'html') return t('resourcePreview.htmlPreview');
    if (resource.metadata?.isA2UI) return t('resourcePreview.a2uiComponent');
    return t('resourcePreview.resourcePreview');
  };

  // 复制源码到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resource.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // 渲染预览内容
  const renderPreviewContent = () => {
    // A2UI 组件预览
    if (resource.metadata?.isA2UI && resource.metadata?.a2uiSchema) {
      return (
        <div className="flex-1 overflow-auto p-6">
          <A2UIRenderer schema={resource.metadata.a2uiSchema} />
        </div>
      );
    }

    // MiniApp 预览
    if (resource.type === 'miniapp' && resource.metadata?.miniApp) {
      const miniApp = resource.metadata.miniApp as Parameters<typeof MiniAppWindow>[0]['miniApp'];
      return (
        <div className="flex-1 overflow-hidden">
          <MiniAppWindow miniApp={miniApp} onClose={() => onOpenChange(false)} className="h-full" />
        </div>
      );
    }

    // 图片预览
    if (resource.type === 'image' && resource.metadata?.url) {
      return (
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-muted/20">
          <img
            src={resource.metadata.url}
            alt={resource.metadata.filename || 'image'}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      );
    }

    // HTML 预览
    if (resource.type === 'html') {
      const htmlContent = resource.content;

      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 视图切换按钮 */}
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            <Button
              size="sm"
              variant={viewMode === 'preview' ? 'default' : 'ghost'}
              onClick={() => setViewMode('preview')}
              className="h-8 px-3"
            >
              <EyeIcon className="size-4 mr-1" />
              {t('resourcePreview.preview')}
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'source' ? 'default' : 'ghost'}
              onClick={() => setViewMode('source')}
              className="h-8 px-3"
            >
              <CodeIcon className="size-4 mr-1" />
              {t('resourcePreview.source')}
            </Button>
          </div>

          {/* 内容区域 */}
          {viewMode === 'preview' ? (
            <div className="flex-1 overflow-hidden">
              <iframe
                src={htmlPreviewUrl}
                className="flex-1 border-0"
                title="HTML Preview"
                sandbox="allow-scripts"
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4 bg-muted/50 relative">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="absolute top-2 right-2 h-8 w-8 p-0"
                title={copied ? t('resourcePreview.copied') : t('resourcePreview.copySource')}
              >
                {copied ? (
                  <CheckIcon className="size-4 text-green-500" />
                ) : (
                  <CopyIcon className="size-4" />
                )}
              </Button>
              <pre className="text-xs font-mono whitespace-pre-wrap break-words pr-12">
                <code>{htmlContent}</code>
              </pre>
            </div>
          )}
        </div>
      );
    }

    // 链接预览
    if (resource.type === 'link' && resource.metadata?.url) {
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 视图切换和外部链接按钮 */}
          <div className="flex items-center gap-2 px-4 py-2 border-b">
            <Button
              size="sm"
              variant={viewMode === 'preview' ? 'default' : 'ghost'}
              onClick={() => setViewMode('preview')}
              className="h-8 px-3"
            >
              <EyeIcon className="size-4 mr-1" />
              {t('resourcePreview.preview')}
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'source' ? 'default' : 'ghost'}
              onClick={() => setViewMode('source')}
              className="h-8 px-3"
            >
              <CodeIcon className="size-4 mr-1" />
              {t('resourcePreview.info')}
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(resource.metadata?.url, '_blank')}
              className="h-8 px-3"
            >
              <ExternalLinkIcon className="size-4 mr-1" />
              {t('resourcePreview.openInNewWindow')}
            </Button>
          </div>

          {/* 内容区域 */}
          {viewMode === 'preview' ? (
            <div className="flex-1 overflow-hidden">
              <iframe
                src={resource.metadata.url}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title={resource.metadata.title || t('resourcePreview.linkPreview')}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    {t('resourcePreview.linkUrl')}
                  </h3>
                  <a
                    href={resource.metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline break-all"
                  >
                    {resource.metadata.url}
                  </a>
                </div>
                {resource.metadata.domain && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('resourcePreview.domain')}
                    </h3>
                    <p className="text-sm">{resource.metadata.domain}</p>
                  </div>
                )}
                {resource.metadata.description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                      {t('resourcePreview.description')}
                    </h3>
                    <p className="text-sm">{resource.metadata.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-[900px] max-h-[85vh] p-0 flex flex-col', className)}>
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle>{getResourceTitle()}</DialogTitle>
          {resource.metadata?.size && (
            <p className="text-sm text-muted-foreground">
              {formatFileSize(resource.metadata.size)}
            </p>
          )}
        </DialogHeader>

        {renderPreviewContent()}
      </DialogContent>
    </Dialog>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
