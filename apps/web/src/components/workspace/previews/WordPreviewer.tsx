/**
 * Word Previewer Component
 * Word 文档预览器 - 使用 mammoth.js 将 docx 转换为 HTML
 * 支持本地预览，无需公网 URL
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { PreviewContainer, PreviewLoading, PreviewError } from './PreviewContainer';
import type { PreviewerProps } from './types';
import { buildFileUrl } from './types';

export function WordPreviewer({ file, deviceId, onlineUrl, className = '' }: PreviewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileUrl = buildFileUrl(deviceId, file.path);

  // 加载并转换文档
  const loadDocument = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 获取文件内容
      const response = await fetch(fileUrl, {
        headers: {
          'Cli-Url': onlineUrl,
        },
      });

      if (!response.ok) {
        throw new Error('文件加载失败');
      }

      const arrayBuffer = await response.arrayBuffer();

      // 动态导入 mammoth
      const mammoth = await import('mammoth');

      // 转换为 HTML
      const result = await mammoth.convertToHtml({ arrayBuffer });

      if (result.messages.length > 0) {
        console.warn('Word 转换警告:', result.messages);
      }

      setHtmlContent(result.value);
    } catch (err) {
      console.error('Word 预览错误:', err);
      setError(err instanceof Error ? err.message : '文档加载失败');
    } finally {
      setIsLoading(false);
    }
  }, [fileUrl, onlineUrl]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  // 复制内容
  const handleCopy = useCallback(async () => {
    try {
      // 创建临时元素获取纯文本
      const temp = document.createElement('div');
      temp.innerHTML = htmlContent;
      await navigator.clipboard.writeText(temp.textContent || '');
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  }, [htmlContent]);

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
        {/* 复制 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
              disabled={!htmlContent}
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>复制文本</TooltipContent>
        </Tooltip>

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
        icon={<FileText className="h-4 w-4" />}
        className={className}
      >
        <PreviewLoading message="正在解析 Word 文档..." />
      </PreviewContainer>
    );
  }

  if (error) {
    return (
      <PreviewContainer
        title={file.name}
        icon={<FileText className="h-4 w-4" />}
        toolbar={toolbar}
        className={className}
      >
        <PreviewError
          message="文档加载失败"
          description={error}
          onRetry={loadDocument}
        />
      </PreviewContainer>
    );
  }

  return (
    <PreviewContainer
      title={file.name}
      icon={<FileText className="h-4 w-4" />}
      toolbar={toolbar}
      className={className}
    >
      <div className="flex-1 overflow-auto p-6 bg-background">
        <article
          className="prose prose-sm dark:prose-invert max-w-none mx-auto
            prose-headings:font-semibold
            prose-p:my-3 prose-p:leading-relaxed
            prose-table:border-collapse prose-th:border prose-th:p-2 prose-th:bg-muted prose-td:border prose-td:p-2
            prose-img:max-w-full prose-img:rounded"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </PreviewContainer>
  );
}
