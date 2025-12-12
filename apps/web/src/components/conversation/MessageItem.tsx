/**
 * MessageItem Component
 * T050: Create MessageItem component
 * 使用 ai-elements 优化消息展示
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import type { Database } from '@/types/database.types';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
  MessageAttachments,
  MessageAttachment,
} from '@/components/ai-elements/message';
import { CopyIcon, RefreshCcwIcon, AlertCircleIcon, ClockIcon } from 'lucide-react';
import type { FileUIPart } from 'ai';
import {
  smartRefreshAttachmentUrls,
  type AttachmentWithPath,
} from '@/lib/storage/attachment-utils';
import { logger } from '@mango/shared/utils';
import { cn } from '@/lib/utils';

type MessageType = Database['public']['Tables']['messages']['Row'];

interface StreamingFile {
  type: string;
  url: string;
  mediaType: string;
  filename: string;
}

interface ToolCall {
  tool: string;
  status: 'pending' | 'running' | 'success' | 'error';
  args?: any;
  result?: any;
  error?: string;
}

interface MessageItemProps {
  message: MessageType;
  showSender?: boolean;
  showActions?: boolean;
  onCopy?: (content: string) => void;
  onRetry?: () => void;
  className?: string;
  // 流式消息支持
  streamingContent?: string;
  isStreaming?: boolean;
  streamingFiles?: StreamingFile[];
  toolCalls?: ToolCall[];
}

/**
 * MessageItem 组件
 * 使用 ai-elements 的 Message 组件展示不同类型的消息内容
 */
