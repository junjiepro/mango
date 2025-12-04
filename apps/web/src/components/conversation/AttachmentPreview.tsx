/**
 * AttachmentPreview Component
 * T052: Create AttachmentPreview component
 *
 * 显示附件预览,支持图片预览、文件信息展示、删除操作
 */

'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { logger } from '@mango/shared/utils'

export interface AttachmentData {
  /** 附件 ID (可选,用于已上传的附件) */
  id?: string
  /** 文件名 */
  fileName: string
  /** 文件类型 */
  fileType: string
  /** 文件大小(字节) */
  fileSize: number
  /** 文件 URL 或本地 Object URL */
  url?: string
  /** 本地 File 对象 */
  file?: File
}

export interface AttachmentPreviewProps {
  /** 附件数据 */
  attachment: AttachmentData
  /** 删除回调 */
  onRemove?: () => void
  /** 是否可删除 */
  removable?: boolean
  /** 是否显示详细信息 */
  showDetails?: boolean
  /** 自定义样式类名 */
  className?: string
  /** 预览模式: compact | full */
  mode?: 'compact' | 'full'
}

/**
 * AttachmentPreview 组件
 * 根据文件类型显示不同的预览样式
 */
export function AttachmentPreview({
  attachment,
  onRemove,
  removable = true,
  showDetails = true,
  className = '',
  mode = 'compact',
}: AttachmentPreviewProps) {
  const [imageError, setImageError] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // 判断是否为图片
  const isImage = attachment.fileType.startsWith('image/')

  // 获取预览 URL
  const getPreviewUrl = (): string | null => {
    if (attachment.url) {
      return attachment.url
    }
    if (attachment.file && isImage) {
      // 为本地文件创建 Object URL
      if (!previewUrl) {
        const url = URL.createObjectURL(attachment.file)
        setPreviewUrl(url)
        return url
      }
      return previewUrl
    }
    return null
  }

  // 清理 Object URL
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * 获取文件图标
   */
  const getFileIcon = (): string => {
    if (isImage) return '🖼️'
    if (attachment.fileType === 'application/pdf') return '📄'
    if (
      attachment.fileType === 'application/msword' ||
      attachment.fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return '📝'
    }
    if (attachment.fileType === 'text/plain') return '📃'
    return '📎'
  }

  /**
   * 处理删除
   */
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRemove) {
      onRemove()
      logger.debug('Attachment removed', { fileName: attachment.fileName })
    }
  }

  /**
   * 处理图片加载错误
   */
  const handleImageError = () => {
    setImageError(true)
    logger.warn('Image preview failed to load', { fileName: attachment.fileName })
  }

  // Compact 模式 - 小型预览卡片
  if (mode === 'compact') {
    return (
      <div
        className={`
          relative flex items-center gap-2 rounded-md border bg-muted px-3 py-2
          ${className}
        `}
      >
        {/* 文件图标或缩略图 */}
        {isImage && !imageError && getPreviewUrl() ? (
          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded">
            <Image
              src={getPreviewUrl()!}
              alt={attachment.fileName}
              fill
              className="object-cover"
              onError={handleImageError}
            />
          </div>
        ) : (
          <div className="text-2xl flex-shrink-0">{getFileIcon()}</div>
        )}

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium" title={attachment.fileName}>
            {attachment.fileName}
          </div>
          {showDetails && (
            <div className="text-xs text-muted-foreground">
              {formatFileSize(attachment.fileSize)}
            </div>
          )}
        </div>

        {/* 删除按钮 */}
        {removable && onRemove && (
          <button
            onClick={handleRemove}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            type="button"
            title="删除附件"
          >
            ×
          </button>
        )}
      </div>
    )
  }

  // Full 模式 - 完整预览卡片
  return (
    <div
      className={`
        relative rounded-lg border bg-card overflow-hidden
        ${className}
      `}
    >
      {/* 预览区域 */}
      {isImage && !imageError && getPreviewUrl() ? (
        <div className="relative w-full aspect-video bg-muted">
          <Image
            src={getPreviewUrl()!}
            alt={attachment.fileName}
            fill
            className="object-contain"
            onError={handleImageError}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center w-full aspect-video bg-muted">
          <div className="text-6xl">{getFileIcon()}</div>
        </div>
      )}

      {/* 文件信息 */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="truncate font-medium" title={attachment.fileName}>
              {attachment.fileName}
            </div>
            {showDetails && (
              <div className="mt-1 text-sm text-muted-foreground">
                {formatFileSize(attachment.fileSize)}
                {' • '}
                {attachment.fileType}
              </div>
            )}
          </div>

          {/* 删除按钮 */}
          {removable && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-8 w-8 p-0 flex-shrink-0"
              title="删除附件"
            >
              🗑️
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * AttachmentPreviewList 组件
 * 显示多个附件的预览列表
 */
export interface AttachmentPreviewListProps {
  /** 附件列表 */
  attachments: AttachmentData[]
  /** 删除回调 */
  onRemove?: (index: number) => void
  /** 是否可删除 */
  removable?: boolean
  /** 预览模式 */
  mode?: 'compact' | 'full'
  /** 自定义样式类名 */
  className?: string
}

export function AttachmentPreviewList({
  attachments,
  onRemove,
  removable = true,
  mode = 'compact',
  className = '',
}: AttachmentPreviewListProps) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <div
      className={`
        ${mode === 'compact' ? 'flex flex-wrap gap-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}
        ${className}
      `}
    >
      {attachments.map((attachment, index) => (
        <AttachmentPreview
          key={attachment.id || `${attachment.fileName}-${index}`}
          attachment={attachment}
          onRemove={onRemove ? () => onRemove(index) : undefined}
          removable={removable}
          mode={mode}
        />
      ))}
    </div>
  )
}
