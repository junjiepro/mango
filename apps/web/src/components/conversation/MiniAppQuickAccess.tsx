/**
 * MiniAppQuickAccess Component
 * 在输入框上方显示历史消息中提及的所有 MiniApp，方便快速访问
 */

'use client';

import React, { useMemo } from 'react';
import { MiniAppReference } from './MiniAppReference';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database.types';

type Message = Database['public']['Tables']['messages']['Row'];
type MiniApp = Database['public']['Tables']['mini_apps']['Row'];
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row'];

interface MiniAppQuickAccessProps {
  messages: Message[];
  installations?: any[];
  onOpenMiniApp?: (miniApp: MiniApp, installation: MiniAppInstallation) => void;
  onClose?: () => void;
  className?: string;
}

interface MiniAppRef {
  miniAppId: string;
  installationId: string;
  messageCount: number;
  lastMentionedAt: string;
  miniApp?: MiniApp;
  installation?: MiniAppInstallation;
}

/**
 * MiniAppQuickAccess 组件
 * 从历史消息中提取所有 MiniApp 引用，显示为快速访问栏
 */
export function MiniAppQuickAccess({
  messages,
  installations,
  onOpenMiniApp,
  onClose,
  className,
}: MiniAppQuickAccessProps) {
  // 从所有消息中提取并去重 MiniApp 引用
  const miniAppRefs = useMemo(() => {
    const refMap = new Map<string, MiniAppRef>();
    const installationMap = new Map<string, any>();

    if (installations) {
      installations.forEach((install) => {
        installationMap.set(install.id, install);
      });
    }

    messages.forEach((message) => {
      const metadata = message.metadata as any;
      if (!metadata || !metadata.miniApp) {
        return;
      }

      const key = metadata.miniApp.installationId || metadata.miniApp.miniAppId;
      if (!key) return;

      if (refMap.has(key)) {
        const existing = refMap.get(key)!;
        existing.messageCount += 1;
        // 更新最后提及时间（取最新的）
        if (
          message.created_at &&
          new Date(message.created_at) > new Date(existing.lastMentionedAt)
        ) {
          existing.lastMentionedAt = message.created_at;
        }
      } else {
        refMap.set(key, {
          miniAppId: metadata.miniApp.miniAppId,
          installationId: metadata.miniApp.installationId,
          messageCount: 1,
          lastMentionedAt: message.created_at || '',
          installation: installationMap.get(metadata.miniApp.installationId),
          miniApp: installationMap.get(metadata.miniApp.installationId)?.mini_app,
        });
      }
    });

    // 转换为数组并按最后提及时间排序
    return Array.from(refMap.values())
      .filter((ref) => ref.miniApp && ref.installation)
      .sort(
        (a, b) => new Date(b.lastMentionedAt).getTime() - new Date(a.lastMentionedAt).getTime()
      );
  }, [messages, installations]);

  // 如果没有 MiniApp 引用，不显示
  if (miniAppRefs.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2', className)}>
      {/* 标题 */}
      <div className="flex items-center gap-2 text-sm font-medium text-purple-900 dark:text-purple-100 flex-shrink-0">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <span>对话中的小应用</span>
      </div>

      {/* MiniApp 列表 - 横向滚动 */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex items-center gap-2">
          {miniAppRefs.map(
            (ref, index) =>
              ref.miniApp &&
              ref.installation && (
                <div key={index} className="flex-shrink-0">
                  <MiniAppReference
                    miniApp={ref.miniApp}
                    installation={ref.installation}
                    onOpen={onOpenMiniApp}
                    compact
                  />
                </div>
              )
          )}
        </div>
      </div>
    </div>
  );
}
