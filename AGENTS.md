# Repository Guidelines

## Project Structure & Module Organization
- `src/app/[locale]` implements Next.js App Router routes and locale-aware pages; API handlers live under `src/app/api`.
- Shared UI lives in `src/components`, domain state in `src/contexts` and `src/hooks`, and backend-facing helpers in `src/lib`.
- Localization artifacts sit in `messages/` and generated types in `types/`; static assets belong in `public/`.
- Documentation and product specs are collected in `docs/`; automated tests reside in `tests/` with `coverage/` and `playwright-report/` storing outputs.
- Supabase configuration, migrations, and SQL snippets are stored in `supabase/`; scripts supporting automation live in `scripts/`.

## Build, Test, and Development Commands
- `npm run dev` launches the Turbopack dev server on http://localhost:3000 with hot reload.
- `npm run build` creates a production bundle after the prebuild env and translation checks.
- `npm run start` serves the compiled output.
- `npm run lint` runs ESLint using `eslint.config.mjs`.
- `npm run test`, `npm run test:watch`, and `npm run test:coverage` execute Jest suites; `npm run test:e2e`, `test:e2e:ui`, and `test:e2e:debug` run Playwright with optional UI or debugger.
- `npm run validate:env`, `validate:translations`, and `validate:i18n-types` verify configuration, locale coverage, and generated types; run these before committing configuration or i18n changes.

## Coding Style & Naming Conventions
- Write TypeScript with ES modules and React 19 patterns; default indentation is two spaces and semicolons are required.
- Component and hook files use PascalCase names such as `AuthStatus.tsx` and camelCase names such as `useAuth.ts`; test utilities mirror the feature name.
- Tailwind utility strings stay double-quoted; prefer class composition helpers from `tailwind-merge` and `clsx`.
- Use `npm run lint` prior to pushing and rely on editor ESLint integration for autofixable issues.

## Testing Guidelines
- Unit and integration specs live in `tests/unit` and `tests/integration` as `*.test.ts[x]`; end-to-end flows in `tests/e2e` follow the `*.spec.ts` convention.
- Keep fixtures beside suites under `tests/**/__fixtures__`; use Testing Library helpers (`@testing-library/react`) for component coverage.
- Review Jest coverage output in `coverage/` and Playwright traces in `playwright-report/`; avoid regressing on tracked scenarios.
- Document manual verification (auth flows, localization switches) in PRs when automated coverage is insufficient.

## Commit & Pull Request Guidelines
- Follow existing history: short, present-tense subjects (<=72 characters) such as `Add auth context guards`; add an optional body separated by a blank line for rationale or references.
- Reference related issues, specs, or Supabase migrations in the body; call out translation or environment updates explicitly.
- Pull requests need a clear summary, checklist of commands run (lint, tests, validations), and UX evidence (screenshots or GIFs) for UI-affecting work.
- Attach links or paths to relevant artifacts (`playwright-report/`, `test-results/`) when end-to-end suites run; share `.env.local` key requirements when new variables are introduced.

## Environment & Configuration
- Manage secrets via `.env.local`; keep `.env.example` updated with new keys and run `npm run validate:env` after edits.
- Localization keys originate in `messages/<locale>.json`; regenerate i18n types with `npm run validate:i18n-types` whenever keys change.
- Use the `supabase/` folder for schema changes; document required migrations or seed data in PR descriptions.
