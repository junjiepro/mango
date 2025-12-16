/**
 * MessageInput Component
 * T049: Create MessageInput component with multimodal support
 */

'use client'

import React, { useState, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { logger } from '@mango/shared/utils'
import { uploadFiles, type UploadResult } from '@/lib/storage/upload'
import { AttachmentUpload } from './AttachmentUpload'
import { AttachmentPreviewList, type AttachmentData as AttachmentPreviewData } from './AttachmentPreview'
import { MiniAppSelector } from './MiniAppSelector'
import type { Database } from '@/types/database.types'

type MiniApp = Database['public']['Tables']['mini_apps']['Row']
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row']

/**
 * 附件数据格式 (用于保存到数据库)
 */
export interface MessageAttachmentData {
  url: string
  name: string
  type: string
  size: number
  path: string
}

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: MessageAttachmentData[], miniAppData?: { miniAppId: string; installationId: string }) => Promise<void>
  disabled?: boolean
  placeholder?: string
  className?: string
}

/**
 * MessageInput 组件
 * 支持文本输入和文件上传的多模态输入框
 */
export function MessageInput({
  onSendMessage,
  disabled = false,
  placeholder = '输入消息...',
  className = '',
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [selectedMiniApp, setSelectedMiniApp] = useState<{ miniApp: MiniApp; installation: MiniAppInstallation } | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadingFileName, setUploadingFileName] = useState<string>('')
  const [uploadError, setUploadError] = useState<string>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整文本框高度
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    adjustTextareaHeight()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl/Cmd + Enter 发送消息
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFilesSelected = (files: File[]) => {
    setAttachments((prev) => [...prev, ...files])
    setUploadError('')
    logger.debug('Files selected', { count: files.length })
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMiniAppSelect = (miniApp: MiniApp, installation: MiniAppInstallation) => {
    setSelectedMiniApp({ miniApp, installation })
    // 自动填充调用小应用的提示
    const prompt = `@${miniApp.display_name} `
    setContent((prev) => prev + prompt)
    textareaRef.current?.focus()
  }

  const handleRemoveMiniApp = () => {
    setSelectedMiniApp(null)
  }

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return
    if (isSending || disabled) return

    setIsSending(true)
    setUploadError('')
    setUploadProgress(0)

    try {
      // 上传附件到 Supabase Storage
      let uploadResults: UploadResult[] = []

      if (attachments.length > 0) {
        logger.info('Uploading attachments', { count: attachments.length })

        uploadResults = await uploadFiles(attachments, {
          bucket: 'attachments',
          pathPrefix: 'messages',
          uniqueFileName: true,
          onProgress: (progress, fileName) => {
            setUploadProgress(progress)
            setUploadingFileName(fileName)
          },
        })

        if (uploadResults.length === 0) {
          throw new Error('所有文件上传失败')
        }

        if (uploadResults.length < attachments.length) {
          logger.warn('Some files failed to upload', {
            total: attachments.length,
            successful: uploadResults.length,
          })
          setUploadError(
            `部分文件上传失败 (${uploadResults.length}/${attachments.length})`
          )
        }

        logger.info('Attachments uploaded successfully', {
          count: uploadResults.length,
        })
      }

      // 转换附件格式为数据库所需格式
      const attachmentsData = uploadResults.map((result) => ({
        url: result.publicUrl,
        name: result.fileName,
        type: result.fileType,
        size: result.fileSize,
        path: result.path,
      }))

      // 准备小应用数据
      const miniAppData = selectedMiniApp
        ? {
            miniAppId: selectedMiniApp.miniApp.id,
            installationId: selectedMiniApp.installation.id,
          }
        : undefined

      // 发送消息
      await onSendMessage(content.trim(), attachmentsData, miniAppData)

      // 清空输入
      setContent('')
      setAttachments([])
      setSelectedMiniApp(null)
      setUploadProgress(0)
      setUploadingFileName('')
      setUploadError('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '发送失败'
      logger.error('Failed to send message', err as Error)
      setUploadError(errorMessage)
    } finally {
      setIsSending(false)
    }
  }

  // 将 File[] 转换为 AttachmentPreviewData[]
  const attachmentDataList: AttachmentPreviewData[] = attachments.map((file) => ({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    file,
  }))

  return (
    <div className={`rounded-lg border bg-background ${className}`}>
      {/* 小应用选择提示 */}
      {selectedMiniApp && (
        <div className="border-b p-3 bg-primary/5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              {selectedMiniApp.miniApp.icon_url ? (
                <img
                  src={selectedMiniApp.miniApp.icon_url}
                  alt={selectedMiniApp.miniApp.display_name}
                  className="h-6 w-6 rounded object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              )}
              <span className="text-sm font-medium">
                将调用: {selectedMiniApp.miniApp.display_name}
              </span>
            </div>
            <button
              onClick={handleRemoveMiniApp}
              className="text-muted-foreground hover:text-foreground"
              type="button"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 附件预览 */}
      {attachments.length > 0 && (
        <div className="border-b p-3">
          <AttachmentPreviewList
            attachments={attachmentDataList}
            onRemove={handleRemoveAttachment}
            removable={!isSending}
            mode="compact"
          />
        </div>
      )}

      {/* 输入区域 */}
      <div className="flex items-end gap-2 p-3">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isSending}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          rows={1}
          style={{ minHeight: '24px', maxHeight: '200px' }}
        />

        <div className="flex items-center gap-2">
          {/* 小应用选择器 */}
          <MiniAppSelector
            onSelect={handleMiniAppSelect}
            disabled={disabled || isSending}
          />

          {/* 附件上传按钮 */}
          <AttachmentUpload
            onFilesSelected={handleFilesSelected}
            disabled={disabled || isSending}
            multiple={true}
            accept="image/*,.pdf,.doc,.docx,.txt"
            maxSize={10 * 1024 * 1024}
            mode="button"
          />

          {/* 发送按钮 */}
          <Button
            type="button"
            onClick={handleSend}
            disabled={disabled || isSending || (!content.trim() && attachments.length === 0)}
            size="sm"
            className="h-8"
          >
            {isSending ? '发送中...' : '发送'}
          </Button>
        </div>
      </div>

      {/* 上传进度和提示文本 */}
      <div className="border-t px-3 py-2">
        {/* 上传进度 */}
        {isSending && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>正在上传: {uploadingFileName}</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {uploadError && (
          <div className="mb-2 text-xs text-destructive flex items-center gap-1">
            <span>⚠️</span>
            <span>{uploadError}</span>
            <button
              onClick={() => setUploadError('')}
              className="ml-auto hover:text-destructive/80"
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {/* 提示文本 */}
        <div className="text-xs text-muted-foreground">
          按 Ctrl+Enter 发送消息 • 支持图片、PDF、Word、文本文件(最大 10MB)
        </div>
      </div>
    </div>
  )
}
