'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const localActive = useLocale();
  const pathname = usePathname();

  const locales = [
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' }
  ];

  const onSelectChange = (locale: string) => {
    startTransition(() => {
      // 更新 cookie 以持久化语言选择
      document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;

      // 构建新的 URL
      const newPathname = pathname.replace(`/${localActive}`, `/${locale}`);
      router.replace(newPathname);
    });
  };

  return (
    <div className="relative" data-testid="language-switcher">
      <select
        value={localActive}
        onChange={(e) => onSelectChange(e.target.value)}
        disabled={isPending}
        className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {locales.map((locale) => (
          <option key={locale.code} value={locale.code} data-value={locale.code}>
            {locale.flag} {locale.name}
          </option>
        ))}
      </select>

      {/* 自定义下拉箭头 */}
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {isPending && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded-md">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}
    </div>
  );
}