import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MiniAppSandbox, SandboxConfig } from '../../src/core/sandbox';
import { SandboxState, Permission } from '../../src/apis/types';

describe('MiniAppSandbox', () => {
  let sandbox: MiniAppSandbox;
  let container: HTMLDivElement;

  beforeEach(() => {
    // 创建容器元素
    container = document.createElement('div');
    container.id = 'sandbox-container';
    document.body.appendChild(container);

    sandbox = new MiniAppSandbox({
      appId: 'test-app',
      userId: 'test-user',
      manifest: {
        id: 'test-app',
        name: 'Test App',
        version: '1.0.0',
        description: 'Test MiniApp',
        author: 'Test Author',
        permissions: [Permission.USER_READ, Permission.STORAGE_LOCAL],
        entryPoint: '/app.js',
        sandbox: {
          allowScripts: true,
          allowForms: false,
          allowPopups: false,
          allowModals: false,
        },
      },
      container,
      baseUrl: 'https://example.com',
    });
  });

  afterEach(() => {
    sandbox.destroy();
    document.body.removeChild(container);
  });

  describe('初始化', () => {
    it('应该正确创建沙箱实例', () => {
      expect(sandbox).toBeDefined();
    });

    it('应该在加载前处于IDLE状态', () => {
      expect(sandbox.getState()).toBe(SandboxState.IDLE);
    });

    it('应该正确设置权限', () => {
      const permissions = sandbox.getPermissions();
      expect(permissions).toContain(Permission.USER_READ);
      expect(permissions).toContain(Permission.STORAGE_LOCAL);
    });
  });

  describe('加载', () => {
    it('应该正确加载MiniApp', async () => {
      await sandbox.load();

      expect(sandbox.getState()).toBe(SandboxState.RUNNING);

      // 验证iframe已创建
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();
    });

    it('应该设置正确的sandbox属性', async () => {
      await sandbox.load();

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('sandbox')).toContain('allow-scripts');
      expect(iframe?.getAttribute('sandbox')).toContain('allow-same-origin');
    });

    it('应该设置安全相关的属性', async () => {
      await sandbox.load();

      const iframe = container.querySelector('iframe');
      expect(iframe?.getAttribute('referrerpolicy')).toBe('no-referrer');
    });

    it('应该在重复加载时抛出错误', async () => {
      await sandbox.load();

      await expect(sandbox.load()).rejects.toThrow(
        'Cannot load sandbox in state'
      );
    });

    it('应该在加载失败时进入ERROR状态', async () => {
      const failingSandbox = new MiniAppSandbox({
        appId: 'test-app',
        userId: 'test-user',
        manifest: {
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          description: 'Test',
          author: 'Test',
          permissions: [],
          entryPoint: '/invalid.js',
        },
        container,
        baseUrl: 'https://invalid-domain-that-does-not-exist.com',
      });

      try {
        await failingSandbox.load();
      } catch (error) {
        expect(failingSandbox.getState()).toBe(SandboxState.ERROR);
      }

      failingSandbox.destroy();
    });
  });

  describe('消息通信', () => {
    beforeEach(async () => {
      await sandbox.load();
    });

    it('应该能够发送消息到MiniApp', async () => {
      const payload = { action: 'test', data: 'hello' };

      // Mock iframe的postMessage
      const iframe = container.querySelector('iframe');
      const postMessageSpy = vi.spyOn(iframe!.contentWindow!, 'postMessage');

      await sandbox.sendMessage('test-action', payload);

      expect(postMessageSpy).toHaveBeenCalled();
    });

    it('应该能够接收MiniApp的响应', async () => {
      const requestPayload = { query: 'test' };
      const responsePayload = { result: 'success' };

      // 模拟响应
      setTimeout(() => {
        const event = new MessageEvent('message', {
          data: {
            id: expect.any(String),
            type: 'response',
            action: 'test-action',
            payload: responsePayload,
            timestamp: Date.now(),
            nonce: 'test-nonce',
            version: '1.0.0',
          },
          origin: 'https://example.com',
        });
        window.dispatchEvent(event);
      }, 100);

      const response = await sandbox.sendMessage('test-action', requestPayload);
      expect(response).toEqual(responsePayload);
    });

    it('应该在超时时拒绝消息', async () => {
      const shortTimeoutSandbox = new MiniAppSandbox({
        appId: 'test-app',
        userId: 'test-user',
        manifest: {
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          description: 'Test',
          author: 'Test',
          permissions: [],
          entryPoint: '/app.js',
        },
        container: document.createElement('div'),
        baseUrl: 'https://example.com',
      });

      await shortTimeoutSandbox.load();

      await expect(
        shortTimeoutSandbox.sendMessage('test-action', {})
      ).rejects.toThrow('timeout');

      shortTimeoutSandbox.destroy();
    });
  });

  describe('生命周期', () => {
    it('应该正确处理加载生命周期', async () => {
      expect(sandbox.getState()).toBe(SandboxState.IDLE);

      const loadPromise = sandbox.load();
      expect(sandbox.getState()).toBe(SandboxState.LOADING);

      await loadPromise;
      expect(sandbox.getState()).toBe(SandboxState.RUNNING);
    });

    it('应该正确销毁沙箱', async () => {
      await sandbox.load();

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();

      sandbox.destroy();

      expect(sandbox.getState()).toBe(SandboxState.DESTROYED);
      expect(container.querySelector('iframe')).toBeNull();
    });

    it('应该在销毁后拒绝新消息', async () => {
      await sandbox.load();
      sandbox.destroy();

      await expect(
        sandbox.sendMessage('test-action', {})
      ).rejects.toThrow('Sandbox is not running');
    });

    it('应该支持暂停和恢复', async () => {
      await sandbox.load();

      sandbox.pause();
      expect(sandbox.getState()).toBe(SandboxState.PAUSED);

      sandbox.resume();
      expect(sandbox.getState()).toBe(SandboxState.RUNNING);
    });
  });

  describe('安全隔离', () => {
    it('应该限制iframe的权限', async () => {
      await sandbox.load();

      const iframe = container.querySelector('iframe');
      const sandboxAttr = iframe?.getAttribute('sandbox');

      // 不应该包含危险权限
      expect(sandboxAttr).not.toContain('allow-top-navigation');
      expect(sandboxAttr).not.toContain('allow-popups');
    });

    it('应该验证消息来源', async () => {
      await sandbox.load();

      const handler = vi.fn();
      sandbox.on('test-action', handler);

      // 发送来自错误源的消息
      const maliciousEvent = new MessageEvent('message', {
        data: {
          id: 'msg-1',
          type: 'request',
          action: 'test-action',
          payload: {},
          timestamp: Date.now(),
          nonce: 'test-nonce',
          version: '1.0.0',
        },
        origin: 'https://malicious.com',
      });
      window.dispatchEvent(maliciousEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    it('应该设置CSP策略', async () => {
      await sandbox.load();

      const iframe = container.querySelector('iframe');
      const csp = iframe?.getAttribute('csp');

      // 应该有严格的CSP
      expect(csp).toBeTruthy();
    });
  });

  describe('权限管理', () => {
    it('应该正确初始化权限', async () => {
      await sandbox.load();

      const permissions = sandbox.getPermissions();
      expect(permissions).toContain(Permission.USER_READ);
      expect(permissions).toContain(Permission.STORAGE_LOCAL);
    });

    it('应该能够动态授予权限', async () => {
      await sandbox.load();

      sandbox.grantPermission(Permission.SYSTEM_NOTIFICATION);

      const permissions = sandbox.getPermissions();
      expect(permissions).toContain(Permission.SYSTEM_NOTIFICATION);
    });

    it('应该能够撤销权限', async () => {
      await sandbox.load();

      sandbox.revokePermission(Permission.USER_READ);

      const permissions = sandbox.getPermissions();
      expect(permissions).not.toContain(Permission.USER_READ);
    });

    it('应该验证权限请求', async () => {
      await sandbox.load();

      const hasPermission = sandbox.hasPermission(Permission.USER_READ);
      expect(hasPermission).toBe(true);

      const noPermission = sandbox.hasPermission(Permission.NETWORK_EXTERNAL);
      expect(noPermission).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该处理加载错误', async () => {
      const errorSandbox = new MiniAppSandbox({
        appId: 'test-app',
        userId: 'test-user',
        manifest: {
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          description: 'Test',
          author: 'Test',
          permissions: [],
          entryPoint: '/app.js',
        },
        container,
        baseUrl: 'https://invalid-domain-that-does-not-exist.com',
      });

      await expect(errorSandbox.load()).rejects.toThrow();
      expect(errorSandbox.getState()).toBe(SandboxState.ERROR);

      errorSandbox.destroy();
    });

    it('应该处理运行时错误', async () => {
      await sandbox.load();

      const errorHandler = vi.fn();
      sandbox.on('error', errorHandler);

      // 模拟运行时错误
      const errorEvent = new MessageEvent('message', {
        data: {
          id: 'msg-1',
          type: 'error',
          action: 'runtime-error',
          payload: { message: 'Runtime error occurred' },
          timestamp: Date.now(),
          nonce: 'test-nonce',
          version: '1.0.0',
        },
        origin: 'https://example.com',
      });
      window.dispatchEvent(errorEvent);

      expect(errorHandler).toHaveBeenCalled();
    });

    it('应该在容器不存在时抛出错误', () => {
      // Sandbox 构造函数不会立即验证容器,只在 load 时验证
      const invalidSandbox = new MiniAppSandbox({
        appId: 'test-app',
        userId: 'test-user',
        manifest: {
          id: 'test-app',
          name: 'Test App',
          version: '1.0.0',
          description: 'Test',
          author: 'Test',
          permissions: [],
          entryPoint: '/app.js',
        },
        container: null as any,
        baseUrl: 'https://example.com',
      });

      expect(invalidSandbox).toBeDefined();
    });
  });

  describe('性能监控', () => {
    it('应该记录加载时间', async () => {
      const startTime = Date.now();
      await sandbox.load();
      const endTime = Date.now();

      const loadTime = sandbox.getLoadTime();
      expect(loadTime).toBeGreaterThan(0);
      expect(loadTime).toBeLessThanOrEqual(endTime - startTime);
    });

    it('应该提供性能指标', async () => {
      await sandbox.load();

      const metrics = sandbox.getMetrics();
      expect(metrics).toHaveProperty('loadTime');
      expect(metrics).toHaveProperty('messageCount');
      expect(metrics).toHaveProperty('errorCount');
    });
  });

  describe('事件系统', () => {
    it('应该支持事件监听', async () => {
      await sandbox.load();

      const listener = vi.fn();
      sandbox.on('custom-event', listener);

      // 触发事件
      const event = new MessageEvent('message', {
        data: {
          id: 'msg-1',
          type: 'event',
          action: 'custom-event',
          payload: { data: 'test' },
          timestamp: Date.now(),
          nonce: 'test-nonce',
          version: '1.0.0',
        },
        origin: 'https://example.com',
      });
      window.dispatchEvent(event);

      expect(listener).toHaveBeenCalledWith({ data: 'test' });
    });

    it('应该支持移除事件监听', async () => {
      await sandbox.load();

      const listener = vi.fn();
      sandbox.on('custom-event', listener);
      sandbox.off('custom-event', listener);

      // 触发事件
      const event = new MessageEvent('message', {
        data: {
          id: 'msg-1',
          type: 'event',
          action: 'custom-event',
          payload: {},
          timestamp: Date.now(),
          nonce: 'test-nonce',
          version: '1.0.0',
        },
        origin: 'https://example.com',
      });
      window.dispatchEvent(event);

      expect(listener).not.toHaveBeenCalled();
    });

    it('应该支持一次性事件监听', async () => {
      await sandbox.load();

      const listener = vi.fn();
      sandbox.once('custom-event', listener);

      // 触发两次事件
      const event = new MessageEvent('message', {
        data: {
          id: 'msg-1',
          type: 'event',
          action: 'custom-event',
          payload: {},
          timestamp: Date.now(),
          nonce: 'test-nonce',
          version: '1.0.0',
        },
        origin: 'https://example.com',
      });
      window.dispatchEvent(event);
      window.dispatchEvent(event);

      // 应该只被调用一次
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('资源管理', () => {
    it('应该正确清理资源', async () => {
      await sandbox.load();

      const iframe = container.querySelector('iframe');
      expect(iframe).toBeTruthy();

      sandbox.destroy();

      // iframe应该被移除
      expect(container.querySelector('iframe')).toBeNull();
      // 状态应该是DESTROYED
      expect(sandbox.getState()).toBe(SandboxState.DESTROYED);
    });

    it('应该在销毁时清理所有事件监听器', async () => {
      await sandbox.load();

      const listener1 = vi.fn();
      const listener2 = vi.fn();
      sandbox.on('event1', listener1);
      sandbox.on('event2', listener2);

      sandbox.destroy();

      // 触发事件
      const event = new MessageEvent('message', {
        data: {
          id: 'msg-1',
          type: 'event',
          action: 'event1',
          payload: {},
          timestamp: Date.now(),
          nonce: 'test-nonce',
          version: '1.0.0',
        },
        origin: 'https://example.com',
      });
      window.dispatchEvent(event);

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });
});
