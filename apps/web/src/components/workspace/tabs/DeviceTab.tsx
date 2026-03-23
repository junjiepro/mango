/**
 * DeviceTab Component
 * 工作区设备标签页 - 显示选中设备信息和调试功能
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  MonitorIcon,
  XCircle,
  RefreshCw,
  Loader2,
  Play,
  List,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Circle,
  Settings,
  Save,
  FolderOpen,
  Globe,
  ExternalLink,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { DeviceBinding } from '@/services/DeviceService';
import type { DiscoveredWebService } from '@mango/shared/types/web-service.types';
import { toast } from 'sonner';

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface DeviceTabProps {
  device?: DeviceBinding;
  onRefresh?: () => void;
  onOpenWebService?: (service: DiscoveredWebService, proxyUrl: string) => void;
}

export function DeviceTab({ device, onRefresh, onOpenWebService }: DeviceTabProps) {
  const t = useTranslations('devices');
  // 状态检查
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<{
    is_online: boolean;
    last_check_at: string;
    health_check_error?: string | null;
  } | null>(null);

  // MCP 调试状态
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [toolArgs, setToolArgs] = useState('{}');
  const [result, setResult] = useState<any>(null);
  const [isLoadingTools, setIsLoadingTools] = useState(false);
  const [isCallingTool, setIsCallingTool] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // 折叠状态
  const [statusOpen, setStatusOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(true);
  const [webServicesOpen, setWebServicesOpen] = useState(true);

  // Web 服务发现状态
  const [webServices, setWebServices] = useState<DiscoveredWebService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);
  const [probePort, setProbePort] = useState('');
  const [isProbing, setIsProbing] = useState(false);
  const webServicesTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isOnlineRef = useRef(false);

  // 配置管理状态
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [workspaceDir, setWorkspaceDir] = useState('');
  const [bindingDataDir, setBindingDataDir] = useState('');
  const [mcpServicesJson, setMcpServicesJson] = useState('{}');
  const [mcpJsonError, setMcpJsonError] = useState<string | null>(null);
  const clientRef = useRef<Client | null>(null);
  const [onlineUrl, setOnlineUrl] = useState<string | undefined>(
    device?.online_urls?.[0]
  );

  // 探测浏览器可达的 URL（按 online_urls 优先级顺序）
  useEffect(() => {
    const urls = device?.online_urls;
    if (!urls?.length) {
      setOnlineUrl(undefined);
      return;
    }

    let cancelled = false;

    (async () => {
      for (const url of urls) {
        if (cancelled) return;
        try {
          const resp = await fetch(`${url}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
          });
          if (!cancelled && resp.ok) {
            setOnlineUrl(url);
            return;
          }
        } catch {
          // 不可达，继续下一个
        }
      }
      // 全部不可达，回退到第一个（保持显示用）
      if (!cancelled) setOnlineUrl(urls[0]);
    })();

    return () => { cancelled = true; };
  }, [device?.online_urls]);

  // 清理客户端连接
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.close().catch(console.error);
      }
    };
  }, []);

  // 设备变化时重置状态
  useEffect(() => {
    setTools([]);
    setSelectedTool('');
    setResult(null);
    setIsConnected(false);
    setError(null);
    if (clientRef.current) {
      clientRef.current.close().catch(console.error);
      clientRef.current = null;
    }
  }, [device?.id]);

  // 检查设备状态
  const checkStatus = async () => {
    if (!device?.id) return;

    setIsCheckingStatus(true);
    try {
      const response = await fetch(`/api/devices/${device.id}`);
      if (response.ok) {
        const data = await response.json();
        setDeviceStatus({
          is_online: data.device.is_online,
          last_check_at: data.device.last_check_at,
          health_check_error: data.device.health_check_error,
        });
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // 初始加载状态
  useEffect(() => {
    if (device?.id) {
      checkStatus();
    }
  }, [device?.id]);

  // 加载配置
  const loadConfig = async () => {
    if (!onlineUrl || !device?.binding_code) return;

    setConfigLoading(true);
    setConfigError(null);

    try {
      const response = await fetch(`${onlineUrl}/setting`, {
        headers: { Authorization: `Bearer ${device.binding_code}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWorkspaceDir(data.config?.workspaceDir || '');
        setBindingDataDir(data.config?.bindingDataDir || '');
        const mcpServices = data.config?.mcpServices || {};
        setMcpServicesJson(JSON.stringify(mcpServices, null, 2));
      }
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : t('deviceTab.loadConfigFailed'));
    } finally {
      setConfigLoading(false);
    }
  };

  // 保存配置
  const saveConfig = async () => {
    if (!onlineUrl || !device?.binding_code) return;

    // 验证 MCP 服务 JSON
    let mcpServices = {};
    if (mcpServicesJson.trim()) {
      try {
        mcpServices = JSON.parse(mcpServicesJson);
      } catch {
        setConfigError(t('deviceTab.mcpJsonFormatError'));
        return;
      }
    }

    setConfigSaving(true);
    setConfigError(null);
    setConfigSuccess(false);

    try {
      const response = await fetch(`${onlineUrl}/setting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${device.binding_code}`,
        },
        body: JSON.stringify({
          binding_code: device.binding_code,
          workspace_dir: workspaceDir || undefined,
          binding_data_dir: bindingDataDir || undefined,
          mcp_services: mcpServices,
        }),
      });

      if (!response.ok) {
        throw new Error(t('deviceTab.saveConfigFailed'));
      }

      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
      onRefresh?.();
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : t('deviceTab.saveConfigFailed'));
    } finally {
      setConfigSaving(false);
    }
  };

  // 连接到 MCP 服务器
  const connectToServer = async () => {
    if (!onlineUrl || !device?.binding_code) {
      setError(t('deviceTab.deviceOffline'));
      return false;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const client = new Client(
        { name: 'mango-workspace-debugger', version: '1.0.0' },
        { capabilities: {} }
      );

      const transport = new StreamableHTTPClientTransport(new URL(`${onlineUrl}/mcp`), {
        requestInit: {
          headers: { Authorization: `Bearer ${device.binding_code}` },
        },
      });

      await client.connect(transport);
      clientRef.current = client;
      setIsConnected(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deviceTab.connectionFailed'));
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // 加载工具列表
  const loadTools = async () => {
    setIsLoadingTools(true);
    setError(null);
    setResult(null);

    try {
      if (!isConnected || !clientRef.current) {
        const connected = await connectToServer();
        if (!connected) return;
      }

      const response = await clientRef.current!.listTools();
      setTools(response.tools || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deviceTab.loadToolsFailed'));
      setIsConnected(false);
    } finally {
      setIsLoadingTools(false);
    }
  };

  // 处理参数变化
  const handleArgsChange = (value: string) => {
    setToolArgs(value);
    setJsonError(null);

    if (value.trim()) {
      try {
        JSON.parse(value);
      } catch {
        setJsonError(t('deviceTab.jsonFormatError'));
      }
    }
  };

  // 调用工具
  const callTool = async () => {
    if (!selectedTool) {
      setError(t('deviceTab.pleaseSelectTool'));
      return;
    }

    setIsCallingTool(true);
    setError(null);
    setResult(null);

    try {
      if (!isConnected || !clientRef.current) {
        const connected = await connectToServer();
        if (!connected) return;
      }

      let parsedArgs = {};
      if (toolArgs.trim()) {
        try {
          parsedArgs = JSON.parse(toolArgs);
        } catch {
          throw new Error(t('deviceTab.argsJsonFormatError'));
        }
      }

      const response = await clientRef.current!.callTool({
        name: selectedTool,
        arguments: parsedArgs,
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deviceTab.callFailed'));
      setIsConnected(false);
    } finally {
      setIsCallingTool(false);
    }
  };

  // 断开连接
  const disconnect = async () => {
    if (clientRef.current) {
      await clientRef.current.close();
      clientRef.current = null;
    }
    setIsConnected(false);
    setTools([]);
    setSelectedTool('');
    setResult(null);
  };

  // 加载 Web 服务列表
  const loadWebServices = async () => {
    if (!onlineUrl || !device?.binding_code) return;
    setIsLoadingServices(true);
    try {
      const response = await fetch(`${onlineUrl}/web-services`, {
        headers: { Authorization: `Bearer ${device.binding_code}` },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        setWebServices(data.services || []);
        setLastScanAt(data.lastScanAt || null);
      }
    } catch (err) {
      console.error('Failed to load web services:', err);
    } finally {
      setIsLoadingServices(false);
    }
  };

  // Web 服务自动刷新（展开时每 15s）
  useEffect(() => {
    if (webServicesOpen && isOnlineRef.current && onlineUrl && device?.binding_code) {
      loadWebServices();
      webServicesTimerRef.current = setInterval(loadWebServices, 15000);
    }
    return () => {
      if (webServicesTimerRef.current) {
        clearInterval(webServicesTimerRef.current);
        webServicesTimerRef.current = null;
      }
    };
  }, [webServicesOpen, onlineUrl, device?.binding_code]);

  // 手动探测端口
  const handleProbe = async () => {
    const port = parseInt(probePort, 10);
    if (!port || port < 1 || port > 65535) {
      toast.error(t('deviceTab.invalidPort'));
      return;
    }
    if (!onlineUrl || !device?.binding_code) return;

    setIsProbing(true);
    try {
      const response = await fetch(`${onlineUrl}/web-services/probe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${device.binding_code}`,
        },
        body: JSON.stringify({ port }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.service) {
          toast.success(t('deviceTab.probeSuccess'));
          // Refresh the service list
          await loadWebServices();
          // Auto-open the discovered service
          openServiceWithToken(data.service);
          setProbePort('');
        } else {
          toast.error(t('deviceTab.probeNotFound', { port: String(port) }));
        }
      }
    } catch (err) {
      console.error('Probe failed:', err);
      toast.error(t('deviceTab.probeNotFound', { port: String(port) }));
    } finally {
      setIsProbing(false);
    }
  };

  // 获取预览 token 并打开服务
  const openServiceWithToken = async (service: DiscoveredWebService) => {
    if (!onlineUrl || !device?.binding_code) return;
    try {
      const resp = await fetch(`${onlineUrl}/web-services/${service.id}/preview-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${device.binding_code}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        const proxyUrl = `${onlineUrl}${data.previewUrl}`;
        onOpenWebService?.(service, proxyUrl);
      } else {
        // Fallback: open without token (will work if Bearer auth works)
        onOpenWebService?.(service, `${onlineUrl}/proxy/web/${service.id}/`);
      }
    } catch {
      onOpenWebService?.(service, `${onlineUrl}/proxy/web/${service.id}/`);
    }
  };

  // 未选择设备时的空状态
  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-muted-foreground mb-2">
          <MonitorIcon className="w-12 h-12 mx-auto opacity-50" />
        </div>
        <p className="text-sm text-muted-foreground">{t('deviceTab.noDevice')}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('deviceTab.noDeviceHint')}
        </p>
      </div>
    );
  }

  const isOnline = deviceStatus?.is_online ?? (device.online_urls && device.online_urls.length > 0);
  isOnlineRef.current = !!isOnline;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* 设备基本信息 */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MonitorIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{device.binding_name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {onlineUrl || t('offline')}
            </div>
          </div>
          <Badge variant={device.status === 'active' ? 'default' : 'secondary'} className="flex-shrink-0">
            {device.status}
          </Badge>
        </div>

        {/* 状态监控 */}
        <Collapsible open={statusOpen} onOpenChange={setStatusOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 w-full text-left text-sm font-medium py-1.5 hover:text-primary transition-colors">
              {statusOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {t('deviceTab.statusMonitor')}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('deviceTab.connectionStatus')}</span>
              <div className="flex items-center gap-1.5">
                <Circle className={`w-2 h-2 fill-current ${isOnline ? 'text-green-500' : 'text-gray-400'}`} />
                <span className={isOnline ? 'text-green-600' : 'text-muted-foreground'}>
                  {isOnline ? t('online') : t('offline')}
                </span>
              </div>
            </div>

            {deviceStatus?.last_check_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('deviceTab.lastCheck')}</span>
                <span className="text-xs">
                  {new Date(deviceStatus.last_check_at).toLocaleString('zh-CN')}
                </span>
              </div>
            )}

            {deviceStatus?.health_check_error && (
              <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{deviceStatus.health_check_error}</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={checkStatus}
              disabled={isCheckingStatus}
            >
              {isCheckingStatus ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              )}
              {t('deviceTab.refreshStatus')}
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* 配置管理 */}
        <Collapsible open={configOpen} onOpenChange={(open) => {
          setConfigOpen(open);
          if (open && !workspaceDir && !bindingDataDir) {
            loadConfig();
          }
        }}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 w-full text-left text-sm font-medium py-1.5 hover:text-primary transition-colors">
              {configOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {t('deviceTab.configManagement')}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {configLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    {t('deviceTab.workspaceDir')}
                  </Label>
                  <Input
                    value={workspaceDir}
                    onChange={(e) => setWorkspaceDir(e.target.value)}
                    placeholder={t('deviceTab.workspaceDirPlaceholder')}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    {t('deviceTab.dataDir')}
                  </Label>
                  <Input
                    value={bindingDataDir}
                    onChange={(e) => setBindingDataDir(e.target.value)}
                    placeholder={t('deviceTab.dataDirPlaceholder')}
                    className="h-8 text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('deviceTab.dataDirHint')}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    {t('deviceTab.mcpServiceConfig')}
                  </Label>
                  <Textarea
                    value={mcpServicesJson}
                    onChange={(e) => {
                      setMcpServicesJson(e.target.value);
                      setMcpJsonError(null);
                      try {
                        if (e.target.value.trim()) JSON.parse(e.target.value);
                      } catch {
                        setMcpJsonError(t('deviceTab.jsonFormatError'));
                      }
                    }}
                    placeholder="{}"
                    className="font-mono text-xs min-h-[100px] resize-none"
                  />
                  {mcpJsonError && (
                    <p className="text-xs text-destructive">{mcpJsonError}</p>
                  )}
                </div>

                {configError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">{configError}</AlertDescription>
                  </Alert>
                )}

                {configSuccess && (
                  <Alert className="py-2 bg-green-50 text-green-900 border-green-200">
                    <AlertDescription className="text-xs">{t('deviceTab.configSaved')}</AlertDescription>
                  </Alert>
                )}

                <Button
                  size="sm"
                  className="w-full"
                  onClick={saveConfig}
                  disabled={configSaving || !isOnline}
                >
                  {configSaving ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {t('deviceTab.saveConfig')}
                </Button>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Web 服务发现 */}
        <Collapsible open={webServicesOpen} onOpenChange={(open) => {
          setWebServicesOpen(open);
        }}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 w-full text-left text-sm font-medium py-1.5 hover:text-primary transition-colors">
              {webServicesOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Globe className="w-4 h-4" />
              {t('deviceTab.webServices')}
              {webServices.filter(s => s.status === 'online').length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
                  {webServices.filter(s => s.status === 'online').length}
                </Badge>
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {/* 刷新按钮 + 上次扫描时间 */}
            <div className="flex items-center justify-between">
              {lastScanAt && (
                <span className="text-xs text-muted-foreground">
                  {t('deviceTab.lastScan')}: {new Date(lastScanAt).toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 ml-auto"
                onClick={loadWebServices}
                disabled={isLoadingServices || !isOnline}
              >
                {isLoadingServices ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </Button>
            </div>

            {/* 服务列表 */}
            {!isOnline ? (
              <p className="text-xs text-muted-foreground">{t('deviceTab.deviceOfflineCannotConnect')}</p>
            ) : isLoadingServices && webServices.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">{t('deviceTab.scanning')}</span>
              </div>
            ) : webServices.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-xs text-muted-foreground">{t('deviceTab.noWebServices')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('deviceTab.noWebServicesHint')}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {webServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 group"
                  >
                    <Circle className={`w-2 h-2 fill-current flex-shrink-0 ${
                      service.status === 'online' ? 'text-green-500' : 'text-gray-400'
                    }`} />
                    <span className="text-xs font-mono flex-shrink-0">:{service.port}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                      {service.protocol.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {service.title || `${service.protocol}://127.0.0.1:${service.port}`}
                    </span>
                    {service.status === 'online' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={() => openServiceWithToken(service)}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        <span className="text-xs">{t('deviceTab.openService')}</span>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground flex-shrink-0">{t('deviceTab.serviceOffline')}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 手动探测端口 */}
            {isOnline && (
              <div className="flex items-center gap-2 pt-1 border-t">
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={probePort}
                  onChange={(e) => setProbePort(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleProbe(); }}
                  placeholder={t('deviceTab.portPlaceholder')}
                  className="h-7 text-xs flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3"
                  onClick={handleProbe}
                  disabled={isProbing || !probePort}
                >
                  {isProbing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                  <span className="ml-1 text-xs">{isProbing ? t('deviceTab.probing') : t('deviceTab.probe')}</span>
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* MCP 调试 */}
        <Collapsible open={mcpOpen} onOpenChange={setMcpOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 w-full text-left text-sm font-medium py-1.5 hover:text-primary transition-colors">
              {mcpOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {t('deviceTab.mcpDebug')}
              {isConnected && <span className="text-xs text-green-600 ml-auto">● {t('deviceTab.connected')}</span>}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            {/* 连接/工具列表按钮 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={loadTools}
                disabled={isLoadingTools || isConnecting || !isOnline}
              >
                {isLoadingTools || isConnecting ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <List className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isConnected ? t('deviceTab.refreshTools') : t('deviceTab.connectAndListTools')}
              </Button>
              {isConnected && (
                <Button variant="outline" size="sm" onClick={disconnect} title={t('disconnect')}>
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {!isOnline && (
              <p className="text-xs text-muted-foreground">{t('deviceTab.deviceOfflineCannotConnect')}</p>
            )}

            {/* 工具选择和调用 */}
            {tools.length > 0 && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('deviceTab.selectTool')}</Label>
                  <Select value={selectedTool} onValueChange={setSelectedTool}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={t('deviceTab.selectTool')} />
                    </SelectTrigger>
                    <SelectContent>
                      {tools.map((tool) => (
                        <SelectItem key={tool.name} value={tool.name} className="text-xs">
                          {tool.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTool && tools.find(t => t.name === selectedTool)?.description && (
                    <p className="text-xs text-muted-foreground">
                      {tools.find(t => t.name === selectedTool)?.description}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{t('deviceTab.argsJson')}</Label>
                  <Textarea
                    value={toolArgs}
                    onChange={(e) => handleArgsChange(e.target.value)}
                    placeholder="{}"
                    className="font-mono text-xs min-h-[60px] resize-none"
                  />
                  {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  onClick={callTool}
                  disabled={isCallingTool || !selectedTool || !!jsonError}
                >
                  {isCallingTool ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {t('deviceTab.callTool')}
                </Button>
              </>
            )}

            {/* 错误信息 */}
            {error && (
              <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 结果显示 */}
            {result && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t('deviceTab.result')}</Label>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-[200px] whitespace-pre-wrap break-all">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
