/**
 * MiniApp Share API Routes
 * T099: Create share link generation in API route
 */

import { NextRequest, NextResponse } from 'next/server'
import { sharingService } from '@/services/SharingService'
import { AppError, ErrorType } from '@mango/shared/utils'

/**
 * POST /api/miniapps/[id]/share
 * 生成分享链接
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { expires_in_days, max_uses } = body

    const shareLink = await sharingService.createShareLink(params.id, {
      expires_in_days,
      max_uses,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          shareToken: shareLink.share_token,
          shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/miniapps/import/${shareLink.share_token}`,
          expiresAt: shareLink.expires_at,
          maxUses: shareLink.max_uses,
        },
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

/**
 * GET /api/miniapps/[id]/share
 * 获取小应用的分享链接列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shareLinks = await sharingService.getUserShareLinks(params.id)

    return NextResponse.json({
      success: true,
      data: shareLinks,
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
