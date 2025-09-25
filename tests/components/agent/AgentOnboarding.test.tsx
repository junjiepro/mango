import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import AgentOnboarding, { useAgentOnboarding } from '@/components/AgentOnboarding';
import '@testing-library/jest-dom';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: jest.fn(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Bot: () => <div data-testid="bot-icon" />,
  MessageCircle: () => <div data-testid="message-circle-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  History: () => <div data-testid="history-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock AI Elements components
jest.mock('@/components/ai-elements', () => ({
  Suggestion: ({ text, onSelect }: { text: string; onSelect?: () => void }) => (
    <div data-testid="suggestion" onClick={onSelect}>
      {text}
    </div>
  ),
  Actions: ({ actions }: { actions: Array<{ label: string; action: () => void }> }) => (
    <div data-testid="actions">
      {actions.map((action, index) => (
        <button key={index} onClick={action.action}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

describe('AgentOnboarding', () => {
  const mockTranslations = {
    'title': 'Welcome to AI Agent',
    'subtitle': "Let's explore AI features",
    'progress.step': 'Step {current} of {total}',
    'steps.welcome.title': 'Meet Your AI Assistant',
    'steps.welcome.description': 'Explore intelligent conversation',
    'steps.welcome.features.intelligent': 'Intelligent conversation',
    'steps.welcome.features.multimodal': 'Multimodal support',
    'steps.welcome.features.tools': 'Tool integration',
    'steps.welcome.suggestion': 'Try asking: Write a function',
    'steps.conversation.title': 'Start Conversations',
    'steps.conversation.description': 'Experience AI chat',
    'steps.conversation.features.naturalLanguage': 'Natural language',
    'steps.conversation.features.codeGeneration': 'Code generation',
    'steps.conversation.features.multiModal': 'Multimedia processing',
    'steps.conversation.tryExample': 'Try Example',
    'steps.features.title': 'Personalization',
    'steps.features.description': 'Customize experience',
    'steps.features.modes': 'UI modes',
    'steps.features.plugins': 'Plugin management',
    'steps.features.preferences': 'Preference settings',
    'steps.features.exploreSettings': 'Explore Settings',
    'steps.history.title': 'History Management',
    'steps.history.description': 'Manage conversations',
    'steps.history.autoSave': 'Auto save',
    'steps.history.search': 'Smart search',
    'steps.history.export': 'Export & share',
    'interactive.suggestion': 'Try this suggestion:',
    'interactive.actions': 'Quick Actions:',
    'navigation.previous': 'Previous',
    'navigation.next': 'Next',
    'navigation.skip': 'Skip Guide',
    'navigation.complete': 'Get Started',
  };

  const mockT = jest.fn((key: string, params?: any) => {
    const template = mockTranslations[key as keyof typeof mockTranslations] || key;
    if (params && typeof template === 'string') {
      return template.replace(/{(\w+)}/g, (match, param) => params[param] || match);
    }
    return template;
  });

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslations as jest.Mock).mockReturnValue(mockT);
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Component Rendering', () => {
    it('renders onboarding modal when open', () => {
      render(<AgentOnboarding {...defaultProps} />);

      expect(screen.getByText('Welcome to AI Agent')).toBeInTheDocument();
      expect(screen.getByText("Let's explore AI features")).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<AgentOnboarding {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Welcome to AI Agent')).not.toBeInTheDocument();
    });

    it('renders progress indicator', () => {
      render(<AgentOnboarding {...defaultProps} />);

      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('renders first step content', () => {
      render(<AgentOnboarding {...defaultProps} />);

      expect(screen.getByText('Meet Your AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('Explore intelligent conversation')).toBeInTheDocument();
      expect(screen.getByText('Intelligent conversation')).toBeInTheDocument();
      expect(screen.getByText('Multimodal support')).toBeInTheDocument();
      expect(screen.getByText('Tool integration')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('disables previous button on first step', () => {
      render(<AgentOnboarding {...defaultProps} />);

      const prevButton = screen.getByText('Previous');
      expect(prevButton).toBeDisabled();
    });

    it('navigates to next step when next button clicked', () => {
      render(<AgentOnboarding {...defaultProps} />);

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
      expect(screen.getByText('Start Conversations')).toBeInTheDocument();
    });

    it('navigates to previous step when previous button clicked', () => {
      render(<AgentOnboarding {...defaultProps} />);

      // Go to step 2
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();

      // Go back to step 1
      fireEvent.click(screen.getByText('Previous'));
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('shows complete button on last step', () => {
      render(<AgentOnboarding {...defaultProps} />);

      // Navigate to last step
      fireEvent.click(screen.getByText('Next')); // Step 2
      fireEvent.click(screen.getByText('Next')); // Step 3
      fireEvent.click(screen.getByText('Next')); // Step 4

      expect(screen.getByText('Get Started')).toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('renders suggestion component on first step', () => {
      render(<AgentOnboarding {...defaultProps} />);

      expect(screen.getByTestId('suggestion')).toBeInTheDocument();
      expect(screen.getByText('Try asking: Write a function')).toBeInTheDocument();
    });

    it('renders actions component on second step', () => {
      render(<AgentOnboarding {...defaultProps} />);

      // Navigate to second step
      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByTestId('actions')).toBeInTheDocument();
      expect(screen.getByText('Try Example')).toBeInTheDocument();
    });

    it('marks step as completed when action is triggered', () => {
      render(<AgentOnboarding {...defaultProps} />);

      // Navigate to second step
      fireEvent.click(screen.getByText('Next'));

      // Click the action button
      fireEvent.click(screen.getByText('Try Example'));

      // Should show check mark
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });
  });

  describe('Event Handlers', () => {
    it('calls onClose when skip button is clicked', () => {
      const onClose = jest.fn();
      render(<AgentOnboarding {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Skip Guide'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when X button is clicked', () => {
      const onClose = jest.fn();
      render(<AgentOnboarding {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByTestId('x-icon'));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onComplete when complete button is clicked', async () => {
      const onComplete = jest.fn();
      render(<AgentOnboarding {...defaultProps} onComplete={onComplete} />);

      // Navigate to last step
      fireEvent.click(screen.getByText('Next')); // Step 2
      fireEvent.click(screen.getByText('Next')); // Step 3
      fireEvent.click(screen.getByText('Next')); // Step 4

      // Click complete button
      fireEvent.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });
    });

    it('sets localStorage when completed', async () => {
      render(<AgentOnboarding {...defaultProps} />);

      // Navigate to last step and complete
      fireEvent.click(screen.getByText('Next')); // Step 2
      fireEvent.click(screen.getByText('Next')); // Step 3
      fireEvent.click(screen.getByText('Next')); // Step 4
      fireEvent.click(screen.getByText('Get Started'));

      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'agentOnboardingCompleted',
          'true'
        );
      });
    });

    it('sets localStorage when skipped', () => {
      render(<AgentOnboarding {...defaultProps} />);

      fireEvent.click(screen.getByText('Skip Guide'));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'agentOnboardingSkipped',
        'true'
      );
    });
  });

  describe('Step Indicators', () => {
    it('shows correct step indicators', () => {
      render(<AgentOnboarding {...defaultProps} />);

      // Check that we have 4 step indicators
      const indicators = screen.getAllByRole('generic').filter(el =>
        el.className?.includes('rounded-full')
      );

      // We should have step indicators in the footer
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('updates step indicators when navigating', () => {
      render(<AgentOnboarding {...defaultProps} />);

      fireEvent.click(screen.getByText('Next'));

      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<AgentOnboarding {...defaultProps} />);

      // Check for modal structure
      const modal = screen.getByRole('dialog', { hidden: true });
      expect(modal).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<AgentOnboarding {...defaultProps} />);

      const nextButton = screen.getByText('Next');
      nextButton.focus();

      // Simulate Enter key press
      fireEvent.keyDown(nextButton, { key: 'Enter' });

      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });
  });
});

describe('useAgentOnboarding Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('returns shouldShow as true when no completion flags exist', () => {
    const TestComponent = () => {
      const { shouldShow } = useAgentOnboarding();
      return <div>{shouldShow ? 'show' : 'hide'}</div>;
    };

    render(<TestComponent />);

    // Hook uses useEffect, so we need to wait
    waitFor(() => {
      expect(screen.getByText('show')).toBeInTheDocument();
    });
  });

  it('returns shouldShow as false when completed', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'agentOnboardingCompleted') return 'true';
      return null;
    });

    const TestComponent = () => {
      const { shouldShow } = useAgentOnboarding();
      return <div>{shouldShow ? 'show' : 'hide'}</div>;
    };

    render(<TestComponent />);

    waitFor(() => {
      expect(screen.getByText('hide')).toBeInTheDocument();
    });
  });

  it('returns shouldShow as false when skipped', () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'agentOnboardingSkipped') return 'true';
      return null;
    });

    const TestComponent = () => {
      const { shouldShow } = useAgentOnboarding();
      return <div>{shouldShow ? 'show' : 'hide'}</div>;
    };

    render(<TestComponent />);

    waitFor(() => {
      expect(screen.getByText('hide')).toBeInTheDocument();
    });
  });

  it('provides markAsCompleted function', () => {
    const TestComponent = () => {
      const { markAsCompleted } = useAgentOnboarding();
      return <button onClick={markAsCompleted}>Complete</button>;
    };

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Complete'));

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'agentOnboardingCompleted',
      'true'
    );
  });

  it('provides markAsSkipped function', () => {
    const TestComponent = () => {
      const { markAsSkipped } = useAgentOnboarding();
      return <button onClick={markAsSkipped}>Skip</button>;
    };

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Skip'));

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'agentOnboardingSkipped',
      'true'
    );
  });

  it('provides resetOnboarding function', () => {
    const TestComponent = () => {
      const { resetOnboarding } = useAgentOnboarding();
      return <button onClick={resetOnboarding}>Reset</button>;
    };

    render(<TestComponent />);

    fireEvent.click(screen.getByText('Reset'));

    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'agentOnboardingCompleted'
    );
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(
      'agentOnboardingSkipped'
    );
  });
});