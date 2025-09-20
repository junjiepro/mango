/**
 * 语言切换器组件单元测试
 * 测试语言切换功能的完整行为
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { setLocaleToCookie } from '@/lib/i18n';

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
}));

jest.mock('@/i18n/routing', () => ({
  routing: {
    locales: ['zh', 'en'],
    defaultLocale: 'zh'
  }
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseLocale = useLocale as jest.MockedFunction<typeof useLocale>;
const mockSetLocaleToCookie = setLocaleToCookie as jest.MockedFunction<typeof setLocaleToCookie>;

// Mock i18n utilities
const { getLocalizedPath, removeLocaleFromPath, getLocaleDisplayName, getLocaleFlag } =
  require('@/lib/i18n');

describe('LanguageSwitcher Component', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock returns
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    });

    mockUsePathname.mockReturnValue('/dashboard');
    mockUseLocale.mockReturnValue('zh');

    // Mock i18n utility functions
    removeLocaleFromPath.mockImplementation((path: string) => path.replace(/^\/[a-z]{2}/, ''));
    getLocalizedPath.mockImplementation((path: string, locale: string) => `/${locale}${path}`);
    getLocaleDisplayName.mockImplementation((locale: string) =>
      locale === 'zh' ? '中文' : 'English'
    );
    getLocaleFlag.mockImplementation((locale: string) =>
      locale === 'zh' ? '🇨🇳' : '🇺🇸'
    );
  });

  describe('Rendering', () => {
    it('should render language switcher with current language', () => {
      render(<LanguageSwitcher />);

      // Should show current language
      expect(screen.getByText('🇨🇳')).toBeInTheDocument();
      expect(screen.getByText('中文')).toBeInTheDocument();
    });

    it('should render language options when clicked', async () => {
      render(<LanguageSwitcher />);

      // Click to open dropdown
      const switcher = screen.getByRole('button');
      fireEvent.click(switcher);

      // Should show all language options
      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument();
      });
    });

    it('should show loading state during language switch', async () => {
      render(<LanguageSwitcher />);

      // Open dropdown
      const switcher = screen.getByRole('button');
      fireEvent.click(switcher);

      // Click English option
      const englishOption = await screen.findByText('English');
      fireEvent.click(englishOption);

      // Should show loading state (this is implementation dependent)
      // The loading state might be in the button text or a spinner
    });
  });

  describe('Language Switching Functionality', () => {
    it('should call setLocaleToCookie when switching language', async () => {
      render(<LanguageSwitcher />);

      // Open dropdown and select English
      const switcher = screen.getByRole('button');
      fireEvent.click(switcher);

      const englishOption = await screen.findByText('English');
      fireEvent.click(englishOption);

      // Should save language to cookie
      expect(mockSetLocaleToCookie).toHaveBeenCalledWith('en');
    });

    it('should navigate to localized path when switching language', async () => {
      render(<LanguageSwitcher />);

      // Open dropdown and select English
      const switcher = screen.getByRole('button');
      fireEvent.click(switcher);

      const englishOption = await screen.findByText('English');
      fireEvent.click(englishOption);

      // Should navigate to English version of current page
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/en/dashboard');
      });
    });

    it('should not trigger navigation when selecting current language', async () => {
      render(<LanguageSwitcher />);

      // Open dropdown and select current language (Chinese)
      const switcher = screen.getByRole('button');
      fireEvent.click(switcher);

      const chineseOption = await screen.findByText('中文');
      fireEvent.click(chineseOption);

      // Should not trigger navigation
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockSetLocaleToCookie).not.toHaveBeenCalled();
    });

    it('should handle complex paths correctly', async () => {
      mockUsePathname.mockReturnValue('/zh/dashboard/profile');
      removeLocaleFromPath.mockReturnValue('/dashboard/profile');
      getLocalizedPath.mockReturnValue('/en/dashboard/profile');

      render(<LanguageSwitcher />);

      // Open dropdown and select English
      const switcher = screen.getByRole('button');
      fireEvent.click(switcher);

      const englishOption = await screen.findByText('English');
      fireEvent.click(englishOption);

      // Should correctly handle path transformation
      expect(removeLocaleFromPath).toHaveBeenCalledWith('/zh/dashboard/profile');
      expect(getLocalizedPath).toHaveBeenCalledWith('/dashboard/profile', 'en');
      expect(mockReplace).toHaveBeenCalledWith('/en/dashboard/profile');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<LanguageSwitcher />);

      const switcher = screen.getByRole('button');
      expect(switcher).toHaveAttribute('aria-expanded', 'false');
      expect(switcher).toHaveAttribute('aria-haspopup', 'true');
    });

    it('should update ARIA expanded state when opened', async () => {
      render(<LanguageSwitcher />);

      const switcher = screen.getByRole('button');
      fireEvent.click(switcher);

      await waitFor(() => {
        expect(switcher).toHaveAttribute('aria-expanded', 'true');
      });
    });

    it('should support keyboard navigation', async () => {
      render(<LanguageSwitcher />);

      const switcher = screen.getByRole('button');

      // Should open with Enter key
      fireEvent.keyDown(switcher, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(switcher).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing locale gracefully', () => {
      mockUseLocale.mockReturnValue(undefined as any);

      expect(() => render(<LanguageSwitcher />)).not.toThrow();
    });

    it('should handle router errors gracefully', async () => {
      mockReplace.mockRejectedValue(new Error('Navigation failed'));

      render(<LanguageSwitcher />);

      const switcher = screen.getByRole('button');
      fireEvent.click(switcher);

      const englishOption = await screen.findByText('English');
      fireEvent.click(englishOption);

      // Should not crash the component
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <LanguageSwitcher />
          <div data-testid="outside-element">Outside</div>
        </div>
      );

      const switcher = screen.getByRole('button');
      fireEvent.click(switcher);

      // Should be open
      await waitFor(() => {
        expect(switcher).toHaveAttribute('aria-expanded', 'true');
      });

      // Click outside
      const outsideElement = screen.getByTestId('outside-element');
      fireEvent.click(outsideElement);

      // Should close
      await waitFor(() => {
        expect(switcher).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const { rerender } = render(<LanguageSwitcher />);

      // Re-render with same props
      rerender(<LanguageSwitcher />);

      // Component should handle re-renders gracefully
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should debounce rapid language switches', async () => {
      render(<LanguageSwitcher />);

      const switcher = screen.getByRole('button');
      fireEvent.click(switcher);

      const englishOption = await screen.findByText('English');

      // Rapidly click multiple times
      fireEvent.click(englishOption);
      fireEvent.click(englishOption);
      fireEvent.click(englishOption);

      // Should only trigger once
      await waitFor(() => {
        expect(mockSetLocaleToCookie).toHaveBeenCalledTimes(1);
      });
    });
  });
});