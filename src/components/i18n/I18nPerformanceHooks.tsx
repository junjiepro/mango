'use client'

/**
 * I18n 性能优化客户端 Hooks
 * 包含 React Hooks 相关的 i18n 性能功能
 */

import React, { useEffect, useState } from 'react'
import { i18nPerformanceManager, type PerformanceMetrics } from '@/lib/i18n-performance'

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
  return React.createElement(React.Fragment, null, children)
}