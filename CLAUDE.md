# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mango is a modern authentication demo system built with Next.js 15, featuring comprehensive user authentication and internationalization (i18n) support. It uses Supabase as the backend service and includes a robust testing suite.

## Tech Stack

- **Frontend**: Next.js 15.5.2 with App Router + Turbopack, React 19.1.0, TypeScript
- **Backend**: Supabase (authentication, database)
- **Styling**: Tailwind CSS 4
- **Internationalization**: next-intl (支持中文简体/英文)
- **Forms**: React Hook Form + Zod validation
- **Testing**: Jest + React Testing Library (95+ unit tests), Playwright (111+ e2e tests)
- **Icons**: Lucide React

## Development Commands

### Core Development
```bash
npm run dev              # Start development server with Turbopack
npm run build            # Build project with Turbopack
npm run start            # Start production server
npm run lint             # Run ESLint
npx tsc --noEmit        # TypeScript type checking
```

### Testing
```bash
npm run test             # Run Jest unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate test coverage report
npm run test:e2e         # Run Playwright e2e tests
npm run test:e2e:ui      # Run e2e tests with UI
npm run test:e2e:debug   # Debug e2e tests
```

### Validation Scripts
```bash
npm run validate:env           # Validate environment variables
npm run validate:translations  # Validate translation file integrity
npm run validate:i18n-types   # Validate i18n TypeScript types
```

### Build Hooks
- `prebuild`: Runs env and translation validation before build
- `prestart`: Runs env validation before start

## Architecture Overview

### Authentication System Architecture
The project implements a comprehensive authentication system with multiple layers:

1. **Supabase Integration** (`src/lib/supabase/`):
   - `client.ts`: Browser-side Supabase client
   - `server.ts`: Server-side Supabase client for SSR
   - `auth-helpers.ts`: Utility functions (`getUser`, `getUserProfile`, `isAuthenticated`, `requireAuth`)
   - `session-manager.ts`: Session management utilities
   - `types.ts`: Database type definitions

2. **Authentication Context** (`src/contexts/AuthContext.tsx`):
   - Provides global authentication state using React Context
   - `AuthProvider` component wraps the app
   - `useAuth` hook for consuming auth state

3. **Route Protection** (`src/middleware.ts`):
   - **Dual middleware system**: Combines next-intl routing with authentication
   - **Route configuration**: Defines public, protected, and auth-only paths
   - **Session management**: Handles session refresh and validation
   - **Locale-aware redirects**: Maintains language preference during redirects
   - **Email verification flow**: Enforces email confirmation for protected routes

4. **Server Actions** (in `actions.ts` files):
   - `signInAction`, `signUpAction`, `signOutAction`
   - `forgotPasswordAction`, `updatePasswordAction`
   - Located in respective page directories

### Internationalization (i18n) Architecture
Advanced i18n implementation using next-intl:

1. **Routing Setup** (`src/i18n/`):
   - `routing.ts`: Defines supported locales (`['zh', 'en']`), default locale (`'zh'`)
   - `request.ts`: Server-side i18n configuration
   - **URL structure**: `/{locale}/path` (e.g., `/zh/dashboard`, `/en/login`)

2. **Translation Management**:
   - **Files**: `messages/zh.json`, `messages/en.json`
   - **Validation**: Custom script validates translation completeness
   - **Performance optimization**: Lazy loading and caching via `src/lib/i18n-performance.ts`

3. **Components**:
   - `LanguageSwitcher.tsx`: Language toggle component
   - `I18nErrorBoundary.tsx`: Graceful handling of translation errors
   - `useI18n.ts`: Custom hook for i18n utilities

4. **Middleware Integration**:
   - **Dual middleware**: Processes i18n routing first, then authentication
   - **Locale preservation**: Maintains language during auth redirects
   - **Static file handling**: Bypasses i18n for assets and API routes

### Component Architecture
1. **UI Components** (`src/components/ui/`):
   - Reusable components following shadcn/ui patterns
   - Components: `button`, `input`, `card`, `alert`, `badge`, `label`
   - Configured via `components.json`

