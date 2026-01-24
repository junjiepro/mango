/**
 * ACP Chat Component
 * ACP 会话聊天界面
 * 使用 ai-elements 组件
 *
 * 注意：此组件不再包含 ChatLayout，ChatLayout 应在父组件中统一管理
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { UIMessage } from 'ai';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Send,
  Square,
  FolderOpen,
  ArrowRight,
  CopyIcon,
  RefreshCcwIcon,
  AlertTriangle,
} from 'lucide-react';
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

interface ACPChatProps {
  deviceId: string;
  sessionId: string;
  agentName: string;
  deviceClient?: DeviceClientAPI;
  initialMessages?: UIMessage[];
  onMessagesChange?: (messages: UIMessage[]) => void;
  isActivated?: boolean;
  // 工作目录相关
  sessionWorkingDirectory?: string;
  currentWorkingDirectory?: string;
  onSwitchToSessionDirectory?: () => void;
  // 设备匹配状态
  isDeviceMismatch?: boolean;
  sessionDeviceName?: string;
  currentDeviceName?: string;
}

export function ACPChat({
  deviceId,
  sessionId,
  agentName,
  deviceClient,
  initialMessages = [],
  onMessagesChange,
  isActivated = true,
  sessionWorkingDirectory,
  currentWorkingDirectory,
  onSwitchToSessionDirectory,
  isDeviceMismatch = false,
  sessionDeviceName,
  currentDeviceName,
}: ACPChatProps) {
  const [input, setInput] = useState('');
  const prevMessagesLengthRef = useRef(0);
  const isInitializedRef = useRef(false);
  const prevIsActivatedRef = useRef(isActivated);

  // 使用 useChat hook
  const { messages, sendMessage, status, stop, error, regenerate, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: `${deviceClient?.deviceUrl}/acp/chat`,
      headers: {
        Authorization: `Bearer ${deviceClient?.deviceBindingCode}`,
      },
    }),
  });

  // 初始化消息（组件挂载时设置初始消息）
  useEffect(() => {
    if (!isInitializedRef.current && initialMessages.length > 0 && messages.length === 0) {
      setMessages(initialMessages);
      prevMessagesLengthRef.current = initialMessages.length;
      isInitializedRef.current = true;
    }
  }, [initialMessages, messages.length, setMessages]);

  // 当激活状态从 false 变为 true 时，重新加载消息
  useEffect(() => {
    if (!prevIsActivatedRef.current && isActivated && initialMessages.length > 0) {
      setMessages(initialMessages);
      prevMessagesLengthRef.current = initialMessages.length;
    }
    prevIsActivatedRef.current = isActivated;
  }, [isActivated, initialMessages, setMessages]);

  // 当消息变化时通知父组件（只在消息数量增加时触发，避免循环）
  useEffect(() => {
    if (
      onMessagesChange &&
      messages.length > 0 &&
      messages.length !== prevMessagesLengthRef.current
    ) {
      prevMessagesLengthRef.current = messages.length;
      onMessagesChange(messages);
    }
  }, [messages.length]);

  const isLoading = status === 'streaming' || status === 'submitted';

  // 判断工作目录是否不一致
  const isWorkingDirectoryMismatch = useMemo(() => {
    if (!sessionWorkingDirectory || !currentWorkingDirectory) return false;
    const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    return normalize(sessionWorkingDirectory) !== normalize(currentWorkingDirectory);
  }, [sessionWorkingDirectory, currentWorkingDirectory]);

  // 格式化路径显示
  const formatPath = useCallback((path: string, maxLength: number = 40) => {
    if (path.length <= maxLength) return path;
    const parts = path.split(/[/\\]/);
    if (parts.length <= 2) return path;
    const start = parts.slice(0, 2).join('/');
    const end = parts.slice(-1)[0];
    return `${start}/.../${end}`;
  }, []);

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
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  }, []);

  // 处理复制
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // 处理重试
  const handleRetry = useCallback(() => {
    regenerate();
  }, [regenerate]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* 设备不一致提示横幅 */}
      {isDeviceMismatch && (
        <div className="flex-shrink-0 bg-background/10 px-4 py-3">
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">
                此会话创建于设备{' '}
                <span className="font-medium">{sessionDeviceName || '未知设备'}</span>
                ，与当前选中的设备
                {currentDeviceName ? (
                  <span className="font-medium"> {currentDeviceName} </span>
                ) : (
                  ' '
                )}
                不一致，无法发送消息
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 未激活状态提示横幅 */}
      {!isDeviceMismatch && !isActivated && (
        <div className="flex-shrink-0 bg-background/10 px-4 py-3">
          <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">正在激活会话...</span>
          </div>
        </div>
      )}

      {/* 工作目录不一致提示横幅 */}
      {!isDeviceMismatch &&
        isActivated &&
        isWorkingDirectoryMismatch &&
        sessionWorkingDirectory && (
          <div className="flex-shrink-0 bg-background/10 px-4 py-2">
            <div className="container mx-auto max-w-4xl">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 min-w-0">
                  <FolderOpen className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">
                    当前目录与会话目录不一致:{' '}
                    <span className="font-medium" title={sessionWorkingDirectory}>
                      {formatPath(sessionWorkingDirectory)}
                    </span>
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 gap-1 text-xs h-7 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                  onClick={onSwitchToSessionDirectory}
                >
                  切换到会话目录
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* 消息列表 */}
      <Conversation className="flex-1 min-h-0">
        <ConversationContent>
          {isEmpty ? (
            <ConversationEmptyState
              title={`与 ${agentName} 开始对话`}
              description={
                isDeviceMismatch
                  ? '请切换到会话所属设备后再进行对话'
                  : isActivated
                    ? '输入消息开始与 Agent 交互'
                    : '会话激活后即可开始对话'
              }
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

                const textContent = message.parts
                  .filter((part) => part.type === 'text')
                  .map((part) => (part as any).text)
                  .join('\n');

                return (
                  <div key={message.id}>
                    <Message from={message.role}>
                      <div
                        className={cn(
                          'mb-2 flex items-center gap-2 text-xs text-muted-foreground',
                          isUser ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <span className="font-medium">{isUser ? '你' : agentName}</span>
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
                      {!isUser && !isStreaming && message.parts.length > 0 && (
                        <MessageActions>
                          <MessageAction tooltip="复制消息" onClick={() => handleCopy(textContent)}>
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

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="text-sm text-destructive">错误: {error.message}</p>
              <Button variant="outline" size="sm" onClick={handleRetry} className="mt-2">
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
            <div
              className={cn(
                'rounded-lg border bg-background',
                (isDeviceMismatch || !isActivated) && 'opacity-50'
              )}
            >
              <form onSubmit={handleSubmit}>
                <div className="flex items-end gap-2 p-3">
                  <textarea
                    value={input}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      isDeviceMismatch
                        ? '设备不一致，无法发送消息...'
                        : isActivated
                          ? `与 ${agentName} 对话...`
                          : '会话激活后可发送消息...'
                    }
                    disabled={isDeviceMismatch || !isActivated || isLoading}
                    className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    rows={1}
                    style={{ minHeight: '24px', maxHeight: '200px' }}
                  />
                  <div className="flex items-center gap-2">
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
                        disabled={isDeviceMismatch || !isActivated || isLoading || !input.trim()}
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
              <div className="border-t px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  {isDeviceMismatch
                    ? '请切换到会话所属设备后再进行对话'
                    : isActivated
                      ? `按 Ctrl+Enter 发送消息 • 当前 Agent: ${agentName}`
                      : '会话激活中，请稍候...'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
