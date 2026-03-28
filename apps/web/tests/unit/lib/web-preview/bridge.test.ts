import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WebPreviewBridge } from '@/lib/web-preview/bridge';

describe('WebPreviewBridge', () => {
  let iframe: HTMLIFrameElement;
  let contentWindow: { postMessage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    iframe = document.createElement('iframe');
    contentWindow = {
      postMessage: vi.fn(),
    };

    Object.defineProperty(iframe, 'contentWindow', {
      value: contentWindow,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends ping requests to the iframe and resolves the summary response', async () => {
    const bridge = new WebPreviewBridge(iframe);
    const pingPromise = bridge.ping();

    expect(contentWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mango-web-preview-host',
        version: '1.0',
        kind: 'request',
        id: 1,
        method: 'bridge/ping',
      }),
      '*'
    );

    const summary = {
      title: 'Device Preview',
      url: 'http://localhost:3000/proxy/web/ws-3000/',
      forms: 1,
      inputs: 2,
      buttons: 3,
      runtimeAvailable: true,
    };

    window.dispatchEvent(
      new MessageEvent('message', {
        source: contentWindow as never,
        data: {
          source: 'mango-web-preview',
          version: '1.0',
          kind: 'response',
          id: 1,
          result: { ok: true, summary },
          timestamp: Date.now(),
        },
      })
    );

    await expect(pingPromise).resolves.toEqual({ ok: true, summary });
    bridge.dispose();
  });

  it('forwards iframe bridge events to subscribers', () => {
    const bridge = new WebPreviewBridge(iframe);
    const listener = vi.fn();
    const unsubscribe = bridge.subscribe(listener);

    window.dispatchEvent(
      new MessageEvent('message', {
        source: contentWindow as never,
        data: {
          source: 'mango-web-preview',
          version: '1.0',
          kind: 'event',
          event: 'preview/runtime',
          payload: { available: true },
          timestamp: 123,
        },
      })
    );

    expect(listener).toHaveBeenCalledWith({
      event: 'preview/runtime',
      payload: { available: true },
      timestamp: 123,
    });

    unsubscribe();
    bridge.dispose();
  });

  it('sends stop requests to the iframe and resolves when acknowledged', async () => {
    const bridge = new WebPreviewBridge(iframe);
    const stopPromise = bridge.stopTask();

    expect(contentWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'mango-web-preview-host',
        version: '1.0',
        kind: 'request',
        id: 1,
        method: 'page-agent/stop',
      }),
      '*'
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        source: contentWindow as never,
        data: {
          source: 'mango-web-preview',
          version: '1.0',
          kind: 'response',
          id: 1,
          result: { ok: true },
          timestamp: Date.now(),
        },
      })
    );

    await expect(stopPromise).resolves.toEqual({ ok: true });
    bridge.dispose();
  });
});
