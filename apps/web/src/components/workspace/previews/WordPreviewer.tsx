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
import { sanitizeHtml } from '@/lib/sanitize';
import type { PreviewerProps } from './types';
import { buildFileUrl } from './types';

export function WordPreviewer({ file, deviceClient, className = '' }: PreviewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileUrl = deviceClient ? buildFileUrl(deviceClient.deviceUrl, file.path) : '';

  // 加载并转换文档
  const loadDocument = useCallback(async () => {
    if (!deviceClient) {
      setError('设备客户端未就绪');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 获取文件内容
      const response = await fetch(fileUrl, {
        headers: {
          Authorization: `Bearer ${deviceClient.deviceBindingCode}`,
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
  }, [fileUrl, deviceClient]);

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
      <div className="flex-1 overflow-auto p-8 bg-white dark:bg-zinc-900">
        <article
          className="max-w-4xl mx-auto word-preview"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }}
        />
        <style jsx global>{`
          .word-preview {
            font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
            font-size: 14px;
            line-height: 1.8;
            color: #333;
          }
          .dark .word-preview {
            color: #e5e5e5;
          }
          .word-preview h1 {
            font-size: 2em;
            font-weight: 700;
            margin: 1.5em 0 0.8em;
            padding-bottom: 0.3em;
            border-bottom: 2px solid #e5e5e5;
          }
          .dark .word-preview h1 {
            border-bottom-color: #404040;
          }
          .word-preview h2 {
            font-size: 1.5em;
            font-weight: 600;
            margin: 1.3em 0 0.6em;
            padding-bottom: 0.2em;
            border-bottom: 1px solid #e5e5e5;
          }
          .dark .word-preview h2 {
            border-bottom-color: #404040;
          }
          .word-preview h3 {
            font-size: 1.25em;
            font-weight: 600;
            margin: 1.2em 0 0.5em;
          }
          .word-preview h4, .word-preview h5, .word-preview h6 {
            font-size: 1.1em;
            font-weight: 600;
            margin: 1em 0 0.4em;
          }
          .word-preview p {
            margin: 0.8em 0;
            text-align: justify;
          }
          .word-preview ul, .word-preview ol {
            margin: 0.8em 0;
            padding-left: 2em;
          }
          .word-preview li {
            margin: 0.3em 0;
          }
          .word-preview table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
          }
          .word-preview th, .word-preview td {
            border: 1px solid #d0d0d0;
            padding: 8px 12px;
            text-align: left;
          }
          .dark .word-preview th, .dark .word-preview td {
            border-color: #404040;
          }
          .word-preview th {
            background: #f5f5f5;
            font-weight: 600;
          }
          .dark .word-preview th {
            background: #2a2a2a;
          }
          .word-preview img {
            max-width: 100%;
            height: auto;
            margin: 1em 0;
            border-radius: 4px;
          }
          .word-preview blockquote {
            margin: 1em 0;
            padding: 0.5em 1em;
            border-left: 4px solid #ddd;
            background: #f9f9f9;
            color: #666;
          }
          .dark .word-preview blockquote {
            border-left-color: #404040;
            background: #1a1a1a;
            color: #aaa;
          }
          .word-preview a {
            color: #0066cc;
            text-decoration: none;
          }
          .word-preview a:hover {
            text-decoration: underline;
          }
          .word-preview strong, .word-preview b {
            font-weight: 600;
          }
          .word-preview em, .word-preview i {
            font-style: italic;
          }
        `}</style>
      </div>
    </PreviewContainer>
  );
}