2. **Authentication Components** (`src/components/auth/`):
   - `LoginForm.tsx`, `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`
   - Form validation using React Hook Form + Zod schemas
   - Exported via `index.ts` for clean imports

3. **Layout Components**:
   - `Navbar.tsx`: Navigation with auth status and language switcher
   - `AuthStatus.tsx`: Displays current authentication state

### Validation System
Comprehensive validation using Zod schemas:
- **Location**: `src/lib/validations/auth.ts`
- **Forms**: All auth forms use consistent validation rules
- **Password policy**: 8+ characters, uppercase, lowercase, numbers
- **Email validation**: RFC-compliant email validation

### File Organization Principles
```
src/
├── app/[locale]/        # Internationalized pages with App Router
├── components/          # Reusable React components
│   ├── auth/           # Authentication-specific components
│   └── ui/             # Generic UI components (shadcn/ui)
├── contexts/           # React Context providers
├── hooks/              # Custom React hooks
├── i18n/               # Internationalization configuration
├── lib/                # Utility libraries and configurations
│   ├── supabase/       # Supabase client configurations
│   └── validations/    # Zod validation schemas
└── types/              # TypeScript type definitions
```

## Environment Variables

### Required Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional Variables
```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_DEFAULT_LOCALE=zh
NEXT_PUBLIC_SUPPORTED_LOCALES=zh,en
```

### Validation
Use `npm run validate:env` to check environment configuration before deployment.

## Development Guidelines

### Path Aliases
- Use `@/*` for imports from `src/` directory
- Example: `import { createClient } from '@/lib/supabase/client'`

### Code Conventions
- **TypeScript**: Full type safety with strict mode enabled
- **Component naming**: PascalCase for components, kebab-case for files
- **Server Actions**: Place in `actions.ts` files within page directories
- **Imports**: Use barrel exports (`index.ts`) for clean imports

### Authentication Patterns
- **Client components**: Use `useAuth()` hook for auth state
- **Server components**: Use `getUser()` or `requireAuth()` from auth-helpers
- **Route protection**: Define routes in middleware configuration
- **Form handling**: Use Server Actions with Zod validation

### Internationalization Patterns
- **Messages**: Use `useTranslations()` hook from next-intl
- **Route generation**: Use `useRouter()` with locale-aware navigation
- **Static content**: Place translatable content in message files
- **Component props**: Pass translations as props when needed

### Testing Guidelines
- **Unit tests**: Focus on business logic and component behavior
- **E2E tests**: Cover complete user workflows
- **Coverage**: Maintain 95%+ test coverage for critical paths
- **Mocking**: Mock Supabase client in tests using Jest

### Performance Considerations
- **Turbopack**: Used for faster development builds
- **Image optimization**: Use Next.js Image component
- **Bundle analysis**: Monitor bundle size with build output
- **Lazy loading**: Implemented for translation files

## Database Migrations

### Supabase Migrations
The project uses Supabase migrations for database schema management:

- **Location**: `supabase/migrations/`
- **Schema Migration**: `20241201000000_ai_agent_schema.sql`
- **Functions Migration**: `20241201000001_ai_agent_functions.sql`

### Applying Migrations
```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL Editor in Supabase Dashboard
```

### AI Agent Schema
- **7 main tables**: sessions, messages, plugins, servers, etc.
- **Row Level Security**: User data isolation
- **Performance indexes**: Optimized for queries
- **Full-text search**: pg_trgm enabled
- **Secure functions**: Protected with explicit search_path

## Troubleshooting

### Common Issues
1. **Environment validation errors**: Run `npm run validate:env` to diagnose
2. **Translation errors**: Use `npm run validate:translations` to check completeness
3. **Type errors**: Run `npx tsc --noEmit` for detailed type checking
4. **Authentication issues**: Check Supabase configuration and session state

### Development Tools
- **Hot reload**: Enabled with Turbopack in development
- **Error overlay**: Next.js provides detailed error information
- **DevTools**: Use React Developer Tools and Supabase dashboard
- **Logging**: Middleware includes detailed auth flow logging