/**
 * Device Detail Page
 * 设备详情页面 - 查看设备状态、编辑配置、调试MCP服务
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AppHeader } from '@/components/layouts/AppHeader';
import { DeviceStatus } from '@/components/device/DeviceStatus';
import { DeviceConfigEditor } from '@/components/device/DeviceConfigEditor';
import { MCPDebugger } from '@/components/device/MCPDebugger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeviceUrls } from '@/hooks/useDeviceBinding';

interface DeviceBinding {
  id: string;
  device_id: string;
  device_name: string;
  platform: string;
  hostname: string;
  binding_name: string;
  device_url: DeviceUrls;
  binding_code: string;
  status: 'active' | 'inactive' | 'expired';
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  last_seen_at: string;
  online_urls?: string[];
  is_online?: boolean;
  health_check_error?: string | null;
  last_check_at?: string;
}

export default function DeviceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const t = useTranslations('devices');
  const deviceId = params.id;

  const [device, setDevice] = useState<DeviceBinding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadDevice();
  }, [deviceId]);

  const loadDevice = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/devices/${deviceId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(t('detail.notFound'));
        }
        throw new Error(t('detail.loadFailed'));
      }

      const data = await response.json();
      setDevice(data.device);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('detail.unknownError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/devices?id=${deviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(t('detail.unbindFailed'));
      }

      router.push('/settings/devices');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('detail.unbindFailed'));
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="container mx-auto max-w-6xl py-8 px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <div className="container mx-auto max-w-6xl py-8 px-4">
          <Alert variant="destructive">
            <AlertDescription>{error || t('detail.notFound')}</AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => router.push('/settings/devices')}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('detail.backToList')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="container mx-auto max-w-6xl py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/settings/devices')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{device.binding_name}</h1>
              <p className="text-muted-foreground mt-1">
                {device.platform} • {device.hostname}
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t('detail.unbindDevice')}
          </Button>
        </div>

        {/* Basic Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('detail.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t('detail.deviceId')}</p>
                <p className="font-mono text-xs mt-1 break-all">{device.device_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('detail.statusLabel')}</p>
                <div className="mt-1">
                  <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                    {device.status}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">{t('detail.createdAt')}</p>
                <p className="mt-1">{formatDate(device.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('detail.updatedAt')}</p>
                <p className="mt-1">{formatDate(device.updated_at)}</p>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-sm text-muted-foreground">{t('detail.deviceUrl')}</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(device.device_url || {}).map(
                  ([key, value]) =>
                    value && (
                      <code key={key} className="text-xs bg-muted px-3 py-2 rounded break-all">
                        {value as string}
                      </code>
                    )
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs defaultValue="status" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">{t('detail.statusMonitor')}</TabsTrigger>
            <TabsTrigger value="config">{t('detail.configManagement')}</TabsTrigger>
            <TabsTrigger value="mcp-debug">{t('detail.mcpDebug')}</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="space-y-6">
            <DeviceStatus
              deviceId={deviceId}
              initialStatus={{
                is_online: device.is_online || false,
                last_check_at: device.last_check_at || new Date().toISOString(),
                health_check_error: device.health_check_error,
              }}
            />
          </TabsContent>

          <TabsContent value="config">
            <DeviceConfigEditor
              deviceId={deviceId}
              bindingCode={device.binding_code}
              bindingName={device.binding_name}
              onUpdate={loadDevice}
              onlineUrls={device.online_urls}
            />
          </TabsContent>

          <TabsContent value="mcp-debug">
            <MCPDebugger
              deviceId={deviceId}
              bindingCode={device.binding_code}
              onlineUrls={device.online_urls}
            />
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('detail.unbindTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('detail.unbindDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t('detail.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('detail.unbinding')}
                  </>
                ) : (
                  t('detail.confirmUnbind')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
