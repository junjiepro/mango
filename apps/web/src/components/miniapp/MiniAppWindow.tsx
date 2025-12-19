/**
 * MiniApp Window Component
 * 提供完整的MiniApp窗口，包括标题栏、工具栏和内容区域
 * 处理MiniApp的所有API请求
 */

'use client';

import React, { useState, useCallback } from 'react';
import { MiniAppContainer } from './MiniAppContainer';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database.types';

type MiniApp = Database['public']['Tables']['mini_apps']['Row'];
type MiniAppInstallation = Database['public']['Tables']['mini_app_installations']['Row'];

interface SecureMessage {
  id: string;
  type: 'REQUEST' | 'RESPONSE' | 'EVENT';
  action: string;
  version: string;
  nonce: string;
  timestamp: number;
  payload: any;
  signature?: string;
}

interface MiniAppWindowProps {
  miniApp: MiniApp;
  installation: MiniAppInstallation;
  onClose?: () => void;
  className?: string;
}

/**
 * MiniAppWindow 组件
 * 提供完整的MiniApp运行环境和API处理
 */
export function MiniAppWindow({ miniApp, installation, onClose, className }: MiniAppWindowProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const containerRef = React.useRef<any>(null);

  // 处理来自MiniApp的消息
  const handleMessage = useCallback(
    async (message: SecureMessage) => {
      console.log('Received message from MiniApp:', message);

      try {
        let response: any = null;

        // 根据action处理不同的API请求
        switch (message.action) {
          case 'storage.get':
            response = await handleStorageGet(message.payload.key);
            break;

          case 'storage.set':
            response = await handleStorageSet(message.payload.key, message.payload.value);
            break;

          case 'storage.remove':
            response = await handleStorageRemove(message.payload.key);
            break;

          case 'notification.send':
            response = await handleNotificationSend(
              message.payload.title,
              message.payload.body,
              message.payload.options
            );
            break;

          case 'user.getInfo':
            response = await handleGetUserInfo();
            break;

          default:
            console.warn('Unknown action:', message.action);
            response = { error: 'Unknown action' };
        }

        // 发送响应回MiniApp
        if (containerRef.current?.sendMessage) {
          await containerRef.current.sendMessage(message.id, 'response', {
            id: message.id,
            result: response,
          });
        }
      } catch (error) {
        console.error('Error handling message:', error);
      }
    },
    [installation.id]
  );

  // 存储API处理
  const handleStorageGet = async (key: string) => {
    try {
      const response = await fetch(
        `/api/miniapp-data?installation_id=${installation.id}&key=${key}`
      );
      if (!response.ok) {
        throw new Error('Failed to get data');
      }
      const data = await response.json();
      return data.data?.value || null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  };

  const handleStorageSet = async (key: string, value: any) => {
    try {
      const response = await fetch('/api/miniapp-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installation_id: installation.id,
          key,
          value,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to set data');
      }
      return { success: true };
    } catch (error) {
      console.error('Storage set error:', error);
      return { success: false, error: (error as Error).message };
    }
  };

  const handleStorageRemove = async (key: string) => {
    try {
      const response = await fetch('/api/miniapp-data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installation_id: installation.id,
          key,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to remove data');
      }
      return { success: true };
    } catch (error) {
      console.error('Storage remove error:', error);
      return { success: false, error: (error as Error).message };
    }
  };

  // 通知API处理
  const handleNotificationSend = async (title: string, body: string, options?: any) => {
    try {
      // 检查浏览器通知权限
      if (!('Notification' in window)) {
        return { success: false, error: 'Notifications not supported' };
      }

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: miniApp.icon_url || undefined,
          ...options,
        });
        return { success: true };
      } else {
        return { success: false, error: 'Notification permission denied' };
      }
    } catch (error) {
      console.error('Notification error:', error);
      return { success: false, error: (error as Error).message };
    }
  };

  // 用户信息API处理
  const handleGetUserInfo = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (!response.ok) {
        throw new Error('Failed to get user info');
      }
      const data = await response.json();
      return {
        id: data.user?.id,
        email: data.user?.email,
        // 只返回必要的用户信息，保护隐私
      };
    } catch (error) {
      console.error('Get user info error:', error);
      return null;
    }
  };

  // 刷新MiniApp
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // 切换最大化
  const toggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-background border rounded-lg shadow-lg overflow-hidden',
        isMaximized ? 'fixed inset-4 z-50' : 'w-full h-[600px]',
        className
      )}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
        <div className="flex items-center gap-2">
          {miniApp.icon_url && (
            <img src={miniApp.icon_url} alt={miniApp.display_name} className="w-5 h-5 rounded" />
          )}
          <span className="font-medium text-sm">{miniApp.display_name}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            className="h-7 w-7 p-0"
            title="刷新"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleMaximize}
            className="h-7 w-7 p-0"
            title={isMaximized ? '还原' : '最大化'}
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {onClose && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-7 w-7 p-0"
              title="关闭"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        <MiniAppContainer
          key={refreshKey}
          ref={containerRef}
          miniApp={miniApp}
          installation={installation}
          onMessage={handleMessage}
          onError={(error) => {
            console.error('MiniApp error:', error);
          }}
        />
      </div>
    </div>
  );
}
