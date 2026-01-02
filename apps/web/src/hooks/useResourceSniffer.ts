/**
 * useResourceSniffer Hook
 * 实时嗅探消息中的资源
 * User Story 5: 资源嗅探与管理
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { ResourceDetector } from '@/lib/resource-detector';
import type { DetectedResource } from '@mango/shared/types/resource.types';

interface UseResourceSnifferOptions {
  conversationId: string;
  enabled?: boolean;
}

export function useResourceSniffer({ conversationId, enabled = true }: UseResourceSnifferOptions) {
  const [resources, setResources] = useState<DetectedResource[]>([]);
  const [detector] = useState(() => new ResourceDetector());

  const sniffMessage = useCallback((message: { id: string; content: string; created_at: string }) => {
    if (!enabled) return;

    const detected = detector.detect(message.content);

    setResources(prev => {
      const newResources = [...prev];
      for (const resource of detected) {
        // 避免重复添加
        if (!newResources.some(r => r.content === resource.content && r.type === resource.type)) {
          newResources.push({
            ...resource,
            messageId: message.id,
            timestamp: message.created_at,
          });
        }
      }
      return newResources;
    });
  }, [detector, enabled]);

  const clearResources = useCallback(() => {
    setResources([]);
  }, []);

  return {
    resources,
    sniffMessage,
    clearResources,
  };
}
