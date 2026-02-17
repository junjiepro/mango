/**
 * MiniApp Container Component
 * 提供安全的 iframe 沙箱环境来运行小应用
 *
 * 重构：废弃 SecureMessage 协议，统一使用 JSON-RPC + AppBridge
 * 对标 MCP Apps 规范
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { AppBridge } from '@/lib/miniapp/app-bridge';
import { buildCSP } from '@/lib/miniapp/csp-builder';
import { generateViewSDKScript } from '@/lib/miniapp/view-sdk';
import type { HostContext, CSPConfig, ToolResult, ConsoleEntry } from '@/lib/miniapp/types';
import type { MiniAppMCPClient } from '@/services/MiniAppMCPClient';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];

interface MiniAppContainerProps {
  miniApp: MiniApp;
  mcpClient?: MiniAppMCPClient | null;
  className?: string;
  hostContext?: HostContext;
  cspConfig?: CSPConfig;
  /** 从 MCP 资源 URI 动态加载的 HTML 内容 */
  htmlContent?: string;
  /** 独立 origin 模式：为 App 提供独立域名隔离 */
  sandboxOrigin?: string;
  onError?: (error: Error) => void;
  onInitialized?: () => void;
  onSizeChange?: (size: { width?: number; height?: number }) => void;
  /** View 请求打开外部链接 */
  onOpenLink?: (url: string) => void;
  /** View 请求向对话发送消息 */
  onSendMessage?: (role: string, content: string) => void;
  /** iframe 内 console/错误日志回调 */
  onConsole?: (entry: ConsoleEntry) => void;
}

export interface MiniAppContainerRef {
  bridge: AppBridge | null;
  sendToolResult: (result: ToolResult) => void;
  sendToolInput: (args: Record<string, unknown>) => void;
  setHostContext: (ctx: HostContext) => void;
}

export const MiniAppContainer = React.forwardRef<MiniAppContainerRef, MiniAppContainerProps>(
  ({ miniApp, mcpClient, className, hostContext, cspConfig, htmlContent: htmlContentProp, sandboxOrigin, onError, onInitialized, onSizeChange, onOpenLink, onSendMessage, onConsole }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const bridgeRef = useRef<AppBridge | null>(null);
    const t = useTranslations('miniapps');
    // 用 ref 持有回调 prop，避免回调变化触发 useEffect 重建 iframe
    const callbacksRef = useRef({ onError, onInitialized, onSizeChange, onOpenLink, onSendMessage, onConsole });
    callbacksRef.current = { onError, onInitialized, onSizeChange, onOpenLink, onSendMessage, onConsole };
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [iframeSize, setIframeSize] = useState<{ width?: number; height?: number }>({});

    // 创建沙箱 HTML
    const createSandboxHTML = useCallback(() => {
      const manifest = (miniApp.manifest as Record<string, unknown>) || {};
      const metaCsp = (manifest._meta as Record<string, unknown>)?.csp as CSPConfig | undefined;
      const csp = buildCSP(cspConfig || metaCsp);

      const viewSDK = generateViewSDKScript();
      // 优先使用从 MCP 资源 URI 动态加载的 HTML，回退默认模板
      const htmlContent = htmlContentProp || getDefaultHTML();

      // 构建 App bootstrap 脚本（仅创建 App 实例和兼容层，不注入服务端 MCP 代码）
      const appBootstrap = generateAppBootstrap();

      let html = htmlContent;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${viewSDK}</head>`);
      } else if (html.includes('<body')) {
        html = html.replace('<body', `${viewSDK}<body`);
      } else {
        html = viewSDK + html;
      }

      // 注入 bootstrap 脚本
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${appBootstrap}</body>`);
      } else {
        html = html + appBootstrap;
      }

      // 注入 CSP meta 标签
      if (html.includes('<head>')) {
        html = html.replace(
          '<head>',
          `<head>\n  <meta http-equiv="Content-Security-Policy" content="${csp}">`,
        );
      }

      return html;
    }, [cspConfig, miniApp.manifest, htmlContentProp]);

    // 初始化 AppBridge 并加载 iframe
    useEffect(() => {
      if (!iframeRef.current) return;

      try {
        const html = createSandboxHTML();

        // 创建 AppBridge（支持 origin 隔离）
        const bridge = new AppBridge(
          mcpClient ?? null,
          { name: 'mango-host', version: '1.0.0' },
          {
            hostContext: hostContext ?? { theme: 'light' },
            targetOrigin: sandboxOrigin,
          },
        );

        bridge.oninitialized = () => {
          setIsLoading(false);
          callbacksRef.current.onInitialized?.();
        };

        bridge.onsizechange = (size) => {
          setIframeSize(size);
          callbacksRef.current.onSizeChange?.(size);
        };

        bridge.onopenlink = async (params) => {
          if (callbacksRef.current.onOpenLink) {
            callbacksRef.current.onOpenLink(params.url);
          } else {
            window.open(params.url, '_blank', 'noopener,noreferrer');
          }
          return {};
        };

        bridge.onmessage = async (msg) => {
          callbacksRef.current.onSendMessage?.(msg.role, msg.content);
          return {};
        };

        bridge.onconsole = (entry) => {
          callbacksRef.current.onConsole?.(entry);
        };

        bridgeRef.current = bridge;

        const iframe = iframeRef.current;

        // 先连接 bridge（注册 message 监听），再加载 iframe 内容，
        // 避免 iframe 脚本执行时 Host 还未监听导致 initialize 消息丢失
        bridge.connect(iframe);

        // 加载模式：dedicated domain 或 blob URL
        let blobUrl: string | null = null;
        if (sandboxOrigin) {
          // dedicated domain 模式：通过 srcdoc 加载（独立 origin 由服务端代理提供）
          iframe.srcdoc = html;
        } else {
          // blob URL 模式（默认）
          const blob = new Blob([html], { type: 'text/html' });
          blobUrl = URL.createObjectURL(blob);
          iframe.src = blobUrl;
        }

        return () => {
          bridge.disconnect();
          bridgeRef.current = null;
          if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
      } catch (err) {
        console.error('Error loading miniapp:', err);
        setError(t('loadMiniAppFailed'));
        setIsLoading(false);
        callbacksRef.current.onError?.(err as Error);
      }
    }, [mcpClient, createSandboxHTML, hostContext, sandboxOrigin]);

    // 暴露 API 给父组件
    React.useImperativeHandle(ref, () => ({
      bridge: bridgeRef.current,
      sendToolResult: (result: ToolResult) => {
        bridgeRef.current?.sendToolResult(result);
      },
      sendToolInput: (args: Record<string, unknown>) => {
        bridgeRef.current?.sendToolInput({ arguments: args });
      },
      setHostContext: (ctx: HostContext) => {
        bridgeRef.current?.setHostContext(ctx);
      },
    }), []);

    if (error) {
      return (
        <div className={cn('flex items-center justify-center p-8 text-destructive', className)}>
          <div className="text-center">
            <p className="font-semibold">Error loading mini app</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('relative w-full h-full overflow-auto', className)}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">{t('loadingMiniApp')}</p>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          style={{
            maxWidth: iframeSize.width ? `${iframeSize.width}px` : undefined,
          }}
          sandbox="allow-scripts allow-same-origin allow-forms"
          referrerPolicy="no-referrer"
          title={miniApp.display_name}
        />
      </div>
    );
  },
);

