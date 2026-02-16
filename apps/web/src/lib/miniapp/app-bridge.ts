/**
 * AppBridge - Host 侧与 View (iframe) 的通信桥梁
 * 对标 MCP Apps 规范的 AppBridge 实现
 *
 * 职责：
 * - 管理 Host <-> View 的 JSON-RPC 通信
 * - 转发 View 的工具调用请求到 MCP Server
 * - 推送工具结果、Host 上下文变化到 View
 * - 管理 View 生命周期
 */

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  ToolInput,
  ToolResult,
  ToolCancelled,
  HostContext,
  AppBridgeCallbacks,
  ConsoleEntry,
} from './types';
import type { MiniAppMCPClient } from '@/services/MiniAppMCPClient';

interface AppBridgeOptions {
  hostContext?: HostContext;
  /** 目标 origin，用于 postMessage 安全校验。默认 '*'（blob URL 模式） */
  targetOrigin?: string;
}

export class AppBridge {
  private iframe: HTMLIFrameElement | null = null;
  private mcpClient: MiniAppMCPClient | null;
  private hostInfo: { name: string; version: string };
  private hostContext: HostContext;
  private targetOrigin: string;
  private requestId = 0;
  private pendingRequests = new Map<string | number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private connected = false;

  // 事件回调
  oninitialized: AppBridgeCallbacks['oninitialized'] = undefined;
  onsizechange: AppBridgeCallbacks['onsizechange'] = undefined;
  onmessage: AppBridgeCallbacks['onmessage'] = undefined;
  onopenlink: AppBridgeCallbacks['onopenlink'] = undefined;
  onconsole: AppBridgeCallbacks['onconsole'] = undefined;

  constructor(
    mcpClient: MiniAppMCPClient | null,
    hostInfo: { name: string; version: string },
    options?: AppBridgeOptions,
  ) {
    this.mcpClient = mcpClient;
    this.hostInfo = hostInfo;
    this.hostContext = options?.hostContext ?? {};
    this.targetOrigin = options?.targetOrigin ?? '*';
  }

