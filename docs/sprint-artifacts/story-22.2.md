# Story 22.2: Enforce Non-Production Environment Isolation

## Status

done

- **Priority:** P0
- **Story Points:** 3
- **Dependencies:** None

## Description

As a product owner preparing external review, I want test and staging environments prevented from targeting production Supabase resources, so that presentations, tests, and agent runs cannot damage or expose production HR data.

## Acceptance Criteria

- [x] AC1: `.env.test` and any documented test/staging environment values point to non-production Supabase resources.
- [x] AC2: A hard guard fails fast when `NODE_ENV=test` or staging/presentation execution references known production Supabase URL, project ID, or database host values.
- [x] AC3: The guard produces a clear non-secret error message explaining that production resources cannot be used.
- [x] AC4: Local/test/staging/production environment separation is documented with the expected Supabase project/resource per environment.
- [x] AC5: Tests prove the guard rejects production-like values and permits valid non-production values.

## Technical Notes

- Review environment config helpers before adding new abstractions.
- Do not commit real secrets.
- Keep production identifiers documented only where safe.

## Testing Requirements

**Estimated tests:** 2

- Config guard unit tests.
- Documentation or script verification for test/staging setup.

## Tasks / Subtasks

- [x] Inventory current Supabase environment entry points. (AC: 1, 2)
  - [x] Reviewed `src/lib/supabase/server.ts`.
  - [x] Reviewed `src/lib/supabase/server-api.ts`.
  - [x] Reviewed `src/lib/supabase/client.ts`.
  - [x] Reviewed E2E/test helpers that create Supabase clients directly.

- [x] Implement non-production production-resource guard. (AC: 2, 3, 5)
  - [x] Added Zod-backed guard for test/staging/preview/presentation contexts.
  - [x] Rejects known production Supabase URL, project ref, and database host markers.
  - [x] Error message reports only unsafe environment variable names and omits resource values/secrets.
  - [x] Wired guard into app Supabase clients, login page, E2E setup, and direct test helpers.

- [x] Update non-production environment documentation/configuration. (AC: 1, 4)
  - [x] Reset `.env.test` to local/non-production Supabase placeholders and removed generated production-derived token/user-id values.
  - [x] Updated `docs/testing-setup.md` with local/test/staging/presentation/production separation.
  - [x] Updated commercial readiness index note so `.env.test` is no longer described as production-pointing.

- [x] Verify full project quality gates. (AC: 5)
  - [x] Red phase: focused Story 22.2 Vitest failed because guard module was missing.
  - [x] Green phase: focused Story 22.2 Vitest passed: 5 tests.
  - [x] Run `npx tsc --noEmit`.
  - [x] Run `npx eslint` (exit 0; existing warnings remain).
  - [x] Run `npx vitest run` (exit 0).
  - [x] Run `npx playwright test`; attempted on 2026-06-04 and exited `1` because `.env.test` pointed at local Supabase and no service was listening on `127.0.0.1:54321`.
  - [x] Lead verification on 2026-06-06 confirmed local Supabase is running at `127.0.0.1:54321` and `npx vitest run` exits `0`, but the exact `npx playwright test` command timed out after the 20-minute harness limit without an `EXIT:0`.
  - [x] Lead verification on 2026-06-07 reran exact `npx playwright test` with a longer tool timeout; the full serial suite completed successfully with exit `0`.

## Definition of Done

- Test/staging cannot silently point at production.
- Setup instructions are updated.
- Tests pass with `npx vitest run`.

## Dev Agent Record

### Debug Log

- 2026-06-04: Focused Story 22.2 red test failed with missing `@/lib/env/non-production-supabase-guard` module.
- 2026-06-04: Focused Story 22.2 guard test passed after implementation: `npx vitest run tests/unit/epic-22/story-22.2/non-production-supabase-guard.test.ts`.
- 2026-06-04: `npx tsc --noEmit` exited 0.
- 2026-06-04: `npx eslint` exited 0 with existing warnings.
- 2026-06-04: `npx vitest run` exited 0.
- 2026-06-04: `npx playwright test` exited 1 because local Supabase at `127.0.0.1:54321` is unavailable.
- 2026-06-05: Later Story 22.3 evidence records Docker/local Supabase recovery and an exact `npx playwright test` exit `0` after schema/test fixes.
- 2026-06-06: Lead verification confirmed local Supabase containers are running and `npx supabase status` reports the local API at `127.0.0.1:54321`.
- 2026-06-06: Lead verification `npx vitest run` exited `0`.
- 2026-06-06: Lead verification exact `npx playwright test` timed out after 20 minutes with no clean `EXIT:0`, so Story 22.2 remains in progress pending a fresh exact Playwright pass.
- 2026-06-07: Lead verification exact `npx playwright test` completed successfully after 2268.7 seconds with exit `0`; the earlier timeout was a tool timeout shorter than the full serial E2E suite runtime.

### Completion Notes

- Added a shared non-production Supabase guard with Zod schema validation.
- Guard applies to `NODE_ENV=test`, staging/preview, and presentation contexts.
- Guard rejects known production Supabase resource markers while keeping error output non-secret.
- `.env.test` and `docs/testing-setup.md` now point to local/isolated non-production Supabase resources.
- Local Supabase is currently running, and prior Story 22.3 evidence records a later exact Playwright pass after local schema/test fixes.
- Current Lead verification passes: `npx vitest run` exit `0`; exact `npx playwright test` exit `0`.
- Story is done.

## File List

- `.env.test`
- `docs/commercial-readiness/00_index.md`
- `docs/sprint-artifacts/epic-22-sprint-status.yaml`
- `docs/sprint-artifacts/sprint-status.yaml`
- `docs/sprint-artifacts/story-22.2.md`
- `docs/testing-setup.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/task-dev-22.2.txt`
- `src/app/(auth)/login/page.tsx`
- `src/lib/env/non-production-supabase-guard.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server-api.ts`
- `src/lib/supabase/server.ts`
- `tests/e2e/helpers/seed-data.ts`
- `tests/helpers/api-test-helpers.ts`
- `tests/integration/hr-admin-impersonation-export-integration.test.ts`
- `tests/unit/epic-22/story-22.2/non-production-supabase-guard.test.ts`
- `tests/utils/auth-test-helper.ts`

## Change Log

- 2026-06-04: Added Story 22.2 non-production Supabase resource guard, tests, documentation, and environment cleanup. Story remains in progress pending Playwright environment availability.
- 2026-06-06: Verified local Supabase is running and unit gate passes; updated stale blocker because current exact Playwright verification timed out rather than failing on local Supabase connectivity.
- 2026-06-07: Re-ran exact Playwright gate with sufficient timeout, confirmed exit `0`, and moved Story 22.2 to done.
