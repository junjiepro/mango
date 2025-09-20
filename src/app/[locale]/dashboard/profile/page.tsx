'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updatePasswordSchema, type UpdatePasswordFormData } from '@/lib/validations/auth'
import { updatePasswordAction } from './actions'
import {
  AlertCircle,
  CheckCircle2,
  User,
  Mail,
  Calendar,
  Shield,
  ArrowLeft,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema)
  })

  useEffect(() => {
    if (updateSuccess) {
      const timer = setTimeout(() => {
        setUpdateSuccess(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [updateSuccess])

  useEffect(() => {
    if (updateError) {
      const timer = setTimeout(() => {
        setUpdateError(null)
      }, 8000)
      return () => clearTimeout(timer)
    }
  }, [updateError])

  const onPasswordUpdate = async (data: UpdatePasswordFormData) => {
    setIsUpdating(true)
    setUpdateError(null)

    try {
      // 创建FormData对象
      const formData = new FormData()
      formData.append('currentPassword', data.currentPassword)
      formData.append('newPassword', data.newPassword)
      formData.append('confirmPassword', data.confirmPassword)

      // 调用server action
      const result = await updatePasswordAction(formData)

      if (result.error) {
        setUpdateError(result.error)
      } else if (result.success) {
        setUpdateSuccess(true)
        setShowPasswordForm(false)
        reset()
      }
    } catch (error) {
      setUpdateError('密码更新失败，请稍后重试')
    } finally {
      setIsUpdating(false)
    }
  }

  const getAccountStatusColor = () => {
    if (!user?.email_confirmed_at) return 'destructive'
    return 'default'
  }

  const getAccountStatusText = () => {
    if (!user?.email_confirmed_at) return '待验证'
    return '已验证'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载用户信息...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900">访问被拒绝</CardTitle>
            <CardDescription>请先登录以访问个人资料</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/login')}
              className="w-full"
            >
              前往登录
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回仪表板
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">个人资料</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">欢迎，{user.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 成功消息 */}
          {updateSuccess && (
            <Alert className="mb-6">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>密码已成功更新</AlertDescription>
            </Alert>
          )}

          {/* 错误消息 */}
          {updateError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{updateError}</AlertDescription>
            </Alert>
          )}

          {/* 页面标题 */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">个人资料</h2>
            <p className="mt-2 text-gray-600">查看和管理您的账户信息</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* 基本信息卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  基本信息
                </CardTitle>
                <CardDescription>您的账户基本信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">用户ID</Label>
                    <p className="mt-1 text-sm font-mono bg-gray-50 p-2 rounded border">
                      {user.id}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      邮箱地址
                    </Label>
                    <p className="mt-1 text-sm text-gray-900 p-2">
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center">
                      <Shield className="h-4 w-4 mr-1" />
                      账户状态
                    </Label>
                    <div className="mt-1">
                      <Badge variant={getAccountStatusColor() as any}>
                        {getAccountStatusText()}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      注册时间
                    </Label>
                    <p className="mt-1 text-sm text-gray-900 p-2">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>

                {/* 邮箱验证提醒 */}
                {!user.email_confirmed_at && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      您的邮箱尚未验证。请检查您的邮箱并点击验证链接以完成验证。
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* 账户详情卡片 */}
            <Card>
              <CardHeader>
                <CardTitle>账户详情</CardTitle>
                <CardDescription>详细的账户信息和活动记录</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {user.email_confirmed_at && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">邮箱验证时间</Label>
                      <p className="mt-1 text-sm text-gray-900 p-2">
                        {formatDate(user.email_confirmed_at)}
                      </p>
                    </div>
                  )}
                  {user.last_sign_in_at && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">最后登录</Label>
                      <p className="mt-1 text-sm text-gray-900 p-2">
                        {formatDate(user.last_sign_in_at)}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-500">更新时间</Label>
                    <p className="mt-1 text-sm text-gray-900 p-2">
                      {formatDate(user.updated_at)}
                    </p>
                  </div>
                  {user.phone && (
                    <div>
                      <Label className="text-sm font-medium text-gray-500">手机号码</Label>
                      <p className="mt-1 text-sm text-gray-900 p-2">
                        {user.phone}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 安全设置卡片 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  安全设置
                </CardTitle>
                <CardDescription>管理您的账户安全</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">密码</h4>
                      <p className="text-sm text-gray-500">修改您的登录密码</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                    >
                      {showPasswordForm ? '取消' : '更改密码'}
                    </Button>
                  </div>

                  {/* 密码更新表单 */}
                  {showPasswordForm && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-6">
                        <form onSubmit={handleSubmit(onPasswordUpdate)} className="space-y-4">
                          <div>
                            <Label htmlFor="currentPassword">当前密码</Label>
                            <div className="relative">
                              <Input
                                id="currentPassword"
                                type={showCurrentPassword ? "text" : "password"}
                                {...register('currentPassword')}
                                className="pr-10"
                                placeholder="请输入当前密码"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            {errors.currentPassword && (
                              <p className="text-sm text-red-600 mt-1">{errors.currentPassword.message}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="newPassword">新密码</Label>
                            <div className="relative">
                              <Input
                                id="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                {...register('newPassword')}
                                className="pr-10"
                                placeholder="请输入新密码"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            {errors.newPassword && (
                              <p className="text-sm text-red-600 mt-1">{errors.newPassword.message}</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="confirmPassword">确认新密码</Label>
                            <div className="relative">
                              <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                {...register('confirmPassword')}
                                className="pr-10"
                                placeholder="请再次输入新密码"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                            {errors.confirmPassword && (
                              <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
                            )}
                          </div>

                          <div className="flex space-x-3 pt-4">
                            <Button
                              type="submit"
                              disabled={isUpdating}
                              className="flex items-center"
                            >
                              {isUpdating ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                  更新中...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  更新密码
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setShowPasswordForm(false)
                                reset()
                                setUpdateError(null)
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}