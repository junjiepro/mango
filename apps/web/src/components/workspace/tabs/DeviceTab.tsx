/**
 * DeviceTab Component
 * 工作区设备标签页 - 显示选中设备信息和调试功能
 * User Story 5: 富交互界面与工作区
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
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

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

interface DeviceTabProps {
  device?: DeviceBinding;
  onRefresh?: () => void;
}

export function DeviceTab({ device, onRefresh }: DeviceTabProps) {
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
  const onlineUrl = device?.online_urls?.[0];

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
      setConfigError(err instanceof Error ? err.message : '加载配置失败');
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
        setConfigError('MCP 服务配置 JSON 格式错误');
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
        throw new Error('保存配置失败');
      }

      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);
      onRefresh?.();
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : '保存配置失败');
    } finally {
      setConfigSaving(false);
    }
  };

  // 连接到 MCP 服务器
  const connectToServer = async () => {
    if (!onlineUrl || !device?.binding_code) {
      setError('设备不在线');
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
      setError(err instanceof Error ? err.message : '连接失败');
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
      setError(err instanceof Error ? err.message : '加载工具失败');
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
        setJsonError('JSON 格式错误');
      }
    }
  };

  // 调用工具
  const callTool = async () => {
    if (!selectedTool) {
      setError('请选择一个工具');
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
          throw new Error('参数 JSON 格式错误');
        }
      }

      const response = await clientRef.current!.callTool({
        name: selectedTool,
        arguments: parsedArgs,
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : '调用失败');
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

  // 未选择设备时的空状态
  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-muted-foreground mb-2">
          <MonitorIcon className="w-12 h-12 mx-auto opacity-50" />
        </div>
        <p className="text-sm text-muted-foreground">未选择设备</p>
        <p className="text-xs text-muted-foreground mt-1">
          请在顶部工具栏选择一个设备
        </p>
      </div>
    );
  }

  const isOnline = deviceStatus?.is_online ?? (device.online_urls && device.online_urls.length > 0);

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
              {onlineUrl || '离线'}
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
              状态监控
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">连接状态</span>
              <div className="flex items-center gap-1.5">
                <Circle className={`w-2 h-2 fill-current ${isOnline ? 'text-green-500' : 'text-gray-400'}`} />
                <span className={isOnline ? 'text-green-600' : 'text-muted-foreground'}>
                  {isOnline ? '在线' : '离线'}
                </span>
              </div>
            </div>

            {deviceStatus?.last_check_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">最后检查</span>
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
              刷新状态
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
              配置管理
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
                    工作目录
                  </Label>
                  <Input
                    value={workspaceDir}
                    onChange={(e) => setWorkspaceDir(e.target.value)}
                    placeholder="默认工作目录"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    数据目录
                  </Label>
                  <Input
                    value={bindingDataDir}
                    onChange={(e) => setBindingDataDir(e.target.value)}
                    placeholder="默认数据目录"
                    className="h-8 text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    修改数据目录会自动迁移现有数据
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    MCP 服务配置
                  </Label>
                  <Textarea
                    value={mcpServicesJson}
                    onChange={(e) => {
                      setMcpServicesJson(e.target.value);
                      setMcpJsonError(null);
                      try {
                        if (e.target.value.trim()) JSON.parse(e.target.value);
                      } catch {
                        setMcpJsonError('JSON 格式错误');
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
                    <AlertDescription className="text-xs">配置已保存</AlertDescription>
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
                  保存配置
                </Button>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* MCP 调试 */}
        <Collapsible open={mcpOpen} onOpenChange={setMcpOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 w-full text-left text-sm font-medium py-1.5 hover:text-primary transition-colors">
              {mcpOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              MCP 调试
              {isConnected && <span className="text-xs text-green-600 ml-auto">● 已连接</span>}
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
                {isConnected ? '刷新工具' : '连接并列出工具'}
              </Button>
              {isConnected && (
                <Button variant="outline" size="sm" onClick={disconnect} title="断开连接">
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {!isOnline && (
              <p className="text-xs text-muted-foreground">设备离线，无法连接 MCP 服务</p>
            )}

            {/* 工具选择和调用 */}
            {tools.length > 0 && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">选择工具</Label>
                  <Select value={selectedTool} onValueChange={setSelectedTool}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="选择工具" />
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
                  <Label className="text-xs">参数 (JSON)</Label>
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
                  调用工具
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
                <Label className="text-xs">结果</Label>
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
