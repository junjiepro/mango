/**
 * Device Files Create API
 * 设备文件/目录创建 API
 * 支持创建文件和目录
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const deviceId = params.id;
    const body = await request.json();
    const { path, type } = body;

    if (!path || !type) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (type !== 'file' && type !== 'directory') {
      return NextResponse.json({ error: '类型必须是 file 或 directory' }, { status: 400 });
    }

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

    // 调用设备服务的文件/目录创建 API
    const response = await fetch(`${onlineUrl}/files/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${binding.binding_code}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path, type }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `创建${type === 'file' ? '文件' : '目录'}失败`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Create file/directory error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}
