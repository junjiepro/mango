/**
 * useFileWatcher Hook
 * 文件变化监听 Hook - 通过 WebSocket 订阅文件变化事件
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DeviceBinding } from '@/services/DeviceService';

/**
 * 文件变化事件类型
 */
export type FileChangeType = 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';

/**
 * 文件变化事件
 */
export interface FileChangeEvent {
  changeType: FileChangeType;
  path: string;
  relativePath: string;
  timestamp: number;
}

/**
 * Hook 配置选项
 */
interface UseFileWatcherOptions {
  device?: DeviceBinding;
  watchPath?: string;
  onFileChange?: (event: FileChangeEvent) => void;
  enabled?: boolean;
}

/**
 * Hook 返回值
 */
interface UseFileWatcherReturn {
  isConnected: boolean;
  isSubscribed: boolean;
  error: string | null;
  subscribe: (path?: string) => void;
  unsubscribe: () => void;
}

/**
 * 扩展的设备绑定类型
 */
interface ExtendedDeviceBinding extends DeviceBinding {
  online_urls?: string[];
  reachable_online_urls?: string[];
}

export function useFileWatcher({
  device,
  watchPath,
  onFileChange,
  enabled = true,
}: UseFileWatcherOptions): UseFileWatcherReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttemptRef = useRef(0);
  const onFileChangeRef = useRef(onFileChange);
  const watchPathRef = useRef(watchPath);
  const enabledRef = useRef(enabled);
  const deviceRef = useRef(device);

  // 更新 refs
  useEffect(() => {
    onFileChangeRef.current = onFileChange;
  }, [onFileChange]);

  useEffect(() => {
    watchPathRef.current = watchPath;
  }, [watchPath]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    deviceRef.current = device;
  }, [device]);

  // 发送消息
  const sendMessage = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // 订阅目录
  const subscribe = useCallback((path?: string) => {
    sendMessage({ type: 'subscribe', path: path || watchPathRef.current });
  }, [sendMessage]);

  // 取消订阅
  const unsubscribe = useCallback(() => {
    sendMessage({ type: 'unsubscribe' });
    setIsSubscribed(false);
  }, [sendMessage]);

  // 连接 WebSocket
  useEffect(() => {
    if (!enabled || !device) {
      return;
    }

    const extDevice = device as ExtendedDeviceBinding;
    const httpUrl =
      extDevice.reachable_online_urls?.[0] ?? extDevice.online_urls?.[0];
    if (!httpUrl || !device.binding_code) {
      return;
    }

    const wsUrl = httpUrl.replace(/^http/, 'ws') + '/ws/files';
    const attemptId = ++connectionAttemptRef.current;
    let isActive = true;

    const connect = () => {
      if (!isActive || connectionAttemptRef.current !== attemptId) {
        return;
      }

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      // 清理旧连接
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }

      try {
        console.log('[useFileWatcher] Connecting to:', wsUrl);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isActive || connectionAttemptRef.current !== attemptId || wsRef.current !== ws) {
            ws.close();
            return;
          }
          console.log('[useFileWatcher] Connected, authenticating...');
          setError(null);
          ws.send(JSON.stringify({ type: 'auth', token: device.binding_code }));
        };

        ws.onmessage = (event) => {
          if (!isActive || connectionAttemptRef.current !== attemptId || wsRef.current !== ws) {
            return;
          }
          try {
            const msg = JSON.parse(event.data);
            console.log('[useFileWatcher] Received:', msg.type);

            switch (msg.type) {
              case 'auth':
                if (msg.success) {
                  setIsConnected(true);
                  // 认证成功后自动订阅
                  if (watchPathRef.current) {
                    console.log('[useFileWatcher] Subscribing to:', watchPathRef.current);
                    ws.send(JSON.stringify({ type: 'subscribe', path: watchPathRef.current }));
                  }
                } else {
                  setError('认证失败');
                  ws.close();
                }
                break;

              case 'subscribed':
                console.log('[useFileWatcher] Subscribed to:', msg.path);
                setIsSubscribed(true);
                break;

              case 'unsubscribed':
                setIsSubscribed(false);
                break;

              case 'file_change':
                console.log('[useFileWatcher] File change:', msg.event);
                onFileChangeRef.current?.(msg.event as FileChangeEvent);
                break;
            }
          } catch (err) {
            console.error('[useFileWatcher] Message parse error:', err);
          }
        };

        ws.onerror = (err) => {
          if (!isActive || connectionAttemptRef.current !== attemptId || wsRef.current !== ws) {
            return;
          }
          console.error('[useFileWatcher] WebSocket error:', err);
          setError('连接错误');
        };

        ws.onclose = () => {
          if (!isActive || connectionAttemptRef.current !== attemptId) {
            return;
          }
          console.log('[useFileWatcher] Disconnected');
          setIsConnected(false);
          setIsSubscribed(false);
          if (wsRef.current === ws) {
            wsRef.current = null;
          }

          // 自动重连
          if (enabledRef.current && deviceRef.current && isActive) {
            reconnectTimerRef.current = setTimeout(() => {
              if (isActive && connectionAttemptRef.current === attemptId) {
                connect();
              }
            }, 3000);
          }
        };
      } catch (err) {
        console.error('[useFileWatcher] Connection error:', err);
        setError(err instanceof Error ? err.message : '连接失败');
      }
    };

    connect();

    return () => {
      isActive = false;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [
    enabled,
    device?.id,
    device?.binding_code,
    (device as ExtendedDeviceBinding)?.reachable_online_urls?.[0],
    (device as ExtendedDeviceBinding)?.online_urls?.[0],
  ]);

  // 监听 watchPath 变化，重新订阅
  useEffect(() => {
    if (isConnected && watchPath && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[useFileWatcher] Re-subscribing to:', watchPath);
      wsRef.current.send(JSON.stringify({ type: 'subscribe', path: watchPath }));
    }
  }, [isConnected, watchPath]);

  return {
    isConnected,
    isSubscribed,
    error,
    subscribe,
    unsubscribe,
  };
}
