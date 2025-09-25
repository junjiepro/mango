# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mango is a modern AI Agent platform built with Next.js 15, featuring intelligent conversational AI, comprehensive user management, and advanced performance monitoring. The platform provides a seamless AI assistant experience with multi-modal support, plugin extensibility, and enterprise-grade security.

**Core Mission**: Transform traditional web applications into intelligent, Agent-powered platforms that enhance user productivity through natural language interaction and smart automation.

## Tech Stack

### AI Agent Core
- **AI Elements**: Custom React component library for conversational interfaces
- **Agent System**: Comprehensive conversation management and session handling
- **Performance Monitoring**: Real-time Agent performance tracking and optimization
- **Plugin Architecture**: Extensible MCP (Model Context Protocol) server support

### Platform Foundation
- **Frontend**: Next.js 15.5.2 with App Router + Turbopack, React 19.1.0, TypeScript
- **Backend**: Supabase (authentication, database, real-time subscriptions)
- **Styling**: Tailwind CSS 4 with custom Agent-optimized components
- **Internationalization**: next-intl (支持中文简体/英文，Agent专用术语本地化)
- **Forms**: React Hook Form + Zod validation for Agent preferences
- **Testing**: Jest + React Testing Library (26+ test files), Playwright (integrated e2e testing)
- **Icons**: Lucide React with AI/Agent-themed iconography

## Development Commands

### Core Development
```bash
npm run dev              # Start development server with Turbopack
npm run build            # Build project with Turbopack
npm run start            # Start production server
npm run lint             # Run ESLint
npx tsc --noEmit        # TypeScript type checking
npx tsc --noEmit --watch # TypeScript type checking (watch mode)

# Build analysis
npm run build -- --no-turbo  # Build without Turbopack (fallback)
ANALYZE=true npm run build   # Build with bundle analyzer
```

### Testing & Quality
```bash
npm run test             # Run Jest unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate test coverage report
npm run test:e2e         # Run Playwright e2e tests (includes Agent workflows)
npm run test:e2e:ui      # Run e2e tests with UI
npm run test:e2e:debug   # Debug e2e tests
```

### Environment Management Scripts
```bash
# Environment configuration management
node scripts/env-manager.js validate [env]     # Validate environment variables
node scripts/env-manager.js generate [env]     # Generate environment file template
node scripts/env-manager.js guide              # Show Agent feature flag deployment guide
node scripts/env-manager.js check-deployment   # Pre-deployment readiness check

# Validation scripts
npm run validate:env           # Validate environment variables
npm run validate:translations  # Validate translation file integrity (includes Agent terms)
npm run validate:i18n-types   # Validate i18n TypeScript types
npm run migrate:user-preferences # Migrate user preferences data structure

# Integration testing
bash scripts/integration-check.sh  # Integration system health check
```

### Supabase Local Development
```bash
# Local Supabase services
supabase start               # Start local Supabase services
supabase stop                # Stop local Supabase services
supabase status              # Check local services status
supabase db reset            # Reset local database
supabase db push             # Push database schema changes

# Development workflow
supabase start && npm run dev # Start both Supabase and Next.js
```

### Build Hooks
- `prebuild`: Runs env and translation validation before build
- `prestart`: Runs env validation before start

## Local Development Setup

### Quick Start
```bash
# 1. Install dependencies
npm ci

# 2. Set up environment
node scripts/env-manager.js generate development
cp .env.development.template .env.local

# 3. Start Supabase services
supabase start

# 4. Start development server
npm run dev
```

### Development Services
Once started, these services will be available:
- **Next.js App**: http://localhost:3000
- **Supabase Studio**: http://localhost:54323 (Database management)
- **Supabase API**: http://localhost:54321
- **Email Testing**: http://localhost:54324 (Inbucket)

### Development Workflow
```bash
# Daily development routine
supabase status          # Check services are running
npm run validate:env     # Ensure environment is correct
npm run dev              # Start with Turbopack
npm run test:watch       # Run tests in watch mode (optional)
```

### First-time Setup Checklist
- [ ] Node.js 18+ installed
- [ ] Supabase CLI installed (`npm i -g supabase`)
- [ ] Environment variables configured
- [ ] Database migrations applied (`supabase db push`)
- [ ] Tests passing (`npm test`)

## Architecture Overview

### AI Agent System Architecture
The platform is built around a comprehensive Agent system with multiple intelligent layers:

1. **Agent Core** (`src/components/ai-agent/`):
   - `ConversationInterface.tsx`: Advanced conversational UI with streaming support
   - `AgentLayout.tsx`: Responsive layout optimized for Agent interactions
   - `AgentNavigation.tsx`: Agent-first navigation with mode switching
   - `AgentSessionHistory.tsx`: Conversation history management
   - `AgentFeaturePreview.tsx`: Interactive feature demonstrations
   - `AgentOnboarding.tsx`: Intelligent user onboarding flow

2. **AI Elements Library** (`src/components/ai-elements/`):
   - **Message Components**: `message.tsx`, `conversation.tsx` for rich content display
   - **Input Components**: `prompt-input.tsx`, `actions.tsx` for natural interaction
   - **Content Components**: `code-block.tsx`, `suggestion.tsx` for intelligent responses
   - **Theme System**: `theme.ts` for consistent Agent UI styling
   - **Performance Optimization**: Lazy loading and memoization

3. **Agent Intelligence Layer** (`src/lib/supabase/agent-preferences.ts`):
   - **Preference Management**: User-specific Agent behavior customization
   - **Conversation Context**: Maintain conversation state and context
   - **Model Configuration**: AI model selection and parameter tuning
   - **Privacy Controls**: Granular data sharing and analytics preferences

4. **Performance Monitoring System** (`src/lib/performance/`):
   - `agent-performance.ts`: Core performance monitoring infrastructure
   - `agent-metrics.ts`: Agent-specific metrics collection
   - Real-time response time tracking
   - Conversation quality metrics
   - User experience optimization

### Enhanced Authentication Architecture
Built on a robust authentication foundation, extended for Agent-specific features:

1. **Supabase Integration** (`src/lib/supabase/`):
   - Extended with Agent preference storage
   - Session management for long-running conversations
   - Row-level security for Agent data isolation
   - Real-time subscriptions for collaborative features

2. **Agent-Aware Route Protection** (`src/middleware.ts`):
   - **Multi-modal routing**: Handles both traditional pages and Agent interfaces
   - **Agent mode switching**: Seamless transition between simple/advanced modes
   - **Conversation continuity**: Maintains Agent context across sessions
   - **Performance optimization**: Route-based Agent preloading

3. **User Onboarding Flow**:
   - `AgentOnboarding.tsx`: Interactive Agent feature introduction
   - Progressive feature discovery
   - Personalized Agent configuration during first use

### Component Architecture

1. **AI-First Components** (`src/components/ai-elements/`):
   - Designed specifically for conversational interfaces
   - Optimized for streaming responses and real-time updates
   - Accessibility-first design with screen reader support
   - Theme-aware with dark/light mode optimization

2. **Enhanced Navigation** (`src/components/AgentNavigation.tsx`):
   - Agent-centric menu structure
   - Quick access to conversation history
   - Real-time Agent status indicators
   - Mode switching (Simple/Advanced) with preference persistence

3. **Performance-Optimized Layouts**:
   - `AgentLayout.tsx`: Responsive design optimized for Agent interactions
   - Lazy loading for better initial page load
   - Memory-efficient conversation rendering
   - Mobile-first responsive design

### File Organization Principles
```
src/
├── app/[locale]/           # Internationalized pages (Agent-focused)
│   ├── chat/              # Agent conversation interface
│   ├── dashboard/         # Agent activity center
│   └── profile/           # Agent preferences and settings
├── components/
│   ├── ai-agent/          # Agent-specific components
│   ├── ai-elements/       # Reusable AI interface components
│   ├── auth/              # Authentication components
│   └── ui/                # Base UI components (shadcn/ui)
├── contexts/              # React Context providers
├── hooks/                 # Custom React hooks (including Agent hooks)
├── lib/
│   ├── performance/       # Agent performance monitoring
│   ├── supabase/          # Database and auth (Agent-extended)
│   └── validations/       # Zod schemas (including Agent preferences)
└── types/                 # TypeScript definitions (Agent-focused types)
```

## Agent Development Guidelines

### Core Principles
- **Conversation-First Design**: Every interface should feel natural and conversational
- **Performance-Conscious**: Agent responses must be fast and fluid (< 2s target)
- **User-Centric**: Agent behavior adapts to individual user preferences
- **Privacy-Respecting**: Transparent data usage with granular controls
- **Accessibility-Compliant**: Full screen reader and keyboard navigation support

