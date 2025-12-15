import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageBridge, MessageBridgeConfig } from '../../src/core/message-bridge';
import { MessageType } from '../../src/apis/types';

describe('MessageBridge', () => {
  let bridge: MessageBridge;
  let mockWindow: Window;
  const targetOrigin = 'https://example.com';

  beforeEach(() => {
    bridge = new MessageBridge({
      appId: 'test-app',
      userId: 'test-user',
      allowedOrigins: ['https://example.com', '*'],
      timeout: 5000,
    });

    // Mock window object
    mockWindow = {
      postMessage: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;
  });

  afterEach(() => {
    bridge.destroy();
  });

  describe('初始化', () => {
    it('应该正确初始化消息桥', () => {
      expect(bridge).toBeDefined();
      bridge.initialize(mockWindow, targetOrigin);
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('应该在销毁时移除事件监听器', () => {
      bridge.initialize(mockWindow, targetOrigin);
      bridge.destroy();
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('消息发送', () => {
    beforeEach(() => {
      bridge.initialize(mockWindow, targetOrigin);
    });

    it('应该正确发送单向消息', () => {
      const payload = { data: 'test' };
      bridge.send('test-action', payload);

      expect(mockWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.EVENT,
          action: 'test-action',
          payload,
        }),
        targetOrigin
      );
    });

    it('应该为每条消息生成唯一ID', () => {
      bridge.send('action1', {});
      bridge.send('action2', {});

      const calls = (mockWindow.postMessage as any).mock.calls;
      expect(calls[0][0].id).not.toBe(calls[1][0].id);
    });

    it('应该包含时间戳和nonce', () => {
      bridge.send('test-action', {});

      const message = (mockWindow.postMessage as any).mock.calls[0][0];
      expect(message.timestamp).toBeGreaterThan(0);
      expect(message.nonce).toBeTruthy();
    });
  });

  describe('消息请求-响应', () => {
    beforeEach(() => {
      bridge.initialize(mockWindow, targetOrigin);
    });

    it('应该正确处理请求-响应流程', async () => {
      const requestPayload = { query: 'test' };
      const responsePayload = { result: 'success' };

      // 模拟响应
      setTimeout(() => {
        const requestMessage = (mockWindow.postMessage as any).mock.calls[0][0];
        const responseMessage = {
          id: requestMessage.id,
          type: MessageType.RESPONSE,
          action: 'test-action',
          payload: responsePayload,
          timestamp: Date.now(),
          nonce: 'test-nonce',
          version: '1.0.0',
        };

        // 触发消息事件
        const messageEvent = new MessageEvent('message', {
          data: responseMessage,
          origin: targetOrigin,
        });
        window.dispatchEvent(messageEvent);
      }, 100);

      const response = await bridge.request('test-action', requestPayload);
      expect(response).toEqual(responsePayload);
    });

    it('应该在超时时拒绝请求', async () => {
      const shortTimeoutBridge = new MessageBridge({
        appId: 'test-app',
        userId: 'test-user',
        allowedOrigins: ['*'],
        timeout: 100,
      });
      shortTimeoutBridge.initialize(mockWindow, targetOrigin);

      await expect(
        shortTimeoutBridge.request('test-action', {})
      ).rejects.toThrow('timeout');

      shortTimeoutBridge.destroy();
    });
  });

  describe('消息处理器', () => {
    beforeEach(() => {
      bridge.initialize(mockWindow, targetOrigin);
    });

    it('应该正确注册和调用处理器', async () => {
      const handler = vi.fn().mockResolvedValue({ result: 'ok' });
      bridge.on('test-action', handler);

      // 模拟接收消息
      const message = {
        id: 'msg-1',
        type: MessageType.REQUEST,
        action: 'test-action',
        payload: { data: 'test' },
        timestamp: Date.now(),
        nonce: 'test-nonce',
        version: '1.0.0',
      };

      const messageEvent = new MessageEvent('message', {
        data: message,
        origin: targetOrigin,
      });
      window.dispatchEvent(messageEvent);

      // 等待异步处理
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(handler).toHaveBeenCalledWith(
        { data: 'test' },
        expect.objectContaining({
          appId: 'test-app',
          userId: 'test-user',
        })
      );
    });

    it('应该支持多个处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bridge.on('action1', handler1);
      bridge.on('action2', handler2);

      // 模拟两个不同的消息
      const message1 = {
        id: 'msg-1',
        type: MessageType.REQUEST,
        action: 'action1',
        payload: {},
        timestamp: Date.now(),
        nonce: 'nonce-1',
        version: '1.0.0',
      };

      const message2 = {
        id: 'msg-2',
        type: MessageType.REQUEST,
        action: 'action2',
        payload: {},
        timestamp: Date.now(),
        nonce: 'nonce-2',
        version: '1.0.0',
      };

      window.dispatchEvent(new MessageEvent('message', { data: message1, origin: targetOrigin }));
      window.dispatchEvent(new MessageEvent('message', { data: message2, origin: targetOrigin }));

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('消息验证', () => {
    beforeEach(() => {
      bridge.initialize(mockWindow, targetOrigin);
    });

    it('应该拒绝来自错误源的消息', () => {
      const handler = vi.fn();
      bridge.on('test-action', handler);

      const message = {
        id: 'msg-1',
        type: MessageType.REQUEST,
        action: 'test-action',
        payload: {},
        timestamp: Date.now(),
        nonce: 'test-nonce',
        version: '1.0.0',
      };

      const messageEvent = new MessageEvent('message', {
        data: message,
        origin: 'https://malicious.com',
      });
      window.dispatchEvent(messageEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    it('应该拒绝过期的消息', () => {
      const handler = vi.fn();
      bridge.on('test-action', handler);

      const message = {
        id: 'msg-1',
        type: MessageType.REQUEST,
        action: 'test-action',
        payload: {},
        timestamp: Date.now() - 120000, // 2分钟前
        nonce: 'test-nonce',
        version: '1.0.0',
      };

      const messageEvent = new MessageEvent('message', {
        data: message,
        origin: targetOrigin,
      });
      window.dispatchEvent(messageEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    it('应该拒绝格式错误的消息', () => {
      const handler = vi.fn();
      bridge.on('test-action', handler);

      const invalidMessage = {
        // 缺少必需字段
        action: 'test-action',
      };

      const messageEvent = new MessageEvent('message', {
        data: invalidMessage,
        origin: targetOrigin,
      });
      window.dispatchEvent(messageEvent);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    beforeEach(() => {
      bridge.initialize(mockWindow, targetOrigin);
    });

    it('应该正确处理处理器抛出的错误', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
      bridge.on('test-action', handler);

      const message = {
        id: 'msg-1',
        type: MessageType.REQUEST,
        action: 'test-action',
        payload: {},
        timestamp: Date.now(),
        nonce: 'test-nonce',
        version: '1.0.0',
      };

      const messageEvent = new MessageEvent('message', {
        data: message,
        origin: targetOrigin,
      });
      window.dispatchEvent(messageEvent);

      await new Promise(resolve => setTimeout(resolve, 50));

      // 应该发送错误响应
      expect(mockWindow.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: MessageType.ERROR,
          id: 'msg-1',
        }),
        targetOrigin
      );
    });
  });

  describe('消息大小限制', () => {
    it('应该拒绝超大消息', () => {
      const largeBridge = new MessageBridge({
        appId: 'test-app',
        userId: 'test-user',
        allowedOrigins: ['*'],
        maxMessageSize: 100, // 100 bytes limit
      });
      largeBridge.initialize(mockWindow, targetOrigin);

      const largePayload = { data: 'x'.repeat(1000) };

      expect(() => {
        largeBridge.send('test-action', largePayload);
      }).toThrow('Message size exceeds limit');

      largeBridge.destroy();
    });
  });
});
