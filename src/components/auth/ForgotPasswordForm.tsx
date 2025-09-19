'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/lib/validations/auth'

export default function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const { resetPassword } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    reset
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await resetPassword(data.email)

      if (error) {
        // 处理常见的重置密码错误
        let errorMessage = error.message
        switch (error.message) {
          case 'User not found':
            errorMessage = '该邮箱未注册，请检查邮箱地址或先注册账户'
            break
          case 'For security purposes, you can only request this once every 60 seconds':
            errorMessage = '为了安全起见，您只能每60秒请求一次重置邮件'
            break
          case 'Too many requests':
            errorMessage = '请求过于频繁，请稍后再试'
            break
          case 'Invalid email':
            errorMessage = '邮箱格式无效，请检查后重试'
            break
          default:
            if (errorMessage.includes('rate limit')) {
              errorMessage = '请求过于频繁，请稍后再试'
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
          text: '密码重置邮件已发送！请检查您的邮箱（包括垃圾邮件文件夹）。'
        })
        setEmailSent(true)
        reset()
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: '发送重置邮件过程中发生错误，请稍后重试。'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    const email = getValues('email')
    if (!email) {
      setMessage({
        type: 'error',
        text: '请输入邮箱地址'
      })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await resetPassword(email)

      if (error) {
        setMessage({
          type: 'error',
          text: '重发邮件失败，请稍后再试'
        })
      } else {
        setMessage({
          type: 'success',
          text: '重置邮件已重新发送！'
        })
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: '重发邮件过程中发生错误'
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">
              邮件已发送
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              我们已向您的邮箱发送了密码重置链接
            </p>
          </div>

          <div className="mt-8">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    下一步操作
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>检查您的邮箱（包括垃圾邮件文件夹）</li>
                      <li>点击邮件中的重置链接</li>
                      <li>设置新密码</li>
                      <li>使用新密码登录</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-md p-4 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p
                className={`text-sm ${
                  message.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleResendEmail}
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '发送中...' : '重新发送邮件'}
            </button>

            <div className="text-center space-y-2">
              <Link
                href="/login"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                返回登录
              </Link>
              <span className="text-gray-400 mx-2">|</span>
              <Link
                href="/register"
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                注册新账户
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            忘记密码
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            输入您的邮箱地址，我们将发送密码重置链接
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div>
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
                placeholder="请输入您注册时使用的邮箱"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
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
                  发送中...
                </div>
              ) : (
                '发送重置邮件'
              )}
            </button>
          </div>

          {/* 返回登录链接 */}
          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              ← 返回登录
            </Link>
          </div>

          {/* 帮助信息 */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">需要帮助？</span>
              </div>
            </div>

            <div className="mt-4 text-center">
              <div className="space-y-2 text-sm text-gray-600">
                <p>• 如果您没有收到邮件，请检查垃圾邮件文件夹</p>
                <p>• 重置链接的有效期为1小时</p>
                <p>• 如有问题，请{' '}
                  <Link
                    href="/help"
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    联系客服
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}