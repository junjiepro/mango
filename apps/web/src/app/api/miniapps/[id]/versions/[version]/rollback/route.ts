/**
 * MiniApp Version Rollback API
 * 回滚到指定版本
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/miniapps/[id]/versions/[version]/rollback
 * 回滚到指定版本
 */
export async function POST(
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

    // 验证权限（只有创建者可以回滚）
    const { data: app } = await supabase
      .from('mini_apps')
      .select('*')
      .eq('id', miniAppId)
      .eq('creator_id', user.id)
      .single();

    if (!app) {
      return NextResponse.json(
        { success: false, error: 'MiniApp not found or permission denied' },
        { status: 404 }
      );
    }

    // 获取目标版本
    const { data: targetVersion, error: versionError } = await supabase
      .from('mini_app_versions')
      .select('*')
      .eq('mini_app_id', miniAppId)
      .eq('version', version)
      .single();

    if (versionError || !targetVersion) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    // 先保存当前版本作为备份
    const contentHash = hashContent(app.code ?? '', typeof app.skill_content === 'string' ? app.skill_content : '', typeof app.html === 'string' ? app.html : undefined);
    const { data: nextVersion } = await supabase
      .rpc('generate_next_mini_app_version', { p_mini_app_id: miniAppId });

    await supabase.from('mini_app_versions').insert({
      mini_app_id: miniAppId,
      version: nextVersion || '1.0.1',
      code_snapshot: app.code,
      skill_snapshot: app.skill_content,
      html_snapshot: app.html,
      manifest_snapshot: app.manifest,
      content_hash: contentHash,
      change_summary: `回滚前备份 (回滚到 ${version})`,
      changed_by: user.id,
    });

    // 执行回滚
    const { error: updateError } = await supabase
      .from('mini_apps')
      .update({
        code: targetVersion.code_snapshot,
        skill_content: targetVersion.skill_snapshot,
        html: targetVersion.html_snapshot,
        manifest: targetVersion.manifest_snapshot,
        updated_at: new Date().toISOString(),
      })
      .eq('id', miniAppId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: `已回滚到版本 ${version}`,
    });
  } catch (error) {
    console.error('Rollback error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 简单哈希函数
function hashContent(code: string, skillContent: string, html?: string): string {
  const content = `${code || ''}|${skillContent || ''}|${html || ''}`;
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
