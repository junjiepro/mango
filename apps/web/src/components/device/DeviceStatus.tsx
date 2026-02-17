/**
 * Device Status Component
 * 显示设备的在线状态和健康信息
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('devices');
  const [status, setStatus] = useState(initialStatus);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const response = await fetch(`/api/devices/${deviceId}`);

      if (!response.ok) {
        throw new Error(t('failedCheckStatus'));
      }

      const data = await response.json();
      setStatus({
        is_online: data.device.is_online,
        last_check_at: data.device.last_check_at,
        health_check_error: data.device.health_check_error,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknown'));
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
      return <Badge variant="outline">{t('unknown')}</Badge>;
    }

    if (status.is_online) {
      return (
        <Badge variant="default" className="bg-green-500">
          <Circle className="mr-1 h-2 w-2 fill-current" />
          {t('online')}
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <Circle className="mr-1 h-2 w-2 fill-current" />
        {t('offline')}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('status')}</CardTitle>
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
          <span className="text-sm text-muted-foreground">{t('currentStatus')}</span>
          {getStatusBadge()}
        </div>

        {status?.last_check_at && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('lastCheck')}</span>
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
              {t('offlineHint')}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
