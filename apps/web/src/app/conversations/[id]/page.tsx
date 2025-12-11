/**
 * Conversation Detail Page
 * T055: Create conversation detail page
 */

'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { ConversationProvider, useConversation } from '@/contexts/ConversationContext';
import { MessageList } from '@/components/conversation/MessageList';
import { MessageInput } from '@/components/conversation/MessageInput';
import { TaskProgressIndicator } from '@/components/task/TaskProgressIndicator';
import { AppHeader } from '@/components/layouts/AppHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 对话详情内容组件
 */
function ConversationDetailContent() {
  const {
    currentConversation,
    messages,
    isLoadingMessages,
    sendMessage,
    loadMoreMessages,
    hasMoreMessages,
    tasks,
    isRealtimeConnected,
    error,
  } = useConversation();

  const router = useRouter();

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">加载对话失败</p>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button variant="outline" onClick={() => router.push('/conversations')} className="mt-4">
            返回对话列表
          </Button>
        </div>
      </div>
    );
  }

  if (!currentConversation) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* 对话信息栏 */}
      <div className="border-b bg-muted/40">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/conversations')}>
              ← 返回
            </Button>
            <div>
              <h1 className="font-semibold">{currentConversation.title}</h1>
              {currentConversation.description && (
                <p className="text-xs text-muted-foreground">{currentConversation.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 实时连接状态 */}
            <div className="flex items-center gap-2 text-xs">
              <div
                className={`h-2 w-2 rounded-full ${
                  isRealtimeConnected ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="text-muted-foreground">
                {isRealtimeConnected ? '已连接' : '未连接'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 消息列表 */}
        <div className="flex flex-1 flex-col">
          <MessageList
            conversationId={currentConversation.id}
            messages={messages}
            isLoading={isLoadingMessages}
            hasMore={hasMoreMessages}
            onLoadMore={loadMoreMessages}
            className="flex-1"
          />

          {/* 消息输入框 */}
          <div className="bg-background p-4">
            <div className="container mx-auto max-w-4xl">
              <MessageInput
                onSendMessage={sendMessage}
                placeholder="输入消息... (Ctrl+Enter 发送)"
              />
            </div>
          </div>
        </div>

        {/* 侧边栏 - 任务列表 */}
        {tasks.length > 0 && (
          <div className="w-80 border-l bg-muted/40 p-4 overflow-y-auto">
            <h3 className="mb-4 font-semibold">运行中的任务</h3>
            <div className="space-y-3">
              {tasks
                .filter((task) => ['pending', 'queued', 'running'].includes(task.status))
                .map((task) => (
                  <TaskProgressIndicator key={task.id} task={task} />
                ))}
            </div>

            {tasks.some((task) => ['completed', 'failed'].includes(task.status)) && (
              <>
                <h3 className="mb-4 mt-6 font-semibold">已完成的任务</h3>
                <div className="space-y-3">
                  {tasks
                    .filter((task) => ['completed', 'failed'].includes(task.status))
                    .slice(0, 5)
                    .map((task) => (
                      <TaskProgressIndicator key={task.id} task={task} />
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 对话详情页面
 */
export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  return (
    <ConversationProvider conversationId={id}>
      <div className="flex h-screen flex-col">
        <AppHeader />
        <div className="flex-1 overflow-hidden">
          <ConversationDetailContent />
        </div>
      </div>
    </ConversationProvider>
  );
}
