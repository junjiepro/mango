/**
 * MessageList Component
 * T048: Create MessageList component
 */

'use client'

import React, { useEffect, useRef } from 'react'
import { MessageItem } from './MessageItem'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { Database } from '@/types/database.types'

type Message = Database['public']['Tables']['messages']['Row']

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  className?: string
}

/**
 * MessageList 组件
 * 显示消息列表,支持虚拟滚动和加载更多
 */
export function MessageList({
  messages,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  className = '',
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevMessagesLengthRef = useRef(messages.length)

  // 自动滚动到底部 (仅当有新消息时)
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevMessagesLengthRef.current = messages.length
  }, [messages.length])

  // 初始加载时滚动到底部
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView()
    }
  }, [isLoading])

  if (isLoading && messages.length === 0) {
    return (
      <div className={`space-y-4 p-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className={`flex h-full items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <p className="text-muted-foreground">还没有消息</p>
          <p className="mt-2 text-sm text-muted-foreground">
            发送第一条消息开始对话
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className={`flex flex-col overflow-y-auto ${className}`}
    >
      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="flex justify-center p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? '加载中...' : '加载更多'}
          </Button>
        </div>
      )}

      {/* 消息列表 */}
      <div className="space-y-4 p-4">
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null
          const showSender = !prevMessage || prevMessage.sender_type !== message.sender_type

          return (
            <MessageItem
              key={message.id}
              message={message}
              showSender={showSender}
            />
          )
        })}
      </div>

      {/* 底部锚点 */}
      <div ref={bottomRef} />
    </div>
  )
}
