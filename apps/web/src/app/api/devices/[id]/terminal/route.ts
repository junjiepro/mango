/**
 * Device Terminal API
 * 设备终端连接 API
 * T184: Implement terminal API in device service
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const deviceId = params.id;

    const onlineUrl = request.headers.get('Cli-Url');

    // 获取设备绑定信息
    const { data: binding, error: bindingError } = await supabase
      .from('device_bindings')
      .select('device_url, binding_code, status')
      .eq('id', deviceId)
      .eq('user_id', user.id)
      .single();

    if (bindingError || !binding) {
      return NextResponse.json({ error: '设备不存在或无权限' }, { status: 404 });
    }

    if (binding.status !== 'active') {
      return NextResponse.json({ error: '设备未激活' }, { status: 400 });
    }

    if (!onlineUrl) {
      return NextResponse.json({ error: '设备不在线' }, { status: 400 });
    }

    // 构建 WebSocket URL
    const wsUrl = onlineUrl.replace(/^http/, 'ws') + '/terminal';

    return NextResponse.json({
      success: true,
      wsUrl,
      token: binding.binding_code,
    });
  } catch (error) {
    console.error('Get terminal connection error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取终端连接失败' },
      { status: 500 }
    );
  }
}
