/**
 * EditWithAgentDialog Component
 * 选择会话进行 MiniApp 编辑的对话框
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface EditWithAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  miniAppId: string;
  miniAppName: string;
}

export function EditWithAgentDialog({
  open,
  onOpenChange,
  miniAppId,
  miniAppName,
}: EditWithAgentDialogProps) {
  const t = useTranslations('miniapps');
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // 加载会话列表
  useEffect(() => {
    if (open) {
      loadConversations();
    }
  }, [open]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/conversations?limit=10');
      const result = await response.json();

      if (result.success) {
        setConversations(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新会话
  const handleCreateNew = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: t('useWithAgent', { name: miniAppName }),
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.id) {
        navigateToConversation(result.data.id);
      } else {
        toast.error(t('createSessionFailed'));
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error(t('createSessionFailed'));
    } finally {
      setCreating(false);
    }
  };

  // 选择已有会话
  const handleSelectConversation = (conversationId: string) => {
    navigateToConversation(conversationId);
  };

  // 跳转到会话详情页
  const navigateToConversation = (conversationId: string) => {
    const url = `/conversations/${conversationId}?workspace=apps&miniAppId=${miniAppId}`;
    router.push(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Chat with Agent</DialogTitle>
          <DialogDescription>
            {t('selectSessionForApp', { name: miniAppName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* 新建会话按钮 */}
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-3"
            onClick={handleCreateNew}
            disabled={creating}
          >
            <Plus className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">
                {creating ? t('creating') : t('newSession')}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('createSessionHint')}
              </div>
            </div>
          </Button>

          {/* 分隔线 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('orSelectExisting')}
              </span>
            </div>
          </div>

          {/* 会话列表 */}
          <ScrollArea className="h-[250px]">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t('noSessions')}
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {conv.title || t('unnamedSession')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
