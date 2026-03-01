/**
 * Device Config Editor Component
 * 编辑设备配置信息
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useDeviceClient } from '@/hooks/useDeviceClient';

interface DeviceConfigEditorProps {
  deviceId: string;
  bindingCode: string;
  bindingName: string;
  onlineUrls?: string[];
  onUpdate?: () => void;
}

type MCPServiceConfig = {
  name: string;
  command: string;
  args: string[];
  status: 'active' | 'inactive';
  env?: Record<string, string> | undefined;
};

export function DeviceConfigEditor({
  deviceId,
  bindingCode,
  bindingName,
  onlineUrls,
  onUpdate,
}: DeviceConfigEditorProps) {
  const t = useTranslations('devices');
  // 构建设备对象供 useDeviceClient 使用
  const device = {
    id: deviceId,
    binding_code: bindingCode,
    online_urls: onlineUrls,
  };
  const { client, isReady } = useDeviceClient(device);

  const [name, setName] = useState(bindingName);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [configJson, setConfigJson] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, [client]);

  const loadConfig = async () => {
    if (!client) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await client.config.get();
      const config = {
        mcpServices: data.config?.mcpServices || {},
        workspaceDir: data.config?.workspaceDir,
        bindingDataDir: data.config?.bindingDataDir,
      };

      setConfig(config);
      setConfigJson(JSON.stringify(config, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigChange = (value: string) => {
    setConfigJson(value);
    setJsonError(null);

    // 验证 JSON 格式
    try {
      JSON.parse(value);
    } catch (err) {
      setJsonError(t('invalidJsonFormat'));
    }
  };

  const handleSave = async () => {
    if (!client || !deviceId) return;

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 验证 JSON
      let parsedConfig = {};
      if (configJson.trim()) {
        try {
          parsedConfig = JSON.parse(configJson);
        } catch (err) {
          throw new Error(t('invalidJsonFormat'));
        }
      }

      // 更新设备配置到设备端
      await client.config.update({
        binding_code: bindingCode,
        ...parsedConfig,
      });

      // 更新设备绑定名称（如果名称有变化）
      if (name !== bindingName) {
        const nameResponse = await fetch(`/api/devices/${deviceId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            binding_name: name,
          }),
        });

        if (!nameResponse.ok) {
          throw new Error(t('failedUpdateName'));
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('config.title')}</CardTitle>
        <CardDescription>{t('config.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="binding-name">{t('bindingName')}</Label>
          <Input
            id="binding-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('bindingNamePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="config-json">{t('config.configJson')}</Label>
          <Textarea
            id="config-json"
            value={configJson}
            onChange={(e) => handleConfigChange(e.target.value)}
            placeholder="{}"
            className="font-mono text-sm min-h-[200px]"
          />
          {jsonError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {jsonError}
            </p>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 text-green-900 border-green-200">
            <AlertDescription>{t('config.saveSuccess')}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleSave} disabled={isSaving || !!jsonError} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('config.saving')}
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {t('config.save')}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
