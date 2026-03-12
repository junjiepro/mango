/**
 * Update Device URL Edge Function
 * 用于设备 URL 更新的 Supabase Edge Function
 *
 * 当设备的 URL 发生变化时（例如 Cloudflare Tunnel URL 变更），
 * 设备会调用此 Edge Function 来更新数据库中的 device_url
 *
 * device_url 现在是一个 JSONB 对象，包含三个可能的 URL：
 * - cloudflare_url: Cloudflare Tunnel 公网 URL
 * - localhost_url: 本地 localhost URL
 * - hostname_url: 本地 IP 地址 URL
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeviceUrls {
  cloudflare_url: string | null;
  localhost_url: string | null;
  hostname_url: string | null;
  tailscale_url?: string | null;
}

Deno.serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. 解析请求体
    const { binding_code, device_urls, device_id } = await req.json();

    if (!binding_code || !device_urls || !device_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: binding_code, device_urls, device_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 验证 device_urls 结构
    if (typeof device_urls !== 'object' || device_urls === null) {
      return new Response(JSON.stringify({ error: 'device_urls must be an object' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 验证至少有一个 URL
    const urls = device_urls as DeviceUrls;
    if (!urls.cloudflare_url && !urls.localhost_url && !urls.hostname_url && !urls.tailscale_url) {
      return new Response(JSON.stringify({ error: 'At least one URL must be provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 验证 URL 格式（如果提供）
    const urlsToValidate = [
      { name: 'cloudflare_url', value: urls.cloudflare_url },
      { name: 'localhost_url', value: urls.localhost_url },
      { name: 'hostname_url', value: urls.hostname_url },
      { name: 'tailscale_url', value: urls.tailscale_url },
    ];

    for (const { name, value } of urlsToValidate) {
      if (value) {
        try {
          new URL(value);
        } catch {
          return new Response(JSON.stringify({ error: `Invalid ${name} format` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // 2. 创建 Supabase 客户端（使用 service role key 以绕过 RLS）
    const supabaseKey =
      Deno.env.get('MANGO_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, supabaseKey);

    // 3. 验证 binding_code 和 device_id，并更新 device_url
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('device_bindings')
      .update({
        device_url: device_urls,
        updated_at: now,
        last_seen_at: now,
      })
      .eq('binding_code', binding_code)
      .eq('device_id', device_id)
      .eq('status', 'active')
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: 'Database error', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid binding code or device_id mismatch',
          details: 'Binding not found or not active',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. 返回成功响应
    const binding = data[0];
    return new Response(
      JSON.stringify({
        success: true,
        updated: {
          binding_id: binding.id,
          device_url: device_urls,
          updated_at: now,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
