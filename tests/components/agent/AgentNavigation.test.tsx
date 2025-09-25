import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import AgentNavigation from '@/components/AgentNavigation';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('next-intl');
jest.mock('@/i18n/navigation');
jest.mock('next/navigation', () => ({
  usePathname: () => '/ai-agent',
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Bot: () => <div data-testid="bot-icon" />,
  User: () => <div data-testid="user-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  History: () => <div data-testid="history-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  LogOut: () => <div data-testid="logout-icon" />,
  Languages: () => <div data-testid="languages-icon" />,
  Sun: () => <div data-testid="sun-icon" />,
  Moon: () => <div data-testid="moon-icon" />,
  Monitor: () => <div data-testid="monitor-icon" />,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, ...props }: any) => (
    <button onClick={onClick} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick} data-testid="dropdown-item">{children}</div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Avatar components
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div data-testid="avatar">{children}</div>,
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="avatar-fallback">{children}</div>
  ),
}));

// Mock LanguageSwitcher
jest.mock('@/components/LanguageSwitcher', () => {
  return function LanguageSwitcher() {
    return <div data-testid="language-switcher">Language Switcher</div>;
  };
});

// Mock server actions
jest.mock('@/app/[locale]/actions', () => ({
  signOutAction: jest.fn(),
}));

