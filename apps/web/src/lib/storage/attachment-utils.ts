/**
 * Attachment Utilities
 * 处理附件 URL 刷新和转换的工具函数
 */

import { getClient } from '@/lib/supabase/client';
import { logger } from '@mango/shared/utils';
import { urlCache } from './url-cache';

/**
 * 附件数据接口
 */
export interface AttachmentWithPath {
  url: string;
  path: string;
  name?: string;
  type?: string;
  size?: number;
  [key: string]: unknown;
}

/**
 * 刷新附件的签名 URL
 * 用于处理已过期的签名 URL
 *
 * @param attachments 附件数组
 * @param bucket Storage bucket 名称
 * @param expiresIn 过期时间(秒)，默认 24 小时
 * @returns 刷新后的附件数组
 */
export async function refreshAttachmentUrls(
  attachments: AttachmentWithPath[],
  bucket: string = 'attachments',
  expiresIn: number = 86400
): Promise<AttachmentWithPath[]> {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  const supabase = getClient();
  const refreshedAttachments: AttachmentWithPath[] = [];

  for (const attachment of attachments) {
    try {
      // 如果没有 path，跳过刷新
      if (!attachment.path) {
        logger.warn('Attachment missing path, skipping URL refresh', { attachment });
        refreshedAttachments.push(attachment);
        continue;
      }

      // 先检查缓存
      const cachedUrl = urlCache.get(attachment.path, bucket, 3600);
      if (cachedUrl) {
        refreshedAttachments.push({
          ...attachment,
          url: cachedUrl,
        });
        continue;
      }

      // 缓存未命中，生成新的签名 URL
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(attachment.path, expiresIn);

      if (error || !data) {
        logger.error('Failed to refresh attachment URL', undefined, { error, path: attachment.path });
        // 保留原 URL
        refreshedAttachments.push(attachment);
        continue;
      }

      // 更新 URL - Supabase 返回的是 { signedUrl: string }
      const newUrl = data.signedUrl || data;
      const finalUrl = typeof newUrl === 'string' ? newUrl : attachment.url;

      // 缓存新生成的 URL
      urlCache.set(attachment.path, finalUrl, bucket, expiresIn);

      refreshedAttachments.push({
        ...attachment,
        url: finalUrl,
      });
    } catch (error) {
      logger.error('Error refreshing attachment URL', error as Error);
      refreshedAttachments.push(attachment);
    }
  }

  return refreshedAttachments;
}

/**
 * 检查 URL 是否可能已过期
 * 通过检查 URL 中的时间戳参数来判断
 *
 * @param url 要检查的 URL
 * @param bufferSeconds 提前刷新的缓冲时间(秒)，默认 1 小时
 * @returns 是否需要刷新
 */
export function isUrlExpired(
  url: string | undefined | null,
  bufferSeconds: number = 3600
): boolean {
  // 如果 URL 为空或无效，认为需要刷新
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return true;
  }

  try {
    const urlObj = new URL(url);
    const expiresParam = urlObj.searchParams.get('Expires') || urlObj.searchParams.get('expires');

    if (!expiresParam) {
      // 如果没有过期参数，假设是公开 URL，不需要刷新
      return false;
    }

    const expiresTimestamp = parseInt(expiresParam, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    // 如果即将在 bufferSeconds 内过期，返回 true
    return expiresTimestamp - currentTimestamp < bufferSeconds;
  } catch (error) {
    // URL 解析失败，认为需要刷新
    logger.debug('Failed to parse URL for expiry check, will refresh', {
      url: url?.substring(0, 50),
    });
    return true;
  }
}

/**
 * 智能刷新附件 URL
 * 只刷新已过期或即将过期的 URL
 *
 * @param attachments 附件数组
 * @param bucket Storage bucket 名称
 * @param expiresIn 过期时间(秒)，默认 24 小时
 * @param bufferSeconds 提前刷新的缓冲时间(秒)，默认 1 小时
 * @returns 刷新后的附件数组
 */
export async function smartRefreshAttachmentUrls(
  attachments: AttachmentWithPath[],
  bucket: string = 'attachments',
  expiresIn: number = 86400,
  bufferSeconds: number = 3600
): Promise<AttachmentWithPath[]> {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  const result: AttachmentWithPath[] = [];
  const needsRefresh: AttachmentWithPath[] = [];

  // 先检查缓存，只有缓存未命中且 URL 过期的才需要刷新
  for (const att of attachments) {
    if (!att.path) {
      result.push(att);
      continue;
    }

    // 先检查缓存
    const cachedUrl = urlCache.get(att.path, bucket, bufferSeconds);
    if (cachedUrl) {
      // 缓存命中，直接使用
      result.push({
        ...att,
        url: cachedUrl,
      });
      continue;
    }

    // 缓存未命中，检查当前 URL 是否过期
    if (isUrlExpired(att.url, bufferSeconds)) {
      needsRefresh.push(att);
    } else {
      // URL 还有效，使用原 URL
      result.push(att);
    }
  }

  if (needsRefresh.length === 0) {
    // 没有需要刷新的附件
    return result;
  }

  logger.info('Refreshing expired attachment URLs', {
    total: attachments.length,
    cached: result.length,
    needsRefresh: needsRefresh.length,
  });

  // 只刷新需要的附件
  const refreshed = await refreshAttachmentUrls(needsRefresh, bucket, expiresIn);

  // 合并结果：已缓存的 + 新刷新的
  return [...result, ...refreshed];
}
