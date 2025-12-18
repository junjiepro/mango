/**
 * Messages API Route
 * T057: Create API route for sending message
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AppError, ErrorType, normalizeError } from '@mango/shared/utils';
import { logger } from '@mango/shared/utils';

/**
 * GET /api/conversations/[id]/messages
 * 获取对话的消息列表
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();

    // 验证用户
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 验证对话所有权
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 查询消息
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: true })
      .range(offset, offset + limit);

    if (error) {
      throw new AppError(
        `Failed to fetch messages: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      );
    }

    return NextResponse.json({
      messages: messages || [],
      hasMore: (messages?.length || 0) === limit + 1,
    });
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('GET /api/conversations/[id]/messages failed', appError);

    return NextResponse.json({ error: appError.message }, { status: appError.statusCode });
  }
}

/**
 * POST /api/conversations/[id]/messages
 * 发送消息
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const supabase = await createClient();

    // 验证用户
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 验证对话所有权
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // 解析请求体
    const body = await request.json();
    const { content, contentType, attachments, replyToMessageId, miniAppData } = body;

    // 验证必填字段
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // 获取下一个序列号
    const { data: lastMessage } = await supabase
      .from('messages')
      .select('sequence_number')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: false })
      .limit(1)
      .single();

    const sequenceNumber = (lastMessage?.sequence_number || 0) + 1;

    // 准备消息数据
    const messageData: any = {
      conversation_id: conversationId,
      sender_type: 'user',
      sender_id: user.id,
      content: content.trim(),
      content_type: contentType || 'text/markdown',
      attachments: attachments || [],
      reply_to_message_id: replyToMessageId,
      sequence_number: sequenceNumber,
      status: 'sent',
    };

    // 如果有 MiniApp 数据,添加到 metadata
    if (miniAppData) {
      messageData.metadata = {
        miniApp: {
          miniAppId: miniAppData.miniAppId,
          installationId: miniAppData.installationId,
        },
      };
    }

    // 创建消息
    const { data: message, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to send message: ${error.message}`, ErrorType.DATABASE_ERROR, 500);
    }

    // logger.info('Message sent', {
    //   messageId: message.id,
    //   conversationId,
    //   userId: user.id,
    // });

    // 触发 Agent 响应（异步处理，不阻塞响应）
    // 使用 Edge Function 处理 Agent 响应
    const edgeFunctionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-agent-message`
      : null;

    if (edgeFunctionUrl) {
      // 异步调用 Edge Function，不等待结果
      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          conversationId,
          messageId: message.id,
          userId: user.id,
        }),
      }).catch((error) => {
        logger.error('Failed to trigger agent response', { error });
      });
    } else {
      logger.warn('Edge function URL not configured, agent response not triggered');
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    const appError = normalizeError(error);
    logger.error('POST /api/conversations/[id]/messages failed', appError);

    return NextResponse.json({ error: appError.message }, { status: appError.statusCode });
  }
}
