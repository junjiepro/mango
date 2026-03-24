/**
 * Link Previewer Component
 * 链接预览器 - 支持网页嵌入预览和元信息展示
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Link2,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { PreviewContainer, PreviewLoading, PreviewError } from './PreviewContainer';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_SIZES: Record<DeviceMode, { width: string; label: string }> = {
  desktop: { width: '100%', label: '桌面' },
  tablet: { width: '768px', label: '平板' },
  mobile: { width: '375px', label: '手机' },
};

interface LinkPreviewerProps {
  url: string;
  title?: string;
  className?: string;
}

export function LinkPreviewer({ url, title, className = '' }: LinkPreviewerProps) {
  const t = useTranslations('workspace');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [showAddressBar, setShowAddressBar] = useState(false);
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0);
  const [inputUrl, setInputUrl] = useState(url);
  const [currentUrl, setCurrentUrl] = useState(url);

  // Sync with prop changes (e.g. device URL change, token refresh)
  useEffect(() => {
    if (url !== currentUrl) {
      setCurrentUrl(url);
      setInputUrl(url);
      setIsLoading(true);
      setError(null);
      setKey((prev) => prev + 1);
    }
  }, [url]);

  // 复制 URL
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      toast.success('已复制链接');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  }, [currentUrl]);

  // 刷新
  const handleRefresh = useCallback(() => {
    setKey((prev) => prev + 1);
    setIsLoading(true);
    setError(null);
  }, []);

  // 在新窗口打开
  const handleOpenExternal = useCallback(() => {
    window.open(currentUrl, '_blank');
  }, [currentUrl]);

  // 导航到新 URL
  const handleNavigate = useCallback(() => {
    if (inputUrl && inputUrl !== currentUrl) {
      let normalizedUrl = inputUrl;
      if (!inputUrl.startsWith('http://') && !inputUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + inputUrl;
      }
      setCurrentUrl(normalizedUrl);
      setInputUrl(normalizedUrl);
      setIsLoading(true);
      setError(null);
      setKey((prev) => prev + 1);
    }
  }, [inputUrl, currentUrl]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleNavigate();
      }
    },
    [handleNavigate]
  );

  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* 设备模式切换 */}
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

        <div className="w-px h-4 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showAddressBar ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowAddressBar((prev) => !prev)}
            >
              {showAddressBar ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showAddressBar ? t('linkPreview.hideAddressBar') : t('linkPreview.showAddressBar')}
          </TooltipContent>
        </Tooltip>

        {/* 复制 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>复制链接</TooltipContent>
        </Tooltip>

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

  return (
    <PreviewContainer
      title={title || '链接预览'}
      icon={<Link2 className="h-4 w-4" />}
      toolbar={toolbar}
      className={className}
    >
      <div className="flex flex-col h-full">
        {/* URL 输入栏 */}
        {showAddressBar && (
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/10">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleNavigate}
              placeholder="输入 URL..."
              className="h-7 text-sm flex-1"
            />
          </div>
        )}

        {/* 预览区域 */}
        <div className="flex-1 overflow-hidden flex items-stretch justify-center">
          {error ? (
            <PreviewError
              message="无法加载页面"
              description="该网站可能不允许嵌入显示，请尝试在新窗口打开"
              onRetry={handleRefresh}
            />
          ) : (
            <div
              className="relative overflow-hidden transition-all duration-300 w-full h-full"
              style={{
                maxWidth: DEVICE_SIZES[deviceMode].width,
              }}
            >
              {isLoading && (
                <div className="absolute inset-0 z-10 bg-background">
                  <PreviewLoading message="加载页面..." />
                </div>
              )}
              <iframe
                key={key}
                src={currentUrl}
                className="w-full h-full border-0"
                title={title || currentUrl}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setError('页面加载失败');
                }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </div>
          )}
        </div>
      </div>
    </PreviewContainer>
  );
}
