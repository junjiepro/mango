/**
 * Device Files Read API
 * 设备文件读取 API
 * T174: Implement file read/write API routes for device files
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
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    const onlineUrl = request.headers.get('Cli-Url');

    if (!path) {
      return NextResponse.json({ error: '缺少文件路径' }, { status: 400 });
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

    // 调用设备服务的文件读取 API
    const response = await fetch(`${onlineUrl}/files/read?path=${encodeURIComponent(path)}`, {
      headers: {
        Authorization: `Bearer ${binding.binding_code}`,
      },
    });

    if (!response.ok) {
      throw new Error('读取文件失败');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      content: data.content || '',
    });
  } catch (error) {
    console.error('Read file error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '读取文件失败' },
      { status: 500 }
    );
  }
}