export function MessageItem({
  message,
  showSender = true,
  showActions = true,
  onCopy,
  onRetry,
  className = '',
  streamingContent,
  isStreaming = false,
  streamingFiles = [],
  toolCalls = [],
}: MessageItemProps) {
  const isUser = message.sender_type === 'user';
  const isAgent = message.sender_type === 'agent';
  const isSystem = message.sender_type === 'system';

  // 确定消息角色
  const messageRole = isUser ? 'user' : 'assistant';

  // 状态：刷新后的附件
  const [refreshedAttachments, setRefreshedAttachments] = useState<any[]>([]);
  // 使用 ref 跟踪是否已刷新，避免重复执行
  const hasRefreshedRef = useRef(false);
  const lastMessageIdRef = useRef<string>('');

  // 在组件挂载时刷新附件 URL（如果需要）
  useEffect(() => {
    // 如果消息 ID 变化，重置刷新状态
    if (lastMessageIdRef.current !== message.id) {
      hasRefreshedRef.current = false;
      lastMessageIdRef.current = message.id;
    }

    // 避免重复刷新
    if (hasRefreshedRef.current) {
      return;
    }

    const refreshUrls = async () => {
      if (
        !message.attachments ||
        !Array.isArray(message.attachments) ||
        message.attachments.length === 0
      ) {
        hasRefreshedRef.current = true;
        return;
      }

      // 将 JSON 类型转换为普通对象数组
      const attachmentsArray = message.attachments as any[];

      // 检查附件是否有 path 字段（需要刷新的标志）
      const hasPath = attachmentsArray.some(
        (att: any) => att && typeof att === 'object' && att.path
      );
      if (!hasPath) {
        setRefreshedAttachments(attachmentsArray);
        hasRefreshedRef.current = true;
        return;
      }

      try {
        const refreshed = await smartRefreshAttachmentUrls(
          attachmentsArray as AttachmentWithPath[],
          'attachments',
          86400, // 24小时
          3600 // 提前1小时刷新
        );
        setRefreshedAttachments(refreshed);
        hasRefreshedRef.current = true;
        logger.debug('Attachment URLs refreshed', {
          messageId: message.id,
          count: refreshed.length,
        });
      } catch (error) {
        logger.error('Failed to refresh attachment URLs', error as Error);
        // 失败时使用原始附件
        setRefreshedAttachments(attachmentsArray);
        hasRefreshedRef.current = true;
      }
    };

    refreshUrls();
  }, [message.id, message.attachments]);

  const getSenderName = () => {
    if (isUser) return '你';
    if (isAgent) return 'Agent';
    if (isSystem) return '系统';
    return '未知';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 处理复制操作
  const handleCopy = () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
  };

  // 转换附件格式为 ai-elements 所需的格式
  const convertAttachments = (): FileUIPart[] => {
    const attachmentsToUse =
      refreshedAttachments.length > 0 ? refreshedAttachments : message.attachments;

    if (!attachmentsToUse || !Array.isArray(attachmentsToUse)) {
      return [];
    }

    return attachmentsToUse.map((attachment: any) => {
      // 确保 URL 存在且有效
      const url = attachment.url || attachment.publicUrl || '';
      const filename = attachment.name || attachment.fileName || 'attachment';
      const mediaType =
        attachment.type ||
        attachment.fileType ||
        attachment.mediaType ||
        'application/octet-stream';

      return {
        type: 'file' as const,
        url,
        filename,
        mediaType,
      };
    });
  };

  const attachments = convertAttachments();

  // 确定要显示的内容：优先使用流式内容，否则使用消息内容
  const displayContent = streamingContent || message.content;

  // 转换流式文件为 FileUIPart 格式
  const streamingAttachments: FileUIPart[] = streamingFiles.map((file) => ({
    type: 'file' as const,
    url: file.url,
    filename: file.filename,
    mediaType: file.mediaType,
  }));

  // 合并数据库附件和流式附件
  const allAttachments = [...attachments, ...streamingAttachments];

  // 获取工具调用的显示名称
  const getToolDisplayName = (toolName: string) => {
    const toolNames: Record<string, string> = {
      image_generate: '图片生成',
    };
    return toolNames[toolName] || toolName;
  };

  // 获取工具调用的状态图标和文本
  const getToolStatusDisplay = (status: ToolCall['status']) => {
    switch (status) {
      case 'running':
        return {
          icon: <ClockIcon className="size-3 animate-spin" />,
          text: '执行中',
          color: 'text-blue-500',
        };
      case 'success':
        return { icon: '✓', text: '成功', color: 'text-green-500' };
      case 'error':
        return { icon: '✗', text: '失败', color: 'text-red-500' };
      default:
        return { icon: '○', text: '等待中', color: 'text-gray-500' };
    }
  };

  return (
    <div className={className}>
      <Message from={messageRole}>
        {/* 发送者信息和时间戳 */}
        {showSender && (
          <div
            className={cn(
              'mb-2 flex items-center gap-2 text-xs text-muted-foreground',
              messageRole === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <span className="font-medium">{getSenderName()}</span>
            <span>·</span>
            <span>{formatTime(message.created_at)}</span>
            {message.edited_at && (
              <>
                <span>·</span>
                <span>(已编辑)</span>
              </>
            )}
            {isStreaming && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="size-3 animate-spin" />
                  <span>生成中...</span>
                </span>
              </>
            )}
          </div>
        )}

        {/* 工具调用状态显示 */}
        {toolCalls.length > 0 && (
          <div className="mb-3 space-y-2">
            {toolCalls.map((toolCall, index) => {
              const statusDisplay = getToolStatusDisplay(toolCall.status);
              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                    toolCall.status === 'running' &&
                      'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
                    toolCall.status === 'success' &&
                      'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
                    toolCall.status === 'error' &&
                      'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
                    toolCall.status === 'pending' &&
                      'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950'
                  )}
                >
                  <span className={cn('flex items-center', statusDisplay.color)}>
                    {statusDisplay.icon}
                  </span>
                  <span className="font-medium">{getToolDisplayName(toolCall.tool)}</span>
                  <span className={statusDisplay.color}>{statusDisplay.text}</span>
                  {toolCall.args?.prompt && (
                    <span className="text-xs text-muted-foreground">
                      "{toolCall.args.prompt.substring(0, 30)}
                      {toolCall.args.prompt.length > 30 ? '...' : ''}"
                    </span>
                  )}
                  {toolCall.error && (
                    <span className="text-xs text-red-600 dark:text-red-400">{toolCall.error}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 附件展示 - 在消息内容之前（包含数据库附件和流式附件） */}
        {allAttachments.length > 0 && (
          <MessageAttachments className={cn('mb-2', messageRole !== 'user' && 'ml-0')}>
            {allAttachments.map((attachment, index) => (
              <MessageAttachment key={index} data={attachment} />
            ))}
          </MessageAttachments>
        )}

        {/* 消息内容 */}
        <MessageContent>
          <MessageResponse>{displayContent}</MessageResponse>

          {/* Agent 元数据 - 显示在消息内容内部 */}
          {isAgent && message.agent_metadata && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
              {message.agent_metadata.model && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">模型:</span>
                  <span>{message.agent_metadata.model}</span>
                </div>
              )}
              {message.agent_metadata.tokens && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Tokens:</span>
                  <span>{message.agent_metadata.tokens}</span>
                </div>
              )}
              {message.agent_metadata.thinking_time_ms && (
                <div className="flex items-center gap-1">
                  <ClockIcon className="size-3" />
                  <span>{Math.round(message.agent_metadata.thinking_time_ms)}ms</span>
                </div>
              )}
            </div>
          )}
        </MessageContent>

        {/* 消息操作按钮 */}
        {showActions && !isUser && message.status === 'sent' && (
          <MessageActions>
            <MessageAction tooltip="复制消息" onClick={handleCopy}>
              <CopyIcon className="size-4" />
            </MessageAction>
            {onRetry && (
              <MessageAction tooltip="重新生成" onClick={onRetry}>
                <RefreshCcwIcon className="size-4" />
              </MessageAction>
            )}
          </MessageActions>
        )}

        {/* 消息状态指示器 */}
        {message.status === 'pending' && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <ClockIcon className="size-3 animate-spin" />
            <span>发送中...</span>
          </div>
        )}
        {message.status === 'failed' && (
          <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
            <AlertCircleIcon className="size-3" />
            <span>发送失败</span>
            {onRetry && (
              <button onClick={onRetry} className="underline hover:no-underline">
                重试
              </button>
            )}
          </div>
        )}
      </Message>
    </div>
  );
}
