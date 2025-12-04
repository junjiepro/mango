/**
 * File Upload Utilities for Supabase Storage
 * 提供文件上传到 Supabase Storage 的工具函数
 */

import { getClient } from '@/lib/supabase/client'
import { logger } from '@mango/shared/utils'

/**
 * 文件上传结果
 */
export interface UploadResult {
  /** 文件在 Storage 中的路径 */
  path: string
  /** 文件的公开访问 URL */
  publicUrl: string
  /** 原始文件名 */
  fileName: string
  /** 文件类型 */
  fileType: string
  /** 文件大小(字节) */
  fileSize: number
}

/**
 * 上传进度回调
 */
export type UploadProgressCallback = (progress: number, fileName: string) => void

/**
 * 上传配置
 */
export interface UploadOptions {
  /** Storage bucket 名称 */
  bucket?: string
  /** 文件路径前缀 */
  pathPrefix?: string
  /** 是否生成唯一文件名 */
  uniqueFileName?: boolean
  /** 上传进度回调 */
  onProgress?: UploadProgressCallback
}

/**
 * 默认配置
 */
const DEFAULT_OPTIONS: Required<Omit<UploadOptions, 'onProgress'>> = {
  bucket: 'attachments',
  pathPrefix: 'messages',
  uniqueFileName: true,
}

/**
 * 生成唯一文件名
 * 使用纯英文数字命名,避免中文导致的上传问题
 * @param originalName 原始文件名
 * @returns 唯一文件名 (格式: file_timestamp_random.ext)
 */
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 10)
  const ext = originalName.split('.').pop()?.toLowerCase() || 'bin'

  // 使用纯英文数字命名,避免中文字符
  return `file_${timestamp}_${randomStr}.${ext}`
}

/**
 * 验证文件
 * @param file 要验证的文件
 * @throws 如果文件无效则抛出错误
 */
function validateFile(file: File): void {
  // 检查文件大小 (最大 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件 "${file.name}" 超过最大限制 10MB`)
  }

  // 检查文件类型
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ]

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`不支持的文件类型: ${file.type}`)
  }
}

/**
 * 上传单个文件到 Supabase Storage
 * @param file 要上传的文件
 * @param options 上传配置
 * @returns 上传结果
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const config = { ...DEFAULT_OPTIONS, ...options }

  try {
    // 获取 Supabase 客户端
    const supabase = getClient()

    // 获取当前用户 ID
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new Error('用户未登录,无法上传文件')
    }

    // 验证文件
    validateFile(file)

    // 生成文件路径 (必须包含用户 ID 前缀)
    const fileName = config.uniqueFileName
      ? generateUniqueFileName(file.name)
      : file.name

    // 构建完整路径: {user_id}/{pathPrefix}/{fileName}
    const filePath = config.pathPrefix
      ? `${user.id}/${config.pathPrefix}/${fileName}`
      : `${user.id}/${fileName}`

    logger.debug('Uploading file', {
      fileName: file.name,
      filePath,
      size: file.size,
      type: file.type,
      userId: user.id
    })

    // 上传文件
    const { data, error } = await supabase.storage
      .from(config.bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      logger.error('File upload failed', error)
      throw new Error(`上传失败: ${error.message}`)
    }

    // 获取公开访问 URL
    const { data: urlData } = supabase.storage
      .from(config.bucket)
      .getPublicUrl(data.path)

    logger.info('File uploaded successfully', {
      path: data.path,
      publicUrl: urlData.publicUrl
    })

    // 调用进度回调(100%)
    if (options.onProgress) {
      options.onProgress(100, file.name)
    }

    return {
      path: data.path,
      publicUrl: urlData.publicUrl,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }
  } catch (error) {
    logger.error('File upload error', error as Error)
    throw error
  }
}

/**
 * 批量上传文件
 * @param files 要上传的文件数组
 * @param options 上传配置
 * @returns 上传结果数组
 */
export async function uploadFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  if (files.length === 0) {
    return []
  }

  logger.info('Starting batch upload', { count: files.length })

  const results: UploadResult[] = []
  const errors: Array<{ file: string; error: string }> = []

  // 串行上传文件以避免并发限制
  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    try {
      // 创建带进度的回调
      const progressCallback: UploadProgressCallback = (progress, fileName) => {
        if (options.onProgress) {
          // 计算总体进度: (已完成文件数 + 当前文件进度) / 总文件数
          const totalProgress = ((i + progress / 100) / files.length) * 100
          options.onProgress(totalProgress, fileName)
        }
      }

      const result = await uploadFile(file, {
        ...options,
        onProgress: progressCallback,
      })

      results.push(result)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      errors.push({ file: file.name, error: errorMessage })
      logger.error('Failed to upload file', error as Error)
    }
  }

  // 如果有错误,记录但不抛出,让调用者决定如何处理
  if (errors.length > 0) {
    logger.warn('Some files failed to upload', { errors })
  }

  logger.info('Batch upload completed', {
    total: files.length,
    successful: results.length,
    failed: errors.length
  })

  return results
}

/**
 * 删除文件
 * @param path 文件路径
 * @param bucket Storage bucket 名称
 */
export async function deleteFile(
  path: string,
  bucket: string = DEFAULT_OPTIONS.bucket
): Promise<void> {
  try {
    const supabase = getClient()

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) {
      logger.error('File deletion failed', error)
      throw new Error(`删除失败: ${error.message}`)
    }

    logger.info('File deleted successfully', { path })
  } catch (error) {
    logger.error('File deletion error', error as Error)
    throw error
  }
}

/**
 * 获取文件的公开 URL
 * @param path 文件路径
 * @param bucket Storage bucket 名称
 * @returns 公开访问 URL
 */
export function getPublicUrl(
  path: string,
  bucket: string = DEFAULT_OPTIONS.bucket
): string {
  const supabase = getClient()
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
