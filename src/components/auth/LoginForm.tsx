'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { loginSchema, type LoginFormData } from '@/lib/validations/auth'
import { useEffect } from 'react'

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  // 处理URL参数中的消息
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const messageParam = searchParams.get('message')

    if (errorParam) {
      setMessage({
        type: 'error',
        text: decodeURIComponent(errorParam)
      })
    } else if (messageParam) {
      setMessage({
        type: 'success',
        text: decodeURIComponent(messageParam)
      })
    }

    // 5秒后清除消息
    if (errorParam || messageParam) {
      const timer = setTimeout(() => {
        setMessage(null)
        // 清理URL参数
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('error')
        newUrl.searchParams.delete('message')
        window.history.replaceState({}, '', newUrl.pathname)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await signIn(data.email, data.password)

      if (error) {
        // 处理常见的登录错误
        let errorMessage = error.message
        switch (error.message) {
          case 'Invalid login credentials':
          case 'Invalid email or password':
            errorMessage = '邮箱或密码错误，请检查后重试'
            break
          case 'Email not confirmed':
            errorMessage = '请先验证您的邮箱地址'
            break
          case 'Too many requests':
            errorMessage = '登录尝试过于频繁，请稍后再试'
            break
          case 'Account temporarily locked':
            errorMessage = '账户已临时锁定，请稍后再试'
            break
          default:
            if (errorMessage.includes('rate limit')) {
              errorMessage = '登录请求过于频繁，请稍后再试'
            }
            break
        }

        setMessage({
          type: 'error',
          text: errorMessage
        })
      } else {
        setMessage({
          type: 'success',
          text: '登录成功！正在跳转...'
        })
        reset()
        // 短暂延迟后跳转到控制台
        setTimeout(() => {
          router.push('/dashboard')
        }, 1000)
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: '登录过程中发生错误，请稍后重试。'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            登录您的账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            还没有账户？{' '}
            <Link
              href="/register"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              立即注册
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* 邮箱输入 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱地址
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  errors.email
                    ? 'border-red-300 text-red-900 placeholder-red-300'
                    : 'border-gray-300'
                }`}
                placeholder="请输入邮箱地址"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* 密码输入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码
              </label>
              <input
                {...register('password')}
                type="password"
                id="password"
                autoComplete="current-password"
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
                  errors.password
                    ? 'border-red-300 text-red-900 placeholder-red-300'
                    : 'border-gray-300'
                }`}
                placeholder="请输入密码"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* 记住我和忘记密码 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                记住我
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                忘记密码？
              </Link>
            </div>
          </div>

          {/* 消息显示 */}
          {message && (
            <div
              className={`rounded-md p-4 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  {message.type === 'success' ? (
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm ${
                      message.type === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {message.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  登录中...
                </div>
              ) : (
                '登录'
              )}
            </button>
          </div>

          {/* 其他登录选项提示 */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">或者</span>
              </div>
            </div>

            <div className="mt-4 text-center text-sm text-gray-600">
              需要帮助？{' '}
              <Link
                href="/help"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                联系客服
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}