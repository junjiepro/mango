/**
 * ACP Session Detail API Routes
 * 删除指定的 ACP 会话
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 删除 ACP 会话
 * DELETE /api/devices/[id]/acp/sessions/[sessionId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取设备绑定信息
    const { data: binding, error: bindingError } = await supabase
      .from('device_bindings')
      .select('device_url, binding_code, online_url')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (bindingError || !binding) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const deviceUrl = binding.online_url || binding.device_url;
    if (!deviceUrl) {
      return NextResponse.json({ error: 'Device URL not available' }, { status: 400 });
    }

    // 调用设备的 ACP 会话删除端点
    const response = await fetch(`${deviceUrl}/acp/sessions/${params.sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${binding.binding_code}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to delete ACP session' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('ACP session delete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
