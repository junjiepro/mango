'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { resetPasswordSchema, type ResetPasswordFormData } from '@/lib/validations/auth'

interface Message {
  type: 'error' | 'success'
  text: string
}

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { confirmPasswordReset } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isResetComplete, setIsResetComplete] = useState(false)

  // 从URL参数获取访问令牌
  const accessToken = searchParams.get('access_token')
  const refreshToken = searchParams.get('refresh_token')

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema)
  })

  const password = watch('password')

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!accessToken) {
      setMessage({
        type: 'error',
        text: '密码重置链接无效或已过期，请重新申请密码重置。'
      })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      console.log('[ResetPassword] Starting password reset confirmation')
      const { error } = await confirmPasswordReset(accessToken, data.password)

      if (error) {
        console.error('[ResetPassword] Reset confirmation failed:', error)
        let errorMessage = error.message

        switch (error.message) {
          case 'Invalid or expired token':
            errorMessage = '密码重置链接已过期，请重新申请密码重置'
            break
          case 'Password should be at least 6 characters':
            errorMessage = '密码至少需要6个字符'
            break
          case 'New password should be different from the old password':
            errorMessage = '新密码不能与旧密码相同'
            break
          default:
            if (errorMessage.includes('token')) {
              errorMessage = '密码重置链接无效或已过期，请重新申请'
            } else if (errorMessage.includes('password')) {
              errorMessage = '密码格式不符合要求，请检查后重试'
            } else {
              errorMessage = '密码重置失败，请稍后重试或联系客服'
            }
        }

        setMessage({ type: 'error', text: errorMessage })
      } else {
        console.log('[ResetPassword] Password reset successful')
        setIsResetComplete(true)
        setMessage({
          type: 'success',
          text: '密码重置成功！正在跳转到登录页面...'
        })

        // 3秒后跳转到登录页面
        setTimeout(() => {
          router.push('/login?message=密码已成功重置，请使用新密码登录')
        }, 3000)
      }
    } catch (error) {
      console.error('[ResetPassword] Unexpected error:', error)
      setMessage({
        type: 'error',
        text: '密码重置过程中发生错误，请稍后重试。'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 如果没有访问令牌，显示错误状态
  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-900">
                链接无效
              </CardTitle>
              <CardDescription>
                密码重置链接无效或已过期
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  请检查您的邮箱中的最新密码重置邮件，或重新申请密码重置。
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => router.push('/forgot-password')}
                  className="w-full"
                >
                  重新申请密码重置
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/login')}
                  className="w-full"
                >
                  返回登录页面
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // 如果重置已完成，显示成功状态
  if (isResetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <CardTitle className="text-2xl font-bold text-gray-900">
                密码重置成功！
              </CardTitle>
              <CardDescription>
                您的密码已成功更新
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  正在跳转到登录页面，请使用新密码登录...
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => router.push('/login')}
                className="w-full"
              >
                立即前往登录
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            重置密码
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            请输入您的新密码
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>设置新密码</CardTitle>
            <CardDescription>
              请选择一个强密码来保护您的账户安全
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {message && (
                <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">新密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="请输入新密码"
                    {...register('password')}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="请再次输入新密码"
                    {...register('confirmPassword')}
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* 密码强度指示器 */}
              {password && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">密码强度</Label>
                  <div className="space-y-1">
                    <div className={`text-xs ${password.length >= 8 ? 'text-green-600' : 'text-gray-400'}`}>
                      ✓ 至少8个字符
                    </div>
                    <div className={`text-xs ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      ✓ 包含大写字母
                    </div>
                    <div className={`text-xs ${/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      ✓ 包含小写字母
                    </div>
                    <div className={`text-xs ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      ✓ 包含数字
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? '正在重置...' : '重置密码'}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push('/login')}
                  className="text-sm"
                >
                  返回登录
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 安全提示 */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 space-y-2">
              <h4 className="font-medium text-gray-900">安全提示</h4>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>使用包含大小写字母、数字的强密码</li>
                <li>不要使用与其他网站相同的密码</li>
                <li>定期更新密码以保护账户安全</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}