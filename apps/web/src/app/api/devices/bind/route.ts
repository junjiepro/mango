/**
 * Device Binding API Route
 * 处理设备绑定请求
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 绑定请求验证 Schema
const bindRequestSchema = z.object({
  device_secret: z.string().min(1, 'Device secret is required'),
  binding_name: z.string().optional(),
  tunnel_url: z.string().url('Invalid tunnel URL'),
});

/**
 * POST /api/devices/bind
 * 绑定设备到用户账户
 */
export async function POST(request: NextRequest) {
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

    // 解析请求体
    const body = await request.json();
    const validation = bindRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { device_secret, binding_name, tunnel_url } = validation.data;

    // 验证 device_secret 并获取设备信息
    // 通过 tunnel_url 调用设备的 /health 端点验证
    try {
      const healthResponse = await fetch(`${tunnel_url}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!healthResponse.ok) {
        return NextResponse.json(
          { error: 'Device is not reachable or not responding' },
          { status: 400 }
        );
      }

      const healthData = await healthResponse.json();
      console.log('Device health check:', healthData);
    } catch (error) {
      console.error('Failed to reach device:', error);
      return NextResponse.json(
        { error: 'Failed to connect to device. Please check the tunnel URL.' },
        { status: 400 }
      );
    }

    // 生成设备 ID (基于 device_secret 的哈希)
    const deviceId = await generateDeviceId(device_secret);

    // 检查设备是否已存在
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('id')
      .eq('device_id', deviceId)
      .single();

    let deviceDbId: string;

    if (existingDevice) {
      // 更新现有设备的最后在线时间
      deviceDbId = existingDevice.id;
      await supabase
        .from('devices')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', deviceDbId);
    } else {
      // 创建新设备记录
      const { data: newDevice, error: deviceError } = await supabase
        .from('devices')
        .insert({
          device_id: deviceId,
          device_name: binding_name || `Device ${deviceId.substring(0, 8)}`,
          platform: 'unknown', // 可以从设备健康检查中获取
        })
        .select()
        .single();

      if (deviceError || !newDevice) {
        console.error('Failed to create device:', deviceError);
        return NextResponse.json(
          { error: 'Failed to create device record' },
          { status: 500 }
        );
      }

      deviceDbId = newDevice.id;
    }

    // 检查是否已存在绑定
    const { data: existingBinding } = await supabase
      .from('device_bindings')
      .select('id, status')
      .eq('device_id', deviceDbId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingBinding) {
      // 更新现有绑定
      const { data: updatedBinding, error: updateError } = await supabase
        .from('device_bindings')
        .update({
          tunnel_url,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBinding.id)
        .select()
        .single();

      if (updateError || !updatedBinding) {
        console.error('Failed to update binding:', updateError);
        return NextResponse.json(
          { error: 'Failed to update device binding' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Device binding updated successfully',
        binding: updatedBinding,
      });
    }

    // 生成 binding_token
    const bindingToken = await generateBindingToken();

    // 创建新绑定
    const { data: newBinding, error: bindingError } = await supabase
      .from('device_bindings')
      .insert({
        device_id: deviceDbId,
        user_id: user.id,
        binding_name: binding_name || `Device ${deviceId.substring(0, 8)}`,
        tunnel_url,
        binding_token: bindingToken,
        status: 'active',
      })
      .select()
      .single();

    if (bindingError || !newBinding) {
      console.error('Failed to create binding:', bindingError);
      return NextResponse.json(
        { error: 'Failed to create device binding' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Device bound successfully',
      binding: newBinding,
    });
  } catch (error) {
    console.error('Device binding error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 生成设备 ID (基于 device_secret 的哈希)
 */
async function generateDeviceId(deviceSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(deviceSecret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * 生成 binding_token
 */
async function generateBindingToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
