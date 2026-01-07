/**
 * useResourceSniffer Hook
 * 实时嗅探消息中的资源
 * User Story 5: 资源嗅探与管理
 */

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { ResourceDetector } from '@/lib/resource-detector';
import { smartRefreshAttachmentUrls, type AttachmentWithPath } from '@/lib/storage/attachment-utils';
import type { DetectedResource } from '@mango/shared/types/resource.types';

interface Message {
  id: string;
  content: string;
  created_at: string;
  attachments?: any[];
  metadata?: Record<string, any>;
}

export function useResourceSniffer(messages: Message[]) {
  const [resources, setResources] = useState<DetectedResource[]>([]);
  const [refreshedAttachmentsMap, setRefreshedAttachmentsMap] = useState<Map<string, any[]>>(
    new Map()
  );
  const detector = useMemo(() => new ResourceDetector(), []);

  // 从单个消息中提取所有资源
  const extractResourcesFromMessage = useCallback(
    (message: Message, refreshedAttachments?: any[]): DetectedResource[] => {
      const allResources: DetectedResource[] = [];

      // 1. 从 content 中检测资源（包括 code、链接等）
      const contentResources = detector.detect(message.content);
      contentResources.forEach((resource) => {
        allResources.push({
          ...resource,
          messageId: message.id,
          timestamp: message.created_at,
        });
      });

      // 2. 从 attachments 中提取文件资源（使用刷新后的附件）
      const attachmentsToUse = refreshedAttachments || message.attachments || [];
      if (attachmentsToUse.length > 0) {
        attachmentsToUse.forEach((attachment, index) => {
          // 获取 URL（刷新后的附件会有 url 或 publicUrl）
          const url = attachment.url || attachment.publicUrl || '';

          // 获取文件名（兼容多种字段名）
          const filename = attachment.name || attachment.fileName || 'attachment';

          // 获取 MIME 类型（兼容多种字段名）
          const mimeType =
            attachment.type ||
            attachment.fileType ||
            attachment.mediaType ||
            'application/octet-stream';

          // 判断是否为图片类型
          const isImage = mimeType.startsWith('image/');

          allResources.push({
            id: `${message.id}-attachment-${index}`,
            type: isImage ? 'image' : 'file',
            content: filename,
            metadata: {
              filename,
              size: attachment.size,
              mime_type: mimeType,
              url,
              src: url,
              alt: filename,
            },
            position: { start: 0, end: 0 },
            messageId: message.id,
            timestamp: message.created_at,
          });
        });
      }

      // 3. 从 metadata 中提取资源（A2UI、MiniApp 等）
      if (message.metadata) {
        // 检查 A2UI 组件
        if (message.metadata.a2ui) {
          allResources.push({
            id: `${message.id}-a2ui`,
            type: 'code',
            content: 'A2UI Component',
            metadata: {
              ...message.metadata.a2ui,
              isA2UI: true,
            },
            position: { start: 0, end: 0 },
            messageId: message.id,
            timestamp: message.created_at,
          });
        }

        // 检查 MiniApp - 支持多种格式
        const miniAppData = message.metadata.miniApp || message.metadata.miniapp;
        if (miniAppData) {
          allResources.push({
            id: `${message.id}-miniapp`,
            type: 'miniapp',
            content: miniAppData.name || miniAppData.miniAppName || 'MiniApp',
            metadata: {
              miniAppId: miniAppData.miniAppId,
              installationId: miniAppData.installationId,
              name: miniAppData.name || miniAppData.miniAppName,
              icon: miniAppData.icon || miniAppData.miniAppIcon,
              ...miniAppData,
            },
            position: { start: 0, end: 0 },
            messageId: message.id,
            timestamp: message.created_at,
          });
        }
      }

      return allResources;
    },
    [detector]
  );

  // 生成资源的唯一标识
  const generateUniqueKey = useCallback((resource: DetectedResource): string => {
    if (resource.type === 'miniapp') {
      return `miniapp:${resource.metadata?.installationId || resource.metadata?.miniAppId}`;
    } else if (resource.type === 'image') {
      return `image:${resource.metadata?.src}`;
    } else if (resource.type === 'code' || resource.type === 'html') {
      const contentHash = resource.content.substring(0, 100);
      return `code:${resource.metadata?.language}:${contentHash}`;
    } else if (resource.type === 'link') {
      return `link:${resource.content}`;
    } else if (resource.type === 'file') {
      return `file:${resource.metadata?.filename}`;
    } else {
      return `${resource.type}:${resource.content}`;
    }
  }, []);

  // 刷新消息附件的 URL
  useEffect(() => {
    const refreshAttachments = async () => {
      const newRefreshedMap = new Map<string, any[]>();

      for (const message of messages) {
        if (!message.attachments || message.attachments.length === 0) {
          continue;
        }

        // 检查是否已经刷新过
        if (refreshedAttachmentsMap.has(message.id)) {
          newRefreshedMap.set(message.id, refreshedAttachmentsMap.get(message.id)!);
          continue;
        }

        // 检查附件是否有 path 字段（需要刷新的标志）
        const hasPath = message.attachments.some((att: any) => att && att.path);
        if (!hasPath) {
          // 没有 path 字段，直接使用原始附件
          newRefreshedMap.set(message.id, message.attachments);
          continue;
        }

        try {
          const refreshed = await smartRefreshAttachmentUrls(
            message.attachments as AttachmentWithPath[],
            'attachments',
            86400, // 24小时
            3600 // 提前1小时刷新
          );
          newRefreshedMap.set(message.id, refreshed);
        } catch (error) {
          console.error('Failed to refresh attachment URLs:', error);
          newRefreshedMap.set(message.id, message.attachments);
        }
      }

      setRefreshedAttachmentsMap(newRefreshedMap);
    };

    refreshAttachments();
  }, [messages]);

  // 当刷新完成后，提取所有资源并去重
  useEffect(() => {
    const allResources: DetectedResource[] = [];

    messages.forEach((message) => {
      // 使用刷新后的附件
      const refreshedAttachments = refreshedAttachmentsMap.get(message.id);
      const messageResources = extractResourcesFromMessage(message, refreshedAttachments);
      allResources.push(...messageResources);
    });

    // 去重：合并相同资源，记录所有相关消息ID
    const uniqueMap = new Map<string, DetectedResource>();

    allResources.forEach((resource) => {
      const uniqueKey = generateUniqueKey(resource);

      if (uniqueMap.has(uniqueKey)) {
        const existing = uniqueMap.get(uniqueKey)!;
        // 合并消息ID列表
        if (!existing.messageIds) {
          existing.messageIds = [existing.messageId!];
        }
        if (resource.messageId && !existing.messageIds.includes(resource.messageId)) {
          existing.messageIds.push(resource.messageId);
        }
        // 更新出现次数
        existing.occurrences = (existing.occurrences || 1) + 1;
        // 保留最新的时间戳
        if (
          resource.timestamp &&
          (!existing.timestamp || new Date(resource.timestamp) > new Date(existing.timestamp))
        ) {
          existing.timestamp = resource.timestamp;
        }
      } else {
        // 首次出现，初始化字段
        uniqueMap.set(uniqueKey, {
          ...resource,
          messageIds: [resource.messageId!],
          occurrences: 1,
        });
      }
    });

    setResources(Array.from(uniqueMap.values()));
  }, [messages, refreshedAttachmentsMap, extractResourcesFromMessage, generateUniqueKey]);

  return {
    resources,
  };
}
