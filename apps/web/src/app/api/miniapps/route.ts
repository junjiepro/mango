/**
 * MiniApp API Routes
 * T085: Create API route for creating MiniApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { miniAppService } from '@/services/MiniAppService'
import { AppError, ErrorType } from '@mango/shared/utils'

/**
 * GET /api/miniapps
 * 获取小应用列表（公开的或用户创建的）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'public' // 'public' | 'user'
    const status = searchParams.get('status') || undefined
    const tags = searchParams.get('tags')?.split(',') || undefined
    const search = searchParams.get('search') || undefined
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    let result

    if (type === 'user') {
      result = await miniAppService.getUserMiniApps({
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
        type: ErrorType.INTERNAL_ERROR,
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
        ErrorType.VALIDATION_ERROR,
        400
      )
    }

    // 验证名称格式（只允许字母、数字、下划线、连字符）
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new AppError(
        'Invalid name format. Only alphanumeric characters, underscores, and hyphens are allowed',
        ErrorType.VALIDATION_ERROR,
        400
      )
    }

    const miniApp = await miniAppService.createMiniApp({
      name,
      display_name,
      description,
      code,
      icon_url,
      manifest,
      runtime_config,
      tags,
      is_public,
      is_shareable,
    })

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
        type: ErrorType.INTERNAL_ERROR,
      },
      { status: 500 }
    )
  }
}
