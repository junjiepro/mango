/**
 * ACP Sessions API Routes
 * 获取设备的 ACP 会话列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 获取 ACP 会话列表
 * GET /api/devices/[id]/acp/sessions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // 调用设备的 ACP 会话列表端点
    const response = await fetch(`${deviceUrl}/acp/sessions`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${binding.binding_code}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to get ACP sessions' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('ACP sessions list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
