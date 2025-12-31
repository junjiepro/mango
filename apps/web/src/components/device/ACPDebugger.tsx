/**
 * ACP Debugger Component
 * 调试设备的ACP服务
 * ACP (Agent Communication Protocol) 协议调试工具
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, List, RefreshCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ACPDebuggerProps {
  deviceId: string;
  bindingCode: string;
  onlineUrls?: string[];
}

interface ACPService {
  name: string;
  description?: string;
  type: 'stdio' | 'http' | 'websocket';
}

interface ACPMethod {
  name: string;
  description?: string;
  params?: any;
}

export function ACPDebugger({ deviceId, bindingCode, onlineUrls }: ACPDebuggerProps) {
  const [services, setServices] = useState<ACPService[]>([]);
  const [methods, setMethods] = useState<ACPMethod[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [methodParams, setMethodParams] = useState('{}');
  const [result, setResult] = useState<any>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const [isCallingMethod, setIsCallingMethod] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const onlineUrl = onlineUrls?.[0];

  // 加载 ACP 服务列表
  const loadServices = async () => {
    if (!onlineUrl) {
      setError('设备不在线');
      return;
    }

    setIsLoadingServices(true);
    setError(null);

    try {
      const response = await fetch(`${onlineUrl}/acp`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bindingCode}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const servicesList = data.available_services || [];
      setServices(servicesList);

      // 如果没有服务,显示提示信息
      if (servicesList.length === 0 && data.message) {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载 ACP 服务失败');
      setServices([]);
    } finally {
      setIsLoadingServices(false);
    }
  };

  // 加载服务的方法列表
  const loadMethods = async (serviceName: string) => {
    if (!onlineUrl) {
      setError('设备不在线');
      return;
    }

    setIsLoadingMethods(true);
    setError(null);

    try {
      // 这里可以扩展为实际的 ACP 协议方法发现
      // 目前返回模拟的方法列表
      const mockMethods: ACPMethod[] = [
        { name: 'ping', description: '测试连接' },
        { name: 'getStatus', description: '获取服务状态' },
        { name: 'execute', description: '执行命令', params: { command: 'string' } },
      ];
      setMethods(mockMethods);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载方法失败');
      setMethods([]);
    } finally {
      setIsLoadingMethods(false);
    }
  };

  // 调用 ACP 方法
  const callMethod = async () => {
    if (!onlineUrl || !selectedService || !selectedMethod) {
      setError('请选择服务和方法');
      return;
    }

    // 验证 JSON 格式
    try {
      JSON.parse(methodParams);
      setJsonError(null);
    } catch (err) {
      setJsonError('参数必须是有效的 JSON 格式');
      return;
    }

    setIsCallingMethod(true);
    setError(null);
    setResult(null);

    try {
      const params = JSON.parse(methodParams);

      const response = await fetch(`${onlineUrl}/acp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bindingCode}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: selectedMethod,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '调用方法失败');
    } finally {
      setIsCallingMethod(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ACP 协议调试</CardTitle>
        <CardDescription>
          调试设备的 ACP (Agent Communication Protocol) 服务
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 错误提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 设备状态 */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            设备状态: {onlineUrl ? '在线' : '离线'}
          </div>
          {onlineUrl && (
            <div className="text-xs text-muted-foreground">URL: {onlineUrl}</div>
          )}
        </div>

        {/* 加载服务按钮 */}
        <div>
          <Button
            onClick={loadServices}
            disabled={!onlineUrl || isLoadingServices}
            className="w-full"
          >
            {isLoadingServices ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                加载中...
              </>
            ) : (
              <>
                <List className="mr-2 h-4 w-4" />
                加载 ACP 服务
              </>
            )}
          </Button>
        </div>

        {/* 服务选择 */}
        {services.length > 0 && (
          <div className="space-y-2">
            <Label>选择 ACP 服务</Label>
            <Select
              value={selectedService}
              onValueChange={(value) => {
                setSelectedService(value);
                setSelectedMethod('');
                setMethods([]);
                loadMethods(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择服务" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.name} value={service.name}>
                    {service.name}
                    {service.description && ` - ${service.description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 方法选择 */}
        {methods.length > 0 && (
          <div className="space-y-2">
            <Label>选择方法</Label>
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger>
                <SelectValue placeholder="选择方法" />
              </SelectTrigger>
              <SelectContent>
                {methods.map((method) => (
                  <SelectItem key={method.name} value={method.name}>
                    {method.name}
                    {method.description && ` - ${method.description}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* 方法参数 */}
        {selectedMethod && (
          <div className="space-y-2">
            <Label>方法参数 (JSON)</Label>
            <Textarea
              value={methodParams}
              onChange={(e) => setMethodParams(e.target.value)}
              placeholder='{"key": "value"}'
              className="font-mono text-sm"
              rows={4}
            />
            {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
          </div>
        )}

        {/* 调用按钮 */}
        {selectedMethod && (
          <Button
            onClick={callMethod}
            disabled={!onlineUrl || isCallingMethod || !!jsonError}
            className="w-full"
          >
            {isCallingMethod ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                调用中...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                调用方法
              </>
            )}
          </Button>
        )}

        {/* 结果显示 */}
        {result && (
          <div className="space-y-2">
            <Label>调用结果</Label>
            <pre className="rounded-md bg-muted p-4 text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
