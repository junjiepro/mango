/**
 * SharingService Unit Tests
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

describe('SharingService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let SharingService: any;

  beforeEach(async () => {
    vi.resetModules();
    mockSupabase = createMockSupabaseClient();
    const { createClient } = await import('@/lib/supabase/client');
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);
    const serviceModule = await import('@/services/SharingService');
    SharingService = serviceModule.SharingService;
  });

  describe('createShareLink', () => {
    it('未认证时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(service.createShareLink('app-123')).rejects.toThrow();
    });

    it('小应用不存在时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(service.createShareLink('nonexistent')).rejects.toThrow();
    });

    it('小应用不可分享时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse({ id: 'app-123', is_shareable: false, creator_id: 'test-user-id' })
      );

      await expect(service.createShareLink('app-123')).rejects.toThrow();
    });

    it('非所有者时应抛出权限错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse({ id: 'app-123', is_shareable: true, creator_id: 'other-user' })
      );

      await expect(service.createShareLink('app-123')).rejects.toThrow();
    });

    it('应该成功创建分享链接', async () => {
      const service = new SharingService();
      const mockLink = { id: 'link-1', share_token: 'abc123', mini_app_id: 'app-123' };
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce(
          mockSuccessResponse({ id: 'app-123', is_shareable: true, creator_id: 'test-user-id' })
        );
      mockSupabase.from().insert().select().single.mockResolvedValue(mockSuccessResponse(mockLink));

      const result = await service.createShareLink('app-123');
      expect(result).toEqual(mockLink);
    });

    it('数据库错误时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce(
          mockSuccessResponse({ id: 'app-123', is_shareable: true, creator_id: 'test-user-id' })
        );
      mockSupabase.from().insert().select().single.mockResolvedValue(mockDatabaseError('Insert failed'));

      await expect(service.createShareLink('app-123')).rejects.toThrow();
    });
  });

  describe('getMiniAppByShareToken', () => {
    it('无效 token 时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(service.getMiniAppByShareToken('invalid')).rejects.toThrow();
    });

    it('链接已过期时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse({
          id: 'link-1',
          expires_at: new Date(Date.now() - 1000).toISOString(),
          max_uses: null,
          use_count: 0,
          mini_app_id: 'app-123',
        })
      );

      await expect(service.getMiniAppByShareToken('expired-token')).rejects.toThrow();
    });

    it('超过最大使用次数时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse({
          id: 'link-1',
          expires_at: null,
          max_uses: 5,
          use_count: 5,
          mini_app_id: 'app-123',
        })
      );

      await expect(service.getMiniAppByShareToken('maxed-token')).rejects.toThrow();
    });

    it('应该成功返回小应用信息', async () => {
      const service = new SharingService();
      const mockShareLink = { id: 'link-1', expires_at: null, max_uses: null, use_count: 0, mini_app_id: 'app-123' };
      const mockApp = { id: 'app-123', name: 'Test App' };
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce(mockSuccessResponse(mockShareLink))
        .mockResolvedValueOnce(mockSuccessResponse(mockApp));

      const result = await service.getMiniAppByShareToken('valid-token');
      expect(result.mini_app).toEqual(mockApp);
      expect(result.share_link).toEqual(mockShareLink);
    });
  });

  describe('installFromShareLink', () => {
    it('未认证时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(service.installFromShareLink('token', [])).rejects.toThrow();
    });

    it('已安装时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce(
          mockSuccessResponse({ id: 'link-1', expires_at: null, max_uses: null, use_count: 0, mini_app_id: 'app-123' })
        )
        .mockResolvedValueOnce(mockSuccessResponse({ id: 'app-123', manifest: {} }))
        .mockResolvedValueOnce(mockSuccessResponse({ id: 'install-1' }));

      await expect(service.installFromShareLink('token', [])).rejects.toThrow();
    });

    it('缺少必要权限时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce(
          mockSuccessResponse({ id: 'link-1', expires_at: null, max_uses: null, use_count: 0, mini_app_id: 'app-123' })
        )
        .mockResolvedValueOnce(
          mockSuccessResponse({ id: 'app-123', manifest: { required_permissions: ['camera', 'mic'] } })
        )
        .mockResolvedValueOnce({ data: null, error: null }); // not installed

      await expect(service.installFromShareLink('token', ['camera'])).rejects.toThrow();
    });

    it('应该成功安装小应用', async () => {
      const service = new SharingService();
      const mockInstallation = { id: 'install-1', mini_app_id: 'app-123' };
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValueOnce(
          mockSuccessResponse({ id: 'link-1', expires_at: null, max_uses: null, use_count: 0, mini_app_id: 'app-123' })
        )
        .mockResolvedValueOnce(
          mockSuccessResponse({ id: 'app-123', manifest: { required_permissions: [] }, stats: {} })
        )
        .mockResolvedValueOnce({ data: null, error: null }); // not installed
      mockSupabase.from().insert().select().single.mockResolvedValue(mockSuccessResponse(mockInstallation));
      mockSupabase.from().setDefault({ error: null });

      const result = await service.installFromShareLink('token', []);
      expect(result).toEqual(mockInstallation);
    });
  });

  describe('getUserShareLinks', () => {
    it('未认证时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(service.getUserShareLinks()).rejects.toThrow();
    });

    it('应该返回分享链接列表', async () => {
      const service = new SharingService();
      const mockLinks = [{ id: 'link-1' }, { id: 'link-2' }];
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().order.mockResolvedValue(mockSuccessResponse(mockLinks));

      const result = await service.getUserShareLinks();
      expect(result).toEqual(mockLinks);
    });

    it('数据库错误时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().order.mockResolvedValue(mockDatabaseError('DB error'));

      await expect(service.getUserShareLinks()).rejects.toThrow();
    });
  });

  describe('deleteShareLink', () => {
    it('未认证时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(service.deleteShareLink('link-1')).rejects.toThrow();
    });

    it('链接不存在时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      await expect(service.deleteShareLink('nonexistent')).rejects.toThrow();
    });

    it('非所有者时应抛出权限错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse({ id: 'link-1', created_by: 'other-user' })
      );

      await expect(service.deleteShareLink('link-1')).rejects.toThrow();
    });

    it('应该成功删除分享链接', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse({ id: 'link-1', created_by: 'test-user-id' })
      );
      // delete().eq() is awaited directly — use thenable default
      mockSupabase.from().setDefault({ error: null });

      await expect(service.deleteShareLink('link-1')).resolves.toBeUndefined();
    });

    it('数据库错误时应抛出错误', async () => {
      const service = new SharingService();
      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse({ id: 'link-1', created_by: 'test-user-id' })
      );
      mockSupabase.from().setDefault(mockDatabaseError('Delete failed'));

      await expect(service.deleteShareLink('link-1')).rejects.toThrow();
    });
  });
});
