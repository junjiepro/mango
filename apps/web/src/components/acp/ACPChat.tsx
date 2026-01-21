/**
 * ACP Chat Component
 * ACP 会话聊天界面
 * 使用 ai-elements 组件，布局与 Mango 会话保持一致
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Square, Paperclip } from 'lucide-react';
import { ChatLayout } from '@/components/layouts/ChatLayout';
import { DeviceClientAPI } from '@/hooks/useDeviceClient';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationEmptyState,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message';
import { renderACPMessagePart } from './ACPMessageRenderer';
import { cn } from '@/lib/utils';
import { CopyIcon, RefreshCcwIcon } from 'lucide-react';

interface ACPChatProps {
  deviceId: string;
  sessionId: string;
  agentName: string;
  deviceClient?: DeviceClientAPI;
  showWorkspace?: boolean;
  onToggleWorkspace?: () => void;
  conversationId?: string;
}

export function ACPChat({
  deviceId,
  sessionId,
  agentName,
  deviceClient,
  showWorkspace = false,
  onToggleWorkspace,
  conversationId,
}: ACPChatProps) {
  const [input, setInput] = useState('');

  // 使用 useChat hook
  const { messages, sendMessage, status, stop, error, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: `${deviceClient?.deviceUrl}/acp/chat`,
      headers: {
        Authorization: `Bearer ${deviceClient?.deviceBindingCode}`,
      },
    }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // 处理提交
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        sendMessage({ text: input }, { body: { sessionId } });
        setInput('');
      }
    },
    [input, isLoading, sendMessage, sessionId]
  );

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl/Cmd + Enter 发送消息
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          sendMessage({ text: input }, { body: { sessionId } });
          setInput('');
        }
      }
    },
    [input, isLoading, sendMessage, sessionId]
  );

  // 自动调整文本框高度
  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      // 自动调整高度
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
    },
    []
  );

  // 处理复制
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // 处理重试
  const handleRetry = useCallback(() => {
    regenerate();
  }, [regenerate]);

  // 计算消息列表是否为空
  const isEmpty = messages.length === 0;

  return (
    <ChatLayout
      showWorkspace={showWorkspace}
      onToggleWorkspace={onToggleWorkspace}
      deviceId={deviceId}
      conversationId={conversationId}
    >
      <div className="flex flex-col h-full">
        {/* 消息列表 */}
        <Conversation className="flex-1 min-h-0">
          <ConversationContent>
            {isEmpty ? (
              <ConversationEmptyState
                title={`与 ${agentName} 开始对话`}
                description="输入消息开始与 Agent 交互"
                icon={
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl">🤖</span>
                  </div>
                }
              />
            ) : (
              <>
                {messages.map((message) => {
                  const isUser = message.role === 'user';
                  const isStreaming =
                    status === 'streaming' &&
                    message.id === messages[messages.length - 1]?.id &&
                    message.role === 'assistant';

                  // 提取消息文本内容用于复制
                  const textContent = message.parts
                    .filter((part) => part.type === 'text')
                    .map((part) => (part as any).text)
                    .join('\n');

                  return (
                    <div key={message.id}>
                      <Message from={message.role}>
                        {/* 发送者信息 */}
                        <div
                          className={cn(
                            'mb-2 flex items-center gap-2 text-xs text-muted-foreground',
                            isUser ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <span className="font-medium">
                            {isUser ? '你' : agentName}
                          </span>
                          {isStreaming && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Loader2 className="size-3 animate-spin" />
                                <span>生成中...</span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* 消息内容 */}
                        <MessageContent>
                          {message.parts.map((part, index) =>
                            renderACPMessagePart(
                              part,
                              message.id,
                              index,
                              isStreaming,
                              message.metadata as Record<string, unknown> | undefined
                            )
                          )}
                        </MessageContent>

                        {/* 消息操作按钮 */}
                        {!isUser && !isStreaming && message.parts.length > 0 && (
                          <MessageActions>
                            <MessageAction
                              tooltip="复制消息"
                              onClick={() => handleCopy(textContent)}
                            >
                              <CopyIcon className="size-4" />
                            </MessageAction>
                            <MessageAction tooltip="重新生成" onClick={handleRetry}>
                              <RefreshCcwIcon className="size-4" />
                            </MessageAction>
                          </MessageActions>
                        )}
                      </Message>
                    </div>
                  );
                })}

                {/* 加载状态 */}
                {status === 'submitted' && (
                  <Message from="assistant">
                    <MessageContent>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        <span className="text-sm">正在思考...</span>
                      </div>
                    </MessageContent>
                  </Message>
                )}
              </>
            )}

            {/* 错误显示 */}
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
                <p className="text-sm text-destructive">错误: {error.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  className="mt-2"
                >
                  重试
                </Button>
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {/* 输入框 */}
        <div className="flex-shrink-0">
          <div className="bg-background p-4">
            <div className="container mx-auto max-w-4xl">
              <div className="rounded-lg border bg-background">
                {/* 输入区域 */}
                <form onSubmit={handleSubmit}>
                  <div className="flex items-end gap-2 p-3">
                    <textarea
                      value={input}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      placeholder={`与 ${agentName} 对话...`}
                      disabled={isLoading}
                      className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      rows={1}
                      style={{ minHeight: '24px', maxHeight: '200px' }}
                    />

                    <div className="flex items-center gap-2">
                      {/* 停止按钮（流式传输时显示） */}
                      {status === 'streaming' ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={stop}
                          className="h-8"
                        >
                          <Square className="h-3 w-3 mr-1" />
                          停止
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={isLoading || !input.trim()}
                          size="sm"
                          className="h-8"
                        >
                          {status === 'submitted' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>

                {/* 提示文本 */}
                <div className="border-t px-3 py-2">
                  <div className="text-xs text-muted-foreground">
                    按 Ctrl+Enter 发送消息 • 当前 Agent: {agentName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ChatLayout>
  );
}
