/**
 * InteractPanel Component
 * 交互模式面板 - 通过 MCP 资源发现加载 HTML iframe 渲染
 *
 * 重构：
 * - 统一为 HTML iframe 单一渲染路径
 * - 通过 findHtmlResource() 通用资源发现，支持第三方 MCP ext-app
 * - 工具调用后通过 AppBridge.sendToolResult() 推送结果到 View
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Loader2, RefreshCw, AlertCircle, Terminal, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiniAppMCPClient } from '@/services/MiniAppMCPClient';
import { MiniAppContainer } from '@/components/miniapp/MiniAppContainer';
import type { MiniAppContainerRef } from '@/components/miniapp/MiniAppContainer';
import { DebugConsole } from '@/components/workspace/DebugConsole';
import { createClient } from '@/lib/supabase/client';
import type { HostContext, ConsoleEntry } from '@/lib/miniapp/types';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

interface InteractPanelProps {
  miniAppId: string;
}

type RenderMode = 'html' | 'none';

export function InteractPanel({ miniAppId }: InteractPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>('none');
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [resourceCsp, setResourceCsp] = useState<Record<string, unknown> | undefined>(undefined);
  const [miniApp, setMiniApp] = useState<MiniApp | null>(null);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const clientRef = useRef<MiniAppMCPClient | null>(null);
  const containerRef = useRef<MiniAppContainerRef>(null);
  const { resolvedTheme } = useTheme();

  const handleConsole = useCallback((entry: ConsoleEntry) => {
    setConsoleEntries(prev => [...prev, entry].slice(-500));
  }, []);

  const handleClearConsole = useCallback(() => {
    setConsoleEntries([]);
  }, []);

  const handleSendToAgent = useCallback((content: string) => {
    // 通过 AppBridge 的 sendMessage 将日志发送到对话
    containerRef.current?.bridge?.sendMessage?.('user', content);
  }, []);

  // 构建 Host 上下文（稳定引用，避免每次渲染创建新对象触发 MiniAppContainer useEffect）
  const hostContext = useMemo<HostContext>(() => ({
    theme: (resolvedTheme === 'dark' ? 'dark' : 'light'),
    locale: typeof navigator !== 'undefined' ? navigator.language : 'zh-CN',
  }), [resolvedTheme]);

  const handleError = useCallback((err: Error) => {
    console.error('InteractPanel error:', err);
  }, []);

  // 主题变化时推送给 View
  useEffect(() => {
    containerRef.current?.setHostContext(hostContext);
  }, [resolvedTheme]);

  // 初始化 MCP 客户端并检测渲染模式
  const initialize = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const client = new MiniAppMCPClient(miniAppId, token);
      clientRef.current = client;

      await client.initialize();

      // 加载 MiniApp 数据（用于 HTML 渲染模式）
      const appRes = await fetch(`/api/miniapps/${miniAppId}`);
      const appData = await appRes.json();
      if (appData.success) {
        setMiniApp(appData.data);
      }

      // 通过 findHtmlResource() 发现 HTML 资源（支持任意 MCP ext-app）
      const htmlResource = await client.findHtmlResource();

      if (htmlResource) {
        const res = await client.readResource(htmlResource.uri);
        if (res) {
          setHtmlContent(res.text);
          const uiMeta = res._meta?.ui as Record<string, unknown> | undefined;
          if (uiMeta?.csp) {
            setResourceCsp(uiMeta.csp as Record<string, unknown>);
          }
        }
        setRenderMode('html');
      } else {
        setRenderMode('none');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败');
    } finally {
      setLoading(false);
    }
  }, [miniAppId]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // 工具调用后推送结果到 HTML View
  const handleToolCall = useCallback(
    async (tool: string, args: Record<string, unknown>) => {
      const client = clientRef.current;
      if (!client) return;

      try {
        const result = await client.callTool(tool, args);

        // 通过 AppBridge 推送结果到 HTML View
        if (containerRef.current) {
          containerRef.current.sendToolResult({
            content: [{ type: 'text', text: JSON.stringify(result) }],
            structuredContent: result as Record<string, unknown>,
          });
        }

        return result;
      } catch (err) {
        console.error('Tool call failed:', err);
        throw err;
      }
    },
    [],
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">正在加载交互界面...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={initialize}>
          <RefreshCw className="h-4 w-4 mr-1" />
          重试
        </Button>
      </div>
    );
  }

  // HTML iframe 渲染模式
  if (renderMode === 'html' && miniApp) {
    return (
      <div className="flex flex-col h-full">
        {/* 交互界面：占满剩余空间 */}
        <div className="flex-1 min-h-0">
          <MiniAppContainer
            ref={containerRef}
            miniApp={miniApp}
            mcpClient={clientRef.current}
            hostContext={hostContext}
            htmlContent={htmlContent ?? undefined}
            cspConfig={resourceCsp as import('@/lib/miniapp/types').CSPConfig | undefined}
            onError={handleError}
            onConsole={handleConsole}
          />
        </div>

        {/* 控制台：底部固定，默认折叠 */}
        <div className="shrink-0 border-t">
          <button
            onClick={() => setConsoleOpen(prev => !prev)}
            className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>控制台</span>
            {consoleEntries.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] leading-none">
                {consoleEntries.length}
              </span>
            )}
            <span className="ml-auto">
              {consoleOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </span>
          </button>
          {consoleOpen && (
            <div className="h-48 border-t">
              <DebugConsole
                entries={consoleEntries}
                onClear={handleClearConsole}
                onSendToAgent={handleSendToAgent}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 无 UI 内容
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
      <p className="text-sm">此应用未提供交互界面</p>
      <p className="text-xs">应用需要注册 HTML 类型的 UI 资源</p>
    </div>
  );
}
