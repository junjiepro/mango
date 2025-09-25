/**
 * AI Elements Theme Configuration
 *
 * Defines theme-specific styles and utilities for AI Elements components
 * to ensure consistent design language across the application.
 * Optimized for geek-friendly, approachable design aesthetic.
 */

/**
 * AI Elements Color Tokens
 * Extends the base design system with AI-specific color tokens
 */
export const aiElementsTheme = {
  // AI-specific color tokens
  colors: {
    'ai-assistant': 'oklch(0.646 0.222 41.116)', // Warm orange for AI responses
    'ai-assistant-foreground': 'oklch(0.985 0 0)',
    'ai-user': 'oklch(0.398 0.07 227.392)', // Cool blue for user messages
    'ai-user-foreground': 'oklch(0.985 0 0)',
    'ai-thinking': 'oklch(0.828 0.189 84.429)', // Yellow for thinking states
    'ai-thinking-foreground': 'oklch(0.145 0 0)',
    'ai-code': 'oklch(0.269 0 0)', // Dark gray for code blocks
    'ai-code-foreground': 'oklch(0.985 0 0)',
    'ai-artifact': 'oklch(0.97 0 0)', // Light background for artifacts
    'ai-artifact-foreground': 'oklch(0.145 0 0)',
    'ai-accent': 'oklch(0.769 0.188 70.08)', // Bright accent color
    'ai-accent-foreground': 'oklch(0.145 0 0)',
  },

  // Dark mode variants
  darkColors: {
    'ai-assistant': 'oklch(0.696 0.17 162.48)',
    'ai-assistant-foreground': 'oklch(0.145 0 0)',
    'ai-user': 'oklch(0.488 0.243 264.376)',
    'ai-user-foreground': 'oklch(0.985 0 0)',
    'ai-thinking': 'oklch(0.645 0.246 16.439)',
    'ai-thinking-foreground': 'oklch(0.985 0 0)',
    'ai-code': 'oklch(0.205 0 0)',
    'ai-code-foreground': 'oklch(0.985 0 0)',
    'ai-artifact': 'oklch(0.269 0 0)',
    'ai-artifact-foreground': 'oklch(0.985 0 0)',
    'ai-accent': 'oklch(0.627 0.265 303.9)',
    'ai-accent-foreground': 'oklch(0.985 0 0)',
  },

  // Component-specific theming
  components: {
    message: {
      // Message container styling
      base: 'group flex w-full items-end gap-2 py-4',
      user: 'is-user justify-end',
      assistant: 'is-assistant flex-row-reverse justify-end',

      // Message content variants
      content: {
        contained: {
          base: 'max-w-[80%] px-4 py-3 rounded-lg text-sm overflow-hidden',
          user: 'bg-ai-user text-ai-user-foreground',
          assistant: 'bg-ai-assistant text-ai-assistant-foreground',
        },
        flat: {
          base: 'text-sm overflow-hidden rounded-lg',
          user: 'max-w-[80%] bg-secondary px-4 py-3 text-foreground',
          assistant: 'text-foreground',
        },
      },

      // Avatar styling
      avatar: 'size-8 ring-1 ring-border',
    },

    conversation: {
      container: 'relative flex-1 overflow-y-auto',
      content: 'p-4',
      emptyState: 'flex size-full flex-col items-center justify-center gap-3 p-8 text-center',
      scrollButton: 'absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full',
    },

    promptInput: {
      container: 'relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring',
      textarea: 'min-h-[3rem] w-full resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      attachments: 'flex flex-wrap gap-2 p-2',
      actions: 'flex items-center gap-1 px-3 py-2',
    },

    codeBlock: {
      container: 'not-prose relative overflow-hidden rounded-lg border bg-ai-code text-ai-code-foreground',
      header: 'flex items-center justify-between gap-2 border-b px-4 py-2',
      content: 'overflow-x-auto p-4',
      copyButton: 'absolute right-2 top-2 size-8 border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
    },

    artifact: {
      container: 'relative overflow-hidden rounded-lg border bg-ai-artifact text-ai-artifact-foreground',
      header: 'border-b px-4 py-2',
      content: 'p-4',
      title: 'font-medium text-sm',
      description: 'text-muted-foreground text-sm',
    },

    suggestions: {
      container: 'w-full overflow-x-auto whitespace-nowrap',
      list: 'flex w-max flex-nowrap items-center gap-2',
      item: 'cursor-pointer rounded-full px-4',
    },

    actions: {
      container: 'flex items-center gap-1',
      button: 'relative size-9 p-1.5 text-muted-foreground hover:text-foreground',
    },

    loader: {
      container: 'flex items-center justify-center gap-2 p-4',
      spinner: 'size-4 animate-spin',
      text: 'text-muted-foreground text-sm',
    },

    reasoning: {
      container: 'space-y-2 rounded-lg border bg-ai-thinking/10 p-4',
      step: 'border-l-2 border-ai-thinking pl-4',
      header: 'font-medium text-sm text-ai-thinking',
      content: 'text-muted-foreground text-sm',
    },

    context: {
      container: 'space-y-2 rounded-lg border bg-muted/50 p-4',
      header: 'font-medium text-sm',
      item: 'rounded border bg-background p-3',
      itemHeader: 'mb-1 font-medium text-sm',
      itemContent: 'text-muted-foreground text-sm',
    },
  },

  // Animation and transition settings
  animations: {
    messageSlide: 'animate-in slide-in-from-bottom-2 duration-300',
    fadeIn: 'animate-in fade-in duration-200',
    typewriter: 'animate-in fade-in duration-100',
    thinking: 'animate-pulse duration-1000',
  },

  // Spacing and sizing utilities
  spacing: {
    message: {
      gap: '0.5rem',
      padding: '1rem',
      maxWidth: '80%',
    },
    conversation: {
      padding: '1rem',
      gap: '1rem',
    },
    input: {
      padding: '0.75rem 1rem',
      minHeight: '3rem',
    },
  },

  // Typography settings
  typography: {
    message: {
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
    },
    code: {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.875rem',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: '1rem',
    },
  },

  // Breakpoint-specific adjustments
  responsive: {
    mobile: {
      message: {
        maxWidth: '95%',
        padding: '0.75rem',
      },
      conversation: {
        padding: '0.75rem',
      },
    },
    tablet: {
      message: {
        maxWidth: '85%',
      },
    },
    desktop: {
      message: {
        maxWidth: '80%',
      },
    },
  },
};

/**
 * CSS Custom Properties for AI Elements
 * These can be added to the global CSS file to provide theme tokens
 */
export const aiElementsCSSVariables = `
  /* AI Elements Color Tokens */
  --ai-assistant: oklch(0.646 0.222 41.116);
  --ai-assistant-foreground: oklch(0.985 0 0);
  --ai-user: oklch(0.398 0.07 227.392);
  --ai-user-foreground: oklch(0.985 0 0);
  --ai-thinking: oklch(0.828 0.189 84.429);
  --ai-thinking-foreground: oklch(0.145 0 0);
  --ai-code: oklch(0.269 0 0);
  --ai-code-foreground: oklch(0.985 0 0);
  --ai-artifact: oklch(0.97 0 0);
  --ai-artifact-foreground: oklch(0.145 0 0);
  --ai-accent: oklch(0.769 0.188 70.08);
  --ai-accent-foreground: oklch(0.145 0 0);
`;

export const aiElementsDarkCSSVariables = `
  /* AI Elements Dark Mode Color Tokens */
  --ai-assistant: oklch(0.696 0.17 162.48);
  --ai-assistant-foreground: oklch(0.145 0 0);
  --ai-user: oklch(0.488 0.243 264.376);
  --ai-user-foreground: oklch(0.985 0 0);
  --ai-thinking: oklch(0.645 0.246 16.439);
  --ai-thinking-foreground: oklch(0.985 0 0);
  --ai-code: oklch(0.205 0 0);
  --ai-code-foreground: oklch(0.985 0 0);
  --ai-artifact: oklch(0.269 0 0);
  --ai-artifact-foreground: oklch(0.985 0 0);
  --ai-accent: oklch(0.627 0.265 303.9);
  --ai-accent-foreground: oklch(0.985 0 0);
`;

/**
 * Utility functions for applying AI Elements themes
 */
export const createAIElementsClassNames = {
  // Generate message classes based on role
  message: (role: 'user' | 'assistant', variant: 'contained' | 'flat' = 'contained') => {
    const { message } = aiElementsTheme.components;
    return `${message.base} ${role === 'user' ? message.user : message.assistant}`;
  },

  // Generate message content classes
  messageContent: (role: 'user' | 'assistant', variant: 'contained' | 'flat' = 'contained') => {
    const { content } = aiElementsTheme.components.message;
    return `${content[variant].base} ${content[variant][role]}`;
  },

  // Generate component classes
  component: (componentName: keyof typeof aiElementsTheme.components, element?: string) => {
    const component = aiElementsTheme.components[componentName];
    if (element && typeof component === 'object' && element in component) {
      return component[element as keyof typeof component];
    }
    return typeof component === 'string' ? component : '';
  },
};

export default aiElementsTheme;