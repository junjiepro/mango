/**
 * MiniApp Import Page
 * T100: Create MiniApp import from share link
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PermissionDialog } from '@/components/miniapp/PermissionDialog';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

export default function MiniAppImportPage() {
  const params = useParams();
  const router = useRouter();
  const shareToken = params.shareToken as string;

  const [miniApp, setMiniApp] = useState<MiniApp | null>(null);
  const [shareLink, setShareLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    loadMiniApp();
  }, [shareToken]);

  const loadMiniApp = async () => {
    try {
      const response = await fetch(`/api/miniapps/share/${shareToken}`);
      const result = await response.json();

      if (result.success) {
        setMiniApp(result.data.mini_app);
        setShareLink(result.data.share_link);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Failed to load mini app:', error);
      setError('Failed to load mini app');
    } finally {
      setLoading(false);
    }
  };

  const handleInstallClick = () => {
    const manifest = (miniApp?.manifest as any) || {};
    const requiredPermissions = manifest.required_permissions || [];

    if (requiredPermissions.length > 0) {
      setShowPermissionDialog(true);
    } else {
      handleInstall([]);
    }
  };

  const handleInstall = async (grantedPermissions: string[]) => {
    setInstalling(true);
    try {
      const response = await fetch(`/api/miniapps/share/${shareToken}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted_permissions: grantedPermissions }),
      });

      const result = await response.json();

      if (result.success) {
        alert('Mini app installed successfully!');
        router.push(`/miniapps/${miniApp?.id}`);
      } else {
        alert(`Failed to install: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to install mini app:', error);
      alert('Failed to install mini app');
    } finally {
      setInstalling(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="rounded-lg border bg-card p-8">
          <div className="flex items-start gap-4 mb-6">
            <Skeleton className="h-16 w-16 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error || !miniApp) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-destructive">Error</h2>
          <p className="text-muted-foreground mt-2">{error || 'Mini app not found'}</p>
          <Button onClick={() => router.push('/miniapps')} className="mt-4">
            Go to Gallery
          </Button>
        </div>
      </div>
    );
  }

  const stats = (miniApp.stats as any) || {};
  const manifest = (miniApp.manifest as any) || {};

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Install Mini App</h1>
        <p className="text-muted-foreground mt-2">
          You&apos;ve been invited to install this mini app
        </p>
      </div>

      {/* 小应用信息卡片 */}
      <div className="rounded-lg border bg-card p-8 shadow-sm">
        {/* 图标和基本信息 */}
        <div className="flex items-start gap-4 mb-6">
          {miniApp.icon_url ? (
            <img
              src={miniApp.icon_url}
              alt={miniApp.display_name}
              className="h-16 w-16 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          )}

          <div className="flex-1">
            <h2 className="text-2xl font-bold">{miniApp.display_name}</h2>
            <p className="text-muted-foreground mt-2">{miniApp.description}</p>
          </div>
        </div>

        {/* 标签 */}
        {miniApp.tags && miniApp.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {miniApp.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 统计信息 */}
        <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span>{stats.active_users || 0} users</span>
          </div>

          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>{stats.install_count || 0} installs</span>
          </div>

          {stats.avg_rating > 0 && (
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 fill-yellow-400" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>{stats.avg_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* 权限信息 */}
        {manifest.required_permissions && manifest.required_permissions.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-muted">
            <h3 className="font-semibold mb-2">Required Permissions</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {manifest.required_permissions.map((perm: string) => (
                <li key={perm} className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {perm}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 分享链接信息 */}
        {shareLink && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 text-sm">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                {shareLink.expires_at
                  ? `This link expires on ${new Date(shareLink.expires_at).toLocaleDateString()}`
                  : 'This link does not expire'}
              </span>
            </div>
          </div>
        )}

        {/* 安装按钮 */}
        <Button onClick={handleInstallClick} disabled={installing} className="w-full" size="lg">
          {installing ? 'Installing...' : 'Install Mini App'}
        </Button>
      </div>

      {/* 权限对话框 */}
      {miniApp && (
        <PermissionDialog
          open={showPermissionDialog}
          onOpenChange={setShowPermissionDialog}
          miniAppName={miniApp.display_name}
          requiredPermissions={manifest.required_permissions || []}
          onApprove={handleInstall}
          onDeny={() => setShowPermissionDialog(false)}
        />
      )}
    </div>
  );
}
