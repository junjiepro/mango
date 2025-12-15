/**
 * MiniApp Sandbox Core
 * T077: Implement iframe-based sandbox for MiniApp isolation
 */

import { MiniAppManifest, MiniAppConfig } from '../apis/types';
import { PermissionManager } from './permissions';
import { MessageBridge, MessageBridgeConfig } from './message-bridge';

/**
 * Sandbox configuration
 */
export interface SandboxConfig {
  appId: string;
  userId: string;
  manifest: MiniAppManifest;
  container: HTMLElement;
  baseUrl?: string;
  allowedOrigins?: string[];
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Sandbox state
 */
export enum SandboxState {
  IDLE = 'idle',
  LOADING = 'loading',
  RUNNING = 'running',
  READY = 'ready',
  PAUSED = 'paused',
  ERROR = 'error',
  DESTROYED = 'destroyed',
}

/**
 * MiniApp Sandbox
 * Provides isolated execution environment using iframe
 */
export class MiniAppSandbox {
  private config: SandboxConfig;
  private iframe: HTMLIFrameElement | null = null;
  private state: SandboxState = SandboxState.IDLE;
  private permissionManager: PermissionManager;
  private messageBridge: MessageBridge | null = null;
  private loadTimeout: NodeJS.Timeout | null = null;

  constructor(config: SandboxConfig) {
    this.config = config;
    this.permissionManager = new PermissionManager(config.appId, config.userId);

    // Grant initial permissions from manifest
    if (config.manifest?.permissions) {
      config.manifest.permissions.forEach(permission => {
        this.permissionManager.grant(permission);
      });
    }
  }

  /**
   * Initialize and load the MiniApp
   */
  async load(): Promise<void> {
    if (this.state !== SandboxState.IDLE) {
      throw new Error(`Cannot load sandbox in state: ${this.state}`);
    }

    this.state = SandboxState.LOADING;

    try {
      // Create iframe
      this.iframe = this.createIframe();
      this.config.container.appendChild(this.iframe);

      // Initialize message bridge
      await this.initializeMessageBridge();

      // Load MiniApp content
      await this.loadContent();

      // Wait for ready signal
      await this.waitForReady();

      this.state = SandboxState.RUNNING;
      this.config.onLoad?.();
    } catch (error) {
      this.state = SandboxState.ERROR;
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Destroy the sandbox
   */
  destroy(): void {
    if (this.state === SandboxState.DESTROYED) {
      return;
    }

    // Clear load timeout
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
      this.loadTimeout = null;
    }

    // Destroy message bridge
    if (this.messageBridge) {
      this.messageBridge.destroy();
      this.messageBridge = null;
    }

    // Remove iframe
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }

    this.state = SandboxState.DESTROYED;
  }

  /**
   * Send message to MiniApp
   */
  async sendMessage<T = any, R = any>(action: string, payload: T): Promise<R> {
    if (!this.messageBridge) {
      throw new Error('Message bridge not initialized');
    }

    if (this.state !== SandboxState.RUNNING && this.state !== SandboxState.READY) {
      throw new Error(`Cannot send message in state: ${this.state}`);
    }

    return this.messageBridge.request<T, R>(action, payload);
  }

  /**
   * Post event to MiniApp (one-way)
   */
  postEvent<T = any>(action: string, payload: T): void {
    if (!this.messageBridge) {
      throw new Error('Message bridge not initialized');
    }

    if (this.state !== SandboxState.RUNNING && this.state !== SandboxState.READY) {
      throw new Error(`Cannot post event in state: ${this.state}`);
    }

    this.messageBridge.send(action, payload);
  }

  /**
   * Get current state
   */
  getState(): SandboxState {
    return this.state;
  }

  /**
   * Get permission manager
   */
  getPermissionManager(): PermissionManager {
    return this.permissionManager;
  }

  /**
   * Get all granted permissions
   */
  getPermissions(): string[] {
    return this.permissionManager.getGrantedPermissions();
  }

