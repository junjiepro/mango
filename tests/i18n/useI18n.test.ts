/**
 * i18n Hooks 单元测试
 * 测试自定义国际化 React Hooks
 */

import { renderHook, act } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  useLanguageSwitcher,
  useLocaleInfo,
  useLocalizedFormat,
  useLocalizedRouter,
  useLocalizedValidation
} from '@/hooks/useI18n';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('next-intl', () => ({
  useLocale: jest.fn(),
}));

jest.mock('@/lib/i18n', () => ({
  setLocaleToCookie: jest.fn(),
  getLocalizedPath: jest.fn(),
  removeLocaleFromPath: jest.fn(),
  getLocaleDisplayName: jest.fn(),
  getLocaleFlag: jest.fn(),
  formatNumber: jest.fn(),
  formatDate: jest.fn(),
}));

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['zh', 'en'],
    defaultLocale: 'zh'
  }
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockBack = jest.fn();
const mockForward = jest.fn();
const mockPrefetch = jest.fn();

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseLocale = useLocale as jest.MockedFunction<typeof useLocale>;

const mockI18nUtils = require('@/lib/i18n');

describe('i18n Custom Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      refresh: mockRefresh,
      back: mockBack,
      forward: mockForward,
      prefetch: mockPrefetch,
    });

    mockUsePathname.mockReturnValue('/dashboard');
    mockUseLocale.mockReturnValue('zh');

    // Setup i18n utility mocks
    mockI18nUtils.removeLocaleFromPath.mockImplementation((path: string) => {
      const cleaned = path.replace(/^\/[a-z]{2}/, '');
      return cleaned || '/dashboard';
    });
    mockI18nUtils.getLocalizedPath.mockImplementation((path: string, locale: string) =>
      `/${locale}${path}`
    );
    mockI18nUtils.getLocaleDisplayName.mockImplementation((locale: string) =>
      locale === 'zh' ? '中文' : 'English'
    );
    mockI18nUtils.getLocaleFlag.mockImplementation((locale: string) =>
      locale === 'zh' ? '🇨🇳' : '🇺🇸'
    );
    mockI18nUtils.formatNumber.mockImplementation((num: number) => num.toString());
    mockI18nUtils.formatDate.mockImplementation((date: Date) => date.toISOString());
  });

  describe('useLanguageSwitcher', () => {
    it('should return current locale and available locales', () => {
      const { result } = renderHook(() => useLanguageSwitcher());

      expect(result.current.currentLocale).toBe('zh');
      expect(result.current.availableLocales).toEqual(['zh', 'en']);
      expect(result.current.isPending).toBe(false);
    });

    it('should switch language and update path', async () => {
      const { result } = renderHook(() => useLanguageSwitcher());

      await act(async () => {
        result.current.switchLanguage('en');
      });

      expect(mockI18nUtils.setLocaleToCookie).toHaveBeenCalledWith('en');
      expect(mockI18nUtils.removeLocaleFromPath).toHaveBeenCalledWith('/dashboard');
      expect(mockI18nUtils.getLocalizedPath).toHaveBeenCalledWith('/dashboard', 'en');
      expect(mockReplace).toHaveBeenCalledWith('/en/dashboard');
    });

    it('should not switch if target locale is current locale', async () => {
      const { result } = renderHook(() => useLanguageSwitcher());

      await act(async () => {
        result.current.switchLanguage('zh'); // Current locale
      });

      expect(mockI18nUtils.setLocaleToCookie).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should handle pending state during transition', async () => {
      const { result } = renderHook(() => useLanguageSwitcher());

      act(() => {
        result.current.switchLanguage('en');
      });

      // During transition, isPending should be true
      expect(result.current.isPending).toBe(true);
    });

    it('should handle complex paths correctly', async () => {
      mockUsePathname.mockReturnValue('/zh/dashboard/profile');
      mockI18nUtils.removeLocaleFromPath.mockReturnValue('/dashboard/profile');
      mockI18nUtils.getLocalizedPath.mockReturnValue('/en/dashboard/profile');

      const { result } = renderHook(() => useLanguageSwitcher());

      await act(async () => {
        result.current.switchLanguage('en');
      });

      expect(mockI18nUtils.removeLocaleFromPath).toHaveBeenCalledWith('/zh/dashboard/profile');
      expect(mockI18nUtils.getLocalizedPath).toHaveBeenCalledWith('/dashboard/profile', 'en');
      expect(mockReplace).toHaveBeenCalledWith('/en/dashboard/profile');
    });
  });

  describe('useLocaleInfo', () => {
    it('should return locale information', () => {
      const { result } = renderHook(() => useLocaleInfo());

      expect(result.current.locale).toBe('zh');
      expect(result.current.displayName).toBe('中文');
      expect(result.current.flag).toBe('🇨🇳');
      expect(result.current.isRTL).toBe(false);
    });

    it('should return available locales with metadata', () => {
      const { result } = renderHook(() => useLocaleInfo());

      expect(result.current.availableLocales).toHaveLength(2);
      expect(result.current.availableLocales[0]).toEqual({
        code: 'zh',
        name: '中文',
        displayName: '中文',
        flag: '🇨🇳'
      });
      expect(result.current.availableLocales[1]).toEqual({
        code: 'en',
        name: 'English',
        displayName: 'English',
        flag: '🇺🇸'
      });
    });

    it('should update when locale changes', () => {
      const { result, rerender } = renderHook(() => useLocaleInfo());

      expect(result.current.locale).toBe('zh');

      // Simulate locale change
      mockUseLocale.mockReturnValue('en');
      rerender();

      expect(result.current.locale).toBe('en');
      expect(result.current.displayName).toBe('English');
      expect(result.current.flag).toBe('🇺🇸');
    });
  });

  describe('useLocalizedFormat', () => {
    it('should provide number formatting function', () => {
      const { result } = renderHook(() => useLocalizedFormat());

      result.current.formatNumber(1234.56);

      expect(mockI18nUtils.formatNumber).toHaveBeenCalledWith(
        1234.56,
        'zh',
        undefined
      );
    });

    it('should provide date formatting function', () => {
      const { result } = renderHook(() => useLocalizedFormat());
      const testDate = new Date('2023-12-25');

      result.current.formatDate(testDate);

      expect(mockI18nUtils.formatDate).toHaveBeenCalledWith(
        testDate,
        'zh',
        undefined
      );
    });

    it('should format currency correctly', () => {
      const { result } = renderHook(() => useLocalizedFormat());

      result.current.formatCurrency(1000, 'USD');

      expect(mockI18nUtils.formatNumber).toHaveBeenCalledWith(
        1000,
        'zh',
        {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }
      );
    });

    it('should format percentage correctly', () => {
      const { result } = renderHook(() => useLocalizedFormat());

      result.current.formatPercent(0.85, 2);

      expect(mockI18nUtils.formatNumber).toHaveBeenCalledWith(
        0.85,
        'zh',
        {
          style: 'percent',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      );
    });

    it('should format relative time correctly', () => {
      const { result } = renderHook(() => useLocalizedFormat());

      // Mock Intl.RelativeTimeFormat
      const mockFormat = jest.fn().mockReturnValue('2 天前');
      global.Intl.RelativeTimeFormat = jest.fn().mockImplementation(() => ({
        format: mockFormat
      })) as any;

      const formatted = result.current.formatRelativeTime(-2, 'day');

      expect(global.Intl.RelativeTimeFormat).toHaveBeenCalledWith('zh-CN', {
        numeric: 'auto'
      });
      expect(mockFormat).toHaveBeenCalledWith(-2, 'day');
      expect(formatted).toBe('2 天前');
    });

    it('should handle different locales for relative time', () => {
      mockUseLocale.mockReturnValue('en');

      const { result } = renderHook(() => useLocalizedFormat());

      const mockFormat = jest.fn().mockReturnValue('2 days ago');
      global.Intl.RelativeTimeFormat = jest.fn().mockImplementation(() => ({
        format: mockFormat
      })) as any;

      result.current.formatRelativeTime(-2, 'day');

      expect(global.Intl.RelativeTimeFormat).toHaveBeenCalledWith('en-US', {
        numeric: 'auto'
      });
    });
  });

  describe('useLocalizedRouter', () => {
    it('should provide localized navigation functions', () => {
      const { result } = renderHook(() => useLocalizedRouter());

      expect(result.current.push).toBeDefined();
      expect(result.current.replace).toBeDefined();
      expect(result.current.prefetch).toBeDefined();
      expect(result.current.back).toBeDefined();
      expect(result.current.forward).toBeDefined();
      expect(result.current.refresh).toBeDefined();
    });

    it('should localize push navigation', () => {
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.push('/profile');

      expect(mockI18nUtils.getLocalizedPath).toHaveBeenCalledWith('/profile', 'zh');
      expect(mockPush).toHaveBeenCalledWith('/zh/profile');
    });

    it('should localize replace navigation', () => {
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.replace('/dashboard');

      expect(mockI18nUtils.getLocalizedPath).toHaveBeenCalledWith('/dashboard', 'zh');
      expect(mockReplace).toHaveBeenCalledWith('/zh/dashboard');
    });

    it('should localize prefetch', () => {
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.prefetch('/settings');

      expect(mockI18nUtils.getLocalizedPath).toHaveBeenCalledWith('/settings', 'zh');
      expect(mockPrefetch).toHaveBeenCalledWith('/zh/settings');
    });

    it('should pass through non-localized navigation methods', () => {
      const { result } = renderHook(() => useLocalizedRouter());

      result.current.back();
      result.current.forward();
      result.current.refresh();

      expect(mockBack).toHaveBeenCalled();
      expect(mockForward).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should handle different locales', () => {
      mockUseLocale.mockReturnValue('en');

      const { result } = renderHook(() => useLocalizedRouter());

      result.current.push('/profile');

      expect(mockI18nUtils.getLocalizedPath).toHaveBeenCalledWith('/profile', 'en');
      expect(mockPush).toHaveBeenCalledWith('/en/profile');
    });
  });

  describe('useLocalizedValidation', () => {
    it('should return validation message for known keys', () => {
      const { result } = renderHook(() => useLocalizedValidation());

      const message = result.current.getValidationMessage('required');

      expect(message).toBe('此字段为必填项');
    });

    it('should handle validation messages with parameters', () => {
      const { result } = renderHook(() => useLocalizedValidation());

      const message = result.current.getValidationMessage('minLength', { min: 8 });

      expect(message).toBe('最少需要 8 个字符');
    });

    it('should return key as fallback for unknown validation keys', () => {
      const { result } = renderHook(() => useLocalizedValidation());

      const message = result.current.getValidationMessage('unknownKey');

      expect(message).toBe('unknownKey');
    });

    it('should handle multiple parameters', () => {
      const { result } = renderHook(() => useLocalizedValidation());

      const message = result.current.getValidationMessage('maxLength', { max: 100 });

      expect(message).toBe('最多只能输入 100 个字符');
    });

    it('should work with English locale', () => {
      mockUseLocale.mockReturnValue('en');

      const { result } = renderHook(() => useLocalizedValidation());

      const message = result.current.getValidationMessage('required');

      expect(message).toBe('This field is required');
    });

    it('should handle English validation with parameters', () => {
      mockUseLocale.mockReturnValue('en');

      const { result } = renderHook(() => useLocalizedValidation());

      const message = result.current.getValidationMessage('minLength', { min: 6 });

      expect(message).toBe('Minimum 6 characters required');
    });
  });

  describe('Integration Tests', () => {
    it('should work together for complete i18n workflow', () => {
      const { result: languageSwitcher } = renderHook(() => useLanguageSwitcher());
      const { result: localeInfo } = renderHook(() => useLocaleInfo());
      const { result: localizedRouter } = renderHook(() => useLocalizedRouter());

      // Initial state
      expect(languageSwitcher.current.currentLocale).toBe('zh');
      expect(localeInfo.current.locale).toBe('zh');

      // Switch language
      act(() => {
        languageSwitcher.current.switchLanguage('en');
      });

      // Navigate using localized router
      localizedRouter.current.push('/profile');

      expect(mockI18nUtils.getLocalizedPath).toHaveBeenCalledWith('/profile', 'zh'); // Still zh during transition
    });

    it('should handle edge cases gracefully', () => {
      // Test with undefined locale
      mockUseLocale.mockReturnValue(undefined as any);

      expect(() => {
        renderHook(() => useLanguageSwitcher());
        renderHook(() => useLocaleInfo());
        renderHook(() => useLocalizedFormat());
        renderHook(() => useLocalizedRouter());
        renderHook(() => useLocalizedValidation());
      }).not.toThrow();
    });
  });
});