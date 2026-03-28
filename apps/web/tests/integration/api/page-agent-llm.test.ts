import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUserMock = vi.fn();
const maybeSingleMock = vi.fn();
const eqStatusMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const eqBindingCodeMock = vi.fn(() => ({ eq: eqStatusMock }));
const selectMock = vi.fn(() => ({ eq: eqBindingCodeMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const { checkRateLimitMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: getUserMock,
    },
  })),
  createAdminClient: vi.fn(() => ({
    from: fromMock,
  })),
}));

vi.mock('@/lib/rate-limit', () => ({
  RATE_LIMITS: {
    chat: { limit: 20, windowMs: 60_000 },
  },
  checkRateLimit: checkRateLimitMock,
}));

import { OPTIONS, POST } from '@/app/api/page-agent/llm/[...path]/route';

describe('Page Agent LLM Proxy Route', () => {
  const originalEnv = {
    apiBase: process.env.MODEL_PROVIDER_1_API_BASE,
    apiKey: process.env.MODEL_PROVIDER_1_API_KEY,
    models: process.env.MODEL_PROVIDER_1_MODELS,
  };

  beforeEach(() => {
    process.env.MODEL_PROVIDER_1_API_BASE = 'https://provider.example.com/v1';
    process.env.MODEL_PROVIDER_1_API_KEY = 'test-secret';
    process.env.MODEL_PROVIDER_1_MODELS = 'test-model,test-model-2';
    getUserMock.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    maybeSingleMock.mockResolvedValue({
      data: null,
      error: null,
    });
    checkRateLimitMock.mockReturnValue(null);
  });

  afterEach(() => {
    process.env.MODEL_PROVIDER_1_API_BASE = originalEnv.apiBase;
    process.env.MODEL_PROVIDER_1_API_KEY = originalEnv.apiKey;
    process.env.MODEL_PROVIDER_1_MODELS = originalEnv.models;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    getUserMock.mockReset();
    maybeSingleMock.mockReset();
    eqStatusMock.mockClear();
    eqBindingCodeMock.mockClear();
    selectMock.mockClear();
    fromMock.mockClear();
    checkRateLimitMock.mockReset();
  });

  it('returns CORS headers for OPTIONS requests', async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization');
  });

  it('rejects unauthenticated requests without a valid binding code', async () => {
    const request = new NextRequest('http://localhost:3000/api/page-agent/llm/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'open the orders page' }],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ['chat', 'completions'] }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: {
        message: 'Unauthorized',
      },
    });
  });

  it('allows requests authenticated by binding code', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: 'binding-123' },
      error: null,
    });

    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'chatcmpl-test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', upstreamFetch);

    const request = new NextRequest('http://localhost:3000/api/page-agent/llm/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer binding-code-123',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'open the orders page' }],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ['chat', 'completions'] }),
    });

    expect(fromMock).toHaveBeenCalledWith('device_bindings');
    expect(selectMock).toHaveBeenCalledWith('id');
    expect(eqBindingCodeMock).toHaveBeenCalledWith('binding_code', 'binding-code-123');
    expect(eqStatusMock).toHaveBeenCalledWith('status', 'active');
    expect(checkRateLimitMock).toHaveBeenCalledWith('page-agent:binding_code:binding-code-123', {
      limit: 20,
      windowMs: 60000,
    });
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    expect(upstreamFetch).toHaveBeenCalledWith(
      'https://provider.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-secret',
          'Content-Type': 'application/json',
        }),
      })
    );

    const [, init] = upstreamFetch.mock.calls[0];
    expect(JSON.parse(String(init.body))).toEqual({
      messages: [{ role: 'user', content: 'open the orders page' }],
      model: 'test-model',
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: 'chatcmpl-test' });
  });

  it('ignores explicit model values from the request body and always uses the default model', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: 'binding-123' },
      error: null,
    });

    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', upstreamFetch);

    const request = new NextRequest('http://localhost:3000/api/page-agent/llm/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer binding-code-123',
      },
      body: JSON.stringify({
        model: 'custom-model',
        messages: [{ role: 'user', content: 'log in' }],
      }),
    });

    await POST(request, {
      params: Promise.resolve({ path: ['chat', 'completions'] }),
    });

    const [, init] = upstreamFetch.mock.calls[0];
    expect(JSON.parse(String(init.body))).toEqual({
      model: 'test-model',
      messages: [{ role: 'user', content: 'log in' }],
    });
  });

  it('allows authenticated first-party requests without a binding code', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const upstreamFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', upstreamFetch);

    const request = new NextRequest('http://localhost:3000/api/page-agent/llm/chat/completions', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'summarize the page' }],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ['chat', 'completions'] }),
    });

    expect(response.status).toBe(200);
    expect(checkRateLimitMock).toHaveBeenCalledWith('page-agent:user:user-123', {
      limit: 20,
      windowMs: 60000,
    });
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid binding code even when a user session exists', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/page-agent/llm/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid-binding-code',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'summarize the page' }],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ['chat', 'completions'] }),
    });

    expect(response.status).toBe(401);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it('returns a CORS-safe 429 response when rate limited', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: 'binding-123' },
      error: null,
    });
    checkRateLimitMock.mockReturnValue(
      new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '12',
        },
      })
    );

    const request = new NextRequest('http://localhost:3000/api/page-agent/llm/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer binding-code-123',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'open the orders page' }],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ['chat', 'completions'] }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Retry-After')).toBe('12');
    await expect(response.json()).resolves.toEqual({ error: 'Too many requests' });
  });

  it('rejects unsupported upstream paths', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { id: 'binding-123' },
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/page-agent/llm/models', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer binding-code-123',
      },
      body: JSON.stringify({}),
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ['models'] }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        message: 'Unsupported page-agent upstream path',
      },
    });
  });
});
