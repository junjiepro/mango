/**
 * I18n 性能优化工具
 * 提供翻译文件懒加载、缓存和性能监控功能
 */

interface TranslationCache {
  [locale: string]: {
    messages: any
    timestamp: number
    version?: string
  }
}

interface PerformanceMetrics {
  loadTime: number
  cacheHits: number
  cacheMisses: number
  errorCount: number
}

class I18nPerformanceManager {
  private cache: TranslationCache = {}
  private metrics: PerformanceMetrics = {
    loadTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errorCount: 0
  }
  private readonly CACHE_EXPIRY = 30 * 60 * 1000 // 30分钟
  private readonly MAX_CACHE_SIZE = 10 // 最多缓存10个语言

  /**
   * 懒加载翻译文件
   */
  async loadTranslations(locale: string): Promise<any> {
    const startTime = performance.now()

    try {
      // 检查缓存
      const cached = this.getFromCache(locale)
      if (cached) {
        this.metrics.cacheHits++
        return cached
      }

      this.metrics.cacheMisses++

      // 动态导入翻译文件
      const messages = await this.loadTranslationFile(locale)

      // 更新缓存
      this.setCache(locale, messages)

      const endTime = performance.now()
      this.metrics.loadTime += endTime - startTime

      return messages
    } catch (error) {
      this.metrics.errorCount++
      console.error(`Failed to load translations for locale: ${locale}`, error)

      // 返回降级内容
      return this.getFallbackTranslations(locale)
    }
  }

  /**
   * 从缓存获取翻译
   */
  private getFromCache(locale: string): any | null {
    const cached = this.cache[locale]

    if (!cached) {
      return null
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY) {
      delete this.cache[locale]
      return null
    }

    return cached.messages
  }

  /**
   * 设置缓存
   */
  private setCache(locale: string, messages: any): void {
    // 清理过期缓存
    this.cleanExpiredCache()

    // 如果缓存已满，删除最旧的条目
    if (Object.keys(this.cache).length >= this.MAX_CACHE_SIZE) {
      const oldestKey = Object.keys(this.cache).reduce((oldest, key) => {
        return this.cache[key].timestamp < this.cache[oldest].timestamp ? key : oldest
      })
      delete this.cache[oldestKey]
    }

    this.cache[locale] = {
      messages,
      timestamp: Date.now(),
      version: process.env.NEXT_PUBLIC_APP_VERSION
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now()
    Object.keys(this.cache).forEach(locale => {
      if (now - this.cache[locale].timestamp > this.CACHE_EXPIRY) {
        delete this.cache[locale]
      }
    })
  }

  /**
   * 动态加载翻译文件
   */
  private async loadTranslationFile(locale: string): Promise<any> {
    // 使用动态导入以支持代码分割
    switch (locale) {
      case 'zh':
        return (await import('../../messages/zh.json')).default
      case 'en':
        return (await import('../../messages/en.json')).default
      default:
        // 回退到默认语言
        return (await import('../../messages/zh.json')).default
    }
  }

  /**
   * 获取降级翻译内容
   */
  private getFallbackTranslations(locale: string): any {
    // 提供基本的降级翻译
    const fallback = {
      common: {
        loading: locale === 'en' ? 'Loading...' : '加载中...',
        error: locale === 'en' ? 'Error' : '错误',
        retry: locale === 'en' ? 'Retry' : '重试'
      },
      navigation: {
        home: locale === 'en' ? 'Home' : '首页',
        login: locale === 'en' ? 'Login' : '登录',
        register: locale === 'en' ? 'Register' : '注册'
      }
    }

    return fallback
  }

  /**
   * 预加载翻译文件
   */
  async preloadTranslations(locales: string[]): Promise<void> {
    const preloadPromises = locales.map(locale =>
      this.loadTranslations(locale).catch(error => {
        console.warn(`Failed to preload translations for ${locale}:`, error)
      })
    )

    await Promise.allSettled(preloadPromises)
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 重置性能指标
   */
  resetMetrics(): void {
    this.metrics = {
      loadTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0
    }
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache = {}
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): { size: number, locales: string[] } {
    return {
      size: Object.keys(this.cache).length,
      locales: Object.keys(this.cache)
    }
  }
}

// 创建单例实例
export const i18nPerformanceManager = new I18nPerformanceManager()

/**
 * React Hook：用于性能优化的翻译加载
 */
export function useOptimizedTranslations(locale: string) {
  const [translations, setTranslations] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    const loadTranslations = async () => {
      try {
        setLoading(true)
        setError(null)

        const messages = await i18nPerformanceManager.loadTranslations(locale)

        if (mounted) {
          setTranslations(messages)
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'))
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadTranslations()

    return () => {
      mounted = false
    }
  }, [locale])

  return { translations, loading, error }
}

/**
 * 性能监控 Hook
 */
export function useI18nPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(
    i18nPerformanceManager.getMetrics()
  )

  const updateMetrics = () => {
    setMetrics(i18nPerformanceManager.getMetrics())
  }

  const resetMetrics = () => {
    i18nPerformanceManager.resetMetrics()
    updateMetrics()
  }

  useEffect(() => {
    // 定期更新指标
    const interval = setInterval(updateMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  return {
    metrics,
    updateMetrics,
    resetMetrics,
    cacheStatus: i18nPerformanceManager.getCacheStatus()
  }
}

/**
 * 翻译预加载器组件
 */
interface TranslationPreloaderProps {
  locales: string[]
  children: React.ReactNode
}

export function TranslationPreloader({ locales, children }: TranslationPreloaderProps) {
  const [preloaded, setPreloaded] = useState(false)

  useEffect(() => {
    i18nPerformanceManager.preloadTranslations(locales).then(() => {
      setPreloaded(true)
    })
  }, [locales])

  // 可以选择在预加载完成前显示加载指示器
  // 但为了不影响用户体验，我们直接渲染子组件
  return <>{children}</>
}

// 导出默认实例和工具函数
export default i18nPerformanceManager

import { useEffect, useState } from 'react'