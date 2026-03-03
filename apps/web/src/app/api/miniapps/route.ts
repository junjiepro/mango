/**
 * MiniApp API Routes
 * T085: Create API route for creating MiniApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { miniAppService } from '@/services/MiniAppService'
import { miniAppInstallationService } from '@/services/MiniAppInstallationService'
import { createClient } from '@/lib/supabase/server'
import { AppError, ErrorType } from '@mango/shared/utils'

/**
 * GET /api/miniapps
 * 获取小应用列表（公开的或用户创建的或用户安装的）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'public' // 'public' | 'user' | 'owned'
    const status = searchParams.get('status') || undefined
    const tags = searchParams.get('tags')?.split(',') || undefined
    const search = searchParams.get('search') || undefined
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 获取当前用户 ID
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let result

    if (type === 'user') {
      // 用户创建的应用
      result = await miniAppService.getUserMiniApps({
        status,
        limit,
        offset,
      })
    } else if (type === 'owned') {
      // 用户拥有的应用（创建的 + 安装的）
      result = await miniAppService.getOwnedMiniApps({
        status,
        limit,
        offset,
      })
    } else {
      result = await miniAppService.getPublicMiniApps({
        tags,
        search,
        limit,
        offset,
      })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.count,
      currentUserId: user?.id || null,
    })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        type: ErrorType.INTERNAL_SERVER_ERROR,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/miniapps
 * 创建新的小应用
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      display_name,
      description,
      code,
      html,
      icon_url,
      manifest,
      runtime_config,
      tags,
      is_public,
      is_shareable,
    } = body

    // 验证必需字段
    if (!name || !display_name || !description || !code) {
      throw new AppError(
        'Missing required fields: name, display_name, description, code',
        ErrorType.VALIDATION_FAILED,
        400
      )
    }

    // 验证名称格式（只允许字母、数字、下划线、连字符）
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new AppError(
        'Invalid name format. Only alphanumeric characters, underscores, and hyphens are allowed',
        ErrorType.VALIDATION_FAILED,
        400
      )
    }

    const miniApp = await miniAppService.createMiniApp({
      name,
      display_name,
      description,
      code,
      html,
      icon_url,
      manifest,
      runtime_config,
      tags,
      is_public,
      is_shareable,
    })

    // 创建后自动为创建者安装，授予 manifest 中声明的所有权限
    try {
      await miniAppInstallationService.installMiniApp({
        mini_app_id: miniApp.id,
        granted_permissions: (manifest?.required_permissions) || [],
      })
    } catch (installError) {
      console.error('Auto-install after creation failed:', installError)
    }

    return NextResponse.json(
      {
        success: true,
        data: miniApp,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          type: error.type,
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        type: ErrorType.INTERNAL_SERVER_ERROR,
      },
      { status: 500 }
    )
  }
}
