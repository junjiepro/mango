/**
 * Logout Route
 * T074: Create logout functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@mango/shared/utils'

/**
 * POST /auth/logout
 * 用户登出
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 获取当前用户
    const { data: { user } } = await supabase.auth.getUser()

    // 登出
    const { error } = await supabase.auth.signOut()

    if (error) {
      logger.error('Logout failed', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    logger.info('User logged out', { userId: user?.id })

    // 重定向到登录页
    return NextResponse.redirect(new URL('/auth/login', request.url))
  } catch (error: any) {
    logger.error('Logout error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /auth/logout
 * 支持 GET 请求登出 (用于链接点击)
 */
export async function GET(request: NextRequest) {
  return POST(request)
}
