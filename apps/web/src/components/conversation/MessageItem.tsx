/**
 * MessageItem Component
 * T050: Create MessageItem component
 */

'use client'

import React from 'react'
import type { Database } from '@/types/database.types'

type Message = Database['public']['Tables']['messages']['Row']

interface MessageItemProps {
  message: Message
  showSender?: boolean
  className?: string
}

/**
 * MessageItem 组件
 * 显示单条消息
 */
export function MessageItem({
  message,
  showSender = true,
  className = '',
}: MessageItemProps) {
  const isUser = message.sender_type === 'user'
  const isAgent = message.sender_type === 'agent'
  const isSystem = message.sender_type === 'system'

  const getSenderName = () => {
    if (isUser) return '你'
    if (isAgent) return 'Agent'
    if (isSystem) return '系统'
    return '未知'
  }

  const getSenderColor = () => {
    if (isUser) return 'text-blue-600'
    if (isAgent) return 'text-purple-600'
    if (isSystem) return 'text-gray-600'
    return 'text-gray-600'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${className}`}
    >
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* 发送者信息 */}
        {showSender && (
          <div className="mb-1 flex items-center gap-2 px-1">
            <span className={`text-xs font-medium ${getSenderColor()}`}>
              {getSenderName()}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.created_at)}
            </span>
            {message.edited_at && (
              <span className="text-xs text-muted-foreground">(已编辑)</span>
            )}
          </div>
        )}

        {/* 消息内容 */}
        <div
          className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : isAgent
              ? 'bg-muted'
              : 'bg-muted/50'
          }`}
        >
          {/* 文本内容 */}
          <div className="whitespace-pre-wrap break-words text-sm">
            {message.content}
          </div>

          {/* 附件 */}
          {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded border border-border/50 bg-background/50 px-3 py-2"
                >
                  <span className="text-xs">📎</span>
                  <span className="text-xs truncate">{attachment.name}</span>
                  {attachment.size && (
                    <span className="text-xs text-muted-foreground">
                      ({Math.round(attachment.size / 1024)} KB)
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Agent 元数据 */}
          {isAgent && message.agent_metadata && (
            <div className="mt-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
              {message.agent_metadata.model && (
                <div>模型: {message.agent_metadata.model}</div>
              )}
              {message.agent_metadata.tokens && (
                <div>Tokens: {message.agent_metadata.tokens}</div>
              )}
              {message.agent_metadata.thinking_time_ms && (
                <div>
                  思考时间: {Math.round(message.agent_metadata.thinking_time_ms)}ms
                </div>
              )}
            </div>
          )}
        </div>

        {/* 消息状态 */}
        {message.status === 'pending' && (
          <div className="mt-1 px-1 text-xs text-muted-foreground">
            发送中...
          </div>
        )}
        {message.status === 'failed' && (
          <div className="mt-1 px-1 text-xs text-destructive">
            发送失败
          </div>
        )}
      </div>
    </div>
  )
}
