/**
 * Device Detail API Route
 * 获取单个设备的详细信息
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorType, normalizeError } from '@mango/shared/utils';
import { logger } from '@mango/shared/utils';
import { DeviceUrls } from '@/hooks/useDeviceBinding';
import { getBrowserSafeDeviceUrls } from '@/lib/device-urls';

/**
 * GET /api/devices/[id]
 * 获取设备详细信息，包括在线状态和MCP服务配置
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    const deviceId = params.id;

    // 获取设备绑定信息
    const { data: binding, error: bindingError } = await supabase
      .from('device_bindings')
      .select(
        `
        id,
        device_id,
        device_name,
        platform,
        hostname,
        binding_name,
        device_url,
        binding_code,
        status,
        config,
        created_at,
        updated_at,
        expires_at,
        last_seen_at
      `
      )
      .eq('id', deviceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (bindingError || !binding) {
      throw new AppError('Device not found', ErrorType.RESOURCE_NOT_FOUND, 404);
    }

    // 检查设备在线状态
    // online_urls 始终返回浏览器可尝试的候选地址，is_online 基于本次健康检查结果
    let healthCheckError = null;
    let candidateOnlineUrls: string[] = [];
    const reachableOnlineUrls: string[] = [];

    if (binding.status === 'active' && binding.device_url) {
      try {
        const deviceUrls = binding.device_url as unknown as DeviceUrls;
        candidateOnlineUrls = getBrowserSafeDeviceUrls(
          deviceUrls,
          request.nextUrl.protocol
        );

        if (candidateOnlineUrls.length === 0) {
          healthCheckError = 'No browser-safe device URL is available';
        }

        const results = await Promise.allSettled(
          candidateOnlineUrls.map(async (url) => {
            const resp = await fetch(`${url}/health`, {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
            });
            return { url, ok: resp.ok, status: resp.status };
          })
        );

        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.ok) {
            reachableOnlineUrls.push(r.value.url);
          } else if (r.status === 'fulfilled') {
            healthCheckError = `Health check failed with status ${r.value.status}`;
          }
        }

        if (reachableOnlineUrls.length > 0) {
          healthCheckError = null;
        }
      } catch (error) {
        healthCheckError = error instanceof Error ? error.message : 'Connection failed';
      }
    }

    return NextResponse.json({
      device: {
        ...binding,
        online_urls: candidateOnlineUrls,
        reachable_online_urls: reachableOnlineUrls,
        is_online: reachableOnlineUrls.length > 0,
        health_check_error: healthCheckError,
        last_check_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('GET /api/devices/[id] failed', appError);

    return NextResponse.json({ error: appError.message }, { status: appError.statusCode });
  }
}

/**
 * PATCH /api/devices/[id]
 * 更新设备绑定信息（如绑定名称）
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

    const deviceId = params.id;
    const body = await request.json();

    // 验证设备归属
    const { data: binding, error: fetchError } = await supabase
      .from('device_bindings')
      .select('id, user_id')
      .eq('id', deviceId)
      .single();

    if (fetchError || !binding) {
      throw new AppError('Device not found', ErrorType.RESOURCE_NOT_FOUND, 404);
    }

    if (binding.user_id !== user.id) {
      throw new AppError('Forbidden', ErrorType.AUTH_FORBIDDEN, 403);
    }

    // 更新设备信息
    const updateData: any = {};
    if (body.binding_name) updateData.binding_name = body.binding_name;
    if (body.status) updateData.status = body.status;

    const { data: updated, error: updateError } = await supabase
      .from('device_bindings')
      .update(updateData)
      .eq('id', deviceId)
      .select()
      .single();

    if (updateError) {
      throw new AppError(
        `Failed to update device: ${updateError.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    logger.info('Device updated successfully', { deviceId, userId: user.id });

    return NextResponse.json({ device: updated });
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('PATCH /api/devices/[id] failed', appError);

    return NextResponse.json({ error: appError.message }, { status: appError.statusCode });
  }
}
