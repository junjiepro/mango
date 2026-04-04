/**
 * Conversations API Route
 * T056: Create API route for creating conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AppError, ErrorType, normalizeError } from '@mango/shared/utils'
import { logger } from '@mango/shared/utils'

/**
 * GET /api/conversations
 * 获取对话列表
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || 'active'

    // 查询对话
    const { data: conversations, error, count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      throw new AppError(
        `Failed to fetch conversations: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return NextResponse.json({
      conversations: conversations || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    const appError = normalizeError(error)
    logger.error('GET /api/conversations failed', appError)

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    )
  }
}

/**
 * POST /api/conversations
 * 创建新对话
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 解析请求体
    const body = await request.json()
    const { title, description, context, device_id } = body

    // 验证必填字段
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // 校验 device_id 属于当前用户
    let validDeviceId: string | null = null
    if (device_id) {
      const { data: binding } = await supabase
        .from('device_bindings')
        .select('id')
        .eq('id', device_id)
        .eq('user_id', user.id)
        .maybeSingle()
      validDeviceId = binding?.id ?? null
    }

    // 创建对话
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description?.trim(),
        context: context || {
          model: 'claude-3-5-sonnet',
          temperature: 0.7,
          max_tokens: 4096,
          system_prompt: null,
        },
        status: 'active',
        device_id: validDeviceId,
      })
      .select()
      .single()

    if (error) {
      throw new AppError(
        `Failed to create conversation: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    logger.info('Conversation created', {
      conversationId: conversation.id,
      userId: user.id,
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    const appError = normalizeError(error)
    logger.error('POST /api/conversations failed', appError)

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    )
  }
}
