import { describe, expect, it } from 'vitest';
import { isProtectedPath, getAuthErrorMessage, getRedirectUrl } from '@/lib/supabase/auth-config';

describe('auth-config public paths', () => {
  it('treats page-agent LLM proxy routes as public', () => {
    expect(isProtectedPath('/api/page-agent/llm')).toBe(false);
    expect(isProtectedPath('/api/page-agent/llm/chat/completions')).toBe(false);
  });

  it('keeps unrelated API routes protected by default', () => {
    expect(isProtectedPath('/api/devices')).toBe(true);
  });
});

describe('getAuthErrorMessage', () => {
  it('returns mapped message for known error', () => {
    expect(getAuthErrorMessage('Invalid login credentials')).toBe('用户名或密码错误');
  });

  it('returns fallback message for unknown error', () => {
    expect(getAuthErrorMessage('some unknown error')).toBe('认证失败，请稍后重试');
  });
});

describe('getRedirectUrl', () => {
  it('returns correct redirect path', () => {
    expect(getRedirectUrl('LOGIN')).toBe('/auth/login');
    expect(getRedirectUrl('HOME')).toBe('/conversations');
  });
});
