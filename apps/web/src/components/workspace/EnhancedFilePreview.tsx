/**
 * Enhanced File Preview Component
 * 增强版文件预览组件 - 根据文件类型自动选择合适的预览器
 */

'use client';

import React from 'react';
import type { FileNode } from '@/hooks/useDeviceFiles';
import { getFileCategory, getFileExtension, type FileCategory } from './previews/types';
import { ImagePreviewer } from './previews/ImagePreviewer';
import { VideoPreviewer } from './previews/VideoPreviewer';
import { AudioPreviewer } from './previews/AudioPreviewer';
import { PDFPreviewer } from './previews/PDFPreviewer';
import { WordPreviewer } from './previews/WordPreviewer';
import { ExcelPreviewer } from './previews/ExcelPreviewer';
import { PPTPreviewer } from './previews/PPTPreviewer';
import { MarkdownPreviewer } from './previews/MarkdownPreviewer';
import { HTMLPreviewer } from './previews/HTMLPreviewer';
import { UnsupportedPreview } from './previews/PreviewContainer';
import { buildFileUrl } from './previews/types';

interface EnhancedFilePreviewProps {
  file: FileNode;
  deviceId: string;
  onlineUrl: string;
  className?: string;
}

/**
 * 根据文件类型返回对应的预览器组件
 */
function getPreviewerComponent(category: FileCategory) {
  switch (category) {
    case 'image':
      return ImagePreviewer;
    case 'video':
      return VideoPreviewer;
    case 'audio':
      return AudioPreviewer;
    case 'pdf':
      return PDFPreviewer;
    case 'office-word':
      return WordPreviewer;
    case 'office-excel':
      return ExcelPreviewer;
    case 'office-ppt':
      return PPTPreviewer;
    case 'markdown':
      return MarkdownPreviewer;
    case 'html':
      return HTMLPreviewer;
    default:
      return null;
  }
}

export function EnhancedFilePreview({
  file,
  deviceId,
  onlineUrl,
  className = '',
}: EnhancedFilePreviewProps) {
  const category = getFileCategory(file.name);
  const extension = getFileExtension(file.name);

  const PreviewerComponent = getPreviewerComponent(category);

  // 下载处理
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = buildFileUrl(deviceId, file.path);
    link.download = file.name;
    link.click();
  };

  // 如果没有对应的预览器，显示不支持预览
  if (!PreviewerComponent) {
    return (
      <div className={`h-full ${className}`}>
        <UnsupportedPreview
          filename={file.name}
          extension={extension}
          onDownload={handleDownload}
        />
      </div>
    );
  }

  return (
    <PreviewerComponent
      file={file}
      deviceId={deviceId}
      onlineUrl={onlineUrl}
      className={className}
    />
  );
}

// 保持向后兼容，导出为 FilePreview
export { EnhancedFilePreview as FilePreviewEnhanced };
