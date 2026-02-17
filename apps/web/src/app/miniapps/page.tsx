/**
 * MiniApp Gallery Page
 * T092: Create MiniApp gallery page
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppHeader } from '@/components/layouts/AppHeader';
import { MiniAppList } from '@/components/miniapp/MiniAppList';
import { EditWithAgentDialog } from '@/components/miniapp/EditWithAgentDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

export default function MiniAppsPage() {
  const t = useTranslations('miniapps');
  const tc = useTranslations('common');
  const router = useRouter();
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'public' | 'installed'>('public');

  // 卸载确认对话框状态
  const [uninstallDialog, setUninstallDialog] = useState<{
    open: boolean;
    miniApp: MiniApp | null;
    step: 'confirm' | 'clearData';
  }>({
    open: false,
    miniApp: null,
    step: 'confirm',
  });

  // Chat with Agent 对话框状态
  const [chatDialog, setChatDialog] = useState<{
    open: boolean;
    miniApp: MiniApp | null;
  }>({
    open: false,
    miniApp: null,
  });

  // 加载小应用列表
  useEffect(() => {
    loadMiniApps();
  }, [viewMode, searchQuery, selectedTags]);

  const loadMiniApps = async () => {
    setLoading(true);
    try {
      if (viewMode === 'installed') {
        // 加载用户创建的和已安装的小应用,并去重

        // 1. 加载用户创建的小应用
        const createdParams = new URLSearchParams({
          type: 'user',
          limit: '50',
        });

        if (searchQuery) {
          createdParams.append('search', searchQuery);
        }

        const createdResponse = await fetch(`/api/miniapps?${createdParams}`);
        const createdResult = await createdResponse.json();

        // 2. 加载已安装的小应用
        const installedResponse = await fetch('/api/miniapps/installations');
        const installedResult = await installedResponse.json();

        if (createdResult.success && installedResult.success) {
          // 提取已安装的小应用信息
          const installedApps = installedResult.data
            .map((inst: any) => inst.mini_app)
            .filter((app: any) => app !== null);

          // 创建一个 Map 用于去重,key 是小应用 ID
          const appsMap = new Map<string, MiniApp>();

          // 先添加用户创建的小应用
          createdResult.data.forEach((app: MiniApp) => {
            appsMap.set(app.id, app);
          });

          // 再添加已安装的小应用(如果已存在则不覆盖)
          installedApps.forEach((app: MiniApp) => {
            if (!appsMap.has(app.id)) {
              appsMap.set(app.id, app);
            }
          });

          // 转换为数组
          const mergedApps = Array.from(appsMap.values());
          setMiniApps(mergedApps);

          // 设置已安装的 ID 集合
          const ids = new Set<string>(installedResult.data.map((inst: any) => inst.mini_app_id));
          setInstalledIds(ids);
        }
      } else {
        // 加载公开的小应用
        const params = new URLSearchParams({
          type: 'public',
          limit: '50',
        });

        if (searchQuery) {
          params.append('search', searchQuery);
        }

        if (selectedTags.length > 0) {
          params.append('tags', selectedTags.join(','));
        }

        const response = await fetch(`/api/miniapps?${params}`);
        const result = await response.json();

        if (result.success) {
          setMiniApps(result.data);
        }

        // 同时加载已安装的ID列表
        await loadInstalledIds();
      }
    } catch (error) {
      console.error('Failed to load mini apps:', error);
      toast.error(t('loadFailed'), {
        description: t('loadFailedDesc'),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInstalledIds = async () => {
    try {
      const response = await fetch('/api/miniapps/installations');
      const result = await response.json();

      if (result.success) {
        const ids = new Set<string>(result.data.map((inst: any) => inst.mini_app_id));
        setInstalledIds(ids);
      }
    } catch (error) {
      console.error('Failed to load installed apps:', error);
    }
  };

  const handleInstall = async (miniApp: MiniApp, permissions: string[]) => {
    try {
      const response = await fetch(`/api/miniapps/${miniApp.id}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted_permissions: permissions }),
      });

      const result = await response.json();

      if (result.success) {
        setInstalledIds((prev) => new Set(prev).add(miniApp.id));
        toast.success(t('installSuccess'), {
          description: t('installSuccessDesc', { name: miniApp.display_name }),
        });
        loadMiniApps();
      } else {
        toast.error(t('installFailed'), {
          description: result.error || t('installFailedDesc'),
        });
      }
    } catch (error) {
      console.error('Failed to install mini app:', error);
      toast.error(t('installFailed'), {
        description: t('installFailedRetry'),
      });
    }
  };

  const handleUninstall = async (miniApp: MiniApp) => {
    // 打开卸载确认对话框
    setUninstallDialog({
      open: true,
      miniApp,
      step: 'confirm',
    });
  };

  const confirmUninstall = (e: React.MouseEvent) => {
    e.preventDefault();
    // 进入第二步：询问是否清空数据
    setUninstallDialog((prev) => ({
      ...prev,
      open: true,
      step: 'clearData',
    }));
  };

  const executeUninstall = async (clearData: boolean) => {
    const miniApp = uninstallDialog.miniApp;
    if (!miniApp) return;

    try {
      const url = clearData
        ? `/api/miniapps/${miniApp.id}/install?clearData=true`
        : `/api/miniapps/${miniApp.id}/install`;

      const response = await fetch(url, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setInstalledIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(miniApp.id);
          return newSet;
        });

        // 重新加载列表
        loadMiniApps();

        const message = clearData
          ? t('uninstallSuccessCleared')
          : t('uninstallSuccessKept');

        toast.success(t('uninstallSuccess'), {
          description: message,
        });
      } else {
        toast.error(t('uninstallFailed'), {
          description: result.error || t('uninstallFailedDesc'),
        });
      }
    } catch (error) {
      console.error('Failed to uninstall mini app:', error);
      toast.error(t('uninstallFailed'), {
        description: t('uninstallFailedRetry'),
      });
    } finally {
      // 关闭对话框
      setUninstallDialog({
        open: false,
        miniApp: null,
        step: 'confirm',
      });
    }
  };

  const handleOpen = (miniApp: MiniApp) => {
    router.push(`/miniapps/${miniApp.id}`);
  };

  const handleShare = async (miniApp: MiniApp) => {
    try {
      const response = await fetch(`/api/miniapps/${miniApp.id}/share`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        const shareUrl = `${window.location.origin}/miniapps/import/${result.data.shareToken}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t('shareLinkCopied'), {
          description: t('shareLinkCopiedDesc'),
        });
      } else {
        toast.error(t('shareGenFailed'), {
          description: result.error || t('shareGenFailedDesc'),
        });
      }
    } catch (error) {
      console.error('Failed to share mini app:', error);
      toast.error(t('shareFailed'), {
        description: t('shareFailedRetry'),
      });
    }
  };

  // 处理 Chat with Agent
  const handleChatWithAgent = (miniApp: MiniApp) => {
    setChatDialog({ open: true, miniApp });
  };

  return (
    <>
      <AppHeader />
      <div className="container mx-auto py-8 px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('page.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('page.description')}
          </p>
        </div>

        {/* 搜索和过滤 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              type="search"
              placeholder={t('page.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'public' ? 'default' : 'outline'}
              onClick={() => setViewMode('public')}
            >
              {t('page.discover')}
            </Button>
            <Button
              variant={viewMode === 'installed' ? 'default' : 'outline'}
              onClick={() => setViewMode('installed')}
            >
              {t('page.myApps')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadMiniApps()}
              disabled={loading}
              title={t('refreshList')}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* 小应用列表 */}
        <MiniAppList
          miniApps={miniApps}
          installedIds={installedIds}
          loading={loading}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          onOpen={handleOpen}
          onShare={handleShare}
          onChatWithAgent={handleChatWithAgent}
        />
      </div>

      {/* 卸载确认对话框 */}
      <AlertDialog
        open={uninstallDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setUninstallDialog({
              open: false,
              miniApp: null,
              step: 'confirm',
            });
          }
        }}
      >
        <AlertDialogContent>
          {uninstallDialog.step === 'confirm' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('confirmUninstall')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('confirmUninstallDesc', { name: uninstallDialog.miniApp?.display_name })}
                  <br />
                  <br />
                  {t('uninstallNote')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tc('actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={confirmUninstall}>{tc('actions.continue')}</AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('dataHandling')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('dataHandlingDesc', { name: uninstallDialog.miniApp?.display_name })}
                  <br />
                  <br />
                  <strong>{t('clearDataWarning')}</strong>{t('clearDataDesc')}
                  <br />
                  <strong>{t('keepDataNote')}</strong>{t('keepDataDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => executeUninstall(false)}>
                  {t('keepData')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => executeUninstall(true)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('clearData')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Chat with Agent 对话框 */}
      {chatDialog.miniApp && (
        <EditWithAgentDialog
          open={chatDialog.open}
          onOpenChange={(open) => setChatDialog({ ...chatDialog, open })}
          miniAppId={chatDialog.miniApp.id}
          miniAppName={chatDialog.miniApp.display_name}
        />
      )}
    </>
  );
}
