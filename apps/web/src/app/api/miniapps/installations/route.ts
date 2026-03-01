/**
 * MiniApp Installations API Routes
 * 获取用户的小应用安装列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorType } from '@mango/shared/utils';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/miniapps/installations
 * 获取用户安装的小应用列表(包含小应用详情)
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
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 获取安装列表,同时关联小应用信息
    const { data, error, count } = await supabase
      .from('mini_app_installations')
      .select(
        `
        *,
        mini_app:mini_apps (
          id,
          name,
          display_name,
          description,
          icon_url,
          html,
          code,
          tags,
          stats,
          manifest
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppError(
        `Failed to get installations: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: count || 0,
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
        type: ErrorType.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }
}
