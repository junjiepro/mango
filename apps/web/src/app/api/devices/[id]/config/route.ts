/**
 * Device Configuration API Route
 * 管理设备的配置信息
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorType, normalizeError } from '@mango/shared/utils';
import { logger } from '@mango/shared/utils';

/**
 * GET /api/devices/[id]/config
 * 从设备端获取配置（通过 /setting 端点）
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deviceId = params.id;

    const onlineUrl = request.headers.get('Cli-Url');

    if (!onlineUrl) {
      throw new AppError('Device not found', ErrorType.NOT_FOUND, 404);
    }

    // 获取设备绑定信息
    const { data: binding, error: bindingError } = await supabase
      .from('device_bindings')
      .select('id, user_id, binding_code, status')
      .eq('id', deviceId)
      .single();

    if (bindingError || !binding) {
      throw new AppError('Device not found', ErrorType.NOT_FOUND, 404);
    }

    if (binding.user_id !== user.id) {
      throw new AppError('Forbidden', ErrorType.FORBIDDEN, 403);
    }

    if (binding.status !== 'active') {
      throw new AppError('Device binding is not active', ErrorType.BAD_REQUEST, 400);
    }

    // 调用设备端的 /setting 端点获取配置
    const deviceResponse = await fetch(`${onlineUrl}/setting`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${binding.binding_code}`,
        'Content-Type': 'application/json',
      },
    });

    if (!deviceResponse.ok) {
      const errorText = await deviceResponse.text();
      logger.error('Device config fetch failed', { error: errorText, deviceId });
      throw new AppError('Failed to fetch device config', ErrorType.EXTERNAL_SERVICE_ERROR, 502);
    }

    const deviceData = await deviceResponse.json();

    return NextResponse.json({
      config: deviceData.config || {},
      device_url: onlineUrl,
    });
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('GET /api/devices/[id]/config failed', appError);

    return NextResponse.json({ error: appError.message }, { status: appError.statusCode });
  }
}

/**
 * POST /api/devices/[id]/config
 * 更新设备端配置（通过 /setting 端点）
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deviceId = params.id;
    const onlineUrl = request.headers.get('Cli-Url');

    if (!onlineUrl) {
      throw new AppError('Device not found', ErrorType.NOT_FOUND, 404);
    }

    const body = await request.json();

    // 获取设备绑定信息
    const { data: binding, error: bindingError } = await supabase
      .from('device_bindings')
      .select('id, user_id, binding_code, device_url, status')
      .eq('id', deviceId)
      .single();

    if (bindingError || !binding) {
      throw new AppError('Device not found', ErrorType.NOT_FOUND, 404);
    }

    if (binding.user_id !== user.id) {
      throw new AppError('Forbidden', ErrorType.FORBIDDEN, 403);
    }

    if (binding.status !== 'active') {
      throw new AppError('Device binding is not active', ErrorType.BAD_REQUEST, 400);
    }

    // 调用设备端的 /setting 端点更新配置
    const deviceResponse = await fetch(`${onlineUrl}/setting`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${binding.binding_code}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        binding_code: binding.binding_code,
        ...body,
      }),
    });

    if (!deviceResponse.ok) {
      const errorText = await deviceResponse.text();
      logger.error('Device config update failed', { error: errorText, deviceId });
      throw new AppError('Failed to update device config', ErrorType.EXTERNAL_SERVICE_ERROR, 502);
    }

    const deviceData = await deviceResponse.json();

    return NextResponse.json({
      success: true,
      message: deviceData.message || 'Configuration updated successfully',
    });
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('POST /api/devices/[id]/config failed', appError);

    return NextResponse.json({ error: appError.message }, { status: appError.statusCode });
  }
}
