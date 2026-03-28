import { describe, expect, it } from 'vitest';
import { isProtectedPath } from '@/lib/supabase/auth-config';

describe('auth-config public paths', () => {
  it('treats page-agent LLM proxy routes as public', () => {
    expect(isProtectedPath('/api/page-agent/llm')).toBe(false);
    expect(isProtectedPath('/api/page-agent/llm/chat/completions')).toBe(false);
  });

  it('keeps unrelated API routes protected by default', () => {
    expect(isProtectedPath('/api/devices')).toBe(true);
  });
});
