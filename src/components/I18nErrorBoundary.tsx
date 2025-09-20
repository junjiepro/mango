'use client'

import { Component, ReactNode } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * I18n 错误边界组件
 * 捕获国际化相关的错误并提供降级体验
 */
class I18nErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // 检查是否为国际化相关错误
    const isI18nError =
      error.message.includes('translation') ||
      error.message.includes('locale') ||
      error.message.includes('intl') ||
      error.message.includes('i18n')

    return {
      hasError: isI18nError,
      error: isI18nError ? error : undefined
    }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // 只记录国际化相关错误
    if (this.state.hasError) {
      console.error('I18n Error Boundary caught an error:', error, errorInfo)

      // 在生产环境中，可以发送错误到监控服务
      if (process.env.NODE_ENV === 'production') {
        // TODO: 发送到错误监控服务
        // errorReportingService.captureException(error, {
        //   tags: { component: 'i18n' },
        //   extra: errorInfo
        // })
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // 渲染自定义的错误界面或回退内容
      return this.props.fallback || <I18nErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

/**
 * 默认的 i18n 错误回退组件
 */
function I18nErrorFallback({ error }: { error?: Error }) {
  const t = useTranslations('errors')

  return (
    <div className="flex flex-col items-center justify-center p-8 border border-red-200 rounded-lg bg-red-50">
      <div className="text-red-600 mb-4">
        <svg
          className="w-12 h-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-red-800 mb-2">
        {t?.('translation_error') || 'Translation Error'}
      </h3>

      <p className="text-red-700 text-center mb-4">
        {t?.('translation_error_message') ||
         'There was an error loading translations. Please try refreshing the page.'}
      </p>

      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-4 p-3 bg-red-100 rounded border text-sm">
          <summary className="cursor-pointer font-medium text-red-800">
            Error Details (Development Only)
          </summary>
          <pre className="mt-2 text-red-700 whitespace-pre-wrap break-words">
            {error.message}
          </pre>
        </details>
      )}

      <button
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        {t?.('refresh_page') || 'Refresh Page'}
      </button>
    </div>
  )
}

/**
 * 高阶组件：为任何组件添加 i18n 错误边界
 */
export function withI18nErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <I18nErrorBoundary fallback={fallback}>
      <Component {...props} />
    </I18nErrorBoundary>
  )

  WrappedComponent.displayName = `withI18nErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

/**
 * Hook：在函数组件中处理 i18n 错误
 */
export function useI18nErrorHandler() {
  const handleI18nError = (error: Error) => {
    console.error('I18n error handled:', error)

    // 可以触发全局错误状态或通知
    // 或者可以使用 React Error Boundary
    if (error.message.includes('translation') || error.message.includes('locale')) {
      // 处理翻译相关错误
      return {
        isI18nError: true,
        fallbackText: 'Translation not available'
      }
    }

    return {
      isI18nError: false,
      fallbackText: null
    }
  }

  return { handleI18nError }
}

export default I18nErrorBoundaryClass
export { I18nErrorBoundaryClass as I18nErrorBoundary }