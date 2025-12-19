/**
 * Device Management Page
 * 设备管理页面 - 显示绑定的设备、在线状态、解绑操作
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, Plus, Trash2, Circle, ExternalLink, RefreshCw } from 'lucide-react';

interface Device {
  id: string;
  device_id: string;
  device_name: string;
  platform: string;
  last_seen_at: string;
}

interface DeviceBinding {
  id: string;
  binding_name: string;
  tunnel_url: string;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_online: boolean;
  last_check_at: string;
  devices: Device;
}

export default function DeviceManagementPage() {
  const router = useRouter();

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

  const loadDevices = async () => {
    try {
      setError(null);
      const response = await fetch('/api/devices');

      if (!response.ok) {
        throw new Error('Failed to load devices');
      }

      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDevices();
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
        throw new Error('Failed to unbind device');
      }

      // 从列表中移除已删除的设备
      setDevices((prev) => prev.filter((d) => d.id !== deviceToDelete));
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unbind device');
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
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (binding.is_online) {
      return (
        <Badge variant="default" className="bg-green-500">
          <Circle className="mr-1 h-2 w-2 fill-current" />
          Online
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <Circle className="mr-1 h-2 w-2 fill-current" />
        Offline
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-6xl py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Device Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your connected devices and local services
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => router.push('/devices/bind')}>
            <Plus className="mr-2 h-4 w-4" />
            Bind New Device
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
                <p className="text-lg font-medium">No devices connected</p>
                <p className="text-sm mt-2">
                  Start the Mango CLI tool on your local machine and bind it to your account
                </p>
              </div>
              <Button onClick={() => router.push('/devices/bind')}>
                <Plus className="mr-2 h-4 w-4" />
                Bind Your First Device
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
                      Platform: {binding.devices.platform} • Bound on{' '}
                      {formatDate(binding.created_at)}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(binding.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Device ID</p>
                    <p className="font-mono text-xs mt-1">
                      {binding.devices.device_id.substring(0, 16)}...
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Seen</p>
                    <p className="mt-1">{formatDate(binding.devices.last_seen_at)}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tunnel URL</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted px-3 py-2 rounded">
                      {binding.tunnel_url}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(binding.tunnel_url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {binding.status === 'active' && !binding.is_online && (
                  <Alert>
                    <AlertDescription className="text-sm">
                      This device appears to be offline. Make sure the Mango CLI tool is
                      running and the tunnel is active.
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
            <AlertDialogTitle>Unbind Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unbind this device? This will remove all associated
              MCP service configurations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unbinding...
                </>
              ) : (
                'Unbind Device'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
