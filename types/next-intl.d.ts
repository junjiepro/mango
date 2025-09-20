/**
 * Next-intl 类型声明扩展
 * 为 next-intl 提供自定义类型定义和增强
 */

import 'next-intl'

// 扩展 next-intl 的默认类型
declare module 'next-intl' {
  // 定义支持的语言类型
  type Locale = 'zh' | 'en'

  // 定义翻译命名空间
  type Namespace =
    | 'common'
    | 'navigation'
    | 'auth'
    | 'pages'
    | 'validation'
    | 'messages'
    | 'errors'

  // 扩展 useTranslations Hook 的类型
  interface IntlConfig {
    locale: Locale
    messages: {
      [key in Namespace]: Record<string, any>
    }
  }

  // 为翻译函数提供更强的类型检查
  type TranslationFunction<T = string> = (
    key: string,
    values?: Record<string, string | number>
  ) => T

  // 扩展错误类型
  interface IntlError extends Error {
    code?: 'MISSING_MESSAGE' | 'INVALID_MESSAGE' | 'MISSING_LOCALE'
    namespace?: string
    key?: string
    locale?: string
  }
}

// 全局声明
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_DEFAULT_LOCALE: 'zh' | 'en'
      NEXT_PUBLIC_SUPPORTED_LOCALES: string
    }
  }

  // 扩展 Window 对象以支持语言偏好
  interface Window {
    __NEXT_INTL_LOCALE__?: string
    __NEXT_INTL_MESSAGES__?: Record<string, any>
  }
}

// 路由类型声明
declare module '@/i18n/routing' {
  export interface Pathnames {
    '/': '/'
    '/login': '/login'
    '/register': '/register'
    '/dashboard': '/dashboard'
    '/dashboard/profile': '/dashboard/profile'
    '/forgot-password': '/forgot-password'
    '/reset-password': '/reset-password'
  }

  export type Pathname = keyof Pathnames
  export type LocalePrefix = 'always' | 'as-needed' | 'never'
}

// 性能相关类型声明
declare module '@/lib/i18n-performance' {
  export interface PerformanceMetrics {
    loadTime: number
    cacheHits: number
    cacheMisses: number
    errorCount: number
  }

  export interface CacheStatus {
    size: number
    locales: string[]
  }

  export interface TranslationCache {
    [locale: string]: {
      messages: any
      timestamp: number
      version?: string
    }
  }
}

// 错误边界类型声明
declare module '@/components/I18nErrorBoundary' {
  export interface I18nErrorBoundaryState {
    hasError: boolean
    error?: Error
  }

  export interface I18nErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ReactNode
  }

  export interface I18nErrorHandler {
    handleI18nError: (error: Error) => {
      isI18nError: boolean
      fallbackText: string | null
    }
  }
}

// 自定义 Hook 类型声明
declare module '@/hooks/useI18n' {
  export interface UseI18nReturn {
    locale: string
    setLocale: (locale: string) => void
    t: (key: string, params?: Record<string, any>) => string
    isLoading: boolean
    error: Error | null
  }

  export interface UseTypedTranslationsReturn<T extends string> {
    t: (key: T, params?: Record<string, any>) => string
    locale: string
    isLoading: boolean
    error: Error | null
  }
}

// 中间件类型声明
declare module 'next/server' {
  export interface NextRequest {
    nextUrl: {
      pathname: string
      locale?: string
    }
  }
}

export {}