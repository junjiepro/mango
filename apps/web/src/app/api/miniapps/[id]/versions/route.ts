/**
 * MiniApp Versions API Routes
 * 获取小应用版本列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/miniapps/[id]/versions
 * 获取小应用版本列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const miniAppId = params.id;

    // 验证小应用存在且有权限
    const { data: app } = await supabase
      .from('mini_apps')
      .select('id, creator_id, is_public')
      .eq('id', miniAppId)
      .single();

    if (!app) {
      return NextResponse.json(
        { success: false, error: 'MiniApp not found' },
        { status: 404 }
      );
    }

    const isOwner = app.creator_id === user.id;
    if (!isOwner && !app.is_public) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      );
    }

    // 获取版本列表
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const { data: versions, error } = await supabase
      .from('mini_app_versions')
      .select('version, change_summary, created_at, changed_by')
      .eq('mini_app_id', miniAppId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: versions || [],
    });
  } catch (error) {
    console.error('Get versions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