### Agent Component Patterns
```typescript
// Agent-aware component pattern
import { useAgentPreferences } from '@/lib/supabase/agent-preferences'
import { useAgentPerformance } from '@/hooks/useAgentPerformance'

export function AgentFeature() {
  const { preferences } = useAgentPreferences()
  const { measureAsyncOperation } = useAgentPerformance()

  const handleAgentAction = useCallback(async () => {
    await measureAsyncOperation('agent_action', async () => {
      // Agent logic here
    })
  }, [measureAsyncOperation])
}
```

### Performance Best Practices
- **Streaming Responses**: Use React Suspense for progressive rendering
- **Memory Management**: Implement conversation pruning for long sessions
- **Caching Strategy**: Cache Agent responses with user-specific keys
- **Bundle Optimization**: Code-split Agent features for better loading
- **Metrics Collection**: Monitor Agent performance with real-time telemetry

### Agent State Management
```typescript
// Agent preference hook usage
const { preferences, updatePreferences } = useAgentPreferences(user)

// Update Agent model preference
await updatePreferences({
  ai_settings: {
    ...preferences.ai_settings,
    model: 'gpt-4',
    temperature: 0.7
  }
})
```

### Testing Configuration Details

#### Jest Configuration (jest.config.js)
- **Test Environment**: jsdom for DOM testing
- **Path Mapping**: `@/*` → `src/*` aliases
- **Coverage Collection**: Excludes type definitions and Storybook files
- **Test Locations**: `tests/**/*` and `src/**/__tests__/**/*`
- **Setup**: Automatic React Testing Library setup

```bash
# Test commands
npm run test             # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage report
```

#### Playwright Configuration (playwright.config.ts)
- **Test Directory**: `./tests/integration`
- **Base URL**: http://localhost:3000
- **Browsers**: Chromium, Firefox, WebKit
- **Auto Dev Server**: Starts Next.js automatically for E2E tests

```bash
# E2E test commands
npm run test:e2e         # Headless E2E tests
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:debug   # Debug mode with browser
```

#### Testing Coverage Areas
- **Unit Tests**: Agent logic, utilities, validation schemas (`tests/unit/`, `tests/lib/`)
- **Component Tests**: Agent UI components with mocked data (`tests/components/agent/`)
- **Integration Tests**: Real data flow and authentication (`tests/integration/`)
- **E2E Tests**: Complete user journeys and Agent workflows (`tests/e2e/`)
- **i18n Tests**: Translation completeness and locale switching (`tests/i18n/`)
- **Performance Tests**: Response times and memory usage validation
- **Accessibility Tests**: Screen reader and keyboard navigation support

## Environment Variables and Configuration

### Environment Management System
The project includes an automated environment management tool (`scripts/env-manager.js`) that supports:
- Interactive environment validation
- Template generation for different deployment stages
- Agent feature flag deployment guidance
- Pre-deployment readiness checks

```bash
# Interactive setup
node scripts/env-manager.js validate    # Validates current environment
node scripts/env-manager.js generate    # Generates environment templates
node scripts/env-manager.js guide       # Shows Agent deployment guide
```

### Required Core Variables
```env
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Agent System Configuration
```env
# Agent core settings
NEXT_PUBLIC_AGENT_DEFAULT_MODEL=gpt-4
NEXT_PUBLIC_AGENT_MAX_HISTORY=500
NEXT_PUBLIC_AGENT_RESPONSE_TIMEOUT=30000
NEXT_PUBLIC_AGENT_STREAMING_ENABLED=true
NEXT_PUBLIC_PERFORMANCE_MONITORING=true

# Agent deployment phases (use env-manager.js guide for details)
NEXT_PUBLIC_AGENT_SYSTEM_ENABLED=true
NEXT_PUBLIC_AGENT_ADVANCED_MODE=true
NEXT_PUBLIC_AGENT_PLUGIN_SYSTEM=true
```

### Internationalization Configuration
```env
NEXT_PUBLIC_DEFAULT_LOCALE=zh
NEXT_PUBLIC_SUPPORTED_LOCALES=zh,en
NEXT_PUBLIC_AGENT_I18N_ENABLED=true
```

### Supabase Local Development Ports
```env
# Local Supabase services (configured in supabase/config.toml)
SUPABASE_API_PORT=54321          # API Gateway
SUPABASE_DB_PORT=54322           # PostgreSQL Database
SUPABASE_STUDIO_PORT=54323       # Supabase Studio
SUPABASE_INBUCKET_PORT=54324     # Email testing (Inbucket)
SUPABASE_STORAGE_PORT=54327      # Storage API
SUPABASE_AUTH_PORT=54328         # Auth API
```

## Database Schema

### Agent-Specific Tables
The database schema is optimized for Agent functionality:

```sql
-- Agent conversations and sessions
agent_sessions, agent_messages, agent_conversation_summaries

-- Agent preferences and configuration
agent_preferences, agent_model_configs, agent_ui_preferences

-- Agent performance and analytics
agent_performance_metrics, agent_usage_analytics

-- Agent plugin system
agent_plugins, agent_servers, agent_tools
```

### Migration Commands
```bash
# Apply Agent schema migrations
supabase db push

# Reset and reapply migrations (development only)
supabase db reset
```

## Agent Feature Development

### Creating New Agent Components
1. **Component Structure**: Follow the AI Elements pattern
2. **Performance Integration**: Include performance monitoring hooks
3. **Preference Integration**: Support user customization
4. **Accessibility**: Implement ARIA labels and keyboard navigation
5. **Testing**: Include unit, integration, and E2E tests

### Agent Conversation Flow
```typescript
// Example Agent conversation implementation
export function ConversationInterface() {
  const { sendMessage, messages, isLoading } = useAgentConversation()
  const { preferences } = useAgentPreferences()

  const handleSubmit = async (message: string) => {
    await sendMessage(message, {
      model: preferences.ai_settings.model,
      streaming: preferences.ai_settings.stream_responses
    })
  }

  return (
    <Conversation
      messages={messages}
      onSubmit={handleSubmit}
      loading={isLoading}
      streamingEnabled={preferences.ai_settings.stream_responses}
    />
  )
}
```

### Agent Performance Monitoring
Implement performance tracking for Agent features:

```typescript
import { useAgentPerformance } from '@/hooks/useAgentPerformance'

export function useAgentChat() {
  const { measureAsyncOperation, recordMetric } = useAgentPerformance()

  const sendMessage = useCallback(async (message: string) => {
    const response = await measureAsyncOperation('send_message', async () => {
      return await apiClient.sendMessage(message)
    })

    recordMetric({
      type: 'conversation_response_time',
      value: response.responseTime,
      metadata: { messageLength: message.length }
    })

    return response
  }, [measureAsyncOperation, recordMetric])
}
```

## Important Configuration Files

### Performance and Build Configuration
- `next-performance.config.js`: Agent-optimized Next.js configuration with performance budgets and monitoring
- `next.config.ts`: Main Next.js configuration
- `jest.config.js` & `jest.setup.js`: Testing configuration
- `playwright.config.ts`: E2E testing configuration
- `eslint.config.mjs`: Code quality and linting rules
- `tsconfig.json`: TypeScript configuration
- `tailwind.config.ts`: Styling configuration (Tailwind CSS 4)

### Agent System Configuration
- `.mcp.json`: Model Context Protocol server configuration
- `components.json`: shadcn/ui component configuration
- `postcss.config.mjs`: PostCSS configuration for Tailwind CSS 4
- `supabase/config.toml`: Local Supabase services configuration

## Performance Configuration and Monitoring

### Next.js Performance Optimization (next-performance.config.js)
The project includes Agent-specific performance optimizations:

#### Key Features
- **Turbopack Integration**: Faster builds and hot reloading
- **Optimized Package Imports**: Selective imports for Radix UI, Lucide, and syntax highlighter
- **Partial Prerendering (PPR)**: Experimental Next.js 15 feature
- **Bundle Splitting**: Separate chunks for AI Elements, UI libraries, and Supabase
- **Production Optimizations**: Console log removal, React property stripping

#### Performance Budgets
```javascript
// Configured in next-performance.config.js
JavaScript: 1MB max (warning at 500KB)
CSS: 200KB max (warning at 100KB)
Images: 1MB per file max (warning at 500KB)
```

#### Agent Performance Targets
- Conversation page load: < 2s
- Message response time: < 3s
- History loading: < 1.5s
- Settings save: < 1s

### Bundle Analysis
```bash
# Analyze bundle size
ANALYZE=true npm run build

