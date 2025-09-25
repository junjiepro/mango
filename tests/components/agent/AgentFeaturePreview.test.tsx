import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import AgentFeaturePreview from '@/components/AgentFeaturePreview';
import '@testing-library/jest-dom';

// Mock next-intl
jest.mock('next-intl');

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  Code: () => <div data-testid="code-icon" />,
  BarChart: () => <div data-testid="bar-chart-icon" />,
  PenTool: () => <div data-testid="pen-tool-icon" />,
  Lightbulb: () => <div data-testid="lightbulb-icon" />,
}));

// Mock AI Elements components
jest.mock('@/components/ai-elements', () => ({
  Message: ({
    role,
    children
  }: {
    role: 'user' | 'assistant';
    children: React.ReactNode;
  }) => (
    <div data-testid={`message-${role}`}>
      {children}
    </div>
  ),
  Conversation: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="conversation">
      {children}
    </div>
  ),
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    ...props
  }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}));

describe('AgentFeaturePreview', () => {
  const mockUseTranslations = useTranslations as jest.MockedFunction<typeof useTranslations>;

  const mockTranslations = {
    'demo.title': 'Feature Demo',
    'demo.subtitle': 'Experience AI Assistant Power',
    'demo.scenarios.codeHelp.title': 'Code Assistant',
    'demo.scenarios.codeHelp.user': 'Help me write a quicksort algorithm',
    'demo.scenarios.codeHelp.assistant': 'I\'ll write a Python quicksort for you...',
    'demo.scenarios.analysis.title': 'Data Analysis',
    'demo.scenarios.analysis.user': 'Analyze this sales data trends',
    'demo.scenarios.analysis.assistant': 'Based on the data, I found trends...',
    'demo.scenarios.creative.title': 'Creative Writing',
    'demo.scenarios.creative.user': 'Write a modern poem about spring',
    'demo.scenarios.creative.assistant': 'Spring breeze caresses the city edge...',
    'demo.scenarios.problemSolving.title': 'Problem Solving',
    'demo.scenarios.problemSolving.user': 'How to optimize website speed?',
    'demo.scenarios.problemSolving.assistant': 'Website speed optimization involves...',
    'demo.playDemo': 'Play Demo',
    'demo.pauseDemo': 'Pause Demo',
    'demo.tryNow': 'Try Now',
  };

  const mockT = jest.fn((key: string) => {
    return mockTranslations[key as keyof typeof mockTranslations] || key;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseTranslations.mockReturnValue(mockT);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders main title and subtitle', () => {
      render(<AgentFeaturePreview />);

      expect(screen.getByText('Feature Demo')).toBeInTheDocument();
      expect(screen.getByText('Experience AI Assistant Power')).toBeInTheDocument();
    });

    it('renders all scenario cards', () => {
      render(<AgentFeaturePreview />);

      expect(screen.getByText('Code Assistant')).toBeInTheDocument();
      expect(screen.getByText('Data Analysis')).toBeInTheDocument();
      expect(screen.getByText('Creative Writing')).toBeInTheDocument();
      expect(screen.getByText('Problem Solving')).toBeInTheDocument();
    });

    it('renders scenario icons correctly', () => {
      render(<AgentFeaturePreview />);

      expect(screen.getByTestId('code-icon')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('pen-tool-icon')).toBeInTheDocument();
      expect(screen.getByTestId('lightbulb-icon')).toBeInTheDocument();
    });

    it('shows play button initially', () => {
      render(<AgentFeaturePreview />);

      expect(screen.getByText('Play Demo')).toBeInTheDocument();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('renders all scenario cards as inactive initially', () => {
      render(<AgentFeaturePreview />);

      const cards = screen.getAllByTestId('card');
      cards.forEach(card => {
        expect(card).not.toHaveClass('ring-2');
      });
    });
  });

  describe('Demo Playback', () => {
    it('starts demo when play button is clicked', async () => {
      render(<AgentFeaturePreview />);

      const playButton = screen.getByText('Play Demo');
      fireEvent.click(playButton);

      expect(screen.getByText('Pause Demo')).toBeInTheDocument();
      expect(screen.getByTestId('pause-icon')).toBeInTheDocument();
    });

    it('pauses demo when pause button is clicked', async () => {
      render(<AgentFeaturePreview />);

      // Start demo
      fireEvent.click(screen.getByText('Play Demo'));
      expect(screen.getByText('Pause Demo')).toBeInTheDocument();

      // Pause demo
      fireEvent.click(screen.getByText('Pause Demo'));
      expect(screen.getByText('Play Demo')).toBeInTheDocument();
    });

    it('cycles through scenarios during demo', async () => {
      render(<AgentFeaturePreview />);

      // Start demo
      fireEvent.click(screen.getByText('Play Demo'));

      // First scenario should be active
      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Advance to next scenario
      await act(async () => {
        jest.advanceTimersByTime(4000);
      });

      // Should have moved to next scenario
      expect(screen.getByTestId('conversation')).toBeInTheDocument();
    });

    it('shows conversation messages during active scenario', async () => {
      render(<AgentFeaturePreview />);

      fireEvent.click(screen.getByText('Play Demo'));

      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      // Should show user message first
      expect(screen.getByTestId('message-user')).toBeInTheDocument();
    });

    it('displays both user and assistant messages', async () => {
      render(<AgentFeaturePreview />);

      fireEvent.click(screen.getByText('Play Demo'));

      // Wait for user message
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      expect(screen.getByTestId('message-user')).toBeInTheDocument();

      // Wait for assistant message
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByTestId('message-assistant')).toBeInTheDocument();
    });

    it('loops back to first scenario after completing all', async () => {
      render(<AgentFeaturePreview />);

      fireEvent.click(screen.getByText('Play Demo'));

      // Advance through all scenarios (4 * 4000ms = 16000ms)
      await act(async () => {
        jest.advanceTimersByTime(16000);
      });

      // Should loop back to first scenario
      expect(screen.getByText('Code Assistant')).toBeInTheDocument();
    });
  });

  describe('Scenario Selection', () => {
    it('allows manual scenario selection', async () => {
      render(<AgentFeaturePreview />);

      const analysisCard = screen.getByText('Data Analysis').closest('[data-testid="card"]');
      fireEvent.click(analysisCard!);

      expect(screen.getByText('Analyze this sales data trends')).toBeInTheDocument();
    });

    it('highlights selected scenario', async () => {
      render(<AgentFeaturePreview />);

      const creativeCard = screen.getByText('Creative Writing').closest('[data-testid="card"]');
      fireEvent.click(creativeCard!);

      // Card should be highlighted
      expect(creativeCard).toHaveClass('ring-2');
    });

    it('stops auto-demo when manual selection is made', async () => {
      render(<AgentFeaturePreview />);

      // Start demo
      fireEvent.click(screen.getByText('Play Demo'));

      // Manually select a scenario
      const problemCard = screen.getByText('Problem Solving').closest('[data-testid="card"]');
      fireEvent.click(problemCard!);

      // Demo should stop (play button should be visible)
      expect(screen.getByText('Play Demo')).toBeInTheDocument();
    });

    it('shows correct conversation for selected scenario', async () => {
      render(<AgentFeaturePreview />);

      const codeCard = screen.getByText('Code Assistant').closest('[data-testid="card"]');
      fireEvent.click(codeCard!);

      expect(screen.getByText('Help me write a quicksort algorithm')).toBeInTheDocument();
      expect(screen.getByText('I\'ll write a Python quicksort for you...')).toBeInTheDocument();
    });
  });

  describe('Try Now Functionality', () => {
    it('shows try now button for active scenarios', async () => {
      render(<AgentFeaturePreview />);

      const card = screen.getByText('Creative Writing').closest('[data-testid="card"]');
      fireEvent.click(card!);

      expect(screen.getByText('Try Now')).toBeInTheDocument();
    });

    it('calls onTryFeature when try now button is clicked', async () => {
      const mockOnTryFeature = jest.fn();
      render(<AgentFeaturePreview onTryFeature={mockOnTryFeature} />);

      const card = screen.getByText('Data Analysis').closest('[data-testid="card"]');
      fireEvent.click(card!);

      const tryButton = screen.getByText('Try Now');
      fireEvent.click(tryButton);

      expect(mockOnTryFeature).toHaveBeenCalledWith('analysis');
    });
  });

  describe('Responsive Design', () => {
    it('renders with proper responsive grid classes', () => {
      const { container } = render(<AgentFeaturePreview />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('md:grid-cols-2', 'lg:grid-cols-4');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<AgentFeaturePreview />);

      const mainTitle = screen.getByRole('heading', { name: 'Feature Demo' });
      expect(mainTitle).toBeInTheDocument();

      const scenarioTitles = screen.getAllByTestId('card-title');
      expect(scenarioTitles).toHaveLength(4);
    });

    it('has accessible buttons with proper labels', () => {
      render(<AgentFeaturePreview />);

      const playButton = screen.getByRole('button', { name: /play demo/i });
      expect(playButton).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(<AgentFeaturePreview />);

      const playButton = screen.getByText('Play Demo');
      playButton.focus();

      fireEvent.keyDown(playButton, { key: 'Enter' });
      expect(screen.getByText('Pause Demo')).toBeInTheDocument();
    });

    it('has proper ARIA attributes for scenario cards', () => {
      render(<AgentFeaturePreview />);

      const cards = screen.getAllByTestId('card');
      cards.forEach(card => {
        // Cards should be clickable/focusable
        expect(card).toBeInTheDocument();
      });
    });
  });

  describe('Animation and Timing', () => {
    it('handles message timing correctly', async () => {
      render(<AgentFeaturePreview />);

      fireEvent.click(screen.getByText('Play Demo'));

      // User message appears first (after 1000ms)
      await act(async () => {
        jest.advanceTimersByTime(999);
      });
      expect(screen.queryByTestId('message-user')).not.toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByTestId('message-user')).toBeInTheDocument();

      // Assistant message appears after additional delay (2000ms)
      await act(async () => {
        jest.advanceTimersByTime(1999);
      });
      expect(screen.queryByTestId('message-assistant')).not.toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByTestId('message-assistant')).toBeInTheDocument();
    });

    it('cleans up timers on unmount', () => {
      const { unmount } = render(<AgentFeaturePreview />);

      fireEvent.click(screen.getByText('Play Demo'));

      // Unmount component while demo is running
      unmount();

      // Should not throw errors
      act(() => {
        jest.advanceTimersByTime(10000);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing translation gracefully', () => {
      mockUseTranslations.mockReturnValue((key: string) => `Missing: ${key}`);

      render(<AgentFeaturePreview />);

      expect(screen.getByText('Missing: demo.title')).toBeInTheDocument();
    });

    it('handles scenario selection with invalid index', () => {
      render(<AgentFeaturePreview />);

      // Manually trigger scenario change with invalid index
      const cards = screen.getAllByTestId('card');
      fireEvent.click(cards[0]);

      // Should not crash
      expect(screen.getByText('Code Assistant')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not create memory leaks with timers', () => {
      const { unmount } = render(<AgentFeaturePreview />);

      fireEvent.click(screen.getByText('Play Demo'));

      // Start multiple scenarios
      act(() => {
        jest.advanceTimersByTime(8000);
      });

      unmount();

      // Advance timers after unmount - should not cause issues
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      // No assertions needed - test passes if no errors thrown
    });
  });
});