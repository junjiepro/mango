'use client'

import { useAuth } from '@/contexts/AuthContext'

export default function AuthStatus() {
  const { user, session, loading } = useAuth()

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">认证状态</h2>

      <div className="space-y-3">
        <div className="flex items-center">
          <span className="font-medium w-20">状态:</span>
          <span className={`px-2 py-1 rounded text-sm ${
            user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {user ? '已登录' : '未登录'}
          </span>
        </div>

        {user && (
          <>
            <div className="flex items-center">
              <span className="font-medium w-20">用户ID:</span>
              <span className="text-gray-600 font-mono text-sm">{user.id}</span>
            </div>

            <div className="flex items-center">
              <span className="font-medium w-20">邮箱:</span>
              <span className="text-gray-600">{user.email}</span>
            </div>

            <div className="flex items-center">
              <span className="font-medium w-20">创建时间:</span>
              <span className="text-gray-600">
                {new Date(user.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
          </>
        )}

        {session && (
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <p className="text-sm font-medium text-gray-700 mb-2">会话信息:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <div>访问令牌过期: {new Date(session.expires_at! * 1000).toLocaleString('zh-CN')}</div>
              <div>刷新令牌: {session.refresh_token ? '有效' : '无'}</div>
            </div>
          </div>
        )}
      </div>

      {!user && (
        <div className="mt-4 text-center">
          <p className="text-gray-600 mb-4">请登录以查看完整信息</p>
          <div className="space-x-2">
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              登录
            </button>
            <button
              onClick={() => window.location.href = '/register'}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              注册
            </button>
          </div>
        </div>
      )}
    </div>
  )
}