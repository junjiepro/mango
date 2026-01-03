/**
 * DeviceTab Component
 * 工作区设备标签页
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React from 'react';
import { MonitorIcon, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Device {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'connecting';
  platform: string;
  lastSeen?: Date;
}

interface DeviceTabProps {
  devices?: Device[];
  onDeviceClick?: (device: Device) => void;
}

const STATUS_CONFIG = {
  online: { icon: CheckCircle, color: 'text-green-500', label: '在线' },
  offline: { icon: XCircle, color: 'text-gray-400', label: '离线' },
  connecting: { icon: Clock, color: 'text-yellow-500', label: '连接中' },
};

export function DeviceTab({ devices = [], onDeviceClick }: DeviceTabProps) {
  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-gray-400 mb-2">
          <MonitorIcon className="w-16 h-16 mx-auto" />
        </div>
        <p className="text-sm text-gray-500">暂无设备</p>
        <p className="text-xs text-gray-400 mt-1">通过 CLI 工具绑定设备后会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      {devices.map(device => {
        const statusConfig = STATUS_CONFIG[device.status];
        const StatusIcon = statusConfig.icon;

        return (
          <div
            key={device.id}
            onClick={() => onDeviceClick?.(device)}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <MonitorIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {device.name}
              </div>
              <div className="text-xs text-gray-500">
                {device.platform}
              </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-1">
              <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
              <span className={`text-xs ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
