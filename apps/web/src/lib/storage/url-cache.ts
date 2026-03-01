/**
 * URL Cache Manager
 * 缓存签名 URL，避免重复生成
 */

import { logger } from '@mango/shared/utils'

/**
 * 缓存项接口
 */
interface CacheEntry {
  url: string
  expiresAt: number  // Unix 时间戳（秒）
  createdAt: number  // Unix 时间戳（秒）
}

/**
 * URL 缓存管理器
 */
class UrlCacheManager {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly CACHE_KEY_PREFIX = 'url_cache_'

  /**
   * 生成缓存键
   * @param path 文件路径
   * @param bucket Bucket 名称
   */
  private getCacheKey(path: string, bucket: string): string {
    return `${this.CACHE_KEY_PREFIX}${bucket}:${path}`
  }

  /**
   * 从 URL 中提取过期时间
   * @param url 签名 URL
   * @returns 过期时间戳（秒），如果无法提取则返回 null
   */
  private extractExpiryFromUrl(url: string): number | null {
    try {
      const urlObj = new URL(url)
      const expiresParam = urlObj.searchParams.get('Expires') || urlObj.searchParams.get('expires')

      if (expiresParam) {
        return parseInt(expiresParam, 10)
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * 检查缓存项是否有效
   * @param entry 缓存项
   * @param bufferSeconds 提前过期的缓冲时间（秒）
   * @returns 是否有效
   */
  private isEntryValid(entry: CacheEntry, bufferSeconds: number = 3600): boolean {
    const currentTimestamp = Math.floor(Date.now() / 1000)
    // 如果距离过期时间还有超过 bufferSeconds，则认为有效
    return entry.expiresAt - currentTimestamp > bufferSeconds
  }

  /**
   * 获取缓存的 URL
   * @param path 文件路径
   * @param bucket Bucket 名称
   * @param bufferSeconds 提前过期的缓冲时间（秒）
   * @returns 缓存的 URL，如果不存在或已过期则返回 null
   */
  get(path: string, bucket: string = 'attachments', bufferSeconds: number = 3600): string | null {
    const key = this.getCacheKey(path, bucket)
    const entry = this.cache.get(key)

    if (!entry) {
      logger.debug('URL cache miss', { path, bucket, cacheSize: this.cache.size })
      return null
    }

    // 检查是否有效
    if (!this.isEntryValid(entry, bufferSeconds)) {
      // 已过期，删除缓存
      this.cache.delete(key)
      logger.debug('URL cache expired', { path, bucket, expiredAt: entry.expiresAt })
      return null
    }

    const remainingTime = entry.expiresAt - Math.floor(Date.now() / 1000)
    logger.info('URL cache hit', { path: path.substring(0, 50), bucket, remainingTime })
    return entry.url
  }

  /**
   * 设置缓存
   * @param path 文件路径
   * @param url 签名 URL
   * @param bucket Bucket 名称
   * @param expiresIn 过期时间（秒），如果不提供则从 URL 中提取
   */
  set(path: string, url: string, bucket: string = 'attachments', expiresIn?: number): void {
    const key = this.getCacheKey(path, bucket)
    const currentTimestamp = Math.floor(Date.now() / 1000)

    // 尝试从 URL 中提取过期时间
    let expiresAt: number
    if (expiresIn) {
      expiresAt = currentTimestamp + expiresIn
    } else {
      const extractedExpiry = this.extractExpiryFromUrl(url)
      if (extractedExpiry) {
        expiresAt = extractedExpiry
      } else {
        // 如果无法提取，默认 24 小时
        expiresAt = currentTimestamp + 86400
      }
    }

    const entry: CacheEntry = {
      url,
      expiresAt,
      createdAt: currentTimestamp,
    }

    this.cache.set(key, entry)
    logger.debug('URL cached', { path, bucket, expiresAt, ttl: expiresAt - currentTimestamp })
  }

  /**
   * 删除缓存
   * @param path 文件路径
   * @param bucket Bucket 名称
   */
  delete(path: string, bucket: string = 'attachments'): void {
    const key = this.getCacheKey(path, bucket)
    this.cache.delete(key)
    logger.debug('URL cache deleted', { path, bucket })
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    const size = this.cache.size
    this.cache.clear()
    logger.info('URL cache cleared', { count: size })
  }

  /**
   * 清理过期的缓存项
   * @param bufferSeconds 提前过期的缓冲时间（秒）
   * @returns 清理的数量
   */
  cleanup(bufferSeconds: number = 3600): number {
    let count = 0
    const currentTimestamp = Math.floor(Date.now() / 1000)

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt - currentTimestamp <= bufferSeconds) {
        this.cache.delete(key)
        count++
      }
    }

    if (count > 0) {
      logger.info('URL cache cleanup completed', { cleaned: count, remaining: this.cache.size })
    }

    return count
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { total: number; valid: number; expired: number } {
    const currentTimestamp = Math.floor(Date.now() / 1000)
    let valid = 0
    let expired = 0

    for (const entry of this.cache.values()) {
      if (this.isEntryValid(entry)) {
        valid++
      } else {
        expired++
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
    }
  }
}

// 导出单例实例
export const urlCache = new UrlCacheManager()

// 定期清理过期缓存（每 10 分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    urlCache.cleanup()
  }, 10 * 60 * 1000)
}
