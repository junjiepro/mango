/**
 * Device List API Route
 * 获取用户的设备绑定列表
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/devices
 * 获取当前用户的所有设备绑定
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 验证用户身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取用户的设备绑定列表
    const { data: bindings, error: bindingsError } = await supabase
      .from('device_bindings')
      .select(
        `
        id,
        binding_name,
        tunnel_url,
        status,
        created_at,
        updated_at,
        expires_at,
        config,
        devices (
          id,
          device_id,
          device_name,
          platform,
          last_seen_at
        )
      `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (bindingsError) {
      console.error('Failed to fetch device bindings:', bindingsError);
      return NextResponse.json(
        { error: 'Failed to fetch device bindings' },
        { status: 500 }
      );
    }

    // 检查每个设备的在线状态
    const devicesWithStatus = await Promise.all(
      (bindings || []).map(async (binding) => {
        let isOnline = false;
        let lastCheckAt = new Date().toISOString();

        // 尝试检查设备是否在线
        if (binding.status === 'active' && binding.tunnel_url) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

            const healthResponse = await fetch(`${binding.tunnel_url}/health`, {
              method: 'GET',
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
            isOnline = healthResponse.ok;
          } catch (error) {
            // 设备离线或无法访问
            isOnline = false;
          }
        }

        return {
          ...binding,
          is_online: isOnline,
          last_check_at: lastCheckAt,
        };
      })
    );

    return NextResponse.json({
      devices: devicesWithStatus,
      total: devicesWithStatus.length,
    });
  } catch (error) {
    console.error('Device list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/devices?id=<binding_id>
 * 解绑设备
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 验证用户身份
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 获取绑定 ID
    const { searchParams } = new URL(request.url);
    const bindingId = searchParams.get('id');

    if (!bindingId) {
      return NextResponse.json(
        { error: 'Binding ID is required' },
        { status: 400 }
      );
    }

    // 验证绑定是否属于当前用户
    const { data: binding, error: fetchError } = await supabase
      .from('device_bindings')
      .select('id, user_id')
      .eq('id', bindingId)
      .single();

    if (fetchError || !binding) {
      return NextResponse.json(
        { error: 'Binding not found' },
        { status: 404 }
      );
    }

    if (binding.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this binding' },
        { status: 403 }
      );
    }

    // 删除绑定 (级联删除相关的 MCP 服务配置)
    const { error: deleteError } = await supabase
      .from('device_bindings')
      .delete()
      .eq('id', bindingId);

    if (deleteError) {
      console.error('Failed to delete binding:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unbind device' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Device unbound successfully',
    });
  } catch (error) {
    console.error('Device unbind error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
