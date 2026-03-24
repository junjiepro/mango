/**
 * ResourcePreview Component
 * 资源预览组件 - 在编辑区显示资源内容（只读模式）
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState } from 'react';
import type { DetectedResource } from '@mango/shared/types/resource.types';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Code,
  Link as LinkIcon,
  Eye,
  ExternalLink,
  Download,
  RefreshCw,
  Smartphone,
  Tablet,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { A2UIRenderer } from '@/components/a2ui/A2UIRenderer';
import { MiniAppWindow } from '@/components/miniapp/MiniAppWindow';
import { PreviewContainer, PreviewLoading, PreviewError } from './previews/PreviewContainer';

interface ResourcePreviewProps {
  resource: DetectedResource;
  className?: string;
}

function normalizeLinkUrl(value?: string): string {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  return '';
}

// 资源类型图标映射
function getResourceIcon(type: string) {
  switch (type) {
    case 'image':
      return <ImageIcon className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'audio':
      return <Music className="h-4 w-4" />;
    case 'code':
      return <Code className="h-4 w-4" />;
    case 'link':
      return <LinkIcon className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export function ResourcePreview({ resource, className = '' }: ResourcePreviewProps) {
  const linkUrl = normalizeLinkUrl(resource.metadata?.url || resource.content);

  // A2UI 组件预览
  if (resource.metadata?.isA2UI && resource.metadata?.a2uiSchema) {
    return <A2UIPreview resource={resource} className={className} />;
  }

  // MiniApp 预览
  if (resource.type === 'miniapp' && resource.metadata?.miniApp && resource.metadata?.installation) {
    return <MiniAppPreview resource={resource} className={className} />;
  }

  // 图片预览
  if (resource.type === 'image' && resource.metadata?.url) {
    return <ImageResourcePreview resource={resource} className={className} />;
  }

  // 视频预览
  if (resource.type === 'video' && resource.metadata?.url) {
    return <VideoResourcePreview resource={resource} className={className} />;
  }

  // 音频预览
  if (resource.type === 'audio' && resource.metadata?.url) {
    return <AudioResourcePreview resource={resource} className={className} />;
  }

  // 代码预览
  if (resource.type === 'code') {
    return <CodeResourcePreview resource={resource} className={className} />;
  }

  // 链接预览
  if (resource.type === 'link' && linkUrl) {
    return <LinkResourcePreview resource={resource} className={className} />;
  }

  // 默认预览
  return <DefaultResourcePreview resource={resource} className={className} />;
}

/**
 * A2UI 组件预览
 */
function A2UIPreview({ resource, className }: ResourcePreviewProps) {
  return (
    <PreviewContainer
      title="A2UI 组件"
      icon={<Code className="h-4 w-4" />}
      className={className}
    >
      <div className="flex-1 overflow-auto p-4">
        <A2UIRenderer schema={resource.metadata?.a2uiSchema} />
      </div>
    </PreviewContainer>
  );
}

/**
 * MiniApp 预览
 */
function MiniAppPreview({ resource, className }: ResourcePreviewProps) {
  const miniApp = resource.metadata?.miniApp as Parameters<typeof MiniAppWindow>[0]['miniApp'] | undefined;
  const displayName = (miniApp as { display_name?: string })?.display_name;

  if (!miniApp) {
    return (
      <PreviewContainer
        title="小应用"
        icon={<Eye className="h-4 w-4" />}
        className={className}
      >
        <PreviewError message="无法加载小应用" description="缺少必要的配置信息" />
      </PreviewContainer>
    );
  }

  return (
    <PreviewContainer
      title={displayName || '小应用'}
      icon={<Eye className="h-4 w-4" />}
      className={className}
    >
      <div className="flex-1 overflow-hidden">
        <MiniAppWindow
          miniApp={miniApp}
          onClose={() => {}}
          className="h-full"
        />
      </div>
    </PreviewContainer>
  );
}

/**
 * 图片资源预览
 */
function ImageResourcePreview({ resource, className }: ResourcePreviewProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const url = resource.metadata?.url || '';
  const filename = resource.metadata?.filename || '图片';

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.25, 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
              <span className="text-xs font-bold">−</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>缩小</TooltipContent>
        </Tooltip>
        <span className="text-xs text-muted-foreground w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
              <span className="text-xs font-bold">+</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>放大</TooltipContent>
        </Tooltip>
        <div className="w-px h-4 bg-border mx-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRotate}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>旋转</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
              <Monitor className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>重置</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  return (
    <PreviewContainer
      title={filename}
      icon={<ImageIcon className="h-4 w-4" />}
      toolbar={toolbar}
      className={className}
    >
      <div className="flex-1 overflow-auto flex items-center justify-center bg-muted/20 p-4">
        <img
          src={url}
          alt={filename}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
          }}
          draggable={false}
        />
      </div>
    </PreviewContainer>
  );
}

/**
 * 视频资源预览
 */
function VideoResourcePreview({ resource, className }: ResourcePreviewProps) {
  const url = resource.metadata?.url || '';
  const filename = resource.metadata?.filename || '视频';

  return (
    <PreviewContainer
      title={filename}
      icon={<Video className="h-4 w-4" />}
      className={className}
    >
      <div className="flex-1 flex items-center justify-center bg-black">
        <video controls className="max-w-full max-h-full">
          <source src={url} />
          您的浏览器不支持视频播放
        </video>
      </div>
    </PreviewContainer>
  );
}

/**
 * 音频资源预览
 */
function AudioResourcePreview({ resource, className }: ResourcePreviewProps) {
  const url = resource.metadata?.url || '';
  const filename = resource.metadata?.filename || '音频';

  return (
    <PreviewContainer
      title={filename}
      icon={<Music className="h-4 w-4" />}
      className={className}
    >
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
          <Music className="h-12 w-12 text-primary/60" />
        </div>
        <audio controls className="w-full max-w-md">
          <source src={url} />
          您的浏览器不支持音频播放
        </audio>
      </div>
    </PreviewContainer>
  );
}

/**
 * 代码资源预览
 */
function CodeResourcePreview({ resource, className }: ResourcePreviewProps) {
  const language = resource.metadata?.language || 'text';

  return (
    <PreviewContainer
      title="代码片段"
      icon={<Code className="h-4 w-4" />}
      toolbar={
        <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
          {language}
        </span>
      }
      className={className}
    >
      <div className="flex-1 overflow-auto">
        <pre className="p-4 text-sm font-mono bg-muted/30 min-h-full">
          <code>{resource.content}</code>
        </pre>
      </div>
    </PreviewContainer>
  );
}

/**
 * 链接资源预览
 */
function LinkResourcePreview({ resource, className }: ResourcePreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'info'>('preview');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const url = normalizeLinkUrl(resource.metadata?.url || resource.content);
  const title = resource.metadata?.title || resource.metadata?.domain || '链接';
  const domain = resource.metadata?.domain || '';

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  };

  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* 视图切换 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('preview')}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>预览</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={viewMode === 'info' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('info')}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>信息</TooltipContent>
        </Tooltip>

        {viewMode === 'preview' && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            {/* 设备模式 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={deviceMode === 'desktop' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDeviceMode('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>桌面</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={deviceMode === 'tablet' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDeviceMode('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>平板</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={deviceMode === 'mobile' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDeviceMode('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>手机</TooltipContent>
            </Tooltip>
          </>
        )}

        <div className="w-px h-4 bg-border mx-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>新窗口打开</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  return (
    <PreviewContainer
      title={title}
      icon={<LinkIcon className="h-4 w-4" />}
      toolbar={toolbar}
      className={className}
    >
      {viewMode === 'preview' ? (
        <div className="flex-1 flex items-center justify-center bg-muted/10 overflow-hidden">
          <div
            className="h-full bg-background shadow-lg transition-all duration-300"
            style={{ width: deviceWidths[deviceMode], maxWidth: '100%' }}
          >
            {isLoading && <PreviewLoading message="加载页面中..." />}
            {error && <PreviewError message="页面加载失败" description={error} />}
            <iframe
              src={url}
              className={`w-full h-full border-0 ${isLoading ? 'hidden' : ''}`}
              sandbox="allow-scripts allow-same-origin allow-forms"
              title={title}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError('无法加载此页面');
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-lg mx-auto space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              {domain && <p className="text-sm text-muted-foreground">{domain}</p>}
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm break-all block"
            >
              {url}
            </a>
            {resource.metadata?.description && (
              <p className="text-sm text-muted-foreground">{resource.metadata.description}</p>
            )}
          </div>
        </div>
      )}
    </PreviewContainer>
  );
}

/**
 * 默认资源预览
 */
function DefaultResourcePreview({ resource, className }: ResourcePreviewProps) {
  const title = resource.metadata?.filename || resource.metadata?.title || '资源';

  return (
    <PreviewContainer
      title={title}
      icon={getResourceIcon(resource.type)}
      className={className}
    >
      <div className="flex-1 overflow-auto p-4">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{resource.content}</p>
      </div>
    </PreviewContainer>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