  /**
   * 连接到 iframe 中的 View
   */
  connect(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;
    this.messageHandler = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageHandler);
    this.connected = true;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    this.pendingRequests.forEach(({ reject }) => {
      reject(new Error('AppBridge disconnected'));
    });
    this.pendingRequests.clear();
    this.iframe = null;
    this.connected = false;
  }

  /**
   * 处理来自 View 的消息
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    if (!this.iframe || event.source !== this.iframe.contentWindow) {
      return;
    }

    // origin 校验：dedicated domain 模式下验证来源
    if (this.targetOrigin !== '*' && event.origin !== this.targetOrigin) {
      return;
    }

    const data = event.data;
    if (!data || data.jsonrpc !== '2.0') return;

    // View 发来的请求
    if (data.method) {
      await this.handleViewRequest(data as JsonRpcRequest);
      return;
    }

    // View 发来的响应（对 Host 通知的确认）
    if (data.id !== undefined && (data.result !== undefined || data.error !== undefined)) {
      const pending = this.pendingRequests.get(data.id);
      if (pending) {
        this.pendingRequests.delete(data.id);
        if (data.error) {
          pending.reject(new Error(data.error.message));
        } else {
          pending.resolve(data.result);
        }
      }
    }
  }

  /**
   * 处理 View 发来的请求
   */
  private async handleViewRequest(request: JsonRpcRequest): Promise<void> {
    let result: unknown;
    let error: { code: number; message: string } | undefined;

    try {
      switch (request.method) {
        case 'initialize':
          result = this.handleInitialize();
          break;
        case 'tools/call':
          result = await this.handleToolCall(request.params as {
            name: string;
            arguments: Record<string, unknown>;
          });
          break;
        case 'resources/read':
          result = await this.handleResourceRead(request.params as { uri: string });
          break;
        case 'openLink':
          result = await this.handleOpenLink(request.params as { url: string });
          break;
        case 'sendMessage':
          result = await this.handleSendMessage(request.params as {
            role: string;
            content: string;
          });
          break;
        case 'sizeChanged':
          this.handleSizeChanged(request.params as {
            width?: number;
            height?: number;
          });
          result = {};
          break;
        case 'console':
          this.onconsole?.(request.params as ConsoleEntry);
          return; // console 消息不需要响应（无 id）
        default:
          error = { code: -32601, message: `Method not found: ${request.method}` };
      }
    } catch (err) {
      error = {
        code: -32603,
        message: err instanceof Error ? err.message : 'Internal error',
      };
    }

    // 发送响应
    if (request.id !== undefined) {
      this.postToView({
        jsonrpc: '2.0',
        id: request.id,
        ...(error ? { error } : { result }),
      } as JsonRpcResponse);
    }
  }

  private handleInitialize(): Record<string, unknown> {
    const info = {
      protocolVersion: '2024-11-05',
      hostInfo: this.hostInfo,
      hostContext: this.hostContext,
      capabilities: {
        tools: { call: true },
        resources: { read: true },
        openLinks: {},
        logging: {},
      },
    };
    // 延迟触发 oninitialized
    queueMicrotask(() => this.oninitialized?.());
    return info;
  }

  private async handleToolCall(
    params: { name: string; arguments: Record<string, unknown> },
  ): Promise<unknown> {
    console.log('[AppBridge] handleToolCall:', params.name, params.arguments);
    if (!this.mcpClient) {
      console.error('[AppBridge] No MCP client available');
      throw new Error('No MCP client available');
    }
    try {
      const result = await this.mcpClient.callTool(params.name, params.arguments);
      console.log('[AppBridge] Tool result:', params.name, result);
      return result;
    } catch (err) {
      console.error('[AppBridge] Tool call failed:', params.name, err);
      throw err;
    }
  }

  private async handleResourceRead(params: { uri: string }): Promise<unknown> {
    if (!this.mcpClient) {
      throw new Error('No MCP client available');
    }
    return this.mcpClient.readResourceRaw(params.uri);
  }

  private async handleOpenLink(params: { url: string }): Promise<Record<string, unknown>> {
    if (this.onopenlink) {
      return this.onopenlink(params);
    }
    // 默认行为：在新标签页打开
    window.open(params.url, '_blank', 'noopener,noreferrer');
    return {};
  }

  private async handleSendMessage(
    params: { role: string; content: string },
  ): Promise<Record<string, unknown>> {
    if (this.onmessage) {
      return this.onmessage(params);
    }
    return {};
  }

  private handleSizeChanged(size: { width?: number; height?: number }): void {
    this.onsizechange?.(size);
  }

  // === Host -> View 推送方法 ===

  /**
   * 推送工具输入参数到 View
   */
  sendToolInput(input: ToolInput): void {
    this.sendNotification('notifications/toolInput', input);
  }

  /**
   * 推送部分工具输入（流式）
   */
  sendToolInputPartial(input: ToolInput): void {
    this.sendNotification('notifications/toolInputPartial', input);
  }

  /**
   * 推送工具执行结果到 View
   */
  sendToolResult(result: ToolResult): void {
    this.sendNotification('notifications/toolResult', result);
  }

  /**
   * 推送工具取消通知
   */
  sendToolCancelled(params: ToolCancelled): void {
    this.sendNotification('notifications/toolCancelled', params);
  }

  /**
   * 更新 Host 上下文
   */
  setHostContext(context: HostContext): void {
    this.hostContext = { ...this.hostContext, ...context };
    this.sendNotification('notifications/hostContextChanged', this.hostContext);
  }

  /**
   * 优雅关闭 View
   */
  async teardownResource(): Promise<void> {
    if (!this.connected) return;
    try {
      await this.sendRequest('notifications/teardown', {});
    } catch {
      // teardown 失败不阻塞
    }
  }

  // === 底层通信 ===

  private sendNotification(method: string, params: Record<string, unknown>): void {
    this.postToView({ jsonrpc: '2.0', method, params });
  }

  private sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = ++this.requestId;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.postToView({ jsonrpc: '2.0', id, method, params });
      // 超时
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  private postToView(message: Record<string, unknown>): void {
    if (!this.iframe?.contentWindow) return;
    this.iframe.contentWindow.postMessage(message, this.targetOrigin);
  }
}
