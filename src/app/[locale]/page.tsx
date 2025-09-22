'use client';

import { useAuth } from '@/contexts/AuthContext';
import AuthStatus from '@/components/AuthStatus';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const t = useTranslations('pages.home');
  const tCommon = useTranslations('common');
  const router = useRouter();

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
            {t('title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        <AuthStatus />

        {user && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">{t('featuresTitle')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="p-4 text-left border rounded-lg hover:bg-gray-50"
                >
                  <h3 className="font-medium">{t('dashboard.title')}</h3>
                  <p className="text-sm text-gray-600">{t('dashboard.description')}</p>
                </button>

                <button
                  onClick={() => router.push('/dashboard/profile')}
                  className="p-4 text-left border rounded-lg hover:bg-gray-50"
                >
                  <h3 className="font-medium">{t('profile.title')}</h3>
                  <p className="text-sm text-gray-600">{t('profile.description')}</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {!user && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h2 className="text-xl font-semibold mb-4">{t('getStarted.title')}</h2>
              <p className="text-gray-600 mb-6">
                {t('getStarted.description')}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/register')}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  {t('getStarted.registerButton')}
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  {t('getStarted.loginButton')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
