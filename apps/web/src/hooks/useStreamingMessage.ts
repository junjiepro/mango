/**
 * useStreamingMessage Hook
 * 处理流式消息的订阅和状态管理
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@mango/shared/utils';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { AttachmentWithPath } from '@/lib/storage/attachment-utils';

interface StreamingMessage {
  messageId: string;
  content: string;
  isStreaming: boolean;
  isComplete: boolean;
  files?: AttachmentWithPath[];
  toolCalls?: ToolCall[];
}

interface ToolCall {
  tool: string;
  status: 'pending' | 'running' | 'success' | 'error';
  args?: any;
  result?: any;
  error?: string;
}

interface MessageChunkPayload {
  messageId: string;
  chunk: string;
  fullContent: string;
  type: 'text';
}

interface MessageFilePayload {
  messageId: string;
  file: AttachmentWithPath;
}

interface MessageCompletePayload {
  messageId: string;
  fullContent: string;
  tokenCount: number;
  processingTime: number;
  files?: AttachmentWithPath[];
}

interface ToolCallStartPayload {
  messageId: string;
  tool: string;
  args: any;
}

interface ToolCallResultPayload {
  messageId: string;
  tool: string;
  status: 'success' | 'error';
  result?: any;
  error?: string;
}

/**
 * useStreamingMessage Hook
 * 订阅特定对话的流式消息
 */
export function useStreamingMessage(conversationId: string | null) {
  const [streamingMessages, setStreamingMessages] = useState<Map<string, StreamingMessage>>(
    new Map()
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  // 更新流式消息内容
  const updateStreamingMessage = useCallback(
    (messageId: string, content: string, isComplete: boolean, files?: AttachmentWithPath[]) => {
      setStreamingMessages((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(messageId);
        newMap.set(messageId, {
          messageId,
          content,
          isStreaming: !isComplete,
          isComplete,
          files: files || existing?.files || [],
        });
        return newMap;
      });
    },
    []
  );

  // 添加文件到流式消息
  const addFileToStreamingMessage = useCallback((messageId: string, file: AttachmentWithPath) => {
    setStreamingMessages((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(messageId);
      if (existing) {
        newMap.set(messageId, {
          ...existing,
          files: [...(existing.files || []), file],
        });
      }
      return newMap;
    });
  }, []);

  // 更新工具调用状态
  const updateToolCall = useCallback((messageId: string, toolCall: ToolCall) => {
    setStreamingMessages((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(messageId);
      if (existing) {
        const toolCalls = existing.toolCalls || [];
        const existingIndex = toolCalls.findIndex((tc) => tc.tool === toolCall.tool);

        const updatedToolCalls =
          existingIndex >= 0
            ? toolCalls.map((tc, idx) => (idx === existingIndex ? { ...tc, ...toolCall } : tc))
            : [...toolCalls, toolCall];

        newMap.set(messageId, {
          ...existing,
          toolCalls: updatedToolCalls,
        });
      } else {
        // 如果消息不存在，创建一个新的
        newMap.set(messageId, {
          messageId,
          content: '',
          isStreaming: true,
          isComplete: false,
          toolCalls: [toolCall],
        });
      }
      return newMap;
    });
  }, []);

  // 清除已完成的流式消息
  const clearStreamingMessage = useCallback((messageId: string) => {
    setStreamingMessages((prev) => {
      const newMap = new Map(prev);
      newMap.delete(messageId);
      return newMap;
    });
  }, []);

  // 订阅流式消息
  useEffect(() => {
    if (!conversationId) {
      return;
    }

    // 创建 Realtime Channel 订阅整个对话的消息
    const channelName = `conversation:${conversationId}:streaming`;
    const channel = supabase.channel(channelName);

    // 订阅消息块事件（文本）
    channel.on('broadcast', { event: 'message_chunk' }, (payload) => {
      const data = payload.payload as MessageChunkPayload;
      logger.debug('Received message chunk', {
        messageId: data.messageId,
        chunkLength: data.chunk.length,
        fullContentLength: data.fullContent.length,
      });

      updateStreamingMessage(data.messageId, data.fullContent, false);
    });

    // 订阅文件生成事件（多模态）
    channel.on('broadcast', { event: 'message_file' }, (payload) => {
      const data = payload.payload as MessageFilePayload;
      logger.debug('Received generated file', {
        messageId: data.messageId,
        fileType: data.file.type,
        mediaType: data.file.mediaType,
      });

      addFileToStreamingMessage(data.messageId, data.file);
    });

    // 订阅工具调用开始事件
    channel.on('broadcast', { event: 'tool_call_start' }, (payload) => {
      const data = payload.payload as ToolCallStartPayload;
      logger.debug('Tool call started', {
        messageId: data.messageId,
        tool: data.tool,
        args: data.args,
      });

      updateToolCall(data.messageId, {
        tool: data.tool,
        status: 'running',
        args: data.args,
      });
    });

    // 订阅工具调用结果事件
    channel.on('broadcast', { event: 'tool_call_result' }, (payload) => {
      const data = payload.payload as ToolCallResultPayload;
      logger.debug('Tool call result', {
        messageId: data.messageId,
        tool: data.tool,
        status: data.status,
      });

      updateToolCall(data.messageId, {
        tool: data.tool,
        status: data.status,
        result: data.result,
        error: data.error,
      });

      // 如果是图片生成成功，自动添加到文件列表
      if (data.status === 'success' && data.tool === 'generating_image' && data.result?.name) {
        addFileToStreamingMessage(data.messageId, {
          type: data.result.type,
          url: data.result.url,
          mediaType: data.result.type,
          name: data.result.name || 'generated-image.png',
          path: data.result.path,
        });
      }
    });

    // 订阅消息完成事件
    channel.on('broadcast', { event: 'message_complete' }, (payload) => {
      const data = payload.payload as MessageCompletePayload;
      logger.debug('Message streaming complete', {
        messageId: data.messageId,
        contentLength: data.fullContent.length,
        tokens: data.tokenCount,
        processingTime: data.processingTime,
        filesCount: data.files?.length || 0,
      });

      updateStreamingMessage(data.messageId, data.fullContent, true, data.files);

      // 3秒后清除流式消息状态（给数据库更新留出时间）
      setTimeout(() => {
        clearStreamingMessage(data.messageId);
      }, 3000);
    });

    // 订阅 channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Subscribed to streaming channel', { conversationId });
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('Failed to subscribe to streaming channel', { conversationId });
      }
    });

    channelRef.current = channel;

    // 清理函数
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        logger.info('Unsubscribed from streaming channel', { conversationId });
      }
    };
  }, [
    conversationId,
    supabase,
    updateStreamingMessage,
    addFileToStreamingMessage,
    updateToolCall,
    clearStreamingMessage,
  ]);

  return {
    streamingMessages,
    getStreamingMessage: (messageId: string) => streamingMessages.get(messageId),
  };
}
