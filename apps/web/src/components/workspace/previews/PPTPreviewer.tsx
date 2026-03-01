/**
 * PPT Previewer Component
 * PPT 演示文稿预览器
 * 由于 PPT 格式复杂，目前提供基本信息展示和下载功能
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Presentation, Download, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PreviewContainer, PreviewLoading, PreviewError } from './PreviewContainer';
import type { PreviewerProps } from './types';
import { buildFileUrl, getFileExtension } from './types';

interface PPTInfo {
  slideCount?: number;
  title?: string;
  author?: string;
  lastModified?: string;
}

export function PPTPreviewer({ file, deviceClient, className = '' }: PreviewerProps) {
  const [info, setInfo] = useState<PPTInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileUrl = deviceClient ? buildFileUrl(deviceClient.deviceUrl, file.path) : '';
  const extension = getFileExtension(file.name);

  // 尝试解析 PPT 基本信息
  const loadDocument = useCallback(async () => {
    if (!deviceClient) {
      setError('设备客户端未就绪');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(fileUrl, {
        headers: {
          Authorization: `Bearer ${deviceClient.deviceBindingCode}`,
        },
      });

      if (!response.ok) {
        throw new Error('文件加载失败');
      }

      const arrayBuffer = await response.arrayBuffer();

      // 对于 pptx 文件，检查是否为有效的 ZIP 格式
      if (extension === 'pptx') {
        try {
          // 检查文件是否为有效的 ZIP（pptx 是 ZIP 格式）
          const header = new Uint8Array(arrayBuffer.slice(0, 4));
          const isZip =
            header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;

          if (isZip) {
            setInfo({
              title: file.name.replace(/\.[^/.]+$/, ''),
            });
          } else {
            throw new Error('无效的 PPTX 文件格式');
          }
        } catch {
          setInfo({
            title: file.name.replace(/\.[^/.]+$/, ''),
          });
        }
      } else {
        // 旧版 ppt 格式
        setInfo({
          title: file.name.replace(/\.[^/.]+$/, ''),
        });
      }
    } catch (err) {
      console.error('PPT 预览错误:', err);
      setError(err instanceof Error ? err.message : '文件加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [fileUrl, deviceClient, extension, file.name]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // 下载
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = file.name;
    link.click();
  }, [fileUrl, file.name]);

  const toolbar = (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {/* 刷新 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadDocument}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>刷新</TooltipContent>
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

  if (isLoading) {
    return (
      <PreviewContainer
        title={file.name}
        icon={<Presentation className="h-4 w-4" />}
        className={className}
      >
        <PreviewLoading message="正在加载演示文稿..." />
      </PreviewContainer>
    );
  }

  if (error) {
    return (
      <PreviewContainer
        title={file.name}
        icon={<Presentation className="h-4 w-4" />}
        toolbar={toolbar}
        className={className}
      >
        <PreviewError message="文件加载失败" description={error} onRetry={loadDocument} />
      </PreviewContainer>
    );
  }

  return (
    <PreviewContainer
      title={file.name}
      icon={<Presentation className="h-4 w-4" />}
      toolbar={toolbar}
      className={className}
    >
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {/* 图标 */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
            <Presentation className="h-12 w-12 text-white" />
          </div>

          {/* 文件名 */}
          <h3 className="text-lg font-medium mb-2">{info?.title || file.name}</h3>

          {/* 文件类型 */}
          <p className="text-sm text-muted-foreground mb-6">
            {extension.toUpperCase()} 演示文稿
          </p>

          {/* 提示信息 */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-left text-sm text-muted-foreground">
                <p className="mb-2">
                  PPT 演示文稿包含复杂的布局和动画，建议下载后使用专业软件查看以获得最佳效果。
                </p>
                <p>支持的软件：Microsoft PowerPoint、WPS Office、LibreOffice Impress</p>
              </div>
            </div>
          </div>

          {/* 下载按钮 */}
          <Button onClick={handleDownload} size="lg">
            <Download className="h-4 w-4 mr-2" />
            下载演示文稿
          </Button>
        </div>
      </div>
    </PreviewContainer>
  );
}
