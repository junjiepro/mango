/**
 * Conversation Detail API Route
 * 处理单个会话的操作
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AppError, ErrorType, normalizeError } from '@mango/shared/utils'
import { logger } from '@mango/shared/utils'

/**
 * GET /api/conversations/[id]
 * 获取单个对话
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params

    // 查询对话
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
      throw new AppError(
        `Failed to fetch conversation: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    return NextResponse.json(conversation)
  } catch (error) {
    const appError = normalizeError(error)
    logger.error('GET /api/conversations/[id] failed', appError)

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    )
  }
}

/**
 * PATCH /api/conversations/[id]
 * 更新对话
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params
    const body = await request.json()

    // 构建更新数据
    const updates: Record<string, any> = {}
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.context !== undefined) updates.context = body.context
    if (body.status !== undefined) updates.status = body.status
    if (body.device_id !== undefined) {
      // 校验 device_id 属于当前用户
      if (body.device_id) {
        const { data: binding } = await supabase
          .from('device_bindings')
          .select('id')
          .eq('id', body.device_id)
          .eq('user_id', user.id)
          .maybeSingle()
        updates.device_id = binding?.id ?? null
      } else {
        updates.device_id = null
      }
    }
    if (body.metadata !== undefined) updates.metadata = body.metadata

    // 更新对话
    const { data: conversation, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
      throw new AppError(
        `Failed to update conversation: ${error.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    logger.info('Conversation updated', {
      conversationId: id,
      userId: user.id,
    })

    return NextResponse.json(conversation)
  } catch (error) {
    const appError = normalizeError(error)
    logger.error('PATCH /api/conversations/[id] failed', appError)

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    )
  }
}
