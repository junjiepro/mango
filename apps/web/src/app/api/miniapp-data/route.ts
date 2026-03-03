/**
 * MiniApp Data API Routes
 * T087: Create API route for MiniApp data CRUD
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AppError, ErrorType } from '@mango/shared/utils';

/**
 * GET /api/miniapp-data?installation_id=xxx&key=xxx
 * 获取小应用数据
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const installation_id = searchParams.get('installation_id');
    const key = searchParams.get('key');

    if (!installation_id) {
      throw new AppError('Missing installation_id parameter', ErrorType.VALIDATION_FAILED, 400);
    }

    let query = supabase.from('mini_app_data').select('*').eq('installation_id', installation_id);

    if (key) {
      query = query.eq('key', key);
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError(
        `Failed to get mini app data: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    // 如果指定了 key,返回单个对象;否则返回数组
    const result = key && data ? data[0] : data;

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        type: ErrorType.INTERNAL_SERVER_ERROR,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/miniapp-data
 * 创建或更新小应用数据
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    const body = await request.json();
    const { installation_id, key, value, value_type, metadata } = body;

    if (!installation_id || !key || value === undefined) {
      throw new AppError(
        'Missing required fields: installation_id, key, value',
        ErrorType.VALIDATION_FAILED,
        400
      );
    }

    // 验证用户拥有该安装
    const { data: installation, error: installError } = await supabase
      .from('mini_app_installations')
      .select('*')
      .eq('id', installation_id)
      .eq('user_id', user.id)
      .single();

    if (installError || !installation) {
      throw new AppError('Installation not found or not authorized', ErrorType.AUTH_FORBIDDEN, 403);
    }

    // 检查是否已存在该 key
    const { data: existing } = await supabase
      .from('mini_app_data')
      .select('*')
      .eq('installation_id', installation_id)
      .eq('key', key)
      .single();

    let result;

    if (existing) {
      // 更新现有数据
      const { data, error } = await supabase
        .from('mini_app_data')
        .update({
          value,
          value_type: value_type || typeof value,
          metadata: metadata || {},
          accessed_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new AppError(
          `Failed to update mini app data: ${error.message}`,
          ErrorType.DATABASE_ERROR,
          500
        );
      }

      result = data;
    } else {
      // 创建新数据
      const { data, error } = await supabase
        .from('mini_app_data')
        .insert({
          installation_id,
          key,
          value,
          value_type: value_type || typeof value,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) {
        throw new AppError(
          `Failed to create mini app data: ${error.message}`,
          ErrorType.DATABASE_ERROR,
          500
        );
      }

      result = data;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        type: ErrorType.INTERNAL_SERVER_ERROR,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/miniapp-data?installation_id=xxx&key=xxx
 * 删除小应用数据
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AppError('User not authenticated', ErrorType.AUTH_UNAUTHORIZED, 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const installation_id = searchParams.get('installation_id');
    const key = searchParams.get('key');

    if (!installation_id || !key) {
      throw new AppError(
        'Missing required parameters: installation_id, key',
        ErrorType.VALIDATION_FAILED,
        400
      );
    }

    // 验证用户拥有该安装
    const { data: installation, error: installError } = await supabase
      .from('mini_app_installations')
      .select('*')
      .eq('id', installation_id)
      .eq('user_id', user.id)
      .single();

    if (installError || !installation) {
      throw new AppError('Installation not found or not authorized', ErrorType.AUTH_FORBIDDEN, 403);
    }

    const { error } = await supabase
      .from('mini_app_data')
      .delete()
      .eq('installation_id', installation_id)
      .eq('key', key);

    if (error) {
      throw new AppError(
        `Failed to delete mini app data: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mini app data deleted successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        type: ErrorType.INTERNAL_SERVER_ERROR,
      },
      { status: 500 }
    );
  }
}
