/**
 * HTML Previewer Component
 * HTML 预览器 - 支持沙箱预览和源码查看
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Globe, Eye, Code, Columns, RefreshCw, ExternalLink, Copy, Check, Smartphone, Monitor, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { PreviewContainer, PreviewLoading, PreviewError } from './PreviewContainer';
import type { PreviewerProps } from './types';
import { buildFileUrl } from './types';

type ViewMode = 'preview' | 'source' | 'split';
type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_SIZES: Record<DeviceMode, { width: string; label: string }> = {
  desktop: { width: '100%', label: '桌面' },
  tablet: { width: '768px', label: '平板' },
  mobile: { width: '375px', label: '手机' },
};

export function HTMLPreviewer({ file, deviceClient, className = '' }: PreviewerProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fileUrl = deviceClient ? buildFileUrl(deviceClient.deviceUrl, file.path) : '';

  // 加载文件内容（用于源码视图）
  useEffect(() => {
    const loadFile = async () => {
      if (viewMode === 'preview') {
        setIsLoading(false);
        return;
      }

      if (!deviceClient) {
        setError('设备客户端未就绪');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const data = await deviceClient.files.read(file.path);
        setContent(data.content || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [file.path, deviceClient, viewMode]);

  // 复制内容
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  }, [content]);

  // 刷新
  const handleRefresh = useCallback(() => {
    setKey((prev) => prev + 1);
    setIsLoading(true);
    setError(null);
  }, []);

  // 在新窗口打开
  const handleOpenExternal = useCallback(() => {
    window.open(fileUrl, '_blank');
  }, [fileUrl]);

  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* 视图模式切换 */}
        <div className="flex items-center gap-1 mr-2">
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
            <TooltipContent>预览模式</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'source' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('source')}
              >
                <Code className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>源码模式</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('split')}
              >
                <Columns className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>分栏模式</TooltipContent>
          </Tooltip>
        </div>

        {/* 设备模式切换 */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <div className="flex items-center gap-1">
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
                <TooltipContent>桌面视图</TooltipContent>
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
                <TooltipContent>平板视图</TooltipContent>
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
                <TooltipContent>手机视图</TooltipContent>
              </Tooltip>
            </div>
          </>
        )}

        <div className="w-px h-4 bg-border mx-1" />

        {/* 复制 */}
        {viewMode !== 'preview' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>复制源码</TooltipContent>
          </Tooltip>
        )}

        {/* 刷新 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>刷新</TooltipContent>
        </Tooltip>

        {/* 新窗口打开 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenExternal}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>在新窗口打开</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  if (error) {
    return (
      <PreviewContainer
        title={file.name}
        icon={<Globe className="h-4 w-4" />}
        toolbar={toolbar}
        className={className}
      >
        <PreviewError message={error} onRetry={handleRefresh} />
      </PreviewContainer>
    );
  }

  return (
    <PreviewContainer
      title={file.name}
      icon={<Globe className="h-4 w-4" />}
      toolbar={toolbar}
      className={className}
    >
      <div className="flex h-full">
        {/* 源码视图 */}
        {(viewMode === 'source' || viewMode === 'split') && (
          <div
            className={`${viewMode === 'split' ? 'w-1/2 border-r' : 'w-full'} overflow-auto p-4 bg-muted/10`}
          >
            {isLoading && viewMode !== 'preview' ? (
              <PreviewLoading message="加载源码..." />
            ) : (
              <pre className="text-sm font-mono whitespace-pre-wrap">{content}</pre>
            )}
          </div>
        )}

        {/* 预览视图 */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-auto flex items-start justify-center p-4 bg-muted/20`}
          >
            <div
              className="relative bg-background shadow-lg rounded-lg overflow-hidden transition-all duration-300"
              style={{
                width: DEVICE_SIZES[deviceMode].width,
                maxWidth: '100%',
                height: deviceMode === 'desktop' ? '100%' : 'auto',
                minHeight: deviceMode !== 'desktop' ? '600px' : undefined,
              }}
            >
              {isLoading && viewMode === 'preview' && (
                <div className="absolute inset-0 z-10 bg-background">
                  <PreviewLoading message="加载页面..." />
                </div>
              )}
              <iframe
                key={key}
                ref={iframeRef}
                src={fileUrl}
                className="w-full h-full border-0"
                title={file.name}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setError('页面加载失败');
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                style={{
                  minHeight: deviceMode !== 'desktop' ? '600px' : '100%',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </PreviewContainer>
  );
}
