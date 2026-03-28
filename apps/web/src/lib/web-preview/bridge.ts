export type WebPreviewBridgeRequestMethod =
  | 'bridge/ping'
  | 'page-agent/execute'
  | 'page-agent/stop';

export interface WebPreviewPageSummary {
  title: string;
  url: string;
  forms: number;
  inputs: number;
  buttons: number;
  runtimeAvailable: boolean;
}

export interface WebPreviewBridgeError {
  code: string;
  message: string;
}

export interface WebPreviewBridgeEvent {
  event: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

interface WebPreviewRequestMessage {
  source: 'mango-web-preview-host';
  version: '1.0';
  kind: 'request';
  id: number;
  method: WebPreviewBridgeRequestMethod;
  params?: Record<string, unknown>;
}

interface WebPreviewResponseMessage {
  source: 'mango-web-preview';
  version: '1.0';
  kind: 'response';
  id: number;
  result?: unknown;
  error?: WebPreviewBridgeError;
  timestamp: number;
}

interface WebPreviewEventMessage {
  source: 'mango-web-preview';
  version: '1.0';
  kind: 'event';
  event: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof globalThis.setTimeout>;
};

export class WebPreviewBridge {
  private iframe: HTMLIFrameElement;
  private targetOrigin: string;
  private requestId = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private eventListeners = new Set<(event: WebPreviewBridgeEvent) => void>();
  private messageHandler: (event: MessageEvent) => void;

  constructor(iframe: HTMLIFrameElement, targetOrigin = '*') {
    this.iframe = iframe;
    this.targetOrigin = targetOrigin;
    this.messageHandler = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageHandler);
  }

  dispose(): void {
    window.removeEventListener('message', this.messageHandler);
    this.pendingRequests.forEach(({ reject, timeoutId }) => {
      window.clearTimeout(timeoutId);
      reject(new Error('WebPreviewBridge disposed'));
    });
    this.pendingRequests.clear();
    this.eventListeners.clear();
  }

  subscribe(listener: (event: WebPreviewBridgeEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  async ping(): Promise<{ ok: true; summary: WebPreviewPageSummary }> {
    const result = await this.request('bridge/ping');
    return result as { ok: true; summary: WebPreviewPageSummary };
  }

  async executeTask(task: string, timeoutMs = 30 * 60_000): Promise<unknown> {
    return this.request('page-agent/execute', { task }, timeoutMs);
  }

  async stopTask(): Promise<{ ok: true }> {
    const result = await this.request('page-agent/stop', undefined, 30_000);
    return result as { ok: true };
  }

  private request(
    method: WebPreviewBridgeRequestMethod,
    params?: Record<string, unknown>,
    timeoutMs = 15_000
  ): Promise<unknown> {
    if (!this.iframe.contentWindow) {
      return Promise.reject(new Error('Preview iframe is not ready'));
    }

    const id = ++this.requestId;
    const message: WebPreviewRequestMessage = {
      source: 'mango-web-preview-host',
      version: '1.0',
      kind: 'request',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Web preview request timed out: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeoutId });
      this.iframe.contentWindow?.postMessage(message, this.targetOrigin);
    });
  }

  private handleMessage(event: MessageEvent): void {
    if (event.source !== this.iframe.contentWindow) {
      return;
    }

    const data = event.data as WebPreviewResponseMessage | WebPreviewEventMessage | undefined;
    if (!data || data.source !== 'mango-web-preview' || data.version !== '1.0') {
      return;
    }

    if (data.kind === 'response') {
      const pending = this.pendingRequests.get(data.id);
      if (!pending) return;

      this.pendingRequests.delete(data.id);
      window.clearTimeout(pending.timeoutId);

      if (data.error) {
        pending.reject(new Error(data.error.message));
      } else {
        pending.resolve(data.result);
      }
      return;
    }

    if (data.kind === 'event') {
      const bridgeEvent: WebPreviewBridgeEvent = {
        event: data.event,
        payload: data.payload,
        timestamp: data.timestamp,
      };

      this.eventListeners.forEach((listener) => listener(bridgeEvent));
    }
  }
}
