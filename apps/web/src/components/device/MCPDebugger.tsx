/**
 * MCP Debugger Component
 * 调试设备的MCP服务
 * 使用 MCP SDK 客户端连接设备端的 MCP 服务器
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

interface MCPDebuggerProps {
  deviceId: string;
  bindingCode: string;
  onlineUrls?: string[];
}

interface Tool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export function MCPDebugger({ deviceId, bindingCode, onlineUrls }: MCPDebuggerProps) {
  const t = useTranslations('devices');
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

  const onlineUrl = onlineUrls?.[0];
  const clientRef = useRef<Client | null>(null);

  // 清理客户端连接
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.close().catch(console.error);
      }
    };
  }, []);

  // 连接到 MCP 服务器
  const connectToServer = async () => {
    if (!onlineUrl) {
      setError(t('mcpDebugger.deviceOffline'));
      return false;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // 创建 MCP 客户端
      const client = new Client(
        {
          name: 'mango-web-debugger',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // 创建 StreamableHTTP 传输层
      const transport = new StreamableHTTPClientTransport(new URL(`${onlineUrl}/mcp`), {
        requestInit: {
          headers: {
            Authorization: `Bearer ${bindingCode}`,
          },
        },
      });

      // 连接到服务器
      await client.connect(transport);

      clientRef.current = client;
      setIsConnected(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mcpDebugger.connectionFailed'));
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
      // 如果未连接，先连接
      if (!isConnected || !clientRef.current) {
        const connected = await connectToServer();
        if (!connected) return;
      }

      // 列出工具
      const response = await clientRef.current!.listTools();
      setTools(response.tools || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
    } finally {
      setIsLoadingTools(false);
    }
  };

  const handleArgsChange = (value: string) => {
    setToolArgs(value);
    setJsonError(null);

    // 验证 JSON 格式
    if (value.trim()) {
      try {
        JSON.parse(value);
      } catch (err) {
        setJsonError(t('invalidJsonFormat'));
      }
    }
  };

  const callTool = async () => {
    if (!selectedTool) {
      setError(t('mcpDebugger.pleaseSelectTool'));
      return;
    }

    setIsCallingTool(true);
    setError(null);
    setResult(null);

    try {
      // 如果未连接，先连接
      if (!isConnected || !clientRef.current) {
        const connected = await connectToServer();
        if (!connected) return;
      }

      // 验证 JSON
      let parsedArgs = {};
      if (toolArgs.trim()) {
        try {
          parsedArgs = JSON.parse(toolArgs);
        } catch (err) {
          throw new Error(t('mcpDebugger.invalidJson'));
        }
      }

      // 调用工具
      const response = await clientRef.current!.callTool({
        name: selectedTool,
        arguments: parsedArgs,
      });

      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
    } finally {
      setIsCallingTool(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('mcpDebugger.title')}</CardTitle>
        <CardDescription>
          {t('mcpDebugger.description')}
          {isConnected && <span className="ml-2 text-green-600">● {t('mcpDebugger.connected')}</span>}
          {!isConnected && onlineUrl && <span className="ml-2 text-gray-400">○ {t('mcpDebugger.notConnected')}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={loadTools}
            disabled={isLoadingTools || isConnecting}
            variant="outline"
            className="flex-1"
          >
            {isLoadingTools ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('mcpDebugger.loading')}
              </>
            ) : (
              <>
                <List className="mr-2 h-4 w-4" />
                {t('mcpDebugger.listTools')}
              </>
            )}
          </Button>
          {isConnected && (
            <Button
              onClick={async () => {
                if (clientRef.current) {
                  await clientRef.current.close();
                  clientRef.current = null;
                }
                setIsConnected(false);
                setTools([]);
                setSelectedTool('');
                setResult(null);
              }}
              variant="outline"
              size="icon"
              title={t('mcpDebugger.disconnect')}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {tools.length > 0 && (
          <>
            <div className="space-y-2">
              <Label>{t('mcpDebugger.selectTool')}</Label>
              <Select value={selectedTool} onValueChange={setSelectedTool}>
                <SelectTrigger>
                  <SelectValue placeholder={t('mcpDebugger.selectATool')} />
                </SelectTrigger>
                <SelectContent>
                  {tools.map((tool) => (
                    <SelectItem key={tool.name} value={tool.name}>
                      {tool.name}
                      {tool.description && ` - ${tool.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tool-args">{t('mcpDebugger.argsJson')}</Label>
              <Textarea
                id="tool-args"
                value={toolArgs}
                onChange={(e) => handleArgsChange(e.target.value)}
                placeholder="{}"
                className="font-mono text-sm min-h-[100px]"
              />
              {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
            </div>

            <Button
              onClick={callTool}
              disabled={isCallingTool || !selectedTool || !!jsonError}
              className="w-full"
            >
              {isCallingTool ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('mcpDebugger.calling')}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {t('mcpDebugger.callTool')}
                </>
              )}
            </Button>
          </>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-2">
            <Label>{t('mcpDebugger.result')}</Label>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-[400px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
