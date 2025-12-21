/**
 * Device List API Route
 * T133: 获取用户的设备绑定列表
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorType, normalizeError } from '@mango/shared/utils';
import { logger } from '@mango/shared/utils';

/**
 * GET /api/devices
 * 获取当前用户的所有设备绑定
 *
 * 查询参数:
 * - status: 过滤状态 (active/inactive/expired)
 * - limit: 每页数量 (默认 20)
 * - offset: 偏移量 (默认 0)
 * - check_online: 是否检查在线状态 (默认 false)
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

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const checkOnline = searchParams.get('check_online') === 'true';

    // 构建查询 - 新的合并表结构
    let query = supabase
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
        created_at,
        updated_at,
        expires_at,
        last_seen_at,
        config
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id);

    // 状态过滤
    if (status) {
      query = query.eq('status', status);
    }

    // 排序和分页
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: bindings, error: bindingsError, count } = await query;

    if (bindingsError) {
      throw new AppError(
        `Failed to fetch device bindings: ${bindingsError.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    // 可选: 检查每个设备的在线状态
    let devicesWithStatus = bindings || [];

    if (checkOnline) {
      devicesWithStatus = await Promise.all(
        (bindings || []).map(async (binding) => {
          let isOnline = false;
          let lastCheckAt = new Date().toISOString();

          // 尝试检查设备是否在线
          if (binding.status === 'active' && binding.device_url) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

              const healthResponse = await fetch(`${binding.device_url}/health`, {
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
    }

    return NextResponse.json({
      devices: devicesWithStatus,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('GET /api/devices failed', appError);

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
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
      throw new AppError(
        'Binding not found',
        ErrorType.NOT_FOUND,
        404
      );
    }

    if (binding.user_id !== user.id) {
      throw new AppError(
        'Forbidden: You do not own this binding',
        ErrorType.FORBIDDEN,
        403
      );
    }

    // 删除绑定 (级联删除相关的 MCP 服务配置)
    const { error: deleteError } = await supabase
      .from('device_bindings')
      .delete()
      .eq('id', bindingId);

    if (deleteError) {
      throw new AppError(
        `Failed to unbind device: ${deleteError.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    logger.info('Device unbound successfully', {
      bindingId,
      userId: user.id,
    });

    return NextResponse.json({
      message: 'Device unbound successfully',
    });
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('DELETE /api/devices failed', appError);

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    );
  }
}
