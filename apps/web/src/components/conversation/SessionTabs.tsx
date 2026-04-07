/**
 * Session Tabs Component
 * 会话标签页组件 - 紧凑型设计，用于切换 Mango 主会话和 ACP 会话
 */

'use client';

import { useTranslations } from 'next-intl';
import { MessageSquare, Bot, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SessionTab } from '@/types/session.types';

interface SessionTabsProps {
  sessions: SessionTab[];
  activeSessionId: string;
  onSessionChange: (sessionId: string) => void;
  onSessionClose: (sessionId: string) => void | Promise<void>;
  onCreateACPSession: () => void;
  className?: string;
  compact?: boolean;
  disableCreateSession?: boolean;
}

export function SessionTabs({
  sessions,
  activeSessionId,
  onSessionChange,
  onSessionClose,
  onCreateACPSession,
  className,
  compact = false,
  disableCreateSession = false,
}: SessionTabsProps) {
  const t = useTranslations('conversations');
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* 会话标签 */}
      <div className="flex items-center gap-0.5">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const isRunning =
            session.runningStatus === 'streaming' || session.runningStatus === 'submitted';
          return (
            <div key={session.id} className="relative group flex items-center">
              <button
                onClick={() => onSessionChange(session.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm transition-all',
                  compact ? 'h-7' : 'h-8',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {/* 图标：运行中显示加载动画，否则显示类型图标 */}
                {isRunning && !isActive ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : session.type === 'mango' ? (
                  <MessageSquare className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
                <span className={cn('truncate', compact ? 'max-w-[80px]' : 'max-w-[100px]')}>
                  {session.label}
                </span>
              </button>

              {/* 关闭按钮 - 只有非 Mango 主会话才能关闭 */}
              {session.type !== 'mango' && (
                <button
                  className={cn(
                    'ml-0.5 p-0.5 rounded hover:bg-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-opacity',
                    isActive && 'hover:bg-primary-foreground/20'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    Promise.resolve(onSessionClose(session.id)).catch((error) => {
                      console.error('Failed to close session:', error);
                    });
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 创建 ACP 会话按钮 */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onCreateACPSession}
        disabled={disableCreateSession}
        className={cn('flex-shrink-0', compact ? 'h-7 w-7' : 'h-8 w-8')}
        title={disableCreateSession ? t('sessionTabs.selectDeviceFirst') : t('sessionTabs.newACPSession')}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
