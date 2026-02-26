/**
 * MessageItem Component
 * T050: Create MessageItem component
 * 使用 ai-elements 优化消息展示
 */

'use client';

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
import { HtmlContentRenderer, isHtmlContent, parseContentSegments } from './HtmlContentRenderer';
import { MiniAppReference } from './MiniAppReference';
import { A2UIRenderer } from '@/components/a2ui/A2UIRenderer';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

type MessageType = Database['public']['Tables']['messages']['Row'];
type MiniApp = Database['public']['Tables']['mini_apps']['Row'];
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row'];

interface ToolCall {
  tool: string;
  toolCallId?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  args?: any;
  result?: any;
  error?: string;
  isMcpTool?: boolean;
  deviceName?: string;
}

interface MiniAppInvocation {
  miniAppId: string;
  miniAppName: string;
  miniAppIcon?: string;
  installationId: string;
  result?: any;
  error?: string;
}

interface MessageItemProps {
  message: MessageType;
  installations?: any[];
  showSender?: boolean;
  showActions?: boolean;
  onCopy?: (content: string) => void;
  onRetry?: () => void;
  className?: string;
  // 流式消息支持
  streamingContent?: string;
  isStreaming?: boolean;
  streamingFiles?: AttachmentWithPath[];
  toolCalls?: ToolCall[];
  // 小应用调用支持
  miniAppInvocation?: MiniAppInvocation;
  // MiniApp 引用支持
  onOpenMiniApp?: (miniApp: MiniApp, installation: MiniAppInstallation) => void;
  // 新增：图片点击处理
  onImageClick?: (url: string, filename?: string) => void;
}

// 稳定的空数组引用，避免默认参数每次创建新引用导致 React.memo 失效
const EMPTY_FILES: AttachmentWithPath[] = [];
const EMPTY_TOOL_CALLS: ToolCall[] = [];

// 非标准 HTML 标签转义用的正则（模块级别，避免每次渲染重建）
const STANDARD_HTML_TAGS =
  /^(?:a|abbr|b|blockquote|br|code|dd|del|details|dfn|div|dl|dt|em|h[1-6]|hr|i|img|ins|kbd|li|mark|ol|p|pre|q|rp|rt|ruby|s|samp|small|span|strong|sub|summary|sup|table|tbody|td|tfoot|th|thead|tr|u|ul|var|wbr)$/i;

const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('zh-CN', TIME_FORMAT_OPTIONS);
}

/**
 * MessageItem 组件
 * 使用 ai-elements 的 Message 组件展示不同类型的消息内容
 */
