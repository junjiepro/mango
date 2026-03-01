/**
 * AttachmentUpload Component
 * T051: Create AttachmentUpload component
 *
 * 提供文件上传功能,支持拖拽上传、文件选择、上传进度显示
 */

'use client';

import React, { useRef, useState, DragEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { logger } from '@mango/shared/utils';
import { FileIcon } from 'lucide-react';

export interface AttachmentUploadProps {
  /** 文件选择回调 */
  onFilesSelected: (files: File[]) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否支持多文件上传 */
  multiple?: boolean;
  /** 接受的文件类型 */
  accept?: string;
  /** 最大文件大小(字节) */
  maxSize?: number;
  /** 自定义样式类名 */
  className?: string;
  /** 显示模式: button | dropzone */
  mode?: 'button' | 'dropzone';
}

/**
 * AttachmentUpload 组件
 * 支持按钮点击上传和拖拽上传两种模式
 */
export function AttachmentUpload({
  onFilesSelected,
  disabled = false,
  multiple = true,
  accept = 'image/*,.pdf,.doc,.docx,.txt',
  maxSize = 10 * 1024 * 1024, // 默认 10MB
  className = '',
  mode = 'button',
}: AttachmentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');
  const t = useTranslations('conversations');

  /**
   * 验证文件
   */
  const validateFiles = (files: File[]): File[] => {
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // 检查文件大小
      if (file.size > maxSize) {
        errors.push(t('attachment.fileTooLarge', { name: file.name, maxSize: formatFileSize(maxSize) }));
        continue;
      }

      // 检查文件类型
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith('.')) {
          // 扩展名匹配
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else if (type.endsWith('/*')) {
          // MIME 类型通配符匹配
          const prefix = type.slice(0, -2);
          return file.type.startsWith(prefix);
        } else {
          // 精确 MIME 类型匹配
          return file.type === type;
        }
      });

      if (!isAccepted) {
        errors.push(t('attachment.fileTypeNotSupported', { name: file.name }));
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      setError(errors.join('; '));
      logger.warn('File validation failed', { errors });
    } else {
      setError('');
    }

    return validFiles;
  };

  /**
   * 处理文件选择
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
      logger.debug('Files selected', { count: validFiles.length });
    }

    // 清空 input 以允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 处理拖拽进入
   */
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * 处理文件拖放
   */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
      logger.debug('Files dropped', { count: validFiles.length });
    }
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * 打开文件选择对话框
   */
  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 按钮模式
  if (mode === 'button') {
    return (
      <div className={className}>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={openFileDialog}
          disabled={disabled}
          className="h-8 w-8 p-0"
          title={t('attachment.upload')}
        >
          <FileIcon />
        </Button>
        {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
      </div>
    );
  }

  // 拖放区域模式
  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`
          relative rounded-lg border-2 border-dashed p-6 text-center cursor-pointer
          transition-colors duration-200
          ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="text-4xl">
            <FileIcon />
          </div>
          <div className="text-sm font-medium">
            {isDragging ? t('attachment.dropToUpload') : t('attachment.clickOrDrop')}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('attachment.supportedFormats', { formats: accept.split(',').slice(0, 3).join(', ') })}
            {accept.split(',').length > 3 && t('attachment.andMore')} ({t('attachment.maxSize', { size: formatFileSize(maxSize) })})
          </div>
        </div>
      </div>
      {error && (
        <div className="mt-2 text-xs text-destructive flex items-center gap-1">
          <span>⚠️</span>
          <span>{error}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setError('');
            }}
            className="ml-auto hover:text-destructive/80"
            type="button"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
