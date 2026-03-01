/**
 * i18n Configuration
 * T157: next-intl locale configuration
 */

export const locales = ['zh', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh';

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
