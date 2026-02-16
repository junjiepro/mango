/**
 * MiniAppTab Component
 * 工作区应用管理标签页
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package, History, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

interface MiniAppVersion {
  version: string;
  change_summary: string | null;
  created_at: string;
}

interface MiniAppTabProps {
  conversationId?: string;
  selectedMiniAppId?: string | null;
  onMiniAppSelect?: (miniAppId: string | null) => void;
  onMiniAppClick?: (miniApp: MiniApp, isOwner: boolean) => void;
  onCreateNew?: () => void;
}

export function MiniAppTab({
  conversationId,
  selectedMiniAppId,
  onMiniAppSelect,
  onMiniAppClick,
  onCreateNew,
}: MiniAppTabProps) {
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<MiniApp | null>(null);
  const [versions, setVersions] = useState<MiniAppVersion[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // 加载用户的 MiniApp 列表
  const loadMiniApps = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/miniapps?type=owned&limit=50');
      const result = await response.json();
      if (result.success) {
        setMiniApps(result.data);
        if (result.currentUserId) {
          setCurrentUserId(result.currentUserId);
        }
      }
    } catch (error) {
      console.error('Failed to load mini apps:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载版本历史
  const loadVersions = useCallback(async (miniAppId: string) => {
    try {
      const response = await fetch(`/api/miniapps/${miniAppId}/versions`);
      const result = await response.json();
      if (result.success) {
        setVersions(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    }
  }, []);

  useEffect(() => {
    loadMiniApps();
  }, [loadMiniApps]);

  useEffect(() => {
    if (selectedMiniAppId && miniApps.length > 0) {
      const app = miniApps.find(a => a.id === selectedMiniAppId);
      if (app) {
        setSelectedApp(app);
        loadVersions(app.id);
      }
    }
  }, [selectedMiniAppId, miniApps, loadVersions]);

  const handleSelectApp = (app: MiniApp) => {
    setSelectedApp(selectedApp?.id === app.id ? null : app);
    onMiniAppSelect?.(selectedApp?.id === app.id ? null : app.id);
    const isOwner = currentUserId ? app.creator_id === currentUserId : false;
    onMiniAppClick?.(app, isOwner);
    if (selectedApp?.id !== app.id) {
      loadVersions(app.id);
    }
  };

  // 空状态
  if (!loading && miniApps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-gray-400 mb-2">
          <Package className="w-16 h-16 mx-auto" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-gray-500">暂无应用</p>
        <p className="text-xs text-gray-400 mt-1">创建的小应用会显示在这里</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onCreateNew}
        >
          <Plus className="h-4 w-4 mr-1" />
          新建应用
        </Button>
      </div>
    );
  }

  // 加载状态
  if (loading) {
    return (
      <div className="space-y-0.5 p-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 p-2 animate-pulse">
            <div className="h-8 w-8 rounded bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-2 w-16 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-0.5 w-full min-w-0 p-2">
        {/* 新建应用按钮 */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 mb-2"
          onClick={onCreateNew}
        >
          <Plus className="h-4 w-4" />
          新建应用
        </Button>

        {miniApps.map((app) => {
          const isSelected = selectedApp?.id === app.id;
          return (
            <div key={app.id}>
              <button
                onClick={() => handleSelectApp(app)}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded text-left transition-colors',
                  isSelected
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
              >
                {app.icon_url ? (
                  <img
                    src={app.icon_url}
                    alt={app.display_name}
                    className="h-8 w-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{app.display_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    v{(app.manifest as any)?.version || '1.0.0'}
                  </p>
                </div>
              </button>

              {/* 展开的版本历史 */}
              {isSelected && versions.length > 0 && (
                <div className="ml-10 mt-1 mb-2 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                    <History className="h-3 w-3" />
                    <span>版本历史</span>
                  </div>
                  {versions.slice(0, 3).map((v) => (
                    <div
                      key={v.version}
                      className="px-2 py-1 text-xs text-muted-foreground"
                    >
                      <span className="font-mono">{v.version}</span>
                      <span className="mx-1">·</span>
                      <span>{new Date(v.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
