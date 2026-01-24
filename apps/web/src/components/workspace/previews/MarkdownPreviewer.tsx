/**
 * Markdown Previewer Component
 * Markdown 预览器 - 支持 GFM 语法和实时预览
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, Eye, Code, Columns, RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { PreviewContainer, PreviewLoading, PreviewError } from './PreviewContainer';
import type { PreviewerProps } from './types';

type ViewMode = 'preview' | 'source' | 'split';

// 简单的 Markdown 解析器
function parseMarkdown(markdown: string): string {
  let html = markdown;

  // 转义 HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 代码块
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langClass}>${code.trim()}</code></pre>`;
  });

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 标题
  html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

  // 粗体和斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // 删除线
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // 水平线
  html = html.replace(/^[-*_]{3,}$/gm, '<hr />');

  // 引用
  html = html.replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>');
  // 合并连续的 blockquote
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

  // 无序列表
  html = html.replace(/^[-*+]\s+(.*)$/gm, '<li>$1</li>');

  // 有序列表
  html = html.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>');

  // 包装列表项
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    return `<ul>${match}</ul>`;
  });

  // 任务列表
  html = html.replace(/<li>\[ \]\s*(.*)<\/li>/g, '<li class="task-list-item"><input type="checkbox" disabled /> $1</li>');
  html = html.replace(/<li>\[x\]\s*(.*)<\/li>/gi, '<li class="task-list-item"><input type="checkbox" checked disabled /> $1</li>');

  // 表格（简单支持）
  html = html.replace(/^\|(.+)\|$/gm, (match, content) => {
    const cells = content.split('|').map((cell: string) => cell.trim());
    const isHeader = cells.every((cell: string) => /^[-:]+$/.test(cell));
    if (isHeader) return '';
    const cellTag = 'td';
    const cellsHtml = cells.map((cell: string) => `<${cellTag}>${cell}</${cellTag}>`).join('');
    return `<tr>${cellsHtml}</tr>`;
  });
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, (match) => {
    return `<table>${match}</table>`;
  });

  // 段落
  html = html.replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>');

  // 清理空段落
  html = html.replace(/<p><\/p>/g, '');

  return html;
}

export function MarkdownPreviewer({ file, deviceClient, className = '' }: PreviewerProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [copied, setCopied] = useState(false);

  // 加载文件内容
  useEffect(() => {
    const loadFile = async () => {
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
  }, [file.path, deviceClient]);

  // 解析 Markdown
  const htmlContent = useMemo(() => parseMarkdown(content), [content]);

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
    setIsLoading(true);
    setError(null);
  }, []);

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

        <div className="w-px h-4 bg-border mx-1" />

        {/* 复制 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>复制源码</TooltipContent>
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
        <PreviewLoading message="加载 Markdown..." />
      </PreviewContainer>
    );
  }

  if (error) {
    return (
      <PreviewContainer
        title={file.name}
        icon={<FileText className="h-4 w-4" />}
        className={className}
      >
        <PreviewError message={error} onRetry={handleRefresh} />
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
      <div className="flex h-full">
        {/* 源码视图 */}
        {(viewMode === 'source' || viewMode === 'split') && (
          <div
            className={`${viewMode === 'split' ? 'w-1/2 border-r' : 'w-full'} overflow-auto p-4 bg-muted/10`}
          >
            <pre className="text-sm font-mono whitespace-pre-wrap">{content}</pre>
          </div>
        )}

        {/* 预览视图 */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-auto p-6`}
          >
            <article
              className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-4
                prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                prose-p:my-3 prose-p:leading-relaxed
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
                prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic
                prose-ul:list-disc prose-ol:list-decimal
                prose-li:my-1
                prose-table:border-collapse prose-th:border prose-th:p-2 prose-th:bg-muted prose-td:border prose-td:p-2
                prose-hr:my-8
                prose-img:rounded-lg prose-img:max-w-full"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        )}
      </div>
    </PreviewContainer>
  );
}
