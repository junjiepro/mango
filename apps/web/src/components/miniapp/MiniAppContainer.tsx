/**
 * MiniApp Container Component
 * T088: Create MiniAppContainer component
 *
 * 提供安全的 iframe 沙箱环境来运行小应用
 */

'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database.types'

type MiniApp = Database['public']['Tables']['mini_apps']['Row']
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row']

interface SecureMessage {
  id: string
  type: 'REQUEST' | 'RESPONSE' | 'EVENT'
  action: string
  version: string
  nonce: string
  timestamp: number
  payload: any
  signature?: string
}

interface MiniAppContainerProps {
  miniApp: MiniApp
  installation: MiniAppInstallation
  className?: string
  onMessage?: (message: SecureMessage) => void
  onError?: (error: Error) => void
}

/**
 * MiniAppContainer 组件
 * 使用 iframe 沙箱运行小应用代码
 */
export function MiniAppContainer({
  miniApp,
  installation,
  className,
  onMessage,
  onError,
}: MiniAppContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const messageHandlers = useRef<Map<string, (response: any) => void>>(new Map())

  // 生成随机 nonce
  const generateNonce = () => {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15)
  }

  // 发送消息到 iframe
  const sendMessage = (action: string, payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!iframeRef.current?.contentWindow) {
        reject(new Error('Iframe not ready'))
        return
      }

      const message: SecureMessage = {
        id: generateNonce(),
        type: 'REQUEST',
        action,
        version: '1.0.0',
        nonce: generateNonce(),
        timestamp: Date.now(),
        payload,
      }

      // 保存回调
      messageHandlers.current.set(message.id, resolve)

      // 设置超时
      setTimeout(() => {
        if (messageHandlers.current.has(message.id)) {
          messageHandlers.current.delete(message.id)
          reject(new Error('Message timeout'))
        }
      }, 30000) // 30秒超时

      // 发送消息
      iframeRef.current.contentWindow.postMessage(message, '*')
    })
  }

  // 处理来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 验证来源
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return
      }

      try {
        const message = event.data as SecureMessage

        // 验证消息格式
        if (!message.id || !message.type || !message.action) {
          console.warn('Invalid message format:', message)
          return
        }

        // 验证时间戳（防止重放攻击）
        const now = Date.now()
        if (Math.abs(now - message.timestamp) > 60000) { // 1分钟内有效
          console.warn('Message timestamp expired')
          return
        }

        // 处理响应
        if (message.type === 'RESPONSE') {
          const handler = messageHandlers.current.get(message.id)
          if (handler) {
            handler(message.payload)
            messageHandlers.current.delete(message.id)
          }
        }

        // 处理事件
        if (message.type === 'EVENT') {
          onMessage?.(message)
        }
      } catch (error) {
        console.error('Error handling message:', error)
        onError?.(error as Error)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onMessage, onError])

  // 创建沙箱 HTML
  const createSandboxHTML = () => {
    const runtimeConfig = miniApp.runtime_config as any || {}
    const manifest = miniApp.manifest as any || {}

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline';">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    // MiniApp API
    const MiniAppAPI = {
      // 发送消息到父窗口
      sendMessage: (action, payload) => {
        return new Promise((resolve, reject) => {
          const messageId = Math.random().toString(36).substring(2, 15);
          const message = {
            id: messageId,
            type: 'REQUEST',
            action,
            version: '1.0.0',
            nonce: Math.random().toString(36).substring(2, 15),
            timestamp: Date.now(),
            payload,
          };

          const handleResponse = (event) => {
            if (event.data.id === messageId && event.data.type === 'RESPONSE') {
              window.removeEventListener('message', handleResponse);
              resolve(event.data.payload);
            }
          };

          window.addEventListener('message', handleResponse);
          window.parent.postMessage(message, '*');

          // 超时处理
          setTimeout(() => {
            window.removeEventListener('message', handleResponse);
            reject(new Error('Request timeout'));
          }, 30000);
        });
      },

      // 存储 API
      storage: {
        get: (key) => MiniAppAPI.sendMessage('storage.get', { key }),
        set: (key, value) => MiniAppAPI.sendMessage('storage.set', { key, value }),
        remove: (key) => MiniAppAPI.sendMessage('storage.remove', { key }),
      },

      // 通知 API
      notification: {
        send: (title, body, options) =>
          MiniAppAPI.sendMessage('notification.send', { title, body, options }),
      },

      // 用户信息 API
      user: {
        getInfo: () => MiniAppAPI.sendMessage('user.getInfo', ),
      },
    };

    // 运行用户代码
    try {
      ${miniApp.code}
    } catch (error) {
      console.error('MiniApp execution error:', error);
      window.parent.postMessage({
        id: 'error',
        type: 'EVENT',
        action: 'error',
        version: '1.0.0',
        nonce: Math.random().toString(36).substring(2, 15),
        timestamp: Date.now(),
        payload: { error: error.message, stack: error.stack },
      }, '*');
    }
  </script>
</body>
</html>
    `
  }

  // 加载小应用
  useEffect(() => {
    if (!iframeRef.current) return

    try {
      const html = createSandboxHTML()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)

      iframeRef.current.src = url
      setIsLoading(false)

      return () => {
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error loading miniapp:', error)
      setError('Failed to load mini app')
      setIsLoading(false)
      onError?.(error as Error)
    }
  }, [miniApp.code])

  // 暴露 API 给父组件
  React.useImperativeHandle(
    React.useRef(null),
    () => ({
      sendMessage,
    }),
    []
  )

  if (error) {
    return (
      <div className={cn('flex items-center justify-center p-8 text-destructive', className)}>
        <div className="text-center">
          <p className="font-semibold">Error loading mini app</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative w-full h-full', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading mini app...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        title={miniApp.display_name}
      />
    </div>
  )
}
