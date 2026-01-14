/**
 * Device Files API
 * 设备文件系统 API - 列表查询
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
    const path = searchParams.get('path') || '/';

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

    // 调用设备服务的文件列表 API
    const response = await fetch(`${onlineUrl}/files/list?path=${encodeURIComponent(path)}`, {
      headers: {
        Authorization: `Bearer ${binding.binding_code}`,
      },
    });

    if (!response.ok) {
      throw new Error('获取文件列表失败');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      files: data.files || [],
    });
  } catch (error) {
    console.error('Get files error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取文件列表失败' },
      { status: 500 }
    );
  }
}
