/**
 * MessageList Component
 * T048: Create MessageList component
 * 支持流式消息和实时更新
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
 * 显示消息列表,支持加载更多、流式消息
 * 消息状态由 ConversationContext 统一管理（含 realtime 订阅）
 */
export function MessageList({
  conversationId,
  messages,
  installations,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onOpenMiniApp,
  onImageClick,
  className = '',
}: MessageListProps) {
  const t = useTranslations('conversations');
  const tc = useTranslations('common');
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(messages.length);

  // 订阅流式消息
  const { getStreamingMessage } = useStreamingMessage(conversationId);

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
          <p className="text-muted-foreground">{t('noMessages')}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t('startConversation')}</p>
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
              {isLoading ? tc('actions.loading') : t('loadMore')}
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
