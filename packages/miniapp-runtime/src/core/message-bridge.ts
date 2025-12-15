/**
 * MiniApp Secure Message Bridge
 * T080: Implement secure communication between host and MiniApp
 */

import { MessageType, SecureMessage, MessageResponse } from '../apis/types';

/**
 * Message handler function type
 */
export type MessageHandler<T = any, R = any> = (
  payload: T,
  context: MessageContext
) => Promise<R> | R;

/**
 * Message context provided to handlers
 */
export interface MessageContext {
  appId: string;
  userId: string;
  origin: string;
  timestamp: number;
}

/**
 * Message bridge configuration
 */
export interface MessageBridgeConfig {
  appId: string;
  userId: string;
  allowedOrigins: string[];
  timeout?: number;
  validateSignature?: boolean;
  maxMessageSize?: number;
}

/**
 * Pending request tracking
 */
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Message Bridge for secure communication
 */
export class MessageBridge {
  private config: MessageBridgeConfig;
  private handlers: Map<string, MessageHandler>;
  private pendingRequests: Map<string, PendingRequest>;
  private targetWindow: Window | null = null;
  private targetOrigin: string = '*';
  private messageListener: ((event: MessageEvent) => void) | null = null;

  constructor(config: MessageBridgeConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      validateSignature: false,
      maxMessageSize: 1024 * 1024, // 1MB default
      ...config,
    };
    this.handlers = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Initialize the message bridge
   */
  initialize(targetWindow: Window, targetOrigin: string = '*'): void {
    this.targetWindow = targetWindow;
    this.targetOrigin = targetOrigin;

    // Set up message listener
    this.messageListener = this.handleMessage.bind(this);
    // Use targetWindow instead of global window for better testability
    targetWindow.addEventListener('message', this.messageListener);
  }

  /**
   * Destroy the message bridge
   */
  destroy(): void {
    if (this.messageListener && this.targetWindow) {
      // Use targetWindow instead of global window
      this.targetWindow.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Message bridge destroyed'));
    });
    this.pendingRequests.clear();

