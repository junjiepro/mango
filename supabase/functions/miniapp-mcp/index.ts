/**
 * MiniApp MCP Gateway
 * 标准 MCP Server，支持第三方 Client 连接
 *
 * 端点:
 * - POST /mcp/{miniapp_id} - MCP JSON-RPC 请求
 * - GET /mcp/{miniapp_id} - MCP Server 信息
 * - GET /mcp - 列出用户所有 MiniApp
 */

import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createMiniAppContext } from './context.ts';
import { createMiniAppMCPServer } from './adapter.ts';
import type { MCPRequest } from './mcp-server.ts';

const app = new Hono().basePath('/miniapp-mcp');

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS 预检
app.options('*', (c) => c.json({}, 200, corsHeaders));

// 标准 MCP JSON-RPC 端点
app.post('/mcp/:id', async (c) => {
  const miniAppId = c.req.param('id');

  const supabaseKey =
    Deno.env.get('MANGO_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, supabaseKey);

  // 获取 MiniApp
  const { data: miniApp, error } = await supabase
    .from('mini_apps')
    .select('*')
    .eq('id', miniAppId)
    .single();

  if (error || !miniApp) {
    return c.json({ error: 'MiniApp not found' }, 404, corsHeaders);
  }

  // 创建上下文和 MCP Server
  const context = await createMiniAppContext(c, supabase, miniApp);
  const server = await createMiniAppMCPServer(miniApp, context);

  // 处理 MCP 请求
  const request = (await c.req.json()) as MCPRequest;
  const response = await server.handleRequest(request);

  return c.json(response, 200, corsHeaders);
});

// 列出用户所有 MiniApp (作为 MCP Server 列表)
app.get('/mcp', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json({ error: 'Unauthorized' }, 401, corsHeaders);
  }

  const supabaseKey =
    Deno.env.get('MANGO_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, supabaseKey);

  // 验证 token 获取用户
  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return c.json({ error: 'Invalid token' }, 401, corsHeaders);
  }

  // 获取用户安装的 MiniApp
  const { data: installations } = await supabase
    .from('mini_app_installations')
    .select('mini_app:mini_apps(id, name, description, manifest)')
    .eq('user_id', user.id);

  const servers = (installations || []).map((i: any) => ({
    id: i.mini_app.id,
    name: i.mini_app.name,
    description: i.mini_app.description,
    version: i.mini_app.manifest?.version || '1.0.0',
    endpoint: `/mcp/${i.mini_app.id}`,
  }));

  return c.json({ servers }, 200, corsHeaders);
});

// MCP Server 信息端点
app.get('/mcp/:id', async (c) => {
  const miniAppId = c.req.param('id');

  const supabaseKey =
    Deno.env.get('MANGO_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, supabaseKey);

  const { data: miniApp } = await supabase
    .from('mini_apps')
    .select('id, name, description, manifest')
    .eq('id', miniAppId)
    .single();

  if (!miniApp) {
    return c.json({ error: 'Not found' }, 404, corsHeaders);
  }

  return c.json(
    {
      name: `mango-miniapp-${miniApp.id}`,
      version: miniApp.manifest?.version || '1.0.0',
      protocolVersion: '2024-11-05',
      description: miniApp.description,
    },
    200,
    corsHeaders
  );
});

Deno.serve(app.fetch);
