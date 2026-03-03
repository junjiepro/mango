/**
 * MiniApp Share Install API Routes
 * 通过分享链接安装小应用
 */

import { NextRequest, NextResponse } from 'next/server'
import { sharingService } from '@/services/SharingService'
import { AppError, ErrorType } from '@mango/shared/utils'

/**
 * POST /api/miniapps/share/[shareToken]/install
 * 通过分享链接安装小应用
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    const body = await request.json()
    const { granted_permissions } = body

    const installation = await sharingService.installFromShareLink(
      params.shareToken,
      granted_permissions || []
    )

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