describe('AgentNavigation', () => {
  const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
  const mockUseTranslations = useTranslations as jest.MockedFunction<typeof useTranslations>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockTranslations = {
    'navigation.brand': 'Mango AI',
    'navigation.activityCenter': 'Activity Center',
    'navigation.welcome': 'Welcome, {email}',
    'navigation.logout': 'Sign Out',
    'navigation.profile': 'Profile Settings',
    'navigation.settings': 'Agent Configuration',
    'navigation.newChat': 'New Chat',
    'navigation.history': 'History',
  };

  const mockT = jest.fn((key: string, params?: any) => {
    const template = mockTranslations[key as keyof typeof mockTranslations] || key;
    if (params && typeof template === 'string') {
      return template.replace(/{(\w+)}/g, (match, param) => params[param] || match);
    }
    return template;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslations.mockReturnValue(mockT);
    mockUseRouter.mockReturnValue(mockRouter);
  });

  describe('Authenticated User', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      },
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: jest.fn(),
      });
    });

    it('renders navigation with user information', () => {
      render(<AgentNavigation />);

      expect(screen.getByText('Mango AI')).toBeInTheDocument();
      expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('displays user avatar when available', () => {
      render(<AgentNavigation />);

      expect(screen.getByTestId('avatar-image')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-image')).toHaveAttribute(
        'src',
        'https://example.com/avatar.jpg'
      );
    });

    it('displays avatar fallback when no avatar URL', () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, user_metadata: {} },
        loading: false,
        signOut: jest.fn(),
      });

      render(<AgentNavigation />);

      expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument();
      expect(screen.getByText('TU')).toBeInTheDocument(); // First letters of Test User
    });

    it('shows navigation items for authenticated users', () => {
      render(<AgentNavigation />);

      expect(screen.getByText('Activity Center')).toBeInTheDocument();
      expect(screen.getByText('New Chat')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('navigates to activity center when clicked', () => {
      render(<AgentNavigation />);

      fireEvent.click(screen.getByText('Activity Center'));

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });

    it('navigates to new chat when clicked', () => {
      render(<AgentNavigation />);

      fireEvent.click(screen.getByText('New Chat'));

      expect(mockRouter.push).toHaveBeenCalledWith('/ai-agent');
    });

    it('navigates to history when clicked', () => {
      render(<AgentNavigation />);

      fireEvent.click(screen.getByText('History'));

      expect(mockRouter.push).toHaveBeenCalledWith('/ai-agent/history');
    });

    describe('User Dropdown Menu', () => {
      it('shows dropdown items when user avatar is clicked', () => {
        render(<AgentNavigation />);

        // The dropdown content should be present
        expect(screen.getByTestId('dropdown-content')).toBeInTheDocument();
      });

      it('navigates to profile when profile item is clicked', () => {
        render(<AgentNavigation />);

        const profileItems = screen.getAllByText('Profile Settings');
        fireEvent.click(profileItems[0]);

        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard/profile');
      });

      it('navigates to agent settings when settings item is clicked', () => {
        render(<AgentNavigation />);

        fireEvent.click(screen.getByText('Agent Configuration'));

        expect(mockRouter.push).toHaveBeenCalledWith('/ai-agent/settings');
      });

      it('handles sign out when logout item is clicked', async () => {
        const mockSignOut = jest.fn();
        mockUseAuth.mockReturnValue({
          user: mockUser,
          loading: false,
          signOut: mockSignOut,
        });

        render(<AgentNavigation />);

        fireEvent.click(screen.getByText('Sign Out'));

        await waitFor(() => {
          expect(mockSignOut).toHaveBeenCalled();
        });
      });
    });

    describe('Language Switcher', () => {
      it('renders language switcher component', () => {
        render(<AgentNavigation />);

        expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
      });
    });
  });

  describe('Unauthenticated User', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        signOut: jest.fn(),
      });
    });

    it('does not show user-specific navigation items', () => {
      render(<AgentNavigation />);

      expect(screen.queryByText('Activity Center')).not.toBeInTheDocument();
      expect(screen.queryByText('New Chat')).not.toBeInTheDocument();
      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
    });

    it('still shows brand and language switcher', () => {
      render(<AgentNavigation />);

      expect(screen.getByText('Mango AI')).toBeInTheDocument();
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        signOut: jest.fn(),
      });
    });

    it('handles loading state gracefully', () => {
      render(<AgentNavigation />);

      expect(screen.getByText('Mango AI')).toBeInTheDocument();
      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('renders with proper responsive classes', () => {
      const { container } = render(<AgentNavigation />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('border-b');
    });
  });

  describe('Brand Navigation', () => {
    it('navigates to home when brand is clicked', () => {
      render(<AgentNavigation />);

      const brandElement = screen.getByText('Mango AI');
      fireEvent.click(brandElement);

      expect(mockRouter.push).toHaveBeenCalledWith('/');
    });
  });

  describe('Error Handling', () => {
    it('handles missing user metadata gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '123', email: 'test@example.com' },
        loading: false,
        signOut: jest.fn(),
      });

      render(<AgentNavigation />);

      expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
      expect(screen.getByTestId('avatar-fallback')).toBeInTheDocument();
      expect(screen.getByText('TE')).toBeInTheDocument(); // Fallback for test@example.com
    });

    it('handles sign out errors gracefully', async () => {
      const mockSignOut = jest.fn().mockRejectedValue(new Error('Sign out failed'));
      mockUseAuth.mockReturnValue({
        user: {
          id: '123',
          email: 'test@example.com',
          user_metadata: {},
        },
        loading: false,
        signOut: mockSignOut,
      });

      render(<AgentNavigation />);

      fireEvent.click(screen.getByText('Sign Out'));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled();
      });

      // Should not crash on error
      expect(screen.getByText('Mango AI')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' },
    };

    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        loading: false,
        signOut: jest.fn(),
      });
    });

    it('has proper navigation structure', () => {
      render(<AgentNavigation />);

      const nav = screen.getByRole('navigation');
      expect(nav).toBeInTheDocument();
    });

    it('has accessible buttons', () => {
      render(<AgentNavigation />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('aria-label', '');
      });
    });

    it('supports keyboard navigation', () => {
      render(<AgentNavigation />);

      const navButtons = screen.getAllByRole('button');
      navButtons.forEach(button => {
        button.focus();
        fireEvent.keyDown(button, { key: 'Enter' });
        // Should not throw errors
      });
    });
  });
});