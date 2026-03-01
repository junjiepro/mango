/**
 * CLI i18n - Lightweight translation system
 * T167: CLI internationalization support
 */

import enMessages from './locales/en.js';
import zhMessages from './locales/zh.js';

export type CLILocale = 'zh' | 'en';

let currentLocale: CLILocale = 'zh';

export function detectLocale(): CLILocale {
  const envLang = process.env.MANGO_LANG;
  if (envLang === 'en' || envLang === 'zh') return envLang;

  const systemLang = process.env.LC_ALL || process.env.LANG || '';
  if (systemLang.startsWith('en')) return 'en';
  if (systemLang.startsWith('zh')) return 'zh';

  return 'zh';
}

export function setLocale(locale: CLILocale): void {
  currentLocale = locale;
}

export function getLocale(): CLILocale {
  return currentLocale;
}

export function initLocale(): void {
  currentLocale = detectLocale();
}

type Messages = Record<string, string | Record<string, string>>;

const localeMap: Record<CLILocale, Messages> = { en: enMessages, zh: zhMessages };

function getMessages(): Messages {
  return localeMap[currentLocale];
}

/**
 * Translate a key, supporting dot notation for nested keys
 * e.g., t('status.title') or t('status.boundCount', { count: 3 })
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const messages = getMessages();
  const parts = key.split('.');
  let value: any = messages;

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return key; // Fallback to key if not found
    }
  }

  if (typeof value !== 'string') return key;

  // Replace {param} placeholders
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, name) =>
      params[name] !== undefined ? String(params[name]) : `{${name}}`
    );
  }

  return value;
}
