# Repository Guidelines

## Project Structure & Module Organization
`apps/web` contains the Next.js 14 app, API routes, UI components, and tests. Put code in `apps/web/src`, static assets in `apps/web/public`, and web tests in `apps/web/tests`. `apps/cli` holds the TypeScript CLI and device service, with the entrypoint at `apps/cli/src/index.ts`. Shared types and utilities live in `packages/shared`; protocol adapters live in `packages/protocols`. Database changes belong in `supabase/migrations`, and Supabase Edge Functions live under `supabase/functions`. Specs and ADRs are kept in `specs/` and `docs/`.

## Build, Test, and Development Commands
Use Node `>=20` and PNPM `>=9`.

- `pnpm install`: install all workspace dependencies.
- `pnpm dev`: start the Turbo dev pipeline; the web app runs at `http://localhost:3000`.
- `pnpm build`: build all apps and packages.
- `pnpm lint`: run workspace lint tasks.
- `pnpm test`: run workspace test tasks.
- `pnpm test:e2e`: run end-to-end suites.
- `cd apps/web && pnpm vitest run --coverage`: run web unit and integration tests with coverage.
- `cd apps/cli && pnpm build`: build the CLI bundle.
- `pnpm deploy:db`, `pnpm deploy:functions`, `pnpm deploy:cli`: deploy targeted parts of the stack.

## Coding Style & Naming Conventions
This repository is TypeScript-first. Prettier enforces 2-space indentation, semicolons, single quotes, trailing commas (`es5`), `printWidth: 100`, and LF line endings. Run `pnpm format` before large submissions. Follow existing naming patterns: React components and services use `PascalCase`, hooks use `useX.ts`, helpers use `camelCase` file names, and migrations use timestamped snake case such as `20260217000001_phase9_index_optimization.sql`.

## Testing Guidelines
Web tests use Vitest, Testing Library, and Playwright. Place unit and integration tests in `apps/web/tests` with `*.test.ts` names; keep E2E specs in `apps/web/tests/e2e` with `*.spec.ts`. The web app enforces 80% coverage for lines, functions, branches, and statements. Add or update tests for user-facing behavior, API routes, and shared logic when changing them.

## Commit & Pull Request Guidelines
Recent commits use short, imperative subjects in either English or Chinese. Keep the subject brief, action-oriented, and specific to the affected area, for example `fix lint` or `cli: update version`. PRs should include a summary, linked issue or spec when available, screenshots or recordings for UI changes, notes for schema or environment updates, and the exact validation commands you ran.

## Security & Configuration Tips
Start from `.env.example` and keep secrets in `.env.local`; never commit credentials or local tunnel URLs. Treat Supabase migrations as immutable once shared, and review changes under `supabase/functions` and `apps/web/src/app/api` for secret handling and input validation.
