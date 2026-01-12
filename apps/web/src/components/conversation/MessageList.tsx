/**
 * MessageList Component
 * T048: Create MessageList component
 * 支持流式消息和实时更新
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MessageItem } from './MessageItem';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Database } from '@/types/database.types';
import { useStreamingMessage } from '@/hooks/useStreamingMessage';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { cn } from '@/lib/utils';

type Message = Database['public']['Tables']['messages']['Row'];

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row'];

interface MessageListProps {
  conversationId: string | null;
  messages: Message[];
  installations?: any[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onOpenMiniApp?: (miniApp: MiniApp, installation: MiniAppInstallation) => void;
  onImageClick?: (url: string, filename?: string) => void;
  className?: string;
}

/**
 * MessageList 组件
 * 显示消息列表,支持虚拟滚动、加载更多、流式消息和实时更新
 */
export function MessageList({
  conversationId,
  messages: initialMessages,
  installations,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onOpenMiniApp,
  onImageClick,
  className = '',
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(initialMessages.length);

  // 本地消息状态（包含初始消息和实时更新）
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  // 订阅流式消息
  const { streamingMessages, getStreamingMessage } = useStreamingMessage(conversationId);

  // 处理消息插入
  const handleMessageInsert = useCallback((newMessage: Message) => {
    setMessages((prev) => {
      // 检查消息是否已存在
      if (prev.some((msg) => msg.id === newMessage.id)) {
        return prev;
      }
      // 按序列号排序插入
      const updated = [...prev, newMessage].sort((a, b) => a.sequence_number - b.sequence_number);
      return updated;
    });
  }, []);

  // 处理消息更新
  const handleMessageUpdate = useCallback((updatedMessage: Message) => {
    setMessages((prev) => prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg)));
  }, []);

  // 处理消息删除
  const handleMessageDelete = useCallback((messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  // 订阅数据库消息变化
  useRealtimeMessages({
    conversationId,
    onInsert: handleMessageInsert,
    onUpdate: handleMessageUpdate,
    onDelete: handleMessageDelete,
  });

  // 同步初始消息到本地状态
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // 自动滚动到底部 (仅当有新消息时)
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // 初始加载时滚动到底部
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      bottomRef.current?.scrollIntoView();
    }
  }, [isLoading]);

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
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`flex h-full items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <p className="text-muted-foreground">还没有消息</p>
          <p className="mt-2 text-sm text-muted-foreground">发送第一条消息开始对话</p>
        </div>
      </div>
    );
  }

  return (
    <Conversation className={cn(className)}>
      <ConversationContent>
        {/* 加载更多按钮 */}
        {hasMore && (
          <div className="flex justify-center pb-4">
            <Button variant="outline" size="sm" onClick={onLoadMore} disabled={isLoading}>
              {isLoading ? '加载中...' : '加载更多'}
            </Button>
          </div>
        )}

        {/* 消息列表 */}
        {messages.map((message, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showSender = !prevMessage || prevMessage.sender_type !== message.sender_type;

          // 获取流式消息状态
          const streamingMessage = getStreamingMessage(message.id);
          const isStreaming = streamingMessage?.isStreaming || false;
          const streamingContent = streamingMessage?.content;
          const streamingFiles = streamingMessage?.files;
          const toolCalls = streamingMessage?.toolCalls;

          return (
            <MessageItem
              key={message.id}
              message={message}
              installations={installations}
              showSender={showSender}
              streamingContent={streamingContent}
              isStreaming={isStreaming}
              streamingFiles={streamingFiles}
              toolCalls={toolCalls}
              onOpenMiniApp={onOpenMiniApp}
              onImageClick={onImageClick}
            />
          );
        })}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
