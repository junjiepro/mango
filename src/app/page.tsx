'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  interface User {
    id: string;
    email?: string;
    last_sign_in_at?: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Welcome to Mango</h1>
        <p className="mb-6">Please sign in to continue</p>
        <button
          onClick={() => router.push('/login')}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Welcome, {user.email}!</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Your Account</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p>{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Sign In</p>
              <p>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
