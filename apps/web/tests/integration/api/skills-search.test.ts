/**
 * Skills Search API Integration Tests
 * 测试 Skill 搜索 API 路由的集成功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/skills/search/route';
import { NextRequest } from 'next/server';
import { createMockSupabaseClient, mockDatabaseError } from '../../helpers/supabase-mock';
import { createMockSkillSearchResults } from '../../helpers/test-data';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Skills Search API Routes', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    mockSupabase = createMockSupabaseClient();
    // 添加 rpc mock
    (mockSupabase as any).rpc = vi.fn();
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any);
    vi.clearAllMocks();
  });

  describe('POST /api/skills/search', () => {
    it('应该成功搜索并返回匹配的 Skill 列表', async () => {
      const mockResults = createMockSkillSearchResults(5);
      (mockSupabase as any).rpc.mockResolvedValue({
        data: mockResults,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/skills/search', {
        method: 'POST',
        body: JSON.stringify({ query: '待办事项' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(5);
      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'search_skills_by_keywords',
        expect.objectContaining({ query_text: '待办事项' })
      );
    });

    it('应该在查询为空时返回 400', async () => {
      const request = new NextRequest('http://localhost:3000/api/skills/search', {
        method: 'POST',
        body: JSON.stringify({ query: '' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('query is required');
    });

    it('应该在缺少 query 参数时返回 400', async () => {
      const request = new NextRequest('http://localhost:3000/api/skills/search', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('应该支持 limit 参数限制结果数量', async () => {
      const mockResults = createMockSkillSearchResults(5);
      (mockSupabase as any).rpc.mockResolvedValue({
        data: mockResults,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/skills/search', {
        method: 'POST',
        body: JSON.stringify({ query: '待办', limit: 5 }),
      });

      await POST(request);

      expect((mockSupabase as any).rpc).toHaveBeenCalledWith(
        'search_skills_by_keywords',
        expect.objectContaining({ match_count: 5 })
      );
    });

    it('应该在数据库错误时返回 500', async () => {
      (mockSupabase as any).rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const request = new NextRequest('http://localhost:3000/api/skills/search', {
        method: 'POST',
        body: JSON.stringify({ query: '测试' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });
});
