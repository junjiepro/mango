/**
 * MiniApp Detail Page
 * 交互模式 - 通过 MCP 资源发现加载 HTML iframe 渲染，工具调用通过 AppBridge 转发
 */

'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { AppHeader } from '@/components/layouts/AppHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, RefreshCw, Loader2, AlertCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { MiniAppMCPClient } from '@/services/MiniAppMCPClient';
import { MiniAppContainer } from '@/components/miniapp/MiniAppContainer';
import type { MiniAppContainerRef } from '@/components/miniapp/MiniAppContainer';
import type { HostContext } from '@/lib/miniapp/types';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

export default function MiniAppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const miniAppId = params.id as string;
  const clientRef = useRef<MiniAppMCPClient | null>(null);
  const containerRef = useRef<MiniAppContainerRef>(null);
  const { resolvedTheme } = useTheme();

  const [miniApp, setMiniApp] = useState<MiniApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [installing, setInstalling] = useState(false);
  const [uiLoading, setUiLoading] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);

  const hostContext: HostContext = {
    theme: (resolvedTheme === 'dark' ? 'dark' : 'light'),
    locale: typeof navigator !== 'undefined' ? navigator.language : 'zh-CN',
  };

  useEffect(() => {
    loadMiniApp();
    loadInstallation();
  }, [miniAppId]);

  const loadMiniApp = async () => {
    try {
      const response = await fetch(`/api/miniapps/${miniAppId}`);
      const result = await response.json();

      if (result.success) {
        setMiniApp(result.data);
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

  const loadInstallation = async () => {
    try {
      const response = await fetch(`/api/miniapps/${miniAppId}/install`);
      const result = await response.json();
      setInstalled(result.success && !!result.data);
    } catch {
      setInstalled(false);
    }
  };
  const initializeMCP = useCallback(async () => {
    setUiLoading(true);
    setUiError(null);

    try {
      const client = new MiniAppMCPClient(miniAppId);
      clientRef.current = client;

      await client.initialize();

      // 通用资源发现：查找 HTML 类型资源
      const htmlResource = await client.findHtmlResource();
      if (htmlResource) {
        const res = await client.readResource(htmlResource.uri);
        if (res?.text) {
          setHtmlContent(res.text);
        }
      }
    } catch (err) {
      setUiError(err instanceof Error ? err.message : 'MCP 初始化失败');
    } finally {
      setUiLoading(false);
    }
  }, [miniAppId]);

  // 已安装后初始化 MCP
  useEffect(() => {
    if (miniApp && installed) {
      initializeMCP();
    }
  }, [miniApp, installed, initializeMCP]);

  // 安装应用
  const handleInstall = async () => {
    if (!miniApp) return;
    setInstalling(true);
    try {
      const manifest = miniApp.manifest as any || {};
      const permissions = manifest.required_permissions || [];
      const response = await fetch(`/api/miniapps/${miniAppId}/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted_permissions: permissions }),
      });
      const result = await response.json();
      if (result.success) {
        setInstalled(true);
        toast.success('安装成功', {
          description: `${miniApp.display_name} 已成功安装`,
        });
      } else {
        toast.error('安装失败', {
          description: result.error || '安装小应用时出现错误',
        });
      }
    } catch {
      toast.error('安装失败', { description: '无法安装小应用，请稍后重试' });
    } finally {
      setInstalling(false);
    }
  };

  if (loading || installed === null) {
    return (
      <>
        <AppHeader />
        <div className="container mx-auto py-8 px-4">
          <div className="mb-6">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </>
    );
  }

  if (error || !miniApp) {
    return (
      <>
        <AppHeader />
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-destructive">Error</h2>
            <p className="text-muted-foreground mt-2">{error || 'Mini app not found'}</p>
            <Button onClick={() => router.push('/miniapps')} className="mt-4">
              Back to Gallery
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (!installed) {
    return (
      <>
        <AppHeader />
        <div className="container mx-auto py-8 px-4">
          <div className="mb-6 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/miniapps')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{miniApp.display_name}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {miniApp.description}
              </p>
            </div>
          </div>
          <div className="text-center py-16">
            <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">尚未安装此应用</h2>
            <p className="text-muted-foreground text-sm mb-6">
              安装后即可使用交互功能
            </p>
            <Button onClick={handleInstall} disabled={installing}>
              {installing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  安装中...
                </>
              ) : (
                'Install'
              )}
            </Button>
          </div>
        </div>
      </>
    );
  }

  // 渲染交互区域内容
  const renderInteractContent = () => {
    if (uiLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">正在加载交互界面...</p>
        </div>
      );
    }

    if (uiError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{uiError}</p>
          <Button variant="outline" size="sm" onClick={initializeMCP}>
            <RefreshCw className="h-4 w-4 mr-1" />
            重试
          </Button>
        </div>
      );
    }

    if (!htmlContent) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
          <p className="text-sm">此应用未提供交互界面</p>
          <p className="text-xs">应用需要注册 HTML 类型的 UI 资源</p>
        </div>
      );
    }

    return (
      <div className="h-full overflow-hidden">
        <MiniAppContainer
          ref={containerRef}
          miniApp={miniApp!}
          mcpClient={clientRef.current}
          hostContext={hostContext}
          htmlContent={htmlContent}
          onError={(err) => console.error('MiniApp error:', err)}
        />
      </div>
    );
  };

  return (
    <>
      <AppHeader />
      <div className="container mx-auto py-8 px-4">
        {/* 页面标题 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/miniapps')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{miniApp.display_name}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {miniApp.description}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={initializeMCP}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
        </div>

        {/* 交互区域 */}
        <div
          className="rounded-lg border bg-card shadow-sm overflow-hidden"
          style={{ height: 'calc(100vh - 240px)' }}
        >
          {renderInteractContent()}
        </div>
      </div>
    </>
  );
}
