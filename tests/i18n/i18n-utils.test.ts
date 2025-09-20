/**
 * i18n 工具函数单元测试
 * 测试国际化相关的工具函数
 */

import {
  isValidLocale,
  getBrowserLocale,
  getLocaleFromCookie,
  setLocaleToCookie,
  removeLocaleFromPath,
  getLocalizedPath,
  getLocaleDisplayName,
  getLocaleFlag,
  formatNumber,
  formatDate
} from '@/lib/i18n';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock @/i18n/routing
jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['zh', 'en'],
    defaultLocale: 'zh'
  }
}));

// Mock browser APIs
Object.defineProperty(window, 'navigator', {
  value: {
    language: 'zh-CN'
  },
  writable: true
});

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: ''
});

describe('i18n Utility Functions', () => {
  beforeEach(() => {
    // Reset document.cookie
    document.cookie = '';

    // Reset window.navigator.language
    Object.defineProperty(window, 'navigator', {
      value: {
        language: 'zh-CN'
      },
      writable: true
    });
  });

  describe('isValidLocale', () => {
    it('should validate supported locales', () => {
      expect(isValidLocale('zh')).toBe(true);
      expect(isValidLocale('en')).toBe(true);
    });

    it('should reject unsupported locales', () => {
      expect(isValidLocale('fr')).toBe(false);
      expect(isValidLocale('es')).toBe(false);
      expect(isValidLocale('')).toBe(false);
      expect(isValidLocale('invalid')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidLocale(null as any)).toBe(false);
      expect(isValidLocale(undefined as any)).toBe(false);
      expect(isValidLocale(123 as any)).toBe(false);
    });
  });

  describe('getBrowserLocale', () => {
    it('should return browser preferred locale if supported', () => {
      Object.defineProperty(window, 'navigator', {
        value: { language: 'en-US' },
        writable: true
      });

      const locale = getBrowserLocale();
      expect(['zh', 'en']).toContain(locale);
    });

    it('should return default locale for unsupported browser language', () => {
      Object.defineProperty(window, 'navigator', {
        value: { language: 'fr-FR' },
        writable: true
      });

      const locale = getBrowserLocale();
      expect(locale).toBe('zh'); // default locale
    });

    it('should handle missing navigator gracefully', () => {
      const originalNavigator = window.navigator;
      delete (window as any).navigator;

      const locale = getBrowserLocale();
      expect(locale).toBe('zh'); // default locale

      // Restore navigator
      (window as any).navigator = originalNavigator;
    });

    it('should extract language code from full locale string', () => {
      Object.defineProperty(window, 'navigator', {
        value: { language: 'zh-CN' },
        writable: true
      });

      const locale = getBrowserLocale();
      expect(locale).toBe('zh');
    });
  });

  describe('getLocaleFromCookie', () => {
    it('should return locale from cookie if valid', () => {
      document.cookie = 'NEXT_LOCALE=en; path=/';

      const locale = getLocaleFromCookie();
      expect(locale).toBe('en');
    });

    it('should return null for invalid locale in cookie', () => {
      document.cookie = 'NEXT_LOCALE=invalid; path=/';

      const locale = getLocaleFromCookie();
      expect(locale).toBeNull();
    });

    it('should return null when cookie does not exist', () => {
      const locale = getLocaleFromCookie();
      expect(locale).toBeNull();
    });

    it('should handle malformed cookies gracefully', () => {
      document.cookie = 'NEXT_LOCALE=; path=/';

      const locale = getLocaleFromCookie();
      expect(locale).toBeNull();
    });
  });

  describe('setLocaleToCookie', () => {
    it('should set locale cookie with correct attributes', () => {
      setLocaleToCookie('en');

      expect(document.cookie).toContain('NEXT_LOCALE=en');
      expect(document.cookie).toContain('path=/');
      expect(document.cookie).toContain('max-age=31536000'); // 1 year
    });

    it('should overwrite existing locale cookie', () => {
      setLocaleToCookie('zh');
      expect(document.cookie).toContain('NEXT_LOCALE=zh');

      setLocaleToCookie('en');
      expect(document.cookie).toContain('NEXT_LOCALE=en');
    });

    it('should handle invalid locales by not setting cookie', () => {
      const originalCookie = document.cookie;
      setLocaleToCookie('invalid' as any);

      // Cookie should not be modified for invalid locale
      expect(document.cookie).toBe(originalCookie);
    });
  });

  describe('removeLocaleFromPath', () => {
    it('should remove locale from path beginning', () => {
      expect(removeLocaleFromPath('/zh/dashboard')).toBe('/dashboard');
      expect(removeLocaleFromPath('/en/profile')).toBe('/profile');
    });

    it('should handle paths without locale', () => {
      expect(removeLocaleFromPath('/dashboard')).toBe('/dashboard');
      expect(removeLocaleFromPath('/')).toBe('/');
    });

    it('should handle complex paths', () => {
      expect(removeLocaleFromPath('/zh/dashboard/profile/edit')).toBe('/dashboard/profile/edit');
      expect(removeLocaleFromPath('/en/api/users')).toBe('/api/users');
    });

    it('should handle edge cases', () => {
      expect(removeLocaleFromPath('')).toBe('');
      expect(removeLocaleFromPath('/zh')).toBe('');
      expect(removeLocaleFromPath('/en/')).toBe('/');
    });
  });

  describe('getLocalizedPath', () => {
    it('should add locale to path', () => {
      expect(getLocalizedPath('/dashboard', 'zh')).toBe('/zh/dashboard');
      expect(getLocalizedPath('/profile', 'en')).toBe('/en/profile');
    });

    it('should handle root path', () => {
      expect(getLocalizedPath('/', 'zh')).toBe('/zh');
      expect(getLocalizedPath('', 'en')).toBe('/en');
    });

    it('should handle paths that already have locale', () => {
      expect(getLocalizedPath('/zh/dashboard', 'en')).toBe('/en/zh/dashboard');
    });

    it('should handle complex paths', () => {
      expect(getLocalizedPath('/dashboard/profile/edit', 'zh')).toBe('/zh/dashboard/profile/edit');
    });
  });

  describe('getLocaleDisplayName', () => {
    it('should return correct display names', () => {
      expect(getLocaleDisplayName('zh')).toBe('中文');
      expect(getLocaleDisplayName('en')).toBe('English');
    });

    it('should handle invalid locales', () => {
      expect(getLocaleDisplayName('invalid' as any)).toBe('invalid');
    });
  });

  describe('getLocaleFlag', () => {
    it('should return correct flag emojis', () => {
      expect(getLocaleFlag('zh')).toBe('🇨🇳');
      expect(getLocaleFlag('en')).toBe('🇺🇸');
    });

    it('should handle invalid locales', () => {
      expect(getLocaleFlag('invalid' as any)).toBe('🌍');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers correctly for different locales', () => {
      const number = 1234.56;

      const zhFormatted = formatNumber(number, 'zh');
      const enFormatted = formatNumber(number, 'en');

      expect(typeof zhFormatted).toBe('string');
      expect(typeof enFormatted).toBe('string');
      expect(zhFormatted).toContain('1234');
      expect(enFormatted).toContain('1234');
    });

    it('should handle formatting options', () => {
      const number = 1234.567;

      const formatted = formatNumber(number, 'en', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      expect(formatted).toContain('1234.57');
    });

    it('should format currency correctly', () => {
      const amount = 1000;

      const formatted = formatNumber(amount, 'zh', {
        style: 'currency',
        currency: 'CNY'
      });

      expect(typeof formatted).toBe('string');
      expect(formatted).toContain('1000');
    });

    it('should handle edge cases', () => {
      expect(formatNumber(0, 'en')).toBe('0');
      expect(formatNumber(-123, 'zh')).toContain('123');
      expect(typeof formatNumber(Infinity, 'en')).toBe('string');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2023-12-25T10:30:00Z');

    it('should format dates correctly for different locales', () => {
      const zhFormatted = formatDate(testDate, 'zh');
      const enFormatted = formatDate(testDate, 'en');

      expect(typeof zhFormatted).toBe('string');
      expect(typeof enFormatted).toBe('string');
      // Both should contain the year
      expect(zhFormatted).toContain('2023');
      expect(enFormatted).toContain('2023');
    });

    it('should handle formatting options', () => {
      const formatted = formatDate(testDate, 'en', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      expect(formatted).toContain('2023');
      expect(formatted).toContain('December');
      expect(formatted).toContain('25');
    });

    it('should format time correctly', () => {
      const formatted = formatDate(testDate, 'en', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      });

      expect(formatted).toContain('10');
      expect(formatted).toContain('30');
    });

    it('should handle invalid dates gracefully', () => {
      const invalidDate = new Date('invalid');

      expect(() => formatDate(invalidDate, 'en')).not.toThrow();
      const result = formatDate(invalidDate, 'en');
      expect(typeof result).toBe('string');
    });
  });

  describe('Integration Tests', () => {
    it('should work together for complete locale switching flow', () => {
      // Simulate complete locale switching
      const currentPath = '/zh/dashboard/profile';
      const newLocale = 'en';

      // Remove current locale
      const pathWithoutLocale = removeLocaleFromPath(currentPath);
      expect(pathWithoutLocale).toBe('/dashboard/profile');

      // Add new locale
      const newPath = getLocalizedPath(pathWithoutLocale, newLocale);
      expect(newPath).toBe('/en/dashboard/profile');

      // Set cookie
      setLocaleToCookie(newLocale);
      expect(document.cookie).toContain('NEXT_LOCALE=en');
    });

    it('should handle locale validation throughout the flow', () => {
      const validLocale = 'zh';
      const invalidLocale = 'invalid';

      expect(isValidLocale(validLocale)).toBe(true);
      expect(isValidLocale(invalidLocale)).toBe(false);

      // Valid locale should work
      const validPath = getLocalizedPath('/test', validLocale);
      expect(validPath).toBe('/zh/test');

      // Should handle display names
      expect(getLocaleDisplayName(validLocale)).toBe('中文');
      expect(getLocaleFlag(validLocale)).toBe('🇨🇳');
    });
  });
});