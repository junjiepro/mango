/**
 * MessageInput Component
 * T049: Create MessageInput component with multimodal support
 */

'use client'

import React, { useState, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { logger } from '@mango/shared/utils'

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: any[]) => Promise<void>
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
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
    logger.debug('Files selected', { count: files.length })
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return
    if (isSending || disabled) return

    setIsSending(true)

    try {
      // TODO: 上传附件到 Supabase Storage
      const attachmentData = attachments.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      }))

      await onSendMessage(content.trim(), attachmentData)

      // 清空输入
      setContent('')
      setAttachments([])
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (err) {
      logger.error('Failed to send message', err as Error)
    } finally {
      setIsSending(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className={`rounded-lg border bg-background ${className}`}>
      {/* 附件预览 */}
      {attachments.length > 0 && (
        <div className="border-b p-2">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 text-sm"
              >
                <span className="truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <button
                  onClick={() => handleRemoveAttachment(index)}
                  className="text-muted-foreground hover:text-foreground"
                  type="button"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
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
          {/* 附件按钮 */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
            className="h-8 w-8 p-0"
          >
            📎
          </Button>

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

      {/* 提示文本 */}
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        按 Ctrl+Enter 发送消息
      </div>
    </div>
  )
}
