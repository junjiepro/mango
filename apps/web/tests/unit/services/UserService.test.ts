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
  });

  describe('updateUserProfile', () => {
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
});
