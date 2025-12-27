/**
 * Device Status Component
 * 显示设备的在线状态和健康信息
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Circle, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

interface DeviceStatusProps {
  deviceId: string;
  initialStatus?: {
    is_online: boolean;
    last_check_at: string;
    health_check_error?: string | null;
  };
}

export function DeviceStatus({ deviceId, initialStatus }: DeviceStatusProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/devices/${deviceId}`);

      if (!response.ok) {
        throw new Error('Failed to check device status');
      }

      const data = await response.json();
      setStatus({
        is_online: data.device.is_online,
        last_check_at: data.device.last_check_at,
        health_check_error: data.device.health_check_error,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // 自动刷新状态（每30秒）
    const interval = setInterval(() => {
      checkStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [deviceId]);

  const getStatusBadge = () => {
    if (!status) {
      return <Badge variant="outline">Unknown</Badge>;
    }

    if (status.is_online) {
      return (
        <Badge variant="default" className="bg-green-500">
          <Circle className="mr-1 h-2 w-2 fill-current" />
          在线
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <Circle className="mr-1 h-2 w-2 fill-current" />
        离线
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">设备状态</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={isChecking}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">当前状态</span>
          {getStatusBadge()}
        </div>

        {status?.last_check_at && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">最后检查</span>
            <span className="text-sm">
              {new Date(status.last_check_at).toLocaleString('zh-CN')}
            </span>
          </div>
        )}

        {status?.health_check_error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {status.health_check_error}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {!status?.is_online && (
          <Alert>
            <AlertDescription className="text-sm">
              设备离线。请确保 Mango CLI 工具正在运行，并且设备 URL 可访问。
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