    this.targetWindow = null;
  }

  /**
   * Register a message handler
   */
  on<T = any, R = any>(action: string, handler: MessageHandler<T, R>): void {
    this.handlers.set(action, handler);
  }

  /**
   * Unregister a message handler
   */
  off(action: string): void {
    this.handlers.delete(action);
  }

  /**
   * Send a request and wait for response
   */
  async request<T = any, R = any>(action: string, payload: T): Promise<R> {
    if (!this.targetWindow) {
      throw new Error('Message bridge not initialized');
    }

    const message = this.createMessage(action, payload);

    return new Promise<R>((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error(`Request timeout: ${action}`));
      }, this.config.timeout);

      // Store pending request
      this.pendingRequests.set(message.id, {
        resolve,
        reject,
        timeout,
      });

      // Send message
      try {
        this.sendMessage(message);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(message.id);
        reject(error);
      }
    });
  }

  /**
   * Send a one-way message (no response expected)
   */
  send<T = any>(action: string, payload: T): void {
    if (!this.targetWindow) {
      throw new Error('Message bridge not initialized');
    }

    const message = this.createMessage(action, payload);
    message.type = MessageType.EVENT;
    this.sendMessage(message);
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    // Validate origin
    if (!this.isOriginAllowed(event.origin)) {
      console.warn('Message from unauthorized origin:', event.origin);
      return;
    }

    let message: SecureMessage;
    try {
      message = this.parseMessage(event.data);
    } catch (error) {
      console.error('Failed to parse message:', error);
      return;
    }

    // Validate message
    if (!this.validateMessage(message)) {
      console.warn('Invalid message:', message);
      return;
    }

    // Handle different message types
    switch (message.type) {
      case MessageType.REQUEST:
        await this.handleRequest(message);
        break;

      case MessageType.RESPONSE:
        this.handleResponse(message);
        break;

      case MessageType.EVENT:
        await this.handleEvent(message);
        break;

      case MessageType.ERROR:
        this.handleError(message);
        break;

      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  /**
   * Handle incoming request
   */
  private async handleRequest(message: SecureMessage): Promise<void> {
    const handler = this.handlers.get(message.action);

    if (!handler) {
      this.sendError(message.id, 'HANDLER_NOT_FOUND', `No handler for action: ${message.action}`);
      return;
    }

    try {
      const context: MessageContext = {
        appId: this.config.appId,
        userId: this.config.userId,
        origin: this.targetOrigin,
        timestamp: message.timestamp,
      };

      const result = await handler(message.payload, context);

      this.sendResponse(message.id, result);
    } catch (error) {
      const err = error as Error;
      this.sendError(message.id, 'HANDLER_ERROR', err.message);
    }
  }

  /**
   * Handle incoming response
   */
  private handleResponse(message: SecureMessage): void {
    const pending = this.pendingRequests.get(message.id);

    if (!pending) {
      console.warn('Received response for unknown request:', message.id);
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(message.id);

    const response = message.payload as MessageResponse;

    if (response.success) {
      pending.resolve(response.data);
    } else {
      pending.reject(new Error(response.error?.message || 'Request failed'));
    }
  }

  /**
   * Handle incoming event
   */
  private async handleEvent(message: SecureMessage): Promise<void> {
    const handler = this.handlers.get(message.action);

    if (handler) {
      try {
        const context: MessageContext = {
          appId: this.config.appId,
          userId: this.config.userId,
          origin: this.targetOrigin,
          timestamp: message.timestamp,
        };

        await handler(message.payload, context);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }

  /**
   * Handle incoming error
   */
  private handleError(message: SecureMessage): void {
    const pending = this.pendingRequests.get(message.id);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);

      const response = message.payload as MessageResponse;
      pending.reject(new Error(response.error?.message || 'Request failed'));
    }
  }

  /**
   * Send response message
   */
  private sendResponse(requestId: string, data: any): void {
    const response: MessageResponse = {
      id: requestId,
      success: true,
      data,
    };

    const message: SecureMessage = {
      id: requestId,
      type: MessageType.RESPONSE,
      action: 'response',
      version: '1.0',
      nonce: this.generateNonce(),
      timestamp: Date.now(),
      payload: response,
    };

    this.sendMessage(message);
  }

  /**
   * Send error message
   */
  private sendError(requestId: string, code: string, message: string): void {
    const response: MessageResponse = {
      id: requestId,
      success: false,
      error: {
        code,
        message,
      },
    };

    const errorMessage: SecureMessage = {
      id: requestId,
      type: MessageType.ERROR,
      action: 'error',
      version: '1.0',
      nonce: this.generateNonce(),
      timestamp: Date.now(),
      payload: response,
    };

    this.sendMessage(errorMessage);
  }

  /**
   * Create a new message
   */
  private createMessage<T>(action: string, payload: T): SecureMessage<T> {
    return {
      id: this.generateMessageId(),
      type: MessageType.REQUEST,
      action,
      version: '1.0',
      nonce: this.generateNonce(),
      timestamp: Date.now(),
      payload,
    };
  }

  /**
   * Send message to target window
   */
  private sendMessage(message: SecureMessage): void {
    if (!this.targetWindow) {
      throw new Error('Target window not set');
    }

    // Check message size
    const messageStr = JSON.stringify(message);
    if (messageStr.length > this.config.maxMessageSize!) {
      throw new Error('Message size exceeds limit');
    }

    this.targetWindow.postMessage(message, this.targetOrigin);
  }

  /**
   * Parse incoming message
   */
  private parseMessage(data: any): SecureMessage {
    if (typeof data !== 'object' || !data) {
      throw new Error('Invalid message format');
    }

    return data as SecureMessage;
  }

  /**
   * Validate message structure and security
   */
  private validateMessage(message: SecureMessage): boolean {
    // Check required fields
    if (!message.id || !message.type || !message.action || !message.version) {
      return false;
    }

    // Check timestamp (prevent replay attacks)
    const now = Date.now();
    const timeDiff = Math.abs(now - message.timestamp);
    if (timeDiff > 60000) { // 1 minute tolerance
      console.warn('Message timestamp too old or in future');
      return false;
    }

    // Validate signature if required
    if (this.config.validateSignature && !this.validateSignature(message)) {
      return false;
    }

    return true;
  }

  /**
   * Validate message signature
   */
  private validateSignature(message: SecureMessage): boolean {
    // TODO: Implement signature validation
    // For now, return true
    return true;
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    if (this.config.allowedOrigins.includes('*')) {
      return true;
    }

    return this.config.allowedOrigins.includes(origin);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate nonce for replay attack prevention
   */
  private generateNonce(): string {
    return Math.random().toString(36).substr(2, 16);
  }
}

/**
 * Create a message bridge instance
 */
export function createMessageBridge(config: MessageBridgeConfig): MessageBridge {
  return new MessageBridge(config);
}
