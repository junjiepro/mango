import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PermissionManager, PERMISSION_CATALOG } from '../../src/core/permissions';
import { Permission, PermissionStatus } from '../../src/apis/types';

describe('PermissionManager', () => {
  let permissionManager: PermissionManager;
  const appId = 'test-app';
  const userId = 'test-user';

  beforeEach(() => {
    permissionManager = new PermissionManager(appId, userId);
  });

  describe('基本权限检查', () => {
    it('应该正确初始化权限管理器', () => {
      expect(permissionManager).toBeDefined();
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(false);
    });

    it('应该正确授予权限', () => {
      const status = permissionManager.grant(Permission.USER_READ);
      expect(status).toBe(PermissionStatus.GRANTED);
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(true);
    });

    it('应该正确拒绝权限', () => {
      const status = permissionManager.deny(Permission.USER_READ);
      expect(status).toBe(PermissionStatus.DENIED);
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(false);
    });

    it('应该正确撤销权限', () => {
      permissionManager.grant(Permission.USER_READ);
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(true);

      permissionManager.revoke(Permission.USER_READ);
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(false);
    });
  });

  describe('权限过期', () => {
    it('应该支持临时权限授予', async () => {
      // 授予 100ms 的临时权限
      permissionManager.grant(Permission.USER_READ, 100);
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(true);

      // 等待权限过期
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(false);
    });

    it('应该正确处理永久权限', async () => {
      permissionManager.grant(Permission.USER_READ);
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(true);
    });
  });

  describe('权限请求', () => {
    it('应该正确处理用户同意的权限请求', async () => {
      // Mock 用户同意
      vi.spyOn(global, 'confirm').mockReturnValue(true);

      const status = await permissionManager.request(Permission.USER_READ);
      expect(status).toBe(PermissionStatus.GRANTED);
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(true);
    });

    it('应该正确处理用户拒绝的权限请求', async () => {
      // Mock 用户拒绝
      vi.spyOn(global, 'confirm').mockReturnValue(false);

      const status = await permissionManager.request(Permission.USER_READ);
      expect(status).toBe(PermissionStatus.DENIED);
      expect(permissionManager.isGranted(Permission.USER_READ)).toBe(false);
    });

    it('应该返回已授予的权限状态', async () => {
      permissionManager.grant(Permission.USER_READ);

      const status = await permissionManager.request(Permission.USER_READ);
      expect(status).toBe(PermissionStatus.GRANTED);
    });
  });

  describe('权限验证', () => {
    it('应该正确验证单个权限', () => {
      permissionManager.grant(Permission.USER_READ);

      const result = permissionManager.validate([Permission.USER_READ]);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('应该正确验证多个权限', () => {
      permissionManager.grant(Permission.USER_READ);
      permissionManager.grant(Permission.STORAGE_LOCAL);

      const result = permissionManager.validate([
        Permission.USER_READ,
        Permission.STORAGE_LOCAL,
      ]);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('应该正确识别缺失的权限', () => {
      permissionManager.grant(Permission.USER_READ);

      const result = permissionManager.validate([
        Permission.USER_READ,
        Permission.USER_WRITE,
        Permission.STORAGE_LOCAL,
      ]);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual([
        Permission.USER_WRITE,
        Permission.STORAGE_LOCAL,
      ]);
    });

    it('应该正确处理空权限列表', () => {
      const result = permissionManager.validate([]);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe('权限目录', () => {
    it('应该包含所有定义的权限', () => {
      const permissions = Object.values(Permission);
      permissions.forEach(permission => {
        expect(PERMISSION_CATALOG[permission]).toBeDefined();
        expect(PERMISSION_CATALOG[permission].name).toBeTruthy();
        expect(PERMISSION_CATALOG[permission].description).toBeTruthy();
      });
    });

    it('应该正确分类权限风险等级', () => {
      expect(PERMISSION_CATALOG[Permission.USER_READ].risk).toBe('low');
      expect(PERMISSION_CATALOG[Permission.USER_WRITE].risk).toBe('medium');
      expect(PERMISSION_CATALOG[Permission.NETWORK_EXTERNAL].risk).toBe('high');
    });
  });

  describe('批量操作', () => {
    it('应该支持批量授予权限', () => {
      const permissions = [
        Permission.USER_READ,
        Permission.STORAGE_LOCAL,
        Permission.SYSTEM_NOTIFICATION,
      ];

      permissions.forEach(p => permissionManager.grant(p));

      const result = permissionManager.validate(permissions);
      expect(result.valid).toBe(true);
    });

    it('应该支持批量撤销权限', () => {
      const permissions = [
        Permission.USER_READ,
        Permission.STORAGE_LOCAL,
      ];

      permissions.forEach(p => permissionManager.grant(p));
      permissions.forEach(p => permissionManager.revoke(p));

      permissions.forEach(p => {
        expect(permissionManager.isGranted(p)).toBe(false);
      });
    });
  });
});