# Performance monitoring endpoint
curl http://localhost:3000/api/performance?format=json
```

## UI Component System (shadcn/ui)

### Configuration (components.json)
- **Style**: New York design system
- **Base Color**: Neutral palette optimized for Agent interfaces
- **Icons**: Lucide React with AI/Agent-themed iconography
- **CSS Variables**: Enabled for theme customization
- **Path Aliases**: Configured for clean imports

### Component Structure
```bash
@/components/ui          # Base shadcn/ui components
@/components/ai-elements # AI-specific interface components
@/components/ai-agent    # Agent functionality components
@/lib/utils              # Utility functions (cn, etc.)
@/hooks                  # Custom React hooks
```

### Adding New Components
```bash
# Use shadcn/ui CLI to add components
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add sheet
```

## Deployment and Production

### Performance Optimization
- **Next.js Configuration**: Optimized for Agent workloads (`next-performance.config.js`)
- **Bundle Splitting**: Agent features loaded on-demand
- **CDN Strategy**: Static assets optimized for global distribution
- **Database Optimization**: Indexes optimized for Agent queries

### Monitoring and Analytics
- **Real-time Metrics**: Agent performance dashboards
- **User Analytics**: Conversation quality and engagement metrics
- **Error Tracking**: Agent-specific error monitoring
- **Performance Budgets**: Automated alerts for performance degradation

### Security Considerations
- **Data Privacy**: Agent conversations encrypted at rest
- **User Consent**: Transparent data usage with opt-out capabilities
- **API Security**: Rate limiting and abuse prevention for Agent endpoints
- **Content Filtering**: Responsible AI practices with content moderation

## Troubleshooting

### Common Agent Issues
1. **Slow Response Times**: Check performance metrics dashboard (`/api/performance`)
2. **Conversation Context Lost**: Verify session management and database connections
3. **Preference Sync Issues**: Check Supabase RLS policies and user permissions
4. **Streaming Failures**: Validate WebSocket connections and browser compatibility
5. **Translation Missing**: Run `npm run validate:translations` for Agent-specific terms

### Performance Debugging
```bash
# Check Agent metrics
curl http://localhost:3000/api/performance?format=json

# Validate environment configuration
npm run validate:env

# Validate translation integrity
npm run validate:translations
```

### Common Development Issues

#### Turbopack Issues
```bash
# Fallback to Webpack if Turbopack fails
npm run dev -- --no-turbo
npm run build -- --no-turbo
```

#### Environment Configuration Problems
```bash
# Validate and fix environment issues
node scripts/env-manager.js validate
node scripts/env-manager.js generate development
npm run validate:env
```

#### Supabase Connection Issues
```bash
# Check and restart local Supabase services
supabase status
supabase stop && supabase start
supabase db reset  # Reset database if needed
```

#### Build and Cache Issues
```bash
# Clear build cache and reinstall
rm -rf .next
rm -rf node_modules/.cache
npm ci
```

#### Translation and i18n Problems
```bash
# Validate translation files
npm run validate:translations
npm run validate:i18n-types
```

### Development Tools
- **Agent DevTools**: Built-in debugging panel for Agent development
- **Performance Dashboard**: Real-time Agent metrics (`/api/performance`)
- **Conversation Replay**: Debug Agent responses with conversation history
- **Preference Inspector**: Validate Agent configuration and preferences
- **Bundle Analyzer**: Visual bundle size analysis (`ANALYZE=true npm run build`)
- **Supabase Studio**: Local database management (http://localhost:54323)
- **Email Testing**: Inbucket for email flow testing (http://localhost:54324)

## Contributing to Agent Features

### Development Workflow
1. **Feature Planning**: Document Agent feature requirements and user stories
2. **Component Design**: Create Agent-optimized components following established patterns
3. **Performance Testing**: Validate Agent response times and memory usage
4. **User Testing**: Conduct usability tests with real Agent interactions
5. **Documentation**: Update this document with new Agent capabilities

### Code Review Checklist
- [ ] Agent performance meets < 2s response time requirement
- [ ] Component follows AI Elements design patterns
- [ ] Accessibility features implemented (ARIA, keyboard navigation)
- [ ] User preferences respected and configurable
- [ ] Comprehensive test coverage (unit, integration, E2E)
- [ ] Performance monitoring integrated
- [ ] Internationalization support for Agent-specific terms
- [ ] Security and privacy controls implemented

---

## Important Reminders

**This project is now Agent-first**: Every new feature should enhance the intelligent conversation experience. When in doubt, prioritize Agent functionality and user experience over traditional web patterns.

**Performance is Critical**: Agent interactions must feel instantaneous. Always consider the performance impact of new features and optimize accordingly.

**User Privacy Matters**: Agent systems handle sensitive conversation data. Always implement privacy controls and be transparent about data usage.