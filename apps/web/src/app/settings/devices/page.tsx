/**
 * Device Management Page
 * 设备管理页面 - 显示绑定的设备、在线状态、解绑操作
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Loader2, Plus, Trash2, Circle, ExternalLink, RefreshCw, Settings } from 'lucide-react';
import { AppHeader } from '@/components/layouts/AppHeader';
import { DeviceUrls } from '@/hooks/useDeviceBinding';

// 新的合并表结构 - device_bindings 包含所有设备和绑定信息
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
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  last_seen_at: string;
  is_online?: boolean;
  last_check_at?: string;
}

export default function DeviceManagementPage() {
  const router = useRouter();
  const t = useTranslations('devices');

  const [devices, setDevices] = useState<DeviceBinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async (checkOnline = false) => {
    try {
      setError(null);
      const url = checkOnline ? '/api/devices?check_online=true' : '/api/devices';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(t('management.loadFailed'));
      }

      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('management.errorOccurred'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDevices(true); // 刷新时检查在线状态
  };

  const handleDeleteClick = (deviceId: string) => {
    setDeviceToDelete(deviceId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deviceToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/devices?id=${deviceToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(t('management.unbindFailed'));
      }

      // 从列表中移除已删除的设备
      setDevices((prev) => prev.filter((d) => d.id !== deviceToDelete));
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('management.unbindFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (binding: DeviceBinding) => {
    if (binding.status !== 'active') {
      return <Badge variant="secondary">{t('management.inactive')}</Badge>;
    }
    if (binding.is_online === true) {
      return (
        <Badge variant="default" className="bg-green-500">
          <Circle className="mr-1 h-2 w-2 fill-current" />
          {t('online')}
        </Badge>
      );
    }
    if (binding.is_online === false) {
      return (
        <Badge variant="destructive">
          <Circle className="mr-1 h-2 w-2 fill-current" />
          {t('offline')}
        </Badge>
      );
    }
    return <Badge variant="outline">{t('unknown')}</Badge>;
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

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">{t('management.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('management.description')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => router.push('/devices/bind')}>
              <Plus className="mr-2 h-4 w-4" />
              {t('management.bindNewDevice')}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {devices.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="text-muted-foreground">
                  <p className="text-lg font-medium">{t('management.noDevices')}</p>
                  <p className="text-sm mt-2">
                    {t('management.noDevicesHint')}
                  </p>
                </div>
                <Button onClick={() => router.push('/devices/bind')}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('management.bindFirstDevice')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {devices.map((binding) => (
              <Card key={binding.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {binding.binding_name}
                        {getStatusBadge(binding)}
                      </CardTitle>
                      <CardDescription>
                        {t('management.platform', { platform: binding.platform })} • {t('management.boundOn', { date: formatDate(binding.created_at) })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push(`/devices/${binding.id}`)}
                        title={t('management.viewDetails')}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(binding.id)}
                        className="text-destructive hover:text-destructive"
                        title={t('management.unbindDevice')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t('management.deviceId')}</p>
                      <p className="font-mono text-xs mt-1">
                        {binding.device_id.substring(0, 16)}...
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('management.hostname')}</p>
                      <p className="mt-1">{binding.hostname || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('management.lastSeen')}</p>
                      <p className="mt-1">{formatDate(binding.last_seen_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('management.statusLabel')}</p>
                      <p className="mt-1 capitalize">{binding.status}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t('management.deviceUrl')}</p>
                    <div className="flex items-center gap-2">
                      {Object.entries(binding.device_url).map(
                        ([key, value]) =>
                          value && (
                            <code key={key} className="flex-1 text-xs bg-muted px-3 py-2 rounded">
                              {value}
                            </code>
                          )
                      )}
                    </div>
                  </div>

                  {binding.status === 'active' && binding.is_online === false && (
                    <Alert>
                      <AlertDescription className="text-sm">
                        {t('management.offlineAlert')}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('dialog.unbindTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('dialog.unbindDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>{t('dialog.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('dialog.unbinding')}
                  </>
                ) : (
                  t('dialog.unbindConfirm')
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
