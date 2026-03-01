/**
 * Workspace History API
 * 管理用户在各个设备上的工作空间访问历史
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/devices/[id]/workspace-history
 * 获取指定设备的最近访问路径列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // 获取工作空间历史记录，按最后访问时间倒序排列
    const { data, error } = await supabase
      .from('workspace_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('device_binding_id', deviceId)
      .order('last_accessed_at', { ascending: false })
      .limit(10); // 限制返回最近10条记录

    if (error) {
      console.error('Failed to fetch workspace history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workspace history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, history: data || [] });
  } catch (error) {
    console.error('Workspace history GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/devices/[id]/workspace-history
 * 记录新的访问路径或更新现有路径的访问时间
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { path } = body;

    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    // 使用 upsert 来插入或更新记录
    // 如果记录已存在（基于 UNIQUE 约束），则更新 last_accessed_at
    const { data, error } = await supabase
      .from('workspace_history')
      .upsert(
        {
          user_id: user.id,
          device_binding_id: deviceId,
          path: path,
          last_accessed_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,device_binding_id,path',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Failed to record workspace access:', error);
      return NextResponse.json(
        { error: 'Failed to record workspace access' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Workspace history POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/devices/[id]/workspace-history
 * 清除指定设备的历史记录或删除特定路径
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    let query = supabase
      .from('workspace_history')
      .delete()
      .eq('user_id', user.id)
      .eq('device_binding_id', deviceId);

    // 如果提供了 path 参数，只删除该路径的记录
    if (path) {
      query = query.eq('path', path);
    }

    const { error } = await query;

    if (error) {
      console.error('Failed to delete workspace history:', error);
      return NextResponse.json(
        { error: 'Failed to delete workspace history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Workspace history DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
