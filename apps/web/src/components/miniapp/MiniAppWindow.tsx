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
  const [refreshKey, setRefreshKey] = useState(0);
  const containerRef = React.useRef<any>(null);

  // 处理来自MiniApp的消息
  const handleMessage = async (message: any) => {
    try {
      let result: any = null;

      // 处理不同的消息类型
      switch (message.action) {
        case 'storage.get':
          result = await handleStorageGet(message.payload.key);
          break;
        case 'storage.set':
          result = await handleStorageSet(message.payload.key, message.payload.value);
          break;
        case 'storage.remove':
          result = await handleStorageRemove(message.payload.key);
          break;
        case 'notification.send':
          result = await handleNotificationSend(message.payload);
          break;
        case 'user.getInfo':
          result = await handleGetUserInfo();
          break;
        default:
          console.warn('Unknown message action:', message.action);
          result = { error: 'Unknown action' };
      }

      // 通过 ref 发送响应回 iframe
      if (containerRef.current && message.id) {
        await containerRef.current.sendMessage(message.id, 'response', {
          id: message.id,
          result,
        });
      }
    } catch (error) {
      console.error('Error handling message:', error);

      // 发送错误响应
      if (containerRef.current && message.id) {
        await containerRef.current.sendMessage(message.id, 'response', {
          id: message.id,
          error: (error as Error).message,
        });
      }
    }
  };

  const handleStorageGet = async (key: string) => {
    if (!installation) return null;

    try {
      const response = await fetch(
        `/api/miniapp-data?installation_id=${installation.id}&key=${key}`
      );
      const result = await response.json();

      if (result.success && result.data) {
        return result.data.value;
      }
      return null;
    } catch (error) {
      console.error('Failed to get storage:', error);
      return null;
    }
  };

  const handleStorageSet = async (key: string, value: any) => {
    if (!installation) return false;

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
      const result = await response.json();

      return result.success;
    } catch (error) {
      console.error('Failed to set storage:', error);
      return false;
    }
  };

  const handleStorageRemove = async (key: string) => {
    if (!installation) return false;

    try {
      const response = await fetch(
        `/api/miniapp-data?installation_id=${installation.id}&key=${key}`,
        { method: 'DELETE' }
      );
      const result = await response.json();

      return result.success;
    } catch (error) {
      console.error('Failed to remove storage:', error);
      return false;
    }
  };

  const handleNotificationSend = async (payload: any) => {
    // 检查权限
    if (!installation?.granted_permissions?.includes('system:notification')) {
      console.warn('Notification permission not granted');
      return false;
    }

    // 发送浏览器通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(payload.title, {
        body: payload.body,
        ...payload.options,
      });
      return true;
    }

    return false;
  };

  const handleGetUserInfo = async () => {
    // 检查权限
    if (!installation?.granted_permissions?.includes('user:read')) {
      console.warn('User read permission not granted');
      return null;
    }

    try {
      const response = await fetch('/api/profile');
      const result = await response.json();

      if (result.success) {
        return {
          id: result.data.id,
          display_name: result.data.display_name,
          avatar_url: result.data.avatar_url,
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  };

  // 刷新MiniApp
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-background border rounded-lg shadow-lg overflow-hidden',
        'w-full h-[600px]',
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
            className="h-7 w-7 p-0 mr-6"
            title="刷新"
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
