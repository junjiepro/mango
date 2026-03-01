/**
 * ACP Chat Wrapper Component
 * 为每个 ACP 会话创建独立的 deviceClient
 */

'use client';

import { useState, useEffect } from 'react';
import { ACPChat } from './ACPChat';
import { useDeviceClient } from '@/hooks/useDeviceClient';
import type { UIMessage } from 'ai';
import type { SessionRunningStatus } from '@/types/session.types';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ACPChatWrapperProps {
  sessionId: string;
  acpSessionId: string;
  deviceId: string;
  agentName: string;
  initialMessages: UIMessage[];
  onMessagesChange: (messages: UIMessage[]) => void;
  onStatusChange: (status: SessionRunningStatus) => void;
  isActivated: boolean;
  isVisible: boolean;
  sessionWorkingDirectory?: string;
  currentWorkingDirectory: string;
  onSwitchToSessionDirectory: () => void;
  isDeviceMismatch: boolean;
  sessionDeviceName: string;
  currentDeviceName: string;
}

export function ACPChatWrapper({
  sessionId,
  acpSessionId,
  deviceId,
  agentName,
  initialMessages,
  onMessagesChange,
  onStatusChange,
  isActivated,
  isVisible,
  sessionWorkingDirectory,
  currentWorkingDirectory,
  onSwitchToSessionDirectory,
  isDeviceMismatch,
  sessionDeviceName,
  currentDeviceName,
}: ACPChatWrapperProps) {
  const [device, setDevice] = useState<any>(undefined);
  const [isLoadingDevice, setIsLoadingDevice] = useState(true);

  useEffect(() => {
    if (!deviceId) {
      setIsLoadingDevice(false);
      return;
    }

    const loadDevice = async () => {
      setIsLoadingDevice(true);
      try {
        const response = await fetch(`/api/devices/${deviceId}`);
        if (response.ok) {
          const data = await response.json();
          setDevice(data.device);
        }
      } catch (err) {
        console.error('Failed to load device for ACP session:', err);
      } finally {
        setIsLoadingDevice(false);
      }
    };

    loadDevice();
  }, [deviceId]);

  const { client: deviceClient, isReady } = useDeviceClient(device);

  // 在 deviceClient 准备好之前显示加载状态
  if (isLoadingDevice || (!deviceClient && !isDeviceMismatch)) {
    return (
      <div className={cn('flex flex-col h-full items-center justify-center', !isVisible && 'hidden')}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">正在连接设备...</p>
      </div>
    );
  }

  return (
    <ACPChat
      deviceId={deviceId}
      sessionId={acpSessionId}
      agentName={agentName}
      deviceClient={deviceClient ?? undefined}
      initialMessages={initialMessages}
      onMessagesChange={onMessagesChange}
      onStatusChange={onStatusChange}
      isActivated={isActivated}
      isVisible={isVisible}
      sessionWorkingDirectory={sessionWorkingDirectory}
      currentWorkingDirectory={currentWorkingDirectory}
      onSwitchToSessionDirectory={onSwitchToSessionDirectory}
      isDeviceMismatch={isDeviceMismatch}
      sessionDeviceName={sessionDeviceName}
      currentDeviceName={currentDeviceName}
    />
  );
}
