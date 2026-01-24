/**
 * ACP API Routes
 * 处理设备的 ACP 会话管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 创建 ACP 会话
 * POST /api/devices/[id]/acp
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { agent, envVars } = body;

    if (!agent || !agent.command) {
      return NextResponse.json(
        { error: 'Agent configuration is required' },
        { status: 400 }
      );
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

    // 调用设备的 ACP 会话创建端点
    const response = await fetch(`${deviceUrl}/acp/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${binding.binding_code}`,
      },
      body: JSON.stringify({ agent, envVars }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error || 'Failed to create ACP session' },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('ACP session creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
