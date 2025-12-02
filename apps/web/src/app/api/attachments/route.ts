/**
 * Attachments API Route
 * T058: Create API route for uploading attachment
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AppError, ErrorType, normalizeError } from '@mango/shared/utils'
import { logger } from '@mango/shared/utils'

/**
 * POST /api/attachments
 * 上传附件到 Supabase Storage
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

    // 解析 FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const messageId = formData.get('messageId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    // 验证文件大小 (50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // 生成文件路径
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `attachments/${fileName}`

    // 上传到 Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      throw new AppError(
        `Failed to upload file: ${uploadError.message}`,
        ErrorType.EXTERNAL_SERVICE_ERROR,
        500
      )
    }

    // 获取公开 URL
    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath)

    // 如果提供了 messageId,创建附件记录
    let attachment = null
    if (messageId) {
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('attachments')
        .insert({
          message_id: messageId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath,
          storage_bucket: 'attachments',
          status: 'uploaded',
        })
        .select()
        .single()

      if (attachmentError) {
        // 如果创建记录失败,删除已上传的文件
        await supabase.storage.from('attachments').remove([filePath])

        throw new AppError(
          `Failed to create attachment record: ${attachmentError.message}`,
          ErrorType.DATABASE_ERROR,
          500
        )
      }

      attachment = attachmentData
    }

    logger.info('File uploaded', {
      fileName: file.name,
      fileSize: file.size,
      userId: user.id,
      messageId,
    })

    return NextResponse.json({
      attachment,
      url: publicUrl,
      path: filePath,
      name: file.name,
      type: file.type,
      size: file.size,
    }, { status: 201 })
  } catch (error) {
    const appError = normalizeError(error)
    logger.error('POST /api/attachments failed', appError)

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    )
  }
}

/**
 * DELETE /api/attachments
 * 删除附件
 */
export async function DELETE(request: NextRequest) {
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
    const attachmentId = searchParams.get('id')

    if (!attachmentId) {
      return NextResponse.json(
        { error: 'Attachment ID is required' },
        { status: 400 }
      )
    }

    // 获取附件信息
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('*, messages!inner(sender_id)')
      .eq('id', attachmentId)
      .single()

    if (fetchError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      )
    }

    // 验证权限 (只有消息发送者可以删除附件)
    if (attachment.messages.sender_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 从 Storage 删除文件
    const { error: storageError } = await supabase.storage
      .from(attachment.storage_bucket)
      .remove([attachment.storage_path])

    if (storageError) {
      logger.warn('Failed to delete file from storage', {
        error: storageError,
        path: attachment.storage_path,
      })
    }

    // 删除数据库记录
    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      throw new AppError(
        `Failed to delete attachment: ${deleteError.message}`,
        ErrorType.DATABASE_ERROR,
        500
      )
    }

    logger.info('Attachment deleted', {
      attachmentId,
      userId: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const appError = normalizeError(error)
    logger.error('DELETE /api/attachments failed', appError)

    return NextResponse.json(
      { error: appError.message },
      { status: appError.statusCode }
    )
  }
}
