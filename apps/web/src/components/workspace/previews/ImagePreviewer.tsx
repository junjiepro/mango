/**
 * Image Previewer Component
 * 图片预览器 - 支持缩放、旋转、拖拽等功能
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Download,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PreviewContainer, PreviewLoading, PreviewError } from './PreviewContainer';
import type { PreviewerProps } from './types';
import { buildFileUrl } from './types';

const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const SCALE_STEP = 0.25;

export function ImagePreviewer({ file, deviceId, className = '' }: PreviewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const imageUrl = buildFileUrl(deviceId, file.path);

  // 重置视图
  const resetView = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 缩放
  const handleZoom = useCallback(
    (delta: number) => {
      setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
    },
    []
  );

  // 旋转
  const handleRotate = useCallback((delta: number) => {
    setRotation((prev) => (prev + delta) % 360);
  }, []);

  // 适应窗口
  const fitToWindow = useCallback(() => {
    if (!containerRef.current || !naturalSize.width || !naturalSize.height) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 40; // padding
    const containerHeight = container.clientHeight - 40;

    const scaleX = containerWidth / naturalSize.width;
    const scaleY = containerHeight / naturalSize.height;
    const fitScale = Math.min(scaleX, scaleY, 1);

    setScale(fitScale);
    setPosition({ x: 0, y: 0 });
  }, [naturalSize]);

  // 下载
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = file.name;
    link.click();
  }, [imageUrl, file.name]);

  // 鼠标滚轮缩放
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
      handleZoom(delta);
    },
    [handleZoom]
  );

  // 拖拽开始
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return;
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [scale, position]
  );

  // 拖拽中
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging]
  );

  // 拖拽结束
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 图片加载完成
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      setNaturalSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
    }
    setIsLoading(false);
    setError(null);
  }, []);

  // 图片加载失败
  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setError('图片加载失败');
  }, []);

  // 文件变化时重置
  useEffect(() => {
    resetView();
    setIsLoading(true);
    setError(null);
  }, [file.path, resetView]);

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

        <div className="w-px h-4 bg-border mx-1" />

        {/* 逆时针旋转 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleRotate(-90)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>逆时针旋转</TooltipContent>
        </Tooltip>

        {/* 顺时针旋转 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRotate(90)}>
              <RotateCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>顺时针旋转</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

        {/* 适应窗口 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fitToWindow}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>适应窗口</TooltipContent>
        </Tooltip>

        {/* 重置 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>重置视图</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

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
      icon={<ImageIcon className="h-4 w-4" />}
      toolbar={toolbar}
      className={className}
    >
      {error ? (
        <PreviewError
          message={error}
          description="请检查文件是否存在或网络连接"
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
        />
      ) : (
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-muted/10 flex items-center justify-center relative"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {isLoading && <PreviewLoading message="加载图片中..." />}
          <img
            ref={imageRef}
            src={imageUrl}
            alt={file.name}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="max-w-full max-h-full object-contain transition-transform duration-100"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              display: isLoading ? 'none' : 'block',
            }}
            draggable={false}
          />
        </div>
      )}
    </PreviewContainer>
  );
}
