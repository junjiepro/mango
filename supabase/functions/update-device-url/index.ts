/**
 * Update Device URL Edge Function
 * 用于设备 URL 更新的 Supabase Edge Function
 *
 * 当设备的 URL 发生变化时（例如 Cloudflare Tunnel URL 变更），
 * 设备会调用此 Edge Function 来更新数据库中的 device_url
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. 解析请求体
    const { binding_code, new_device_url } = await req.json();

    if (!binding_code || !new_device_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: binding_code, new_device_url' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. 创建 Supabase 客户端（使用 service role key 以绕过 RLS）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 3. 验证 binding_code 并更新 device_url
    const { data, error } = await supabase
      .from('device_bindings')
      .update({
        device_url: new_device_url,
        updated_at: new Date().toISOString(),
      })
      .eq('binding_code', binding_code)
      .eq('status', 'active')
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Database error', details: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid binding code or binding not found' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 4. 同时更新设备的 last_seen_at
    const binding = data[0];
    await supabase
      .from('devices')
      .update({
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', binding.device_id);

    // 5. 返回成功响应
    return new Response(
      JSON.stringify({
        success: true,
        updated: {
          binding_id: binding.id,
          device_url: new_device_url,
          updated_at: binding.updated_at,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
