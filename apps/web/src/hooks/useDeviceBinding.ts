/**
 * useDeviceBinding Hook
 * 用于设备绑定的 Realtime Channel 订阅 Hook
 *
 * 功能：
 * 1. 订阅 Realtime Channel (binding:${tempCode})
 * 2. 获取设备 URL 信息
 * 3. 进行 Health Check
 * 4. 管理连接状态
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface DeviceUrls {
  cloudflare_url: string | null;
  localhost_url: string;
  hostname_url: string;
  tailscale_url?: string | null;
}

export interface DeviceInfo {
  platform: string;
  hostname: string;
  deviceId: string;
}

export interface DeviceBindingState {
  deviceUrls: DeviceUrls | null;
  deviceInfo: DeviceInfo | null;
  healthCheckStatus: 'pending' | 'checking' | 'success' | 'failed';
  isConnected: boolean;
  error: string | null;
}

/**
 * 设备绑定 Hook
 */
export function useDeviceBinding(tempCode: string | null) {
  const [state, setState] = useState<DeviceBindingState>({
    deviceUrls: null,
    deviceInfo: null,
    healthCheckStatus: 'pending',
    isConnected: false,
    error: null,
  });

  useEffect(() => {
    if (!tempCode) {
      return;
    }

    const supabase = createClient();
    const channel = supabase.channel(`binding:${tempCode}`);
    let requestTimeout: NodeJS.Timeout | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let hasReceivedData = false;

    // 请求设备 URL 的函数
    const requestDeviceUrls = async () => {
      console.log('Requesting device URLs from CLI...');
      await channel.send({
        type: 'broadcast',
        event: 'request_urls',
        payload: { timestamp: Date.now() },
      });
    };

    // 订阅 Channel 获取设备 URL
    channel
      .on('broadcast', { event: 'device_urls' }, async (payload) => {
        const { device_urls, device_info } = payload.payload;

        hasReceivedData = true;

        // 清除所有定时器
        if (requestTimeout) clearTimeout(requestTimeout);
        if (retryTimeout) clearTimeout(retryTimeout);

        setState((prev) => ({
          ...prev,
          deviceUrls: device_urls,
          deviceInfo: device_info,
          isConnected: true,
        }));

        // 自动进行 Health Check
        await performHealthCheck(device_urls);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to channel:', `binding:${tempCode}`);

          // 订阅成功后,等待 3 秒,如果没有收到数据则主动请求
          requestTimeout = setTimeout(async () => {
            if (!hasReceivedData) {
              await requestDeviceUrls();

              // 第一次请求后再等待 3 秒,如果仍没有数据则重试
              retryTimeout = setTimeout(async () => {
                if (!hasReceivedData) {
                  console.log('Retrying device URL request...');
                  await requestDeviceUrls();
                }
              }, 3000);
            }
          }, 3000);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setState((prev) => ({
            ...prev,
            error: `Channel subscription failed: ${status}`,
          }));
        }
      });

    // 清理订阅和定时器
    return () => {
      if (requestTimeout) clearTimeout(requestTimeout);
      if (retryTimeout) clearTimeout(retryTimeout);
      supabase.removeChannel(channel);
    };
  }, [tempCode]);

  /**
   * 进行 Health Check
   */
  const performHealthCheck = async (urls: DeviceUrls) => {
    setState((prev) => ({
      ...prev,
      healthCheckStatus: 'checking',
    }));

    // 按优先级遍历所有 URL，找到第一个可达的
    const urlsToTry = [
      urls.cloudflare_url,
      urls.tailscale_url,
      urls.hostname_url,
      urls.localhost_url,
    ].filter(Boolean) as string[];

    for (const urlToCheck of urlsToTry) {
      try {
        const response = await fetch(`${urlToCheck}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          setState((prev) => ({
            ...prev,
            healthCheckStatus: 'success',
          }));
          return;
        }
      } catch {
        // 继续尝试下一个 URL
      }
    }

    // 所有 URL 均不可达
    setState((prev) => ({
      ...prev,
      healthCheckStatus: 'failed',
      error: 'All device URLs unreachable',
    }));
  };

  /**
   * 手动重试 Health Check
   */
  const retryHealthCheck = () => {
    if (state.deviceUrls) {
      performHealthCheck(state.deviceUrls);
    }
  };

  return {
    ...state,
    retryHealthCheck,
  };
}
