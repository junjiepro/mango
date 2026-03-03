/**
 * MiniApp Installation API Routes
 * T086: Create API route for installing MiniApp
 */

import { NextRequest, NextResponse } from 'next/server'
import { miniAppInstallationService } from '@/services/MiniAppInstallationService'
import { AppError, ErrorType } from '@mango/shared/utils'

/**
 * POST /api/miniapps/[id]/install
 * 安装小应用
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const {
      custom_name,
      granted_permissions,
      user_config,
    } = body

    const installation = await miniAppInstallationService.installMiniApp({
      mini_app_id: params.id,
      custom_name,
      granted_permissions,
      user_config,
    })

    return NextResponse.json(
      {
        success: true,
        data: installation,
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

/**
 * DELETE /api/miniapps/[id]/install
 * 卸载小应用
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const clearData = searchParams.get('clearData') === 'true'

    // 先获取安装记录
    const installation = await miniAppInstallationService.getInstallation(params.id)

    if (!installation) {
      throw new AppError('Mini app not installed', ErrorType.RESOURCE_NOT_FOUND, 404)
    }

    await miniAppInstallationService.uninstallMiniApp(installation.id, { clearData })

    return NextResponse.json({
      success: true,
      message: 'Mini app uninstalled successfully',
      dataCleared: clearData,
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
 * GET /api/miniapps/[id]/install
 * 获取小应用安装状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const installation = await miniAppInstallationService.getInstallation(params.id)

    return NextResponse.json({
      success: true,
      data: installation,
      installed: !!installation,
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
