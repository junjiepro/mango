/**
 * MiniApp Detail API Routes
 * 获取、更新、删除单个小应用
 */

import { NextRequest, NextResponse } from 'next/server'
import { miniAppService } from '@/services/MiniAppService'
import { AppError, ErrorType } from '@mango/shared/utils'

/**
 * GET /api/miniapps/[id]
 * 获取小应用详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const miniApp = await miniAppService.getMiniApp(params.id)

    return NextResponse.json({
      success: true,
      data: miniApp,
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
 * PATCH /api/miniapps/[id]
 * 更新小应用
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // 提取 change_summary，不传给 updateMiniApp
    const { change_summary, ...updateData } = body

    // 如果更新了 code、skill_content 或 html，先创建版本快照
    if (updateData.code || updateData.skill_content || updateData.html) {
      await miniAppService.createVersionSnapshot(params.id, change_summary)
    }

    const miniApp = await miniAppService.updateMiniApp(params.id, updateData)

    return NextResponse.json({
      success: true,
      data: miniApp,
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
 * DELETE /api/miniapps/[id]
 * 删除小应用
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await miniAppService.deleteMiniApp(params.id)

    return NextResponse.json({
      success: true,
      message: 'Mini app deleted successfully',
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
