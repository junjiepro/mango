/**
 * useCurrentDevice Hook
 * 获取当前激活的设备信息
 * User Story 5: 富交互界面与工作区
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DeviceBinding } from '@/services/DeviceService';

export function useCurrentDevice() {
  const [device, setDevice] = useState<DeviceBinding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCurrentDevice = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        // 获取用户的活跃设备
        const { data, error } = await supabase
          .from('device_bindings')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Failed to load device:', error);
          setDevice(null);
        } else {
          setDevice(data as DeviceBinding);
        }
      } catch (error) {
        console.error('Error loading device:', error);
        setDevice(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrentDevice();
  }, []);

  return { device, isLoading };
}
