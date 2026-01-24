/**
 * ACP Sessions API Routes
 * 管理对话的 ACP 会话持久化
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 获取对话的所有 ACP 会话
 * GET /api/conversations/[id]/acp-sessions
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sessions, error } = await supabase
      .from('acp_sessions')
      .select(
        `
        *,
        device_bindings (
          id,
          binding_name,
          device_url,
          status
        )
      `
      )
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .order('last_active_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch ACP sessions:', error);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error('ACP sessions fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * 创建新的 ACP 会话
 * POST /api/conversations/[id]/acp-sessions
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      deviceBindingId,
      acpSessionId,
      agentName,
      agentCommand,
      agentArgs,
      envVars,
      sessionConfig,
    } = body;

    if (!deviceBindingId || !acpSessionId || !agentName || !agentCommand) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 验证设备绑定是否属于当前用户
    const { data: binding } = await supabase
      .from('device_bindings')
      .select('id')
      .eq('id', deviceBindingId)
      .eq('user_id', user.id)
      .single();

    if (!binding) {
      return NextResponse.json({ error: 'Device binding not found' }, { status: 404 });
    }

    // 创建 ACP 会话记录
    const { data: session, error: insertError } = await supabase
      .from('acp_sessions')
      .insert({
        conversation_id: params.id,
        device_binding_id: deviceBindingId,
        user_id: user.id,
        acp_session_id: acpSessionId,
        agent_name: agentName,
        agent_command: agentCommand,
        agent_args: agentArgs || [],
        env_vars: envVars || {},
        session_config: sessionConfig || {},
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create ACP session:', insertError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('ACP session creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
