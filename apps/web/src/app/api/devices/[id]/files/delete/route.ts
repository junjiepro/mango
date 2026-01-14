/**
 * Device Files Delete API
 * 设备文件/目录删除 API
 * 支持删除文件和目录
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
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
    const { path } = body;

    if (!path) {
      return NextResponse.json({ error: '缺少文件路径' }, { status: 400 });
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

    // 调用设备服务的文件/目录删除 API
    const response = await fetch(`${onlineUrl}/files/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${binding.binding_code}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '删除失败');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete file/directory error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