  /**
   * Grant a permission
   */
  grantPermission(permission: string): void {
    this.permissionManager.grant(permission as any);
  }

  /**
   * Revoke a permission
   */
  revokePermission(permission: string): void {
    this.permissionManager.revoke(permission as any);
  }

  /**
   * Check if has permission
   */
  hasPermission(permission: string): boolean {
    return this.permissionManager.isGranted(permission as any);
  }

  /**
   * Pause sandbox execution
   */
  pause(): void {
    if (this.state === SandboxState.RUNNING) {
      this.state = SandboxState.PAUSED;
    }
  }

  /**
   * Resume sandbox execution
   */
  resume(): void {
    if (this.state === SandboxState.PAUSED) {
      this.state = SandboxState.RUNNING;
    }
  }

  /**
   * Get load time (stub for now)
   */
  getLoadTime(): number {
    return 0;
  }

  /**
   * Get performance metrics (stub for now)
   */
  getMetrics(): any {
    return {
      loadTime: 0,
      messageCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Register event handler
   */
  on(event: string, handler: Function): void {
    if (this.messageBridge) {
      this.messageBridge.on(event, handler as any);
    }
  }

  /**
   * Unregister event handler
   */
  off(event: string, handler: Function): void {
    if (this.messageBridge) {
      this.messageBridge.off(event);
    }
  }

  /**
   * Register one-time event handler
   */
  once(event: string, handler: Function): void {
    const wrappedHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, wrappedHandler);
    };
    this.on(event, wrappedHandler);
  }

  /**
   * Create iframe element with security attributes
   */
  private createIframe(): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    const manifest = this.config.manifest;

    // Set sandbox attributes
    const sandboxFlags: string[] = [];

    if (manifest.sandbox?.allowScripts !== false) {
      sandboxFlags.push('allow-scripts');
    }

    if (manifest.sandbox?.allowForms) {
      sandboxFlags.push('allow-forms');
    }

    if (manifest.sandbox?.allowPopups) {
      sandboxFlags.push('allow-popups');
    }

    if (manifest.sandbox?.allowModals) {
      sandboxFlags.push('allow-modals');
    }

    // Always allow same-origin for postMessage
    sandboxFlags.push('allow-same-origin');

    iframe.setAttribute('sandbox', sandboxFlags.join(' '));

    // Security attributes
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.setAttribute('allow', ''); // Disable all features by default

    // Styling
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    // Accessibility
    iframe.setAttribute('title', manifest.name);
    iframe.setAttribute('aria-label', manifest.description);

    return iframe;
  }

  /**
   * Initialize message bridge
   */
  private async initializeMessageBridge(): Promise<void> {
    if (!this.iframe || !this.iframe.contentWindow) {
      throw new Error('Iframe not ready');
    }

    const bridgeConfig: MessageBridgeConfig = {
      appId: this.config.appId,
      userId: this.config.userId,
      allowedOrigins: this.config.allowedOrigins || ['*'],
      timeout: 30000,
    };

    this.messageBridge = new MessageBridge(bridgeConfig);

    // Initialize with iframe's content window
    const origin = this.getOrigin();
    this.messageBridge.initialize(this.iframe.contentWindow, origin);

    // Register core handlers
    this.registerCoreHandlers();
  }

  /**
   * Register core message handlers
   */
  private registerCoreHandlers(): void {
    if (!this.messageBridge) return;

    // Permission request handler
    this.messageBridge.on('permission:request', async (payload) => {
      const { permission } = payload;
      return this.permissionManager.request(permission);
    });

    // Permission check handler
    this.messageBridge.on('permission:check', async (payload) => {
      const { permission } = payload;
      return this.permissionManager.getStatus(permission);
    });

    // Lifecycle events
    this.messageBridge.on('lifecycle:ready', () => {
      // MiniApp is ready
    });

    this.messageBridge.on('lifecycle:error', (payload) => {
      const { error } = payload;
      this.config.onError?.(new Error(error));
    });
  }

