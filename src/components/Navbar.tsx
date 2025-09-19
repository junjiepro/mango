'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      router.push('/login');
    } else {
      console.error('Logout error:', error);
    }
  };

  // Don't show navbar on auth pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') {
    return null;
  }

  if (loading) {
    return (
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-indigo-600">Mango</span>
            </div>
            <div className="flex items-center">
              <div className="animate-pulse h-6 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <button
              onClick={() => router.push('/')}
              className="text-xl font-bold text-indigo-600 hover:text-indigo-700"
            >
              Mango
            </button>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-700">
                  欢迎, {user.email}
                </span>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  控制台
                </button>
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  退出登录
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  登录
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  注册
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
