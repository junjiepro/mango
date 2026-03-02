/**
 * LearningService Unit Tests
 * 测试学习规则服务的核心功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockDatabaseError,
  mockSuccessResponse,
} from '../../helpers/supabase-mock';
import { createMockLearningRecord, createMockLearningRecordList } from '../../helpers/test-data';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('LearningService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let learningService: typeof import('@/services/LearningService').learningService;

  beforeEach(async () => {
    vi.resetModules();
    mockSupabase = createMockSupabaseClient();
    const { createClient } = await import('@/lib/supabase/client');
    vi.mocked(createClient).mockReturnValue(mockSupabase as any);

    const serviceModule = await import('@/services/LearningService');
    learningService = serviceModule.learningService;
  });

  describe('createRecord', () => {
    it('应该成功创建偏好记录并使用默认 confidence', async () => {
      const mockRecord = createMockLearningRecord({
        record_type: 'preference',
        confidence: 0.5,
      });

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(mockRecord));

      const result = await learningService.createRecord({
        record_type: 'preference',
        content: { format: 'table' },
      });

      expect(result.record_type).toBe('preference');
      expect(result.confidence).toBe(0.5);
      expect(mockSupabase.from).toHaveBeenCalledWith('learning_records');
    });

    it('应该成功创建扩展 Skill 并设置正确的 confidence', async () => {
      const mockRecord = createMockLearningRecord({
        record_type: 'skill',
        confidence: 0.8,
      });

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .insert()
        .select()
        .single.mockResolvedValue(mockSuccessResponse(mockRecord));

      const result = await learningService.createRecord({
        record_type: 'skill',
        content: { name: 'custom-skill', trigger: 'when user asks about X' },
        confidence: 0.8,
      });

      expect(result.record_type).toBe('skill');
      expect(result.confidence).toBe(0.8);
    });

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(
        learningService.createRecord({
          record_type: 'preference',
          content: {},
        })
      ).rejects.toThrow('User not authenticated');
    });
  });

  describe('getActiveRecords', () => {
    it('应该按 confidence 降序返回活跃记录', async () => {
      const mockRecords = createMockLearningRecordList(3);

      mockSupabase.auth.getUser.mockResolvedValue(mockAuthenticatedUser());
      mockSupabase
        .from()
        .select()
        .eq()
        .eq()
        .order.mockResolvedValue(mockSuccessResponse(mockRecords));

      const result = await learningService.getActiveRecords();

      expect(result).toHaveLength(3);
      expect(mockSupabase.from).toHaveBeenCalledWith('learning_records');
    });

    it('应该在用户未认证时抛出错误', async () => {
      mockSupabase.auth.getUser.mockResolvedValue(mockUnauthenticatedUser());

      await expect(learningService.getActiveRecords()).rejects.toThrow('User not authenticated');
    });
  });

  describe('deactivateRecord', () => {
    it('应该成功停用记录', async () => {
      mockSupabase.from().update().eq.mockResolvedValue({ error: null });

      await learningService.deactivateRecord('learning-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('learning_records');
    });
  });

  describe('deleteRecord', () => {
    it('应该成功删除记录', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue({ error: null });

      await learningService.deleteRecord('learning-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('learning_records');
    });

    it('应该在删除失败时抛出错误', async () => {
      mockSupabase.from().delete().eq.mockResolvedValue(mockDatabaseError('Delete failed'));

      await expect(learningService.deleteRecord('learning-123')).rejects.toMatchObject({
        message: 'Delete failed',
      });
    });
  });
});
