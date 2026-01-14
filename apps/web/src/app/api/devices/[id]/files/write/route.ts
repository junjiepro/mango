/**
 * Device Files Write API
 * 设备文件写入 API
 * T174: Implement file read/write API routes for device files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
    const body = await request.json();
    const { path, content } = body;

    const onlineUrl = request.headers.get('Cli-Url');

    if (!path || content === undefined) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

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

    // 调用设备服务的文件写入 API
    const response = await fetch(`${onlineUrl}/files/write`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${binding.binding_code}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, content }),
    });

    if (!response.ok) {
      throw new Error('写入文件失败');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Write file error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '写入文件失败' },
      { status: 500 }
    );
  }
}
