# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is an **HR Masterdata Management System** — a single Next.js 16 (App Router) application using React 19, TypeScript 5.9, and Supabase (hosted PostgreSQL + Auth). The UI is Swedish-only. It is deployed as a serverless monolith on Vercel.

### Required environment variables

The app requires a `.env.local` file with Supabase credentials. See `.env.example` for the full list. Without valid Supabase credentials, the dev server starts but authentication and database operations fail. The key variables are:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (defaults to `http://localhost:3000`)

### Running the application

- **Dev server**: `pnpm dev` (starts on port 3000, uses `--webpack` flag)
- **Health check**: `curl http://localhost:3000/api/health` returns `{"status":"ok",...}`
- The root URL (`/`) redirects unauthenticated users to `/login`

### Testing

- **Lint**: `pnpm lint` (ESLint flat config; 0 errors expected, warnings are pre-existing)
- **Type-check**: `pnpm type-check` (should pass cleanly)
- **Unit tests**: `pnpm test` (Vitest; ~2861 tests, mocks Supabase via `tests/setup.ts`)
- **Integration tests**: `pnpm test:integration` (requires `.env.test` with real Supabase credentials)
- **E2E tests**: `pnpm test:e2e` (Playwright; requires running dev server and real Supabase)
- Unit tests do **not** require real Supabase credentials — they mock env vars in `tests/setup.ts`

### Gotchas

- The `pnpm dev` command includes `--webpack` flag (not Turbopack). This is intentional per `package.json`.
- `pnpm-workspace.yaml` only configures `ignoredBuiltDependencies` and `onlyBuiltDependencies` — there are no workspace packages.
- One pre-existing test failure exists in `tests/integration/epic-20/story-20.6/saved-filters-integration.test.tsx` (filter name truncation issue in the test itself).
- The CI workflow (`.github/workflows/test-check.yml`) runs: type-check → lint → unit tests → integration tests (if Supabase URL is set).
