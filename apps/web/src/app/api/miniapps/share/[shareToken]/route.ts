/**
 * MiniApp Share Token API Routes
 * 通过分享 token 获取小应用信息
 */

import { NextRequest, NextResponse } from 'next/server'
import { sharingService } from '@/services/SharingService'
import { AppError, ErrorType } from '@mango/shared/utils'

/**
 * GET /api/miniapps/share/[shareToken]
 * 通过分享 token 获取小应用信息
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { shareToken: string } }
) {
  try {
    const result = await sharingService.getMiniAppByShareToken(params.shareToken)

    return NextResponse.json({
      success: true,
      data: result,
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
