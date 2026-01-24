/**
 * ACP Chat API Route
 * 处理 ACP 会话的聊天请求
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * ACP 聊天端点
 * POST /api/devices/[id]/acp/chat
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { sessionId, messages } = body;

    if (!sessionId || !messages) {
      return new Response('sessionId and messages are required', { status: 400 });
    }

    // 获取设备绑定信息
    const { data: binding, error: bindingError } = await supabase
      .from('device_bindings')
      .select('device_url, binding_code, online_url')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (bindingError || !binding) {
      return new Response('Device not found', { status: 404 });
    }

    const deviceUrl = binding.online_url || binding.device_url;
    if (!deviceUrl) {
      return new Response('Device URL not available', { status: 400 });
    }

    // 转发请求到设备的 ACP 聊天端点
    const response = await fetch(`${deviceUrl}/acp/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${binding.binding_code}`,
      },
      body: JSON.stringify({ sessionId, messages }),
    });

    if (!response.ok) {
      return new Response('Failed to process chat', { status: response.status });
    }

    // 返回流式响应
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('ACP chat error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