MiniAppContainer.displayName = 'MiniAppContainer';

// === 辅助函数 ===

/**
 * 生成 App bootstrap 脚本
 * 创建 App 实例、建立连接、提供兼容层
 * 注意：不注入服务端 MCP 代码，code 字段仅在服务端 adapter.ts 沙箱中执行
 */
function generateAppBootstrap(): string {
  return `
<script>
(function() {
  // 创建 App 实例并连接
  var app = new App(
    { name: 'MiniApp', version: '1.0.0' },
    { tools: { listChanged: true } },
    { autoResize: true }
  );

  // 兼容层：window.MiniAppAPI -> App 方法映射
  window.MiniAppAPI = {
    sendMessage: function(action, payload) {
      return app.callServerTool(action, payload || {});
    },
    storage: {
      get: function(key) { return app.callServerTool('storage.get', { key: key }); },
      set: function(key, value) { return app.callServerTool('storage.set', { key: key, value: value }); },
      remove: function(key) { return app.callServerTool('storage.remove', { key: key }); },
    },
    notification: {
      send: function(title, body, options) {
        return app.callServerTool('notification.send', { title: title, body: body, options: options });
      },
    },
    user: {
      getInfo: function() { return app.callServerTool('user.getInfo', {}); },
    },
    invokeMiniApp: function(action, params) {
      return app.callServerTool('invoke', { action: action, params: params || {} });
    },
  };

  // 暴露 app 实例
  window.__mango_app__ = app;

  // 连接到 Host
  app.connect().then(function() {
    console.log('[MiniApp] Connected to host');
  }).catch(function(err) {
    console.error('[MiniApp] Connection failed:', err);
  });
})();
</script>
`;
}

/**
 * 默认 HTML 模板（简化版）
 */
function getDefaultHTML(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --mango-dark: hsl(40, 3%, 8%);
      --mango-light: hsl(48, 31%, 97%);
      --mango-orange: hsl(15, 63%, 60%);
      --mango-gray-200: hsl(48, 13%, 89%);
      --mango-gray-600: hsl(48, 3%, 42%);
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--mango-light);
      min-height: 100vh;
      padding: 20px;
      color: var(--mango-dark);
    }
    .container { max-width: 800px; margin: 0 auto; }
    #app { min-height: 100px; }
    #app:empty::before {
      content: 'MiniApp output area';
      color: var(--mango-gray-600);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="app"></div>
  </div>
</body>
</html>`;
}
