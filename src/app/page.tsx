'use client';

import { useAuth } from '@/contexts/AuthContext';
import AuthStatus from '@/components/AuthStatus';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            欢迎来到 Mango
          </h1>
          <p className="text-lg text-gray-600">
            基于 Next.js 15 和 Supabase 的现代认证系统演示
          </p>
        </div>

        <AuthStatus />

        {user && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">功能演示</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="p-4 text-left border rounded-lg hover:bg-gray-50"
                >
                  <h3 className="font-medium">用户控制台</h3>
                  <p className="text-sm text-gray-600">管理你的个人资料和设置</p>
                </button>

                <button
                  onClick={() => window.location.href = '/dashboard/profile'}
                  className="p-4 text-left border rounded-lg hover:bg-gray-50"
                >
                  <h3 className="font-medium">个人资料</h3>
                  <p className="text-sm text-gray-600">查看和更新个人信息</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {!user && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">开始使用</h2>
              <p className="text-gray-600 mb-6">
                注册或登录以体验完整的认证功能
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.href = '/register'}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  立即注册
                </button>
                <button
                  onClick={() => window.location.href = '/login'}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  已有账号？登录
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
