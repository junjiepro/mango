/**
 * MiniApp Window Component
 * 提供完整的 MiniApp 窗口，包括标题栏和内容区域
 *
 * 重构：废弃 SecureMessage switch-case 分发
 * API 请求通过 AppBridge 自动转发到 MCP Server
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { MiniAppContainer } from './MiniAppContainer';
import type { MiniAppContainerRef } from './MiniAppContainer';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiniAppMCPClient } from '@/services/MiniAppMCPClient';
import { createClient } from '@/lib/supabase/client';
import type { HostContext, CSPConfig } from '@/lib/miniapp/types';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

interface MiniAppWindowProps {
  miniApp: MiniApp;
  onClose?: () => void;
  /** View 请求向对话发送消息 */
  onSendMessage?: (role: string, content: string) => void;
  className?: string;
}

/**
 * MiniAppWindow 组件
 * 提供完整的 MiniApp 运行环境
 * 通过 MCP Client + AppBridge 自动处理所有 API 请求
 */
export function MiniAppWindow({ miniApp, onClose, onSendMessage, className }: MiniAppWindowProps) {
  const tc = useTranslations('common');
  const [refreshKey, setRefreshKey] = useState(0);
  const [mcpClient, setMcpClient] = useState<MiniAppMCPClient | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | undefined>(undefined);
  const [cspConfig, setCspConfig] = useState<CSPConfig | undefined>(undefined);
  const containerRef = useRef<MiniAppContainerRef>(null);
  const { resolvedTheme } = useTheme();

  // 构建 Host 上下文（主题、语言等）
  const hostContext: HostContext = {
    theme: (resolvedTheme === 'dark' ? 'dark' : 'light'),
    locale: typeof navigator !== 'undefined' ? navigator.language : 'zh-CN',
  };

  // 主题变化时推送给 View
  useEffect(() => {
    containerRef.current?.setHostContext(hostContext);
  }, [resolvedTheme]);

  // 初始化 MCP Client
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const client = new MiniAppMCPClient(miniApp.id, token);
        await client.initialize();

        if (!cancelled) {
          setMcpClient(client);

          // 通过通用资源发现加载 HTML UI（支持第三方 MCP ext-app）
          try {
            const htmlResource = await client.findHtmlResource();
            if (!cancelled && htmlResource) {
              const uiResource = await client.readResource(htmlResource.uri);
              if (!cancelled && uiResource?.text) {
                setHtmlContent(uiResource.text);
                const uiCsp = (uiResource._meta?.ui as Record<string, unknown>)?.csp as CSPConfig | undefined;
                if (uiCsp) {
                  setCspConfig(uiCsp);
                }
              }
            }
          } catch (uiErr) {
            console.warn('Failed to read UI resource, using default template:', uiErr);
          }
        }
      } catch (err) {
        console.error('MCP Client init failed:', err);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [miniApp.id, refreshKey]);

  const handleRefresh = () => {
    setMcpClient(null);
    setHtmlContent(undefined);
    setCspConfig(undefined);
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-background border rounded-lg shadow-lg overflow-hidden',
        'w-full h-[600px]',
        className,
      )}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
        <div className="flex items-center gap-2">
          {miniApp.icon_url && (
            <img
              src={miniApp.icon_url}
              alt={miniApp.display_name}
              className="w-5 h-5 rounded"
            />
          )}
          <span className="font-medium text-sm">{miniApp.display_name}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            className="h-7 w-7 p-0 mr-6"
            title={tc('actions.refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        <MiniAppContainer
          key={refreshKey}
          ref={containerRef}
          miniApp={miniApp}
          mcpClient={mcpClient}
          htmlContent={htmlContent}
          cspConfig={cspConfig}
          hostContext={hostContext}
          onSendMessage={onSendMessage}
          onError={(error) => {
            console.error('MiniApp error:', error);
          }}
        />
      </div>
    </div>
  );
}
