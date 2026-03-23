/**
 * Device Binding Page
 * 设备绑定页面 - 使用新的绑定流程
 *
 * 新流程：
 * 1. 用户输入临时绑定码
 * 2. 订阅 Realtime Channel
 * 3. 获取设备 URL
 * 4. Health Check
 * 5. 用户输入设备别名并触发绑定
 */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Wifi, WifiOff } from 'lucide-react';
import { useDeviceBinding } from '@/hooks/useDeviceBinding';
import { createClient } from '@/lib/supabase/client';
import { getPreferredBrowserSafeDeviceUrl } from '@/lib/device-urls';

export default function DeviceBindPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 从 URL 参数获取临时绑定码
  const [tempCode, setTempCode] = useState(searchParams.get('code') || '');
  const [bindingName, setBindingName] = useState('');
  const [isBinding, setIsBinding] = useState(false);
  const [bindError, setBindError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 使用 Realtime Channel 订阅 Hook
  const {
    deviceUrls,
    deviceInfo,
    healthCheckStatus,
    reachableUrl,
    isConnected,
    error: channelError,
    retryHealthCheck,
  } = useDeviceBinding(tempCode);
  const selectedDeviceUrl = reachableUrl || (deviceUrls ? getPreferredBrowserSafeDeviceUrl(deviceUrls) : null);

  const handleBind = async () => {
    if (!deviceUrls || healthCheckStatus !== 'success') {
      return;
    }

    setBindError(null);
    setIsBinding(true);

    try {
      const supabase = createClient();

      // 获取当前用户
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Please login first');
      }

      // 1. 通过设备 URL 发送绑定请求到 CLI
      const deviceUrl = selectedDeviceUrl;
      if (!deviceUrl) {
        throw new Error('No browser-safe device URL is available for binding');
      }
      const bindResponse = await fetch(`${deviceUrl}/bind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          binding_name: bindingName || `${deviceInfo?.platform} Device`,
        }),
      });

      if (!bindResponse.ok) {
        const errorData = await bindResponse.json();
        throw new Error(errorData.error || 'Failed to bind device');
      }

      const bindData = await bindResponse.json();
      const { binding_code, device_info } = bindData;

      // 2. 在 Mango 数据库中创建设备绑定记录(新的合并表结构)
      // 一次性创建包含所有设备和绑定信息的记录
      const { error: bindingError } = await supabase.from('device_bindings').insert({
        user_id: user.id,
        device_id: device_info.device_id,
        device_name: device_info.device_name,
        platform: device_info.platform,
        hostname: device_info.hostname,
        binding_name: bindingName || `${deviceInfo?.platform} Device`,
        device_url: deviceUrls, // 存储完整的 device_urls 对象
        binding_code: binding_code,
        status: 'active',
      });

      if (bindingError) {
        console.error('Failed to save binding:', bindingError);
        throw new Error('Failed to save binding to database');
      }

      // 3. 通知 CLI 端保存绑定配置到本地
      try {
        const settingResponse = await fetch(`${deviceUrl}/setting`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            binding_code: binding_code,
            device_id: device_info.device_id,
            device_name: device_info.device_name,
            user_id: user.id,
            platform: device_info.platform,
            hostname: device_info.hostname,
            temp_code: tempCode, // 传递临时绑定码，用于标记为已使用并清理 Channel
          }),
        });

        if (!settingResponse.ok) {
          console.warn('Failed to save binding config to CLI, but binding was successful');
        }
      } catch (settingError) {
        // 即使保存到 CLI 失败，绑定仍然成功（已保存到数据库）
        console.warn('Failed to notify CLI to save config:', settingError);
      }

      setSuccess(true);

      // 3秒后跳转到设备管理页面
      setTimeout(() => {
        router.push('/settings/devices');
      }, 3000);
    } catch (err) {
      setBindError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsBinding(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Bind Device</CardTitle>
          <CardDescription>
            Connect your local device to your Mango account using the temporary binding code
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
              {/* 错误提示 */}
              {(channelError || bindError) && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{channelError || bindError}</AlertDescription>
                </Alert>
              )}

              {/* 步骤 1: 输入临时绑定码 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="temp-code">Temporary Binding Code *</Label>
                  <Input
                    id="temp-code"
                    type="text"
                    placeholder="Enter 8-character code (e.g., a1b2c3d4)"
                    value={tempCode}
                    onChange={(e) => setTempCode(e.target.value.toLowerCase())}
                    disabled={isConnected || isBinding}
                    maxLength={8}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    The temporary code is displayed when you start the Mango CLI tool
                  </p>
                </div>

                {/* 连接状态指示器 */}
                {tempCode && (
                  <div className="flex items-center gap-2 text-sm">
                    {isConnected ? (
                      <>
                        <Wifi className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Connected to device</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Waiting for device...</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 步骤 2: 显示设备信息和 Health Check 状态 */}
              {deviceUrls && deviceInfo && (
                <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-medium text-sm">Device Information</h4>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform:</span>
                      <span className="font-medium">{deviceInfo.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hostname:</span>
                      <span className="font-medium">{deviceInfo.hostname}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Device URL:</span>
                      <span className="font-mono text-xs">
                        {selectedDeviceUrl || 'Unavailable'}
                      </span>
                    </div>
                  </div>

                  {/* Health Check 状态 */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Health Check:</span>
                      <div className="flex items-center gap-2">
                        {healthCheckStatus === 'checking' && (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-sm text-blue-600">Checking...</span>
                          </>
                        )}
                        {healthCheckStatus === 'success' && (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600">Device is accessible</span>
                          </>
                        )}
                        {healthCheckStatus === 'failed' && (
                          <>
                            <XCircle className="h-4 w-4 text-red-600" />
                            <span className="text-sm text-red-600">Device not accessible</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={retryHealthCheck}
                              className="ml-2"
                            >
                              Retry
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 步骤 3: 输入设备别名并绑定 */}
              {healthCheckStatus === 'success' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="binding-name">Device Name *</Label>
                    <Input
                      id="binding-name"
                      type="text"
                      placeholder="My Work Laptop"
                      value={bindingName}
                      onChange={(e) => setBindingName(e.target.value)}
                      disabled={isBinding}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      A friendly name to identify this device
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={handleBind}
                      disabled={isBinding || !bindingName.trim()}
                      className="flex-1"
                    >
                      {isBinding ? (
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
                      disabled={isBinding}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* 使用说明 */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <h4 className="font-medium text-sm">How to bind your device:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Install and start the Mango CLI tool on your local machine</li>
                  <li>Copy the temporary binding code from the CLI output</li>
                  <li>Paste it into the form above</li>
                  <li>Wait for the device to be detected (automatic)</li>
                  <li>Enter a device name and click &quot;Bind Device&quot;</li>
                </ol>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
