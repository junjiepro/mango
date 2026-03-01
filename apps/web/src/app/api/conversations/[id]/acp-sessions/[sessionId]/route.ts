import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/conversations/[id]/acp-sessions/[sessionId]
 * 更新 ACP 会话状态和最后活跃时间
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const supabase = await createClient();

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status, lastActiveAt } = body;

    // 构建更新数据
    const updateData: any = {};
    if (status) {
      updateData.status = status;
    }
    if (lastActiveAt) {
      updateData.last_active_at = lastActiveAt;
    } else {
      // 默认更新为当前时间
      updateData.last_active_at = new Date().toISOString();
    }

    // 更新会话
    const { data: session, error } = await supabase
      .from('acp_sessions')
      .update(updateData)
      .eq('id', params.sessionId)
      .eq('conversation_id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update ACP session:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Error updating ACP session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/[id]/acp-sessions/[sessionId]
 * 删除持久化的 ACP 会话记录
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  try {
    const supabase = await createClient();

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 删除会话记录
    const { error } = await supabase
      .from('acp_sessions')
      .delete()
      .eq('id', params.sessionId)
      .eq('conversation_id', params.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete ACP session:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ACP session:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
