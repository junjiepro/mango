/**
 * MCPDebugPanel Component
 * MCP 调试面板 - 工具列表/调用、资源浏览、执行日志、初始化状态
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, RefreshCw, AlertCircle, Play, CheckCircle2,
  XCircle, ChevronRight, Server, Wrench, FolderOpen, ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { MiniAppMCPClient } from '@/services/MiniAppMCPClient';

interface MCPDebugPanelProps {
  miniAppId: string;
}

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  _meta?: {
    ui?: {
      resourceUri?: string;
    };
  };
}

interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'request' | 'response' | 'error';
  method: string;
  data: unknown;
}

interface ServerInfo {
  protocolVersion: string;
  serverInfo: { name: string; version: string };
}

type DebugSection = 'tools' | 'resources' | 'logs';

export function MCPDebugPanel({ miniAppId }: MCPDebugPanelProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [tools, setTools] = useState<ToolDefinition[]>([]);
  const [resources, setResources] = useState<ResourceDefinition[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [activeSection, setActiveSection] = useState<DebugSection>('tools');
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null);
  const [toolArgs, setToolArgs] = useState('{}');
  const [toolResult, setToolResult] = useState<unknown>(null);
  const [toolExecuting, setToolExecuting] = useState(false);

  const [selectedResource, setSelectedResource] = useState<ResourceDefinition | null>(null);
  const [resourceContent, setResourceContent] = useState<unknown>(null);
  const [resourceLoading, setResourceLoading] = useState(false);

  const clientRef = useRef<MiniAppMCPClient | null>(null);
  const logIdRef = useRef(0);

  // 添加日志
  const addLog = useCallback((type: LogEntry['type'], method: string, data: unknown) => {
    setLogs(prev => [{
      id: String(++logIdRef.current),
      timestamp: new Date(),
      type,
      method,
      data,
    }, ...prev].slice(0, 100));
  }, []);

  // 初始化连接
  const connect = useCallback(async () => {
    setConnecting(true);
    setConnectError(null);

    try {
      // 获取当前用户 session token
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const client = new MiniAppMCPClient(miniAppId, token);
      clientRef.current = client;

      addLog('request', 'initialize', {});
      const info = await client.initialize();
      addLog('response', 'initialize', info);
      setServerInfo(info);
      setConnected(true);

      // 加载工具和资源列表
      addLog('request', 'tools/list', {});
      const toolsList = await client.listTools();
      addLog('response', 'tools/list', { tools: toolsList });
      setTools(toolsList);

      addLog('request', 'resources/list', {});
      const resourcesList = await client.listResources();
      addLog('response', 'resources/list', { resources: resourcesList });
      setResources(resourcesList);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '连接失败';
      addLog('error', 'initialize', { error: msg });
      setConnectError(msg);
      setConnected(false);
    } finally {
      setConnecting(false);
    }
  }, [miniAppId, addLog]);

  useEffect(() => {
    connect();
  }, [connect]);

  // 执行工具调用
  const executeTool = useCallback(async () => {
    if (!selectedTool || !clientRef.current) return;

    setToolExecuting(true);
    setToolResult(null);

    try {
      const args = JSON.parse(toolArgs);
      addLog('request', `tools/call: ${selectedTool.name}`, args);
      const result = await clientRef.current.callTool(selectedTool.name, args);
      addLog('response', `tools/call: ${selectedTool.name}`, result);
      setToolResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '调用失败';
      addLog('error', `tools/call: ${selectedTool.name}`, { error: msg });
      setToolResult({ error: msg });
    } finally {
      setToolExecuting(false);
    }
  }, [selectedTool, toolArgs, addLog]);

  // 读取资源
  const readResource = useCallback(async (resource: ResourceDefinition) => {
    if (!clientRef.current) return;

    setSelectedResource(resource);
    setResourceLoading(true);
    setResourceContent(null);

    try {
      addLog('request', `resources/read: ${resource.uri}`, {});
      const content = await clientRef.current.readResource(resource.uri);
      addLog('response', `resources/read: ${resource.uri}`, content);
      setResourceContent(content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '读取失败';
      addLog('error', `resources/read: ${resource.uri}`, { error: msg });
      setResourceContent({ error: msg });
    } finally {
      setResourceLoading(false);
    }
  }, [addLog]);

  return (
    <div className="flex flex-col h-full">
      <ServerInfoBar
        connecting={connecting}
        connected={connected}
        serverInfo={serverInfo}
        connectError={connectError}
        onReconnect={connect}
      />
      <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={60} minSize={20}>
          <div className="flex h-full overflow-hidden">
            <SectionNav activeSection={activeSection} onSectionChange={setActiveSection} />
            <div className="flex-1 min-w-0 overflow-hidden">
              {activeSection === 'tools' && (
                <ToolsSection
                  tools={tools}
                  selectedTool={selectedTool}
                  toolArgs={toolArgs}
                  toolResult={toolResult}
                  toolExecuting={toolExecuting}
                  onSelectTool={(t) => { setSelectedTool(t); setToolResult(null); setToolArgs('{}'); }}
                  onArgsChange={setToolArgs}
                  onExecute={executeTool}
                />
              )}
              {activeSection === 'resources' && (
                <ResourcesSection
                  resources={resources}
                  selectedResource={selectedResource}
                  resourceContent={resourceContent}
                  resourceLoading={resourceLoading}
                  onReadResource={readResource}
                />
              )}
              {activeSection === 'logs' && <LogsSection logs={logs} />}
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40} minSize={15}>
          <LogsSection logs={logs} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

// === 子组件 ===

function ServerInfoBar({
  connecting, connected, serverInfo, connectError, onReconnect,
}: {
  connecting: boolean;
  connected: boolean;
  serverInfo: ServerInfo | null;
  connectError: string | null;
  onReconnect: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b bg-muted/30 shrink-0">
      <div className="flex items-center gap-2">
        {connecting ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : connected ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <Server className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium">
          {connecting ? '连接中...' : connected
            ? `${serverInfo?.serverInfo.name || 'MCP Server'} v${serverInfo?.serverInfo.version || '?'}`
            : '未连接'}
        </span>
      </div>
      {serverInfo && (
        <span className="text-xs text-muted-foreground">
          协议 {serverInfo.protocolVersion}
        </span>
      )}
      {connectError && (
        <span className="text-xs text-destructive truncate flex-1">{connectError}</span>
      )}
      <Button variant="ghost" size="sm" className="h-6 ml-auto" onClick={onReconnect}>
        <RefreshCw className="h-3 w-3" />
      </Button>
    </div>
  );
}

function SectionNav({
  activeSection, onSectionChange,
}: {
  activeSection: DebugSection;
  onSectionChange: (s: DebugSection) => void;
}) {
  const items: { key: DebugSection; icon: React.ReactNode; label: string }[] = [
    { key: 'tools', icon: <Wrench className="h-4 w-4" />, label: '工具' },
    { key: 'resources', icon: <FolderOpen className="h-4 w-4" />, label: '资源' },
    { key: 'logs', icon: <ScrollText className="h-4 w-4" />, label: '日志' },
  ];

  return (
    <div className="w-10 border-r flex flex-col items-center py-2 gap-1 shrink-0">
      {items.map(({ key, icon, label }) => (
        <button
          key={key}
          title={label}
          onClick={() => onSectionChange(key)}
          className={cn(
            'p-2 rounded transition-colors',
            activeSection === key
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

function ToolsSection({
  tools, selectedTool, toolArgs, toolResult, toolExecuting,
  onSelectTool, onArgsChange, onExecute,
}: {
  tools: ToolDefinition[];
  selectedTool: ToolDefinition | null;
  toolArgs: string;
  toolResult: unknown;
  toolExecuting: boolean;
  onSelectTool: (t: ToolDefinition) => void;
  onArgsChange: (v: string) => void;
  onExecute: () => void;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* 工具列表 */}
      <ScrollArea className="w-48 border-r shrink-0">
        <div className="p-2 space-y-0.5">
          {tools.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">无可用工具</p>
          ) : tools.map((tool) => (
            <button
              key={tool.name}
              onClick={() => onSelectTool(tool)}
              className={cn(
                'w-full text-left p-2 rounded text-xs transition-colors',
                selectedTool?.name === tool.name
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
            >
              <div className="font-medium truncate">{tool.name}</div>
              <div className="text-muted-foreground truncate mt-0.5">{tool.description}</div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* 工具详情/调用 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedTool ? (
          <>
            <div className="p-3 border-b shrink-0">
              <h4 className="text-sm font-medium">{selectedTool.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">{selectedTool.description}</p>
            </div>
            <div className="p-3 flex-1 flex flex-col min-h-0 gap-2 overflow-auto">
              <label className="text-xs font-medium shrink-0">参数 (JSON)</label>
              <textarea
                value={toolArgs}
                onChange={(e) => onArgsChange(e.target.value)}
                className="min-h-[60px] rounded-md border bg-background px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
                placeholder="{}"
              />
              <Button size="sm" className="shrink-0" onClick={onExecute} disabled={toolExecuting}>
                {toolExecuting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                执行
              </Button>
              {toolResult !== null && (
                <div className="min-h-0 shrink-0">
                  <label className="text-xs font-medium">结果</label>
                  <pre className="mt-1 p-2 rounded bg-muted text-xs font-mono overflow-auto max-h-[200px]">
                    {JSON.stringify(toolResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            选择左侧工具进行调试
          </div>
        )}
      </div>
    </div>
  );
}

function ResourcesSection({
  resources, selectedResource, resourceContent, resourceLoading, onReadResource,
}: {
  resources: ResourceDefinition[];
  selectedResource: ResourceDefinition | null;
  resourceContent: unknown;
  resourceLoading: boolean;
  onReadResource: (r: ResourceDefinition) => void;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* 资源列表 */}
      <ScrollArea className="w-48 border-r shrink-0">
        <div className="p-2 space-y-0.5">
          {resources.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">无可用资源</p>
          ) : resources.map((res) => (
            <button
              key={res.uri}
              onClick={() => onReadResource(res)}
              className={cn(
                'w-full text-left p-2 rounded text-xs transition-colors',
                selectedResource?.uri === res.uri
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
            >
              <div className="font-medium truncate">{res.name}</div>
              <div className="text-muted-foreground truncate mt-0.5 font-mono">{res.uri}</div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* 资源内容预览 */}
      <div className="flex-1 min-w-0">
        {selectedResource ? (
          <div className="p-3 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <h4 className="text-sm font-medium truncate">{selectedResource.name}</h4>
              {selectedResource.mimeType && (
                <span className="text-xs text-muted-foreground">{selectedResource.mimeType}</span>
              )}
            </div>
            {resourceLoading ? (
              <div className="flex items-center justify-center flex-1">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <pre className="flex-1 p-2 rounded bg-muted text-xs font-mono overflow-auto">
                {JSON.stringify(resourceContent, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            选择左侧资源进行预览
          </div>
        )}
      </div>
    </div>
  );
}

function LogsSection({ logs }: { logs: LogEntry[] }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">暂无日志</p>
        ) : logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 p-1.5 rounded text-xs hover:bg-muted/50">
            <span className="text-muted-foreground shrink-0 font-mono w-[70px]">
              {log.timestamp.toLocaleTimeString()}
            </span>
            <span className={cn(
              'shrink-0 w-4',
              log.type === 'request' ? 'text-blue-500' : log.type === 'response' ? 'text-green-500' : 'text-destructive'
            )}>
              {log.type === 'request' ? <ChevronRight className="h-3 w-3" /> : log.type === 'response' ? '←' : '✕'}
            </span>
            <span className="font-medium shrink-0">{log.method}</span>
            <span className="text-muted-foreground truncate font-mono">
              {JSON.stringify(log.data).slice(0, 120)}
            </span>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
