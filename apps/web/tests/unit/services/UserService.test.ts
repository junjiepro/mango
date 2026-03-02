/**
 * UserService Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockSuccessResponse,
  mockDatabaseError,
  mockNotFoundError,
  mockCountResponse,
} from '../../helpers/supabase-mock';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('UserService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let UserService: any;

  beforeEach(async () => {
    vi.resetModules();
    mockSupabase = createMockSupabaseClient();
    const { createClient } = await import('@/lib/supabase/client');
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
    const serviceModule = await import('@/services/UserService');
    UserService = serviceModule.UserService;
  });

  describe('getCurrentUserProfile', () => {
    it('应该返回已认证用户的配置', async () => {
      const service = new UserService();
      const mockProfile = { id: 'test-user-id', display_name: 'Test' };

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().single.mockResolvedValue(mockSuccessResponse(mockProfile));

      const result = await service.getCurrentUserProfile();
      expect(result).toEqual(mockProfile);
    });

    it('未认证时应返回 null', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      const result = await service.getCurrentUserProfile();
      expect(result).toBeNull();
    });

    it('配置不存在时应创建默认配置', async () => {
      const service = new UserService();
      const mockProfile = { id: 'test-user-id', display_name: null };

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce(mockNotFoundError())
        .mockResolvedValueOnce(mockSuccessResponse(mockProfile));
      mockSupabase.from().insert().select().single.mockResolvedValue(mockSuccessResponse(mockProfile));

      const result = await service.getCurrentUserProfile();
      expect(result).toEqual(mockProfile);
    });

    it('数据库错误时应抛出错误', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({ data: null, error: { code: 'OTHER_ERROR', message: 'DB error' } });

      await expect(service.getCurrentUserProfile()).rejects.toThrow();
    });
  });

  describe('createUserProfile', () => {
    it('应该成功创建用户配置', async () => {
      const service = new UserService();
      const mockProfile = { id: 'test-user-id', display_name: null };
      mockSupabase.from().insert().select().single.mockResolvedValue(mockSuccessResponse(mockProfile));

      const result = await service.createUserProfile('test-user-id');
      expect(result).toEqual(mockProfile);
    });

    it('数据库错误时应抛出错误', async () => {
      const service = new UserService();
      mockSupabase.from().insert().select().single.mockResolvedValue(mockDatabaseError('Insert failed'));

      await expect(service.createUserProfile('test-user-id')).rejects.toThrow();
    });
  });

  describe('updateUserProfile', () => {
    it('应该成功更新用户配置', async () => {
      const service = new UserService();
      const mockProfile = { id: 'test-user-id', display_name: 'New Name' };
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().update().eq().select().single.mockResolvedValue(mockSuccessResponse(mockProfile));

      const result = await service.updateUserProfile({ display_name: 'New Name' });
      expect(result).toEqual(mockProfile);
    });

    it('未认证时应抛出错误', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(service.updateUserProfile({ display_name: 'New Name' })).rejects.toThrow();
    });

    it('数据库错误时应抛出错误', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .update()
        .eq()
        .select()
        .single.mockResolvedValue(mockDatabaseError('Update failed'));

      await expect(service.updateUserProfile({ display_name: 'New Name' })).rejects.toThrow();
    });
  });

  describe('updatePreferences', () => {
    it('应该成功更新偏好设置', async () => {
      const service = new UserService();
      const mockProfile = { id: 'test-user-id', preferences: { theme: 'dark' } };
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().single.mockResolvedValue(mockSuccessResponse(mockProfile));
      mockSupabase.from().update().eq().select().single.mockResolvedValue(
        mockSuccessResponse({ ...mockProfile, preferences: { theme: 'dark', lang: 'zh' } })
      );

      const result = await service.updatePreferences({ lang: 'zh' });
      expect(result).toBeDefined();
    });

    it('未认证时应抛出错误', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(service.updatePreferences({ theme: 'dark' })).rejects.toThrow();
    });

    it('配置不存在时应抛出错误', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      // getCurrentUserProfile returns null (unauthenticated path via second getUser call)
      mockSupabase.auth.getUser
        .mockResolvedValueOnce(mockAuthenticatedUser()) // updatePreferences auth check
        .mockResolvedValueOnce(mockUnauthenticatedUser()); // getCurrentUserProfile

      await expect(service.updatePreferences({ theme: 'dark' })).rejects.toThrow();
    });
  });

  describe('updateQuota', () => {
    it('应该成功更新配额', async () => {
      const service = new UserService();
      const mockProfile = { id: 'test-user-id', quota: { max_conversations: 100 } };
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().update().eq().select().single.mockResolvedValue(mockSuccessResponse(mockProfile));

      const result = await service.updateQuota({ max_conversations: 100 });
      expect(result).toEqual(mockProfile);
    });

    it('未认证时应抛出错误', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(service.updateQuota({ max_conversations: 100 })).rejects.toThrow();
    });
  });

  describe('getUserStats', () => {
    it('应该返回用户统计信息', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      const builder = mockSupabase.from();
      builder.setDefault({ count: 5, error: null });

      const result = await service.getUserStats();
      expect(result).toHaveProperty('conversationCount');
      expect(result).toHaveProperty('messageCount');
      expect(result).toHaveProperty('taskCount');
    });

    it('未认证时应抛出错误', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(service.getUserStats()).rejects.toThrow();
    });
  });

  describe('updateLastActive', () => {
    it('应该更新最后活跃时间', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      await expect(service.updateLastActive()).resolves.toBeUndefined();
    });

    it('未认证时应静默返回', async () => {
      const service = new UserService();
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(service.updateLastActive()).resolves.toBeUndefined();
    });
  });
});
