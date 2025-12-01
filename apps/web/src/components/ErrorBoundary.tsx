/**
 * Error Boundary Component
 * T040: Create error boundary component
 */

'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AppError, normalizeError } from '@mango/shared/utils'
import { logger } from '@mango/shared/utils'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: (error: AppError, reset: () => void) => ReactNode
  onError?: (error: AppError, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: AppError | null
}

/**
 * ErrorBoundary 组件
 * 捕获子组件树中的 JavaScript 错误,记录错误并显示降级 UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // 更新 state 使下一次渲染能够显示降级后的 UI
    return {
      hasError: true,
      error: normalizeError(error),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误到日志服务
    const appError = normalizeError(error)

    logger.error('ErrorBoundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorType: appError.type,
    })

    // 调用自定义错误处理器
    if (this.props.onError) {
      this.props.onError(appError, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // 如果提供了自定义 fallback,使用它
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      // 默认错误 UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border border-destructive/50 bg-card p-6 shadow-lg">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-destructive">
                出错了
              </h2>
              <p className="text-sm text-muted-foreground">
                应用程序遇到了一个错误。我们已经记录了这个问题。
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="space-y-2">
                <p className="text-sm font-medium">错误详情:</p>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs font-mono text-muted-foreground">
                    {this.state.error.type}
                  </p>
                  <p className="mt-1 text-sm">{this.state.error.message}</p>
                  {this.state.error.stack && (
                    <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={this.handleReset} className="flex-1">
                重试
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                返回首页
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 函数式 ErrorBoundary Hook (用于特定场景)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: AppError, reset: () => void) => ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
