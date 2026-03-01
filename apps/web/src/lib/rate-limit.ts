/**
 * Rate Limiter Utility
 * T182: API rate limiting middleware
 * 内存实现，适合单实例部署。生产环境可替换为 @upstash/ratelimit
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// 定期清理过期条目
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key)
  }
}, 60_000)

interface RateLimitConfig {
  /** 时间窗口内允许的最大请求数 */
  limit: number
  /** 时间窗口(ms) */
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { success: true, limit: config.limit, remaining: config.limit - 1, resetAt: now + config.windowMs }
  }

  entry.count++
  const remaining = Math.max(0, config.limit - entry.count)
  return {
    success: entry.count <= config.limit,
    limit: config.limit,
    remaining,
    resetAt: entry.resetAt,
  }
}

/** 预设配置 */
export const RATE_LIMITS = {
  /** API 通用: 60次/分钟 */
  api: { limit: 60, windowMs: 60_000 },
  /** 认证相关: 10次/分钟 */
  auth: { limit: 10, windowMs: 60_000 },
  /** AI 对话: 20次/分钟 */
  chat: { limit: 20, windowMs: 60_000 },
} as const

/**
 * API 路由速率限制检查
 * 返回 NextResponse(429) 或 null(通过)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.api
): Response | null {
  const result = rateLimit(identifier, config)
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: 'Too many requests' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetAt),
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
        },
      }
    )
  }
  return null
}
