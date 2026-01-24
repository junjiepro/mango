/**
 * PDF Previewer Component
 * PDF 预览器 - 使用浏览器内置 PDF 查看器
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PreviewContainer, PreviewLoading, PreviewError } from './PreviewContainer';
import type { PreviewerProps } from './types';
import { buildFileUrl } from './types';

export function PDFPreviewer({ file, deviceClient, className = '' }: PreviewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const blobUrlRef = useRef<string | null>(null);
  const fileUrl = deviceClient ? buildFileUrl(deviceClient.deviceUrl, file.path) : '';

  // 加载 PDF 文件
  const loadPDF = useCallback(async () => {
    if (!deviceClient) {
      setError('设备客户端未就绪');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    // 清理旧的 blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    try {
      const response = await fetch(fileUrl, {
        headers: { Authorization: `Bearer ${deviceClient.deviceBindingCode}` },
      });

      if (!response.ok) throw new Error('PDF 加载失败');

      const arrayBuffer = await response.arrayBuffer();
      // 明确指定 MIME 类型为 PDF，确保浏览器使用 PDF 查看器
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;
      setBlobUrl(url);
    } catch (err) {
      console.error('PDF 预览错误:', err);
      setError(err instanceof Error ? err.message : 'PDF 加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [fileUrl, deviceClient]);

  // 初始化加载
  useEffect(() => {
    loadPDF();
  }, [loadPDF]);

  // 清理 blob URL
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  // 刷新
  const handleRefresh = useCallback(() => {
    loadPDF();
  }, [loadPDF]);

  // 下载
  const handleDownload = useCallback(() => {
    if (!blobUrl) return;
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = file.name;
    link.click();
  }, [blobUrl, file.name]);

  // 在新窗口打开
  const handleOpenExternal = useCallback(() => {
    if (!blobUrl) return;
    window.open(blobUrl, '_blank');
  }, [blobUrl]);

  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* 刷新 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>刷新</TooltipContent>
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
          {blobUrl && (
            <iframe
              src={blobUrl}
              className="w-full h-full border-0"
              title={file.name}
            />
          )}
        </div>
      )}
    </PreviewContainer>
  );
}
