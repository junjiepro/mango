/**
 * MiniAppManager Component
 * 工作区应用管理组件 - 显示用户 MiniApp 列表和详情
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Package, Code, RefreshCw, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

interface MiniAppVersion {
  version: string;
  change_summary: string | null;
  created_at: string;
}

interface MiniAppManagerProps {
  conversationId?: string;
  selectedMiniAppId?: string | null;
  onMiniAppSelect?: (miniAppId: string | null) => void;
  onEditWithAgent?: (miniAppId: string) => void;
}

export function MiniAppManager({
  conversationId,
  selectedMiniAppId,
  onMiniAppSelect,
  onEditWithAgent,
}: MiniAppManagerProps) {
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<MiniApp | null>(null);
  const [versions, setVersions] = useState<MiniAppVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
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
      toast.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载版本历史
  const loadVersions = useCallback(async (miniAppId: string) => {
    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/miniapps/${miniAppId}/versions`);
      const result = await response.json();

      if (result.success) {
        setVersions(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadMiniApps();
  }, [loadMiniApps]);

  // 处理外部选中的 MiniApp
  useEffect(() => {
    if (selectedMiniAppId && miniApps.length > 0) {
      const app = miniApps.find(a => a.id === selectedMiniAppId);
      if (app) {
        setSelectedApp(app);
        loadVersions(app.id);
      }
    }
  }, [selectedMiniAppId, miniApps, loadVersions]);

  // 选择 MiniApp
  const handleSelectApp = (app: MiniApp) => {
    setSelectedApp(app);
    onMiniAppSelect?.(app.id);
    loadVersions(app.id);
  };

  // 渲染 MiniApp 列表项
  const renderAppItem = (app: MiniApp) => {
    const isSelected = selectedApp?.id === app.id;
    const isAppOwner = currentUserId ? app.creator_id === currentUserId : false;

    return (
      <button
        key={app.id}
        onClick={() => handleSelectApp(app)}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-transparent hover:bg-accent'
        )}
      >
        {app.icon_url ? (
          <img
            src={app.icon_url}
            alt={app.display_name}
            className="h-8 w-8 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Package className="h-4 w-4" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-sm truncate">{app.display_name}</h3>
            {!isAppOwner && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                已安装
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            v{(app.manifest as any)?.version || '1.0.0'}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* 列表 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-3 border-b flex items-center justify-between shrink-0">
          <h3 className="font-medium text-sm">我的应用</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={loadMiniApps}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </>
            ) : miniApps.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                暂无应用
              </div>
            ) : (
              miniApps.map(renderAppItem)
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 详情面板 - 选中应用时显示 */}
      {selectedApp && (
        <div className="border-t flex flex-col max-h-[50%]">
          {/* 应用信息 */}
          <div className="p-3 border-b shrink-0">
            <div className="flex items-center gap-2">
              {selectedApp.icon_url ? (
                <img
                  src={selectedApp.icon_url}
                  alt={selectedApp.display_name}
                  className="h-8 w-8 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Package className="h-4 w-4" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-sm truncate">{selectedApp.display_name}</h2>
                <p className="text-xs text-muted-foreground truncate">{selectedApp.description}</p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2 mt-3">
              {currentUserId && selectedApp.creator_id === currentUserId ? (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => onEditWithAgent?.(selectedApp.id)}
                >
                  <Code className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => onEditWithAgent?.(selectedApp.id)}
                >
                  <Code className="h-3 w-3 mr-1" />
                  查看
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => loadVersions(selectedApp.id)}
              >
                <History className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* 版本历史 */}
          {versions.length > 0 && (
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
                <h3 className="font-medium text-xs text-muted-foreground">版本历史</h3>
                {versions.slice(0, 5).map((v) => (
                  <div
                    key={v.version}
                    className="p-2 rounded bg-muted/50 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{v.version}</span>
                      <span className="text-muted-foreground">
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {v.change_summary && (
                      <p className="text-muted-foreground mt-1 truncate">
                        {v.change_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}
