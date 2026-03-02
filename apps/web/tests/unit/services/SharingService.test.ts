/**
 * SharingService Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockSuccessResponse,
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
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        });

      await expect(service.createShareLink('nonexistent')).rejects.toThrow();
    });
  });
});
