/**
 * Device Binding Page
 * 设备绑定页面 - 用户输入 device_secret 绑定设备
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function DeviceBindPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 URL 参数获取预填充的值
  const [deviceSecret, setDeviceSecret] = useState(searchParams.get('secret') || '');
  const [tunnelUrl, setTunnelUrl] = useState(searchParams.get('tunnel') || '');
  const [bindingName, setBindingName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 自动提交（如果 URL 参数完整）
  useEffect(() => {
    const secret = searchParams.get('secret');
    const tunnel = searchParams.get('tunnel');

    if (secret && tunnel && !success && !isLoading) {
      handleBind();
    }
  }, [searchParams]);

  const handleBind = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // 验证输入
      if (!deviceSecret.trim()) {
        setError('Device secret is required');
        setIsLoading(false);
        return;
      }

      if (!tunnelUrl.trim()) {
        setError('Tunnel URL is required');
        setIsLoading(false);
        return;
      }

      // 调用绑定 API
      const response = await fetch('/api/devices/bind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_secret: deviceSecret,
          tunnel_url: tunnelUrl,
          binding_name: bindingName || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to bind device');
      }

      setSuccess(true);

      // 3秒后跳转到设备管理页面
      setTimeout(() => {
        router.push('/settings/devices');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Bind Device</CardTitle>
          <CardDescription>
            Connect your local device to your Mango account to enable local tool access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Device bound successfully! Redirecting to device management...
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-secret">Device Secret *</Label>
                  <Input
                    id="device-secret"
                    type="password"
                    placeholder="Enter your device secret"
                    value={deviceSecret}
                    onChange={(e) => setDeviceSecret(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    The device secret is displayed when you start the Mango CLI tool
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tunnel-url">Tunnel URL *</Label>
                  <Input
                    id="tunnel-url"
                    type="url"
                    placeholder="https://your-tunnel.trycloudflare.com"
                    value={tunnelUrl}
                    onChange={(e) => setTunnelUrl(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    The public tunnel URL created by Cloudflare Tunnel
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="binding-name">Device Name (Optional)</Label>
                  <Input
                    id="binding-name"
                    type="text"
                    placeholder="My Work Laptop"
                    value={bindingName}
                    onChange={(e) => setBindingName(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">
                    A friendly name to identify this device
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleBind}
                  disabled={isLoading || !deviceSecret || !tunnelUrl}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Binding...
                    </>
                  ) : (
                    'Bind Device'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/settings/devices')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>

              <div className="rounded-lg bg-muted p-4 space-y-2">
                <h4 className="font-medium text-sm">How to bind your device:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Install and start the Mango CLI tool on your local machine</li>
                  <li>Copy the device secret and tunnel URL from the CLI output</li>
                  <li>Paste them into the form above and click "Bind Device"</li>
                  <li>Your device will be connected and ready to use</li>
                </ol>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
