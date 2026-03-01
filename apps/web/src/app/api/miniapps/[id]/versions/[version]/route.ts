/**
 * MiniApp Version Detail API Routes
 * 获取特定版本详情和回滚
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/miniapps/[id]/versions/[version]
 * 获取特定版本详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; version: string } }
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

    const { id: miniAppId, version } = params;

    // 验证权限
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

    // 获取版本详情
    const { data: versionData, error } = await supabase
      .from('mini_app_versions')
      .select('*')
      .eq('mini_app_id', miniAppId)
      .eq('version', version)
      .single();

    if (error || !versionData) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: versionData,
    });
  } catch (error) {
    console.error('Get version detail error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
