'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Database } from '@/types/database.types';
import { DeviceCache } from '@/lib/deviceCache';

type DeviceBinding = Database['public']['Tables']['device_bindings']['Row'];

interface UseDeviceManagerOptions {
  conversationId?: string;
  initialDeviceId?: string;
}

export function useDeviceManager({ conversationId, initialDeviceId }: UseDeviceManagerOptions = {}) {
  const [devices, setDevices] = useState<DeviceBinding[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(initialDeviceId || '');
  const [selectedDevice, setSelectedDevice] = useState<DeviceBinding | undefined>(undefined);
  const [loadingDevices, setLoadingDevices] = useState(false);

  const loadDevice = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/devices/${id}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('设备未找到');
        throw new Error('加载设备信息失败');
      }
      const data = await response.json();
      setSelectedDevice(data.device);
    } catch (err) {
      console.error('Failed to load device:', id, err);
    }
  }, []);

  // 加载选中设备的详细信息
  useEffect(() => {
    if (selectedDeviceId) loadDevice(selectedDeviceId);
    else setSelectedDevice(undefined);
  }, [selectedDeviceId, loadDevice]);

  // 定期检查设备 URL 可达性
  useEffect(() => {
    if (!selectedDeviceId || !selectedDevice?.online_urls?.length) return;
    const timer = setInterval(async () => {
      const urls = selectedDevice.online_urls || [];
      for (const url of urls) {
        try {
          const resp = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
          if (resp.ok) return;
        } catch { /* continue */ }
      }
      loadDevice(selectedDeviceId);
    }, 15000);
    return () => clearInterval(timer);
  }, [selectedDeviceId, selectedDevice?.online_urls, loadDevice]);

  const loadDevices = useCallback(async (currentConversationDeviceId?: string) => {
    setLoadingDevices(true);
    try {
      const response = await fetch('/api/devices');
      const result = await response.json();

      if (response.ok && result.devices) {
        setDevices(result.devices || []);

        if (currentConversationDeviceId) {
          setSelectedDeviceId(currentConversationDeviceId);
        } else {
          const cachedDeviceId = DeviceCache.getDefaultDeviceId();
          if (cachedDeviceId) {
            setSelectedDeviceId(cachedDeviceId);
          }
        }
      } else {
        console.error('Failed to load devices:', result.error);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  const handleDeviceChange = useCallback(async (deviceId: string, currentConversationId?: string) => {
    const actualDeviceId = deviceId === 'none' ? '' : deviceId;
    setSelectedDeviceId(actualDeviceId);
    DeviceCache.setDefaultDeviceId(actualDeviceId);

    const convId = currentConversationId || conversationId;
    if (convId) {
      try {
        const response = await fetch(`/api/conversations/${convId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: actualDeviceId || null }),
        });
        if (!response.ok) {
          console.error('Failed to save device selection to conversation');
        }
      } catch (error) {
        console.error('Failed to save device selection:', error);
      }
    }
  }, [conversationId]);

  return {
    devices,
    selectedDeviceId,
    selectedDevice,
    loadingDevices,
    loadDevices,
    handleDeviceChange,
    setSelectedDeviceId,
  };
}
