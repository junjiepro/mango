/**
 * HtmlContentRenderer Component
 * 用于渲染 HTML 内容，支持预览和源码切换
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewBody,
} from '@/components/ai-elements/web-preview';
import { Button } from '@/components/ui/button';
import { CodeIcon, EyeIcon, CopyIcon, CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageResponse } from '@/components/ai-elements/message';

interface HtmlContentRendererProps {
  content: string;
  className?: string;
}

/**
 * 内容片段类型
 */
export interface ContentSegment {
  type: 'text' | 'html';
  content: string;
}

/**
 * 检测内容是否包含 HTML
 */
export function isHtmlContent(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  // 检测常见的 HTML 标签
  const htmlTagPattern =
    /<(html|head|body|div|span|p|h[1-6]|ul|ol|li|table|tr|td|th|form|input|button|a|img|script|style|meta|link)[^>]*>/i;

  // 检测 DOCTYPE 声明
  const doctypePattern = /<!DOCTYPE\s+html/i;

  return htmlTagPattern.test(content) || doctypePattern.test(content);
}

/**
 * 解析混合内容，分离文本和 HTML 片段
 */
export function parseContentSegments(content: string): ContentSegment[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const segments: ContentSegment[] = [];

  // 匹配 HTML 代码块（```html ... ``` 或完整的 HTML 文档）
  const htmlBlockPattern =
    /```html\s*([\s\S]*?)```|<!DOCTYPE[^>]*>[\s\S]*?<\/html>|<html[^>]*>[\s\S]*?<\/html>/gi;

  let lastIndex = 0;
  let match;

  // 重置正则表达式的 lastIndex
  htmlBlockPattern.lastIndex = 0;

  while ((match = htmlBlockPattern.exec(content)) !== null) {
    // 添加 HTML 块之前的文本
    if (match.index > lastIndex) {
      const textContent = content.substring(lastIndex, match.index).trim();
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent,
        });
      }
    }

    // 添加 HTML 块
    // match[1] 是 ```html 代码块中的内容，match[0] 是完整的 HTML 文档
    const htmlContent = match[1] || match[0];
    if (htmlContent.trim()) {
      segments.push({
        type: 'html',
        content: htmlContent.trim(),
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // 添加最后剩余的文本
  if (lastIndex < content.length) {
    const textContent = content.substring(lastIndex).trim();
    if (textContent) {
      segments.push({
        type: 'text',
        content: textContent,
      });
    }
  }

  // 如果没有找到任何 HTML 块，但内容包含 HTML 标签，将整个内容作为 HTML
  if (segments.length === 0 && isHtmlContent(content)) {
    segments.push({
      type: 'html',
      content: content,
    });
  }

  // 如果没有任何片段，将整个内容作为文本
  if (segments.length === 0 && content.trim()) {
    segments.push({
      type: 'text',
      content: content,
    });
  }

  return segments;
}

/**
 * 单个 HTML 片段渲染组件
 */
function HtmlSegmentRenderer({ content, index }: { content: string; index: number }) {
  const [viewMode, setViewMode] = useState<'preview' | 'source'>('preview');
  const [copied, setCopied] = useState(false);

  // 创建 blob URL 用于 iframe 预览
  const previewUrl = useMemo(() => {
    if (viewMode !== 'preview') return '';

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    return url;
  }, [content, viewMode]);

  // 清理 blob URL
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // 复制源码到剪贴板
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="my-4">
      <WebPreview className="h-[500px]">
        <WebPreviewNavigation>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-medium text-muted-foreground">
              HTML 内容 {index > 0 ? `#${index + 1}` : ''}
            </span>
            <div className="flex items-center gap-1 ml-auto">
              <Button
                size="sm"
                variant={viewMode === 'preview' ? 'default' : 'ghost'}
                onClick={() => setViewMode('preview')}
                className="h-8 px-3"
              >
                <EyeIcon className="size-4 mr-1" />
                预览
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'source' ? 'default' : 'ghost'}
                onClick={() => setViewMode('source')}
                className="h-8 px-3"
              >
                <CodeIcon className="size-4 mr-1" />
                源码
              </Button>
            </div>
          </div>
        </WebPreviewNavigation>

        {viewMode === 'preview' ? (
          <WebPreviewBody src={previewUrl} />
        ) : (
          <div className="relative flex-1 overflow-auto p-4 bg-muted/50">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="absolute top-2 right-2 h-8 w-8 p-0"
              title={copied ? '已复制' : '复制源码'}
            >
              {copied ? (
                <CheckIcon className="size-4 text-green-500" />
              ) : (
                <CopyIcon className="size-4" />
              )}
            </Button>
            <pre className="text-xs font-mono whitespace-pre-wrap break-words pr-12">
              <code>{content}</code>
            </pre>
          </div>
        )}
      </WebPreview>
    </div>
  );
}

/**
 * 混合内容渲染组件
 * 支持文本和 HTML 混合显示
 */
export function MixedContentRenderer({ content, className }: HtmlContentRendererProps) {
  const segments = useMemo(() => parseContentSegments(content), [content]);

  // 统计 HTML 片段数量，用于编号
  let htmlCount = 0;

  return (
    <div className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <MessageResponse key={index}>{segment.content}</MessageResponse>;
        } else {
          const currentHtmlIndex = htmlCount;
          htmlCount++;
          return (
            <HtmlSegmentRenderer key={index} content={segment.content} index={currentHtmlIndex} />
          );
        }
      })}
    </div>
  );
}

/**
 * HtmlContentRenderer 组件（保持向后兼容）
 * 使用 WebPreview 组件显示 HTML 内容，支持预览和源码切换
 */
export function HtmlContentRenderer({ content, className }: HtmlContentRendererProps) {
  // 检查是否包含混合内容
  const segments = useMemo(() => parseContentSegments(content), [content]);

  // 如果有多个片段或包含文本片段，使用混合内容渲染器
  if (segments.length > 1 || (segments.length === 1 && segments[0].type === 'text')) {
    return <MixedContentRenderer content={content} className={className} />;
  }

  // 否则使用单个 HTML 片段渲染器
  return <HtmlSegmentRenderer content={content} index={0} />;
}
