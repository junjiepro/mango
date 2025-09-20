'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, User, Settings, Shield } from 'lucide-react'

export default function DashboardPage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const welcome = searchParams.get('welcome')
  const redirectMessage = searchParams.get('message')
  const [showWelcome, setShowWelcome] = useState(welcome === 'true')
  const [showRedirectMessage, setShowRedirectMessage] = useState(!!redirectMessage)

  useEffect(() => {
    if (showWelcome) {
      // 5秒后自动隐藏欢迎消息
      const timer = setTimeout(() => {
        setShowWelcome(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [showWelcome])

  useEffect(() => {
    if (showRedirectMessage) {
      // 3秒后自动隐藏重定向消息
      const timer = setTimeout(() => {
        setShowRedirectMessage(false)
        // 清除URL中的消息参数
        const url = new URL(window.location.href)
        url.searchParams.delete('message')
        window.history.replaceState({}, document.title, url.toString())
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showRedirectMessage])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login?message=您已成功退出登录')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const getAccountStatusColor = () => {
    if (!user?.email_confirmed_at) return 'destructive'
    return 'success'
  }

  const getAccountStatusText = () => {
    if (!user?.email_confirmed_at) return '待验证'
    return '已验证'
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

  // 这个检查实际上不应该触发，因为中间件会处理未认证的访问
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <CardTitle className="text-2xl font-bold text-gray-900">访问被拒绝</CardTitle>
            <CardDescription>请先登录以访问仪表板</CardDescription>
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
              <h1 className="text-xl font-semibold text-gray-900">Mango 仪表板</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">欢迎，{user.email}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 重定向消息 */}
          {showRedirectMessage && redirectMessage && (
            <Alert className="mb-6">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{redirectMessage}</AlertDescription>
            </Alert>
          )}

          {/* 欢迎消息 */}
          {showWelcome && (
            <Alert className="mb-6">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                欢迎加入 Mango！您的账户已成功创建并验证。
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWelcome(false)}
                  className="ml-2"
                >
                  关闭
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* 页面标题 */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">用户仪表板</h2>
            <p className="mt-2 text-gray-600">管理您的账户和设置</p>
          </div>

          {/* 账户状态警告 */}
          {!user.email_confirmed_at && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                您的邮箱尚未验证。请检查您的邮箱并点击验证链接。
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/auth/verify-email')}
                  className="ml-2"
                >
                  重新发送验证邮件
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* 用户信息卡片 */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">账户邮箱</h3>
                    <p className="text-lg font-semibold text-gray-900 truncate">{user.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">账户状态</h3>
                    <div className="flex items-center mt-1">
                      <Badge variant={getAccountStatusColor() as any}>
                        {getAccountStatusText()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-sm font-medium text-gray-500">注册时间</h3>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 快速操作 */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">快速操作</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/profile')}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <User className="h-5 w-5 text-indigo-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">个人资料</h4>
                      <p className="text-sm text-gray-500">查看和编辑您的个人信息</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/settings')}>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Settings className="h-5 w-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">账户设置</h4>
                      <p className="text-sm text-gray-500">管理安全设置和偏好</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}