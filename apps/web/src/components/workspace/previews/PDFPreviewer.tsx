/**
 * PDF Previewer Component
 * PDF 预览器 - 支持分页、缩放、搜索等功能
 * 使用 react-pdf 或 PDF.js 实现
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  FileText,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PreviewContainer, PreviewLoading, PreviewError } from './PreviewContainer';
import type { PreviewerProps } from './types';
import { buildFileUrl } from './types';

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

export function PDFPreviewer({ file, deviceId, className = '' }: PreviewerProps) {
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const pdfUrl = buildFileUrl(deviceId, file.path);

  // 缩放
  const handleZoom = useCallback((delta: number) => {
    setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
  }, []);

  // 重置
  const resetView = useCallback(() => {
    setScale(1);
  }, []);

  // 刷新
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setKey((prev) => prev + 1);
  }, []);

  // 下载
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = file.name;
    link.click();
  }, [pdfUrl, file.name]);

  // 在新窗口打开
  const handleOpenExternal = useCallback(() => {
    window.open(pdfUrl, '_blank');
  }, [pdfUrl]);

  // 构建带参数的 PDF URL
  const viewerUrl = useMemo(() => {
    // 使用浏览器内置 PDF 查看器，添加缩放参数
    return `${pdfUrl}#zoom=${Math.round(scale * 100)}`;
  }, [pdfUrl, scale]);

  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* 缩放信息 */}
        <span className="text-xs text-muted-foreground px-2">{Math.round(scale * 100)}%</span>

        {/* 缩小 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleZoom(-SCALE_STEP)}
              disabled={scale <= MIN_SCALE}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>缩小</TooltipContent>
        </Tooltip>

        {/* 放大 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleZoom(SCALE_STEP)}
              disabled={scale >= MAX_SCALE}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>放大</TooltipContent>
        </Tooltip>

        {/* 重置 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>重置缩放</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

        {/* 新窗口打开 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenExternal}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>在新窗口打开</TooltipContent>
        </Tooltip>

        {/* 下载 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>下载</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );

  return (
    <PreviewContainer
      title={file.name}
      icon={<FileText className="h-4 w-4" />}
      toolbar={toolbar}
      className={className}
    >
      {error ? (
        <PreviewError
          message="PDF 加载失败"
          description="请检查文件是否存在或尝试下载后本地查看"
          onRetry={handleRefresh}
        />
      ) : (
        <div className="relative w-full h-full">
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-background">
              <PreviewLoading message="正在加载 PDF..." />
            </div>
          )}
          <iframe
            key={key}
            src={viewerUrl}
            className="w-full h-full border-0"
            title={file.name}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('PDF 加载失败');
            }}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${100 / scale}%`,
              height: `${100 / scale}%`,
            }}
          />
        </div>
      )}
    </PreviewContainer>
  );
}