  /**
   * Load MiniApp content into iframe
   */
  private async loadContent(): Promise<void> {
    if (!this.iframe) {
      throw new Error('Iframe not created');
    }

    const manifest = this.config.manifest;
    const baseUrl = this.config.baseUrl || '';
    const entryUrl = `${baseUrl}${manifest.entryPoint}`;

    // Create HTML content with MiniApp API injection
    const html = this.generateHTML(entryUrl);

    // Write to iframe
    const doc = this.iframe.contentDocument;
    if (!doc) {
      throw new Error('Cannot access iframe document');
    }

    doc.open();
    doc.write(html);
    doc.close();
  }

  /**
   * Generate HTML content for MiniApp
   */
  private generateHTML(entryUrl: string): string {
    const manifest = this.config.manifest;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
  <title>${manifest.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="app"></div>

  <script>
    // MiniApp API Bridge
    (function() {
      const appId = '${this.config.appId}';
      const version = '${manifest.version}';

      // Create API object
      window.MiniAppAPI = {
        appId: appId,
        version: version,

        // Send message to host
        _sendMessage: function(action, payload) {
          return new Promise((resolve, reject) => {
            const messageId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);

            const message = {
              id: messageId,
              type: 'REQUEST',
              action: action,
              version: '1.0',
              nonce: Math.random().toString(36).substr(2, 16),
              timestamp: Date.now(),
              payload: payload
            };

            // Set up response listener
            const responseHandler = function(event) {
              const response = event.data;
              if (response.id === messageId) {
                window.removeEventListener('message', responseHandler);

                if (response.type === 'RESPONSE') {
                  if (response.payload.success) {
                    resolve(response.payload.data);
                  } else {
                    reject(new Error(response.payload.error?.message || 'Request failed'));
                  }
                } else if (response.type === 'ERROR') {
                  reject(new Error(response.payload.error?.message || 'Request failed'));
                }
              }
            };

            window.addEventListener('message', responseHandler);

            // Send message
            window.parent.postMessage(message, '*');

            // Timeout
            setTimeout(() => {
              window.removeEventListener('message', responseHandler);
              reject(new Error('Request timeout'));
            }, 30000);
          });
        },

        // Notify ready
        ready: function() {
          window.parent.postMessage({
            id: 'ready',
            type: 'EVENT',
            action: 'lifecycle:ready',
            version: '1.0',
            nonce: Math.random().toString(36).substr(2, 16),
            timestamp: Date.now(),
            payload: {}
          }, '*');
        }
      };

      // Load entry script
      const script = document.createElement('script');
      script.src = '${entryUrl}';
      script.onerror = function() {
        window.parent.postMessage({
          id: 'error',
          type: 'EVENT',
          action: 'lifecycle:error',
          version: '1.0',
          nonce: Math.random().toString(36).substr(2, 16),
          timestamp: Date.now(),
          payload: { error: 'Failed to load entry script' }
        }, '*');
      };
      document.body.appendChild(script);
    })();
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Wait for MiniApp ready signal
   */
  private async waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadTimeout = setTimeout(() => {
        reject(new Error('MiniApp load timeout'));
      }, 30000);

      if (this.messageBridge) {
        this.messageBridge.on('lifecycle:ready', () => {
          if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
            this.loadTimeout = null;
          }
          resolve();
        });
      }
    });
  }

  /**
   * Get origin for message bridge
   */
  private getOrigin(): string {
    if (this.config.baseUrl) {
      try {
        const url = new URL(this.config.baseUrl);
        return url.origin;
      } catch {
        return '*';
      }
    }
    return '*';
  }
}

/**
 * Create a MiniApp sandbox instance
 */
export function createSandbox(config: SandboxConfig): MiniAppSandbox {
  return new MiniAppSandbox(config);
}
