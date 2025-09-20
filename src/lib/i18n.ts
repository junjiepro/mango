import { routing } from '@/i18n/routing';
import type {
  Locale,
  LanguageOption,
  LocalizedFormatOptions
} from '@/types/i18n';

/**
 * 语言检测和切换工具函数
 */

// 从路由配置推导语言类型，但优先使用类型定义
export type { Locale } from '@/types/i18n';

/**
 * 检查给定的语言代码是否受支持
 */
export function isValidLocale(locale: string): locale is Locale {
  return routing.locales.includes(locale as Locale);
}

/**
 * 获取浏览器的首选语言
 */
export function getBrowserLocale(): Locale {
  if (typeof window === 'undefined' || !window.navigator) {
    return routing.defaultLocale;
  }

  // 获取浏览器语言设置
  const browserLang = window.navigator.language;

  // 尝试匹配完整的语言代码（如 zh-CN）
  if (isValidLocale(browserLang)) {
    return browserLang;
  }

  // 尝试匹配语言代码的前缀（如 zh）
  const langPrefix = browserLang.split('-')[0];
  if (isValidLocale(langPrefix)) {
    return langPrefix;
  }

  return routing.defaultLocale;
}

/**
 * 从 Cookie 中获取保存的语言设置
 */
export function getLocaleFromCookie(): Locale | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  const localeCookie = cookies.find(cookie =>
    cookie.trim().startsWith('NEXT_LOCALE=')
  );

  if (localeCookie) {
    const locale = localeCookie.split('=')[1];
    if (isValidLocale(locale)) {
      return locale;
    }
  }

  return null;
}

/**
 * 设置语言到 Cookie
 */
export function setLocaleToCookie(locale: Locale): void {
  if (typeof document === 'undefined' || !isValidLocale(locale)) {
    return;
  }

  document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
}

/**
 * 获取当前应该使用的语言
 * 优先级：Cookie > URL > 浏览器语言 > 默认语言
 */
export function getCurrentLocale(urlLocale?: string): Locale {
  // 1. 检查 URL 中的语言参数
  if (urlLocale && isValidLocale(urlLocale)) {
    return urlLocale;
  }

  // 2. 检查 Cookie 中保存的语言
  const cookieLocale = getLocaleFromCookie();
  if (cookieLocale) {
    return cookieLocale;
  }

  // 3. 检查浏览器语言
  const browserLocale = getBrowserLocale();
  if (browserLocale) {
    return browserLocale;
  }

  // 4. 返回默认语言
  return routing.defaultLocale;
}

/**
 * 构建带有语言前缀的路径
 */
export function getLocalizedPath(path: string, locale: Locale): string {
  // 移除开头的斜杠
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // 如果路径为空，返回语言根路径
  if (!cleanPath) {
    return `/${locale}`;
  }

  return `/${locale}/${cleanPath}`;
}

/**
 * 从路径中移除语言前缀
 */
export function removeLocaleFromPath(path: string): string {
  const segments = path.split('/');

  // 如果第二个段是有效的语言代码，移除它
  if (segments.length > 1 && isValidLocale(segments[1])) {
    return '/' + segments.slice(2).join('/');
  }

  return path;
}

/**
 * 获取语言的显示名称
 */
export function getLocaleDisplayName(locale: Locale): string {
  const displayNames: Record<Locale, string> = {
    zh: '中文',
    en: 'English'
  };

  return displayNames[locale] || locale;
}

/**
 * 获取语言的国旗表情符号
 */
export function getLocaleFlag(locale: Locale): string {
  const flags: Record<Locale, string> = {
    zh: '🇨🇳',
    en: '🇺🇸'
  };

  return flags[locale] || '🌐';
}

/**
 * 检查当前是否为 RTL（从右到左）语言
 */
export function isRTL(locale: Locale): boolean {
  const rtlLocales: Locale[] = [];
  return rtlLocales.includes(locale);
}

/**
 * 格式化数字为当前语言环境
 */
export function formatNumber(
  number: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  // 将我们的简化语言代码映射到完整的 locale
  const localeMap: Record<Locale, string> = {
    zh: 'zh-CN',
    en: 'en-US'
  };

  return new Intl.NumberFormat(localeMap[locale], options).format(number);
}

/**
 * 格式化日期为当前语言环境
 */
export function formatDate(
  date: Date,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const localeMap: Record<Locale, string> = {
    zh: 'zh-CN',
    en: 'en-US'
  };

  // 处理无效日期
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return new Intl.DateTimeFormat(localeMap[locale], options).format(date);
}