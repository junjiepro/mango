import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

const ALLOWED_UPSTREAM_PATHS = new Set(['chat/completions']);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};

function getProxyConfig() {
  const apiBase = process.env.MODEL_PROVIDER_1_API_BASE;
  const apiKey = process.env.MODEL_PROVIDER_1_API_KEY;
  const models = process.env.MODEL_PROVIDER_1_MODELS;

  if (!apiBase || !apiKey || !models) {
    throw new Error('MODEL_PROVIDER_1_* environment variables are not configured');
  }

  const model = models
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);

  if (!model) {
    throw new Error('MODEL_PROVIDER_1_MODELS does not contain a valid model id');
  }

  return {
    apiBase: apiBase.replace(/\/$/, ''),
    apiKey,
    defaultModel: model,
  };
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

function withCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

type RequestAuth =
  | { kind: 'binding_code'; identifier: string }
  | { kind: 'user'; identifier: string };

async function resolveRequestAuth(request: NextRequest): Promise<RequestAuth | null> {
  const bindingCode = getBearerToken(request);
  if (bindingCode) {
    const adminSupabase = createAdminClient();
    const { data: binding, error } = await adminSupabase
      .from('device_bindings')
      .select('id')
      .eq('binding_code', bindingCode)
      .eq('status', 'active')
      .maybeSingle();

    if (!error && binding) {
      return {
        kind: 'binding_code',
        identifier: bindingCode,
      };
    }

    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    kind: 'user',
    identifier: user.id,
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  try {
    const auth = await resolveRequestAuth(request);
    if (!auth) {
      return Response.json(
        {
          error: {
            message: 'Unauthorized',
          },
        },
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const rateLimitResponse = checkRateLimit(
      `page-agent:${auth.kind}:${auth.identifier}`,
      RATE_LIMITS.chat
    );
    if (rateLimitResponse) {
      return withCorsHeaders(rateLimitResponse);
    }

    const { apiBase, apiKey, defaultModel } = getProxyConfig();
    const { path = [] } = await context.params;
    const upstreamPath = path.length > 0 ? path.join('/') : 'chat/completions';

    if (!ALLOWED_UPSTREAM_PATHS.has(upstreamPath)) {
      return Response.json(
        {
          error: {
            message: 'Unsupported page-agent upstream path',
          },
        },
        {
          status: 404,
          headers: corsHeaders,
        }
      );
    }

    const upstreamUrl = `${apiBase}/${upstreamPath}`;
    const rawBody = await request.text();
    const parsedBody = rawBody ? JSON.parse(rawBody) : {};
    const body =
      typeof parsedBody === 'object' && parsedBody !== null
        ? { ...parsedBody, model: defaultModel }
        : { model: defaultModel };

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const responseHeaders = new Headers(corsHeaders);
    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      responseHeaders.set('Content-Type', contentType);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'page-agent LLM proxy failed';
    return Response.json(
      {
        error: {
          message,
        },
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
