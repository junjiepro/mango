'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import {
  type Locale,
  setLocaleToCookie,
  getLocalizedPath,
  removeLocaleFromPath,
  getLocaleDisplayName,
  getLocaleFlag,
  formatNumber,
  formatDate
} from '@/lib/i18n';
import { routing } from '@/i18n/routing';
import type {
  LanguageSwitcherHook,
  LocaleInfo,
  LocalizedFormatHook,
  LocalizedRouter,
  LocalizedValidationHook
} from '@/types/i18n';

/**
 * 自定义 Hook：提供语言切换功能
 */
export function useLanguageSwitcher(): LanguageSwitcherHook {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale() as Locale;

  const switchLanguage = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    startTransition(() => {
      // 保存语言选择到 Cookie
      setLocaleToCookie(newLocale);

      // 构建新的路径
      const pathWithoutLocale = removeLocaleFromPath(pathname);
      const newPath = getLocalizedPath(pathWithoutLocale, newLocale);

      // 导航到新路径
      router.replace(newPath);
    });
  };

  return {
    currentLocale,
    availableLocales: routing.locales as readonly Locale[],
    switchLanguage,
    isPending
  };
}

/**
 * 自定义 Hook：提供语言信息
 */
export function useLocaleInfo(): LocaleInfo {
  const currentLocale = useLocale() as Locale;

  return {
    locale: currentLocale,
    displayName: getLocaleDisplayName(currentLocale),
    flag: getLocaleFlag(currentLocale),
    isRTL: false, // 当前支持的语言都是 LTR
    availableLocales: routing.locales.map(locale => ({
      code: locale as Locale,
      name: getLocaleDisplayName(locale as Locale), // 添加 name 属性
      displayName: getLocaleDisplayName(locale as Locale),
      flag: getLocaleFlag(locale as Locale)
    }))
  };
}

/**
 * 自定义 Hook：提供本地化格式化功能
 */
export function useLocalizedFormat(): LocalizedFormatHook {
  const currentLocale = useLocale() as Locale;

  const formatLocalizedNumber = (
    number: number,
    options?: Intl.NumberFormatOptions
  ) => formatNumber(number, currentLocale, options);

  const formatLocalizedDate = (
    date: Date,
    options?: Intl.DateTimeFormatOptions
  ) => formatDate(date, currentLocale, options);

  const formatCurrency = (amount: number, currency: string = 'CNY') => {
    return formatNumber(amount, currentLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    });
  };

  const formatPercent = (value: number, fractionDigits: number = 1) => {
    return formatNumber(value, currentLocale, {
      style: 'percent',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });
  };

  const formatRelativeTime = (
    value: number,
    unit: Intl.RelativeTimeFormatUnit
  ) => {
    const localeMap: Record<Locale, string> = {
      zh: 'zh-CN',
      en: 'en-US'
    };

    const rtf = new Intl.RelativeTimeFormat(localeMap[currentLocale], {
      numeric: 'auto'
    });

    return rtf.format(value, unit);
  };

  return {
    formatNumber: formatLocalizedNumber,
    formatDate: formatLocalizedDate,
    formatCurrency,
    formatPercent,
    formatRelativeTime
  };
}

/**
 * 自定义 Hook：提供本地化路由功能
 */
export function useLocalizedRouter(): LocalizedRouter {
  const router = useRouter();
  const currentLocale = useLocale() as Locale;

  const push = (path: string) => {
    const localizedPath = getLocalizedPath(path, currentLocale);
    router.push(localizedPath);
  };

  const replace = (path: string) => {
    const localizedPath = getLocalizedPath(path, currentLocale);
    router.replace(localizedPath);
  };

  const prefetch = (path: string) => {
    const localizedPath = getLocalizedPath(path, currentLocale);
    router.prefetch(localizedPath);
  };

  return {
    push,
    replace,
    prefetch,
    back: router.back,
    forward: router.forward,
    refresh: router.refresh
  };
}

/**
 * 自定义 Hook：处理多语言表单验证消息
 */
export function useLocalizedValidation(): LocalizedValidationHook {
  const currentLocale = useLocale() as Locale;

  const getValidationMessage = (
    key: string,
    params?: Record<string, string | number>
  ): string => {
    // 基础验证消息映射
    const messages: Record<Locale, Record<string, string>> = {
      zh: {
        required: '此字段为必填项',
        email: '请输入有效的邮箱地址',
        minLength: '最少需要 {min} 个字符',
        maxLength: '最多只能输入 {max} 个字符',
        pattern: '格式不正确',
        min: '最小值为 {min}',
        max: '最大值为 {max}'
      },
      en: {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        minLength: 'Minimum {min} characters required',
        maxLength: 'Maximum {max} characters allowed',
        pattern: 'Invalid format',
        min: 'Minimum value is {min}',
        max: 'Maximum value is {max}'
      }
    };

    let message = messages[currentLocale]?.[key] || key;

    // 替换参数
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        message = message.replace(`{${param}}`, String(value));
      });
    }

    return message;
  };

  return {
    getValidationMessage
  };
}