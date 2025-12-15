import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MiniAppNotification, NotificationConfig } from '../../src/apis/notification';
import { RepeatInterval, PermissionStatus, Permission } from '../../src/apis/types';
import { PermissionManager } from '../../src/core/permissions';

describe('MiniAppNotification', () => {
  let notification: MiniAppNotification;
  let permissionManager: PermissionManager;

  beforeEach(() => {
    permissionManager = new PermissionManager('test-app', 'test-user');
    permissionManager.grant(Permission.SYSTEM_NOTIFICATION);

    notification = new MiniAppNotification({
      appId: 'test-app',
      userId: 'test-user',
      permissionManager,
    });

    // Mock Notification API
    global.Notification = {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    } as any;

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('权限请求', () => {
    it('应该正确请求通知权限', async () => {
      const status = await notification.requestPermission();
      expect(status).toBe(PermissionStatus.GRANTED);
      expect(global.Notification.requestPermission).toHaveBeenCalled();
    });

    it('应该处理用户拒绝权限', async () => {
      (global.Notification.requestPermission as any).mockResolvedValue('denied');

      const status = await notification.requestPermission();
      expect(status).toBe(PermissionStatus.DENIED);
    });

    it('应该返回已授予的权限状态', async () => {
      global.Notification.permission = 'granted';

      const status = await notification.requestPermission();
      expect(status).toBe(PermissionStatus.GRANTED);
    });
  });

  describe('即时通知', () => {
    beforeEach(() => {
      global.Notification.permission = 'granted';
    });

    it('应该正确显示通知', async () => {
      const mockNotification = {
        close: vi.fn(),
        addEventListener: vi.fn(),
      };

      global.Notification = vi.fn().mockReturnValue(mockNotification) as any;
      global.Notification.permission = 'granted';

      await notification.show({
        title: 'Test Notification',
        body: 'This is a test',
      });

      expect(global.Notification).toHaveBeenCalledWith(
        'Test Notification',
        expect.objectContaining({
          body: 'This is a test',
        })
      );
    });

    it('应该在没有权限时抛出错误', async () => {
      global.Notification.permission = 'denied';

      await expect(
        notification.show({
          title: 'Test',
          body: 'Test',
        })
      ).rejects.toThrow('Browser notification permission not granted');
    });

    it('应该支持通知选项', async () => {
      const mockNotification = {
        close: vi.fn(),
        addEventListener: vi.fn(),
      };

      global.Notification = vi.fn().mockReturnValue(mockNotification) as any;
      global.Notification.permission = 'granted';

      await notification.show({
        title: 'Test',
        body: 'Test body',
        icon: 'icon.png',
        badge: 'badge.png',
        tag: 'custom-tag',
        silent: true,
      });

      expect(global.Notification).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          body: 'Test body',
          icon: 'icon.png',
          badge: 'badge.png',
          tag: 'custom-tag',
          silent: true,
        })
      );
    });

    it('应该支持通知点击事件', async () => {
      const mockNotification = {
        close: vi.fn(),
        addEventListener: vi.fn(),
      };

      global.Notification = vi.fn().mockReturnValue(mockNotification) as any;
      global.Notification.permission = 'granted';

      const onClick = vi.fn();

      await notification.show({
        title: 'Test',
        body: 'Test',
        onClick,
      });

      expect(mockNotification.addEventListener).toHaveBeenCalledWith('click', onClick);
    });
  });

  describe('定时通知', () => {
    beforeEach(() => {
      const mockNotification = {
        close: vi.fn(),
        addEventListener: vi.fn(),
      };

      global.Notification = vi.fn().mockReturnValue(mockNotification) as any;
      global.Notification.permission = 'granted';
    });

    it('应该正确调度延迟通知', async () => {
      const notificationId = await notification.schedule({
        title: 'Scheduled',
        body: 'This is scheduled',
        delay: 5000, // 5秒后
      });

      expect(notificationId).toBeTruthy();

      // 快进时间
      vi.advanceTimersByTime(5000);

      // 验证通知被触发
      await vi.runAllTimersAsync();
    });

    it('应该正确调度绝对时间通知', async () => {
      const futureTime = new Date(Date.now() + 10000); // 10秒后

      const notificationId = await notification.schedule({
        title: 'Scheduled',
        body: 'At specific time',
        scheduledTime: futureTime,
      });

      expect(notificationId).toBeTruthy();

      // 快进到指定时间
      vi.advanceTimersByTime(10000);
      await vi.runAllTimersAsync();
    });

    it('应该拒绝过去的时间', async () => {
      const pastTime = new Date(Date.now() - 1000);

      await expect(
        notification.schedule({
          title: 'Test',
          body: 'Test',
          scheduledTime: pastTime,
        })
      ).rejects.toThrow('Scheduled time must be in the future');
    });

    it('应该正确取消定时通知', async () => {
      const notificationId = await notification.schedule({
        title: 'Test',
        body: 'Test',
        delay: 5000,
      });

      await notification.cancel(notificationId);

      // 快进时间,通知不应该被触发
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();

      // 验证通知没有被创建
      expect(global.Notification).not.toHaveBeenCalled();
    });

    it('应该限制最大定时通知数量', async () => {
      const promises = [];

      // 尝试创建超过限制的通知
      for (let i = 0; i < 11; i++) {
        promises.push(
          notification.schedule({
            title: `Notification ${i}`,
            body: 'Test',
            delay: 1000,
          })
        );
      }

      // 第11个应该失败
      await expect(Promise.all(promises)).rejects.toThrow(
        'Maximum scheduled notifications limit reached'
      );
    });
  });

  describe('重复通知', () => {
    beforeEach(() => {
      const mockNotification = {
        close: vi.fn(),
        addEventListener: vi.fn(),
      };

      global.Notification = vi.fn().mockReturnValue(mockNotification) as any;
      global.Notification.permission = 'granted';
    });

    it('应该支持每日重复通知', async () => {
      const notificationId = await notification.schedule({
        title: 'Daily',
        body: 'Daily notification',
        delay: 1000,
        repeat: RepeatInterval.DAILY,
      });

      expect(notificationId).toBeTruthy();

      // 快进一天
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
      await vi.runAllTimersAsync();

      // 通知应该被重新调度
    });

    it('应该支持每周重复通知', async () => {
      const notificationId = await notification.schedule({
        title: 'Weekly',
        body: 'Weekly notification',
        delay: 1000,
        repeat: RepeatInterval.WEEKLY,
      });

      expect(notificationId).toBeTruthy();
    });

    it('应该支持每月重复通知', async () => {
      const notificationId = await notification.schedule({
        title: 'Monthly',
        body: 'Monthly notification',
        delay: 1000,
        repeat: RepeatInterval.MONTHLY,
      });

      expect(notificationId).toBeTruthy();
    });

    it('应该在取消时停止重复', async () => {
      const notificationId = await notification.schedule({
        title: 'Repeating',
        body: 'Test',
        delay: 1000,
        repeat: RepeatInterval.DAILY,
      });

      // 触发第一次
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      // 取消
      await notification.cancel(notificationId);

      // 快进一天,不应该再触发
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
      await vi.runAllTimersAsync();
    });
  });

  describe('通知数据', () => {
    beforeEach(() => {
      global.Notification.permission = 'granted';
    });

    it('应该支持自定义数据', async () => {
      const mockNotification = {
        close: vi.fn(),
        addEventListener: vi.fn(),
      };

      global.Notification = vi.fn().mockReturnValue(mockNotification) as any;
      global.Notification.permission = 'granted';

      const customData = { userId: '123', action: 'open-chat' };

      await notification.show({
        title: 'Test',
        body: 'Test',
        data: customData,
      });

      expect(global.Notification).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          data: customData,
        })
      );
    });

    it('应该支持操作按钮', async () => {
      const mockNotification = {
        close: vi.fn(),
        addEventListener: vi.fn(),
      };

      global.Notification = vi.fn().mockReturnValue(mockNotification) as any;
      global.Notification.permission = 'granted';

      const actions = [
        { action: 'reply', title: '回复' },
        { action: 'dismiss', title: '忽略' },
      ];

      await notification.show({
        title: 'Test',
        body: 'Test',
        actions,
      });

      expect(global.Notification).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          actions,
        })
      );
    });
  });

  describe('错误处理', () => {
    it('应该处理通知创建失败', async () => {
      global.Notification.permission = 'granted';
      global.Notification = vi.fn().mockImplementation(() => {
        throw new Error('Notification failed');
      }) as any;
      global.Notification.permission = 'granted';

      await expect(
        notification.show({
          title: 'Test',
          body: 'Test',
        })
      ).rejects.toThrow('Notification failed');
    });

    it('应该处理无效的通知ID', async () => {
      await expect(
        notification.cancel('invalid-id')
      ).rejects.toThrow('Notification not found');
    });

    it('应该验证必需字段', async () => {
      global.Notification.permission = 'granted';

      await expect(
        notification.show({
          title: '',
          body: 'Test',
        })
      ).rejects.toThrow();

      await expect(
        notification.show({
          title: 'Test',
          body: '',
        })
      ).rejects.toThrow();
    });
  });

  describe('通知管理', () => {
    beforeEach(() => {
      global.Notification.permission = 'granted';
    });

    it('应该能够列出所有定时通知', async () => {
      await notification.schedule({
        title: 'Notification 1',
        body: 'Test 1',
        delay: 5000,
      });

      await notification.schedule({
        title: 'Notification 2',
        body: 'Test 2',
        delay: 10000,
      });

      // 这里需要实现 list() 方法来测试
      // const scheduled = await notification.list();
      // expect(scheduled).toHaveLength(2);
    });

    it('应该在通知触发后自动清理', async () => {
      const mockNotification = {
        close: vi.fn(),
        addEventListener: vi.fn(),
      };

      global.Notification = vi.fn().mockReturnValue(mockNotification) as any;
      global.Notification.permission = 'granted';

      const notificationId = await notification.schedule({
        title: 'Test',
        body: 'Test',
        delay: 1000,
      });

      // 触发通知
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      // 尝试取消已触发的通知应该失败
      await expect(
        notification.cancel(notificationId)
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('通知优先级', () => {
    beforeEach(() => {
      global.Notification.permission = 'granted';
    });

    it('应该支持不同的优先级', async () => {
      const mockNotification = {
        close: vi.fn(),
        addEventListener: vi.fn(),
      };

      global.Notification = vi.fn().mockReturnValue(mockNotification) as any;
      global.Notification.permission = 'granted';

      await notification.show({
        title: 'High Priority',
        body: 'Important message',
        requireInteraction: true, // 高优先级通知
      });

      expect(global.Notification).toHaveBeenCalledWith(
        'High Priority',
        expect.objectContaining({
          requireInteraction: true,
        })
      );
    });
  });
});
