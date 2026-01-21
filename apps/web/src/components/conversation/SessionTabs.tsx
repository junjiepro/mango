/**
 * Session Tabs Component
 * 会话标签页组件 - 用于切换 Mango 主会话和 ACP 会话
 */

'use client';

import { MessageSquare, Bot, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SessionTab } from '@/types/session.types';
import { useEffect } from 'react';

interface SessionTabsProps {
  sessions: SessionTab[];
  activeSessionId: string;
  onSessionChange: (sessionId: string) => void;
  onSessionClose: (sessionId: string) => void;
  onCreateACPSession: () => void;
}

export function SessionTabs({
  sessions,
  activeSessionId,
  onSessionChange,
  onSessionClose,
  onCreateACPSession,
}: SessionTabsProps) {
  useEffect(() => console.log('activeSessionId', activeSessionId), [activeSessionId]);
  return (
    <div className="flex items-center gap-2 border-b bg-muted/40 px-4">
      <Tabs value={activeSessionId} onValueChange={onSessionChange} className="flex-1">
        <TabsList className="h-12 bg-transparent">
          {sessions.map((session) => (
            <div key={session.id} className="relative group">
              <TabsTrigger
                value={session.id}
                className="gap-2 pr-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {session.type === 'mango' ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                <span className="max-w-[120px] truncate">{session.label}</span>
              </TabsTrigger>

              {/* 关闭按钮 - 只有非 Mango 主会话才能关闭 */}
              {session.type !== 'mango' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSessionClose(session.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </TabsList>
      </Tabs>

      {/* 创建 ACP 会话按钮 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onCreateACPSession}
        className="gap-2 flex-shrink-0"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">新建 ACP 会话</span>
      </Button>
    </div>
  );
}