export const MessageItem = React.memo(function MessageItem({
  message,
  installations,
  showSender = true,
  showActions = true,
  onCopy,
  onRetry,
  className = '',
  streamingContent,
  isStreaming = false,
  streamingFiles = EMPTY_FILES,
  toolCalls = EMPTY_TOOL_CALLS,
  miniAppInvocation,
  onOpenMiniApp,
  onImageClick,
}: MessageItemProps) {
  const isUser = message.sender_type === 'user';
  const isAgent = message.sender_type === 'agent';
  const isSystem = message.sender_type === 'system';
  const isMiniApp = message.sender_type === 'miniapp';
  const t = useTranslations('conversations');

  // 确定消息角色
  const messageRole = isUser ? 'user' : 'assistant';

  // 从 metadata 中提取 MiniApp 引用
  const miniAppReferences = useMemo(() => {
    const metadata = message.metadata as any;
    if (!metadata || !metadata.miniApp) {
      return [];
    }
    return (
      installations
        ?.filter((install) => install.id === metadata.miniApp.installationId)
        ?.map((install) => ({ miniApp: install.mini_app, installation: install })) || []
    );
  }, [message.metadata, installations]);

  // 状态：刷新后的附件
  const [refreshedAttachments, setRefreshedAttachments] = useState<any[]>([]);
  // 使用 ref 跟踪是否已刷新，避免重复执行
  const hasRefreshedRef = useRef(false);
  const lastMessageIdRef = useRef<string>('');
  const lastAttachmentCountRef = useRef<number>(0);

  const attachmentsTodo = useMemo(
    () =>
      [
        ...(!message.attachments ||
        !Array.isArray(message.attachments) ||
        message.attachments.length === 0
          ? []
          : message.attachments),
        ...streamingFiles,
      ] as AttachmentWithPath[],
    [message.attachments, streamingFiles]
  );

  // 在组件挂载时刷新附件 URL（如果需要）
  useEffect(() => {
    // 如果消息 ID 变化，重置刷新状态
    if (
      lastMessageIdRef.current !== message.id ||
      lastAttachmentCountRef.current !== attachmentsTodo.length
    ) {
      hasRefreshedRef.current = false;
      lastMessageIdRef.current = message.id;
      lastAttachmentCountRef.current = attachmentsTodo.length;
    }

    // 避免重复刷新
    if (hasRefreshedRef.current) {
      return;
    }

    const refreshUrls = async () => {
      if (!attachmentsTodo || !Array.isArray(attachmentsTodo) || attachmentsTodo.length === 0) {
        hasRefreshedRef.current = true;
        return;
      }

      // 将 JSON 类型转换为普通对象数组
      const attachmentsArray = attachmentsTodo;

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
  }, [message.id, attachmentsTodo]);

  const senderName = useMemo(() => {
    if (isUser) return t('messageItem.you');
    if (isAgent) return t('messageItem.agent');
    if (isSystem) return t('messageItem.system');
    if (isMiniApp && miniAppInvocation) return miniAppInvocation.miniAppName;
    return t('messageItem.unknown');
  }, [isUser, isAgent, isSystem, isMiniApp, miniAppInvocation, t]);

  const formattedTime = useMemo(() => formatTime(message.created_at), [message.created_at]);

  const handleCopy = useCallback(() => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      navigator.clipboard.writeText(message.content);
    }
  }, [onCopy, message.content]);

  // 转换附件格式为 ai-elements 所需的格式
  const attachments: FileUIPart[] = useMemo(() => {
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
  }, [refreshedAttachments, message.attachments]);

  // 确定要显示的内容：优先使用流式内容，否则使用消息内容
  const rawContent = streamingContent || message.content;

  // 将 Agent 消息中的非标准 XML 标签块包裹为 ```xml 代码块
  const displayContent = useMemo(() => {
    if (!rawContent || messageRole === 'user') return rawContent;
    // 匹配已有代码块，或顶层非标准标签的完整块（含嵌套内容）
    return rawContent.replace(
      /(```[\s\S]*?```)|(<(\w[\w-]*)(?:\s[^>]*)?>[\s\S]*?<\/\3>)/g,
      (m, code, xmlBlock, tagName) => {
        if (code) return m;
        if (!tagName || STANDARD_HTML_TAGS.test(tagName)) return m;
        return '\n```xml\n' + xmlBlock.trim() + '\n```\n';
      }
    );
  }, [rawContent, messageRole]);

  // 检测内容是否为 HTML 或包含混合内容
  const contentSegments = useMemo(() => parseContentSegments(displayContent), [displayContent]);
  const hasHtmlContent = useMemo(
    () => contentSegments.some((segment) => segment.type === 'html'),
    [contentSegments]
  );

  // 检测消息中是否包含 A2UI 组件
  const a2uiComponents = useMemo(() => {
    const metadata = message.metadata as any;
    if (!metadata || !metadata.a2ui) {
      return [];
    }
    // 支持单个组件或组件数组
    return Array.isArray(metadata.a2ui) ? metadata.a2ui : [metadata.a2ui];
  }, [message.metadata]);

  // 获取工具调用的显示名称
  const getToolDisplayName = (toolCall: ToolCall) => {
    const { tool: toolName, isMcpTool, deviceName } = toolCall;

    // 内置工具的显示名称映射
    const builtInToolNames: Record<string, string> = {
      generating_image: t('messageItem.imageGeneration'),
      reading_taged_file: t('messageItem.readTaggedFile'),
      invoke_miniapp: t('messageItem.invokeMiniApp'),
      create_miniapp: t('messageItem.createMiniApp'),
      update_miniapp: t('messageItem.updateMiniApp'),
    };

    // 如果是内置工具,返回映射的名称
    if (builtInToolNames[toolName]) {
      return builtInToolNames[toolName];
    }

    // 如果是 MCP 工具
    if (isMcpTool) {
      // 移除前缀 (global_ 或 设备名_)
      let displayName = toolName;
      if (toolName.startsWith('global_')) {
        displayName = toolName.replace('global_', '');
      } else if (deviceName && toolName.startsWith(`${deviceName}_`)) {
        displayName = toolName.replace(`${deviceName}_`, '');
      }

      // 格式化工具名称 (将下划线替换为空格,首字母大写)
      displayName = displayName
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return displayName;
    }

    // 默认返回原始工具名称
    return toolName;
  };

  // 获取工具调用的状态图标和文本
  const getToolStatusDisplay = (status: ToolCall['status']) => {
    switch (status) {
      case 'running':
        return {
          icon: <ClockIcon className="size-3 animate-spin" />,
          text: t('messageItem.toolRunning'),
          color: 'text-blue-500',
        };
      case 'success':
        return { icon: '✓', text: t('messageItem.toolSuccess'), color: 'text-green-500' };
      case 'error':
        return { icon: '✗', text: t('messageItem.toolError'), color: 'text-red-500' };
      default:
        return { icon: '○', text: t('messageItem.toolPending'), color: 'text-gray-500' };
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
            <span className="font-medium">{senderName}</span>
            <span>·</span>
            <span>{formattedTime}</span>
            {message.edited_at && (
              <>
                <span>·</span>
                <span>{t('messageItem.edited')}</span>
              </>
            )}
            {isStreaming && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="size-3 animate-spin" />
                  <span>{t('messageItem.generating')}</span>
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
              const displayName = getToolDisplayName(toolCall);

              return (
                <div
                  key={toolCall.toolCallId || index}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
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
                  <span className={cn('flex items-center mt-0.5', statusDisplay.color)}>
                    {statusDisplay.icon}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{displayName}</span>
                      <span className={statusDisplay.color}>{statusDisplay.text}</span>

                      {/* MCP 工具显示设备名称 */}
                      {toolCall.isMcpTool && toolCall.deviceName && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                          {toolCall.deviceName}
                        </span>
                      )}

                      {/* 全局 MCP 工具标识 */}
                      {toolCall.isMcpTool && !toolCall.deviceName && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {t('messageItem.global')}
                        </span>
                      )}
                    </div>

                    {/* 显示工具参数 (如果有 prompt) */}
                    {toolCall.args?.prompt && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        &quot;{toolCall.args.prompt.substring(0, 50)}
                        {toolCall.args.prompt.length > 50 ? '...' : ''}&quot;
                      </div>
                    )}

                    {/* 显示错误信息 */}
                    {toolCall.error && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {toolCall.error}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 小应用调用状态显示 */}
        {miniAppInvocation && (
          <div className="mb-3">
            <div
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3',
                miniAppInvocation.error
                  ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                  : 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950'
              )}
            >
              {/* 小应用图标 */}
              {miniAppInvocation.miniAppIcon ? (
                <img
                  src={miniAppInvocation.miniAppIcon}
                  alt={miniAppInvocation.miniAppName}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-purple-100 dark:bg-purple-900">
                  <svg
                    className="h-4 w-4 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-purple-900 dark:text-purple-100">
                    {miniAppInvocation.miniAppName}
                  </span>
                  {miniAppInvocation.error ? (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {t('messageItem.executionFailed')}
                    </span>
                  ) : (
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      {t('messageItem.invoked')}
                    </span>
                  )}
                </div>

                {/* 错误信息 */}
                {miniAppInvocation.error && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {miniAppInvocation.error}
                  </p>
                )}

                {/* 结果预览 */}
                {miniAppInvocation.result && !miniAppInvocation.error && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <details className="cursor-pointer">
                      <summary className="hover:text-foreground">
                        {t('messageItem.viewResult')}
                      </summary>
                      <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
                        {JSON.stringify(miniAppInvocation.result, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 附件展示 - 在消息内容之前（包含数据库附件和流式附件） */}
        {attachments.length > 0 && (
          <MessageAttachments className={cn('mb-2', messageRole !== 'user' && 'ml-0')}>
            {attachments.map((attachment, index) => {
              // 判断是否为图片类型
              const isImage = attachment.mediaType?.startsWith('image/');

              if (isImage && onImageClick) {
                // 图片类型，添加点击处理
                return (
                  <div
                    key={index}
                    onClick={() => onImageClick(attachment.url, attachment.filename)}
                    className="cursor-pointer"
                  >
                    <MessageAttachment data={attachment} />
                  </div>
                );
              }

              // 非图片类型，正常渲染
              return <MessageAttachment key={index} data={attachment} />;
            })}
          </MessageAttachments>
        )}

        {/* 消息内容 */}
        <MessageContent>
          {hasHtmlContent ? (
            <HtmlContentRenderer content={displayContent} />
          ) : (
            <MessageResponse>{displayContent}</MessageResponse>
          )}

          {/* A2UI 组件渲染 */}
          {a2uiComponents.length > 0 && (
            <div className="mt-3 space-y-3">
              {a2uiComponents.map((component, index) => (
                <A2UIRenderer
                  key={index}
                  schema={component}
                  onEvent={(event) => {
                    logger.debug('A2UI event:', event);
                  }}
                />
              ))}
            </div>
          )}

          {/* Agent 元数据 - 显示在消息内容内部 */}
          {isAgent && message.agent_metadata && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3 text-xs text-muted-foreground">
              {message.agent_metadata.model && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">{t('messageItem.model')}</span>
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
            <MessageAction tooltip={t('messageItem.copyMessage')} onClick={handleCopy}>
              <CopyIcon className="size-4" />
            </MessageAction>
            {onRetry && (
              <MessageAction tooltip={t('messageItem.regenerate')} onClick={onRetry}>
                <RefreshCcwIcon className="size-4" />
              </MessageAction>
            )}
            <FeedbackButton
              messageId={message.id}
              conversationId={message.conversation_id}
              size="sm"
            />
          </MessageActions>
        )}

        {/* 消息状态指示器 */}
        {message.status === 'pending' && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <ClockIcon className="size-3 animate-spin" />
            <span>{t('messageItem.sending')}</span>
          </div>
        )}
        {message.status === 'failed' && (
          <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
            <AlertCircleIcon className="size-3" />
            <span>{t('messageItem.sendFailed')}</span>
            {onRetry && (
              <button onClick={onRetry} className="underline hover:no-underline">
                {t('messageItem.retry')}
              </button>
            )}
          </div>
        )}
      </Message>

      {/* MiniApp 引用显示 - 在消息外部 */}
      {miniAppReferences.length > 0 && (
        <div
          className={cn(
            'mt-2 space-y-2 w-fit',
            messageRole === 'user' ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[80%]'
          )}
        >
          {miniAppReferences.map((ref: any, index: number) => (
            <MiniAppReference
              key={index}
              miniApp={ref.miniApp}
              installation={ref.installation}
              onOpen={onOpenMiniApp}
            />
          ))}
        </div>
      )}
    </div>
  );
});
