/**
 * Unified File Viewer Component
 * 统一文件查看器 - 支持编辑器/预览双模式切换
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Code, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { FileNode } from '@/hooks/useDeviceClient';
import type { DeviceBinding } from '@/services/DeviceService';
import { useDeviceClient } from '@/hooks/useDeviceClient';
import { getFileCategory, hasPreviewSupport, isBinaryFile } from './previews/types';

// 动态导入预览器组件
import { ImagePreviewer } from './previews/ImagePreviewer';
import { VideoPreviewer } from './previews/VideoPreviewer';
import { AudioPreviewer } from './previews/AudioPreviewer';
import { PDFPreviewer } from './previews/PDFPreviewer';
import { WordPreviewer } from './previews/WordPreviewer';
import { ExcelPreviewer } from './previews/ExcelPreviewer';
import { PPTPreviewer } from './previews/PPTPreviewer';
import { MarkdownPreviewer } from './previews/MarkdownPreviewer';
import { HTMLPreviewer } from './previews/HTMLPreviewer';

type ViewMode = 'editor' | 'preview';

interface UnifiedFileViewerProps {
  file: FileNode;
  device: DeviceBinding;
  tabId: string;
  isActive: boolean;
  onMarkDirty?: (tabId: string, isDirty: boolean) => void;
}

/**
 * 根据文件类型获取预览器组件
 */
function getPreviewerComponent(filename: string) {
  const category = getFileCategory(filename);
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

export function UnifiedFileViewer({
  file,
  device,
  tabId,
  isActive,
  onMarkDirty,
}: UnifiedFileViewerProps) {
  const { client: deviceClient } = useDeviceClient(device);
  const isBinary = isBinaryFile(file.name);
  const hasPreview = hasPreviewSupport(file.name);

  // 二进制文件默认预览模式，其他默认编辑器模式
  const [viewMode, setViewMode] = useState<ViewMode>(
    isBinary ? 'preview' : 'editor'
  );

  const PreviewerComponent = getPreviewerComponent(file.name);

  // 是否显示模式切换标签
  const showModeTabs = hasPreview && !isBinary;

  // 渲染模式切换标签
  const renderModeTabs = () => {
    if (!showModeTabs) return null;

    return (
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center border-b bg-muted/20 px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'editor' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setViewMode('editor')}
              >
                <Code className="h-3.5 w-3.5" />
                编辑器
              </Button>
            </TooltipTrigger>
            <TooltipContent>使用代码编辑器查看</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setViewMode('preview')}
              >
                <Eye className="h-3.5 w-3.5" />
                预览
              </Button>
            </TooltipTrigger>
            <TooltipContent>使用预览器查看</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  };

  // 渲染编辑器
  const renderEditor = () => {
    // 动态导入 FileEditor 避免循环依赖
    const FileEditor = require('./FileEditor.optimized').FileEditor;
    return (
      <FileEditor
        key={file.path}
        file={file}
        device={device}
        tabId={tabId}
        isActive={isActive}
        onMarkDirty={onMarkDirty}
      />
    );
  };

  // 渲染预览器
  const renderPreviewer = () => {
    if (!PreviewerComponent) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p className="text-sm">此文件类型不支持预览</p>
        </div>
      );
    }
    return (
      <PreviewerComponent
        file={file}
        deviceClient={deviceClient}
      />
    );
  };

  // 二进制文件只显示预览
  if (isBinary) {
    return (
      <div className="flex flex-col h-full">
        {renderPreviewer()}
      </div>
    );
  }

  // 非二进制文件显示模式切换
  return (
    <div className="flex flex-col h-full">
      {renderModeTabs()}
      <div className="flex-1 min-h-0">
        {viewMode === 'editor' ? renderEditor() : renderPreviewer()}
      </div>
    </div>
  );
}
