---
baseline_commit: e0b38150413fd6b6613456c4de3cd1bb8c596db0
---

# Story 22.3: Remediate Dependency Advisories and Create Risk Register

## Status

done

- **Priority:** P0
- **Story Points:** 3
- **Dependencies:** None

## Description

As a commercial reviewer, I want dependency advisories patched or deliberately risk-accepted, so that known software supply-chain risks do not become an immediate diligence blocker.

## Acceptance Criteria

- [x] AC1: The repo's package-manager audit command is run and the output is captured in the readiness evidence.
- [x] AC2: Critical and high severity production dependency advisories are patched where a compatible fix exists.
- [x] AC3: Remaining advisories are documented with package, severity, affected path, reason not fixed, owner, target date, and compensating control.
- [x] AC4: The blocker tracker links to the advisory risk register and reflects current status.
- [x] AC5: Dependency changes do not introduce lint, unit, or e2e regressions.

## Technical Notes

- Avoid broad package churn unless needed for advisory remediation.
- Separate production dependency advisories from dev-only advisories in the risk register.
- Keep dates specific.

## Testing Requirements

**Estimated tests:** 1

- Full suite after dependency updates: `npx vitest run`; run `npx playwright test` if dependency changes affect app runtime or browser behavior.

## Tasks / Subtasks

- [x] Run and capture the current production dependency audit. (AC: 1)
  - [x] Run the repo package-manager audit command.
  - [x] Store the current advisory output in readiness evidence without secrets.
  - [x] Separate production advisories from dev-only advisories.

- [x] Remediate critical/high production advisories where compatible fixes exist. (AC: 2, 5)
  - [x] Patch direct runtime dependencies where available without broad package churn.
  - [x] Re-run production audit after dependency updates.
  - [x] Confirm no critical/high production advisories remain unpatched unless risk-accepted.

- [x] Create or update the advisory risk register. (AC: 3)
  - [x] Document remaining advisories with package, severity, affected path, reason not fixed, owner, target date, and compensating control.
  - [x] Include dev-only advisories separately if any remain.

- [x] Link blocker tracking and evidence surfaces. (AC: 1, 4)
  - [x] Update the blocker tracker to link to the advisory risk register.
  - [x] Update readiness evidence docs to reference the current audit evidence.

- [x] Verify quality gates. (AC: 5)
  - [x] Add or update focused validation for the advisory evidence/register structure.
  - [x] Run `npx vitest run`.
  - [x] Run `npx playwright test`.
  - [x] Run lint/type-check if configured or touched files require it.

### Review Findings

- [x] [Review][Patch] Future Supabase migrations are ignored by default [.gitignore:83]
- [x] [Review][Patch] Readiness docs still describe the fixed export path as stale [docs/commercial-readiness/11_risk_register_and_open_questions.md:11]
- [x] [Review][Patch] Readiness docs disagree on whether `.env.test` points to production or local Supabase [docs/commercial-readiness/14_evidence_index.md:26]
- [x] [Review][Patch] Dev-only advisory register omits individual remaining advisories from `pnpm audit --dev --json` [docs/commercial-readiness/15_dependency_advisory_risk_register.md:37]
- [x] [Review][Patch] Evidence test over-escapes the Postgres URL secret-scan regex [tests/unit/epic-22/story-22.3/dependency-advisory-evidence.test.ts:32]
- [x] [Review][Patch] Evidence test does not assert the no-critical/no-high production audit claim [tests/unit/epic-22/story-22.3/dependency-advisory-evidence.test.ts:27]
- [x] [Review][Patch] `important_dates.is_active` migration skips normalization when the column already exists nullable [supabase/migrations/20260605151000_add_important_dates_is_active.sql:3]
- [x] [Review][Patch] E2E setup now accepts attached-but-hidden employee rows [tests/e2e/epic-13/story-13.2/employee-selection.spec.ts:12]

## Definition of Done

- Critical/high production advisories are fixed or risk-accepted.
- Risk register is current.
- Relevant tests pass.

## Dev Agent Record

### Debug Log

- 2026-06-05: Started Story 22.3 from BMAD DS workflow.
- 2026-06-05: RED focused test failed as expected because dependency audit evidence and advisory register files did not exist.
- 2026-06-05: Initial `pnpm audit --prod` exited `1` with 33 production advisories: 0 critical, 15 high, 14 moderate, 4 low.
- 2026-06-05: Updated `next` from `16.1.6` to `16.2.7`.
- 2026-06-05: Added pnpm overrides for compatible transitive production fixes: `minimatch`, `brace-expansion`, `tmp`, `ws`, and `postcss`.
- 2026-06-05: Final `pnpm audit --prod` exited `1` with 3 residual production advisories: 0 critical, 0 high, 2 moderate, 1 low.
- 2026-06-05: `pnpm audit --dev --json` separated remaining dev-tool advisories from production runtime advisories.
- 2026-06-05: Focused Story 22.3 test passed: `npx vitest run tests/unit/epic-22/story-22.3/dependency-advisory-evidence.test.ts`.
- 2026-06-05: Full unit gate passed: `npx vitest run` exited `0`.
- 2026-06-05: Lint gate passed: `npx eslint` exited `0` with existing warnings.
- 2026-06-05: Type-check initially failed on stale `.next/dev/types` generated before the Next.js upgrade; removed generated `.next/dev/types`, reran `npx next typegen`, then `npx tsc --noEmit` exited `0`.
- 2026-06-05: Docker Desktop Linux engine started successfully; local Supabase is reachable at `127.0.0.1:54321`.
- 2026-06-05: Synced git-ignored `.env.test` Supabase URL, anon key, and service-role key from local Supabase CLI output; JWT-shaped keys validated without recording secret values.
- 2026-06-05: E2E gate still blocked: `npx playwright test` no longer fails on Supabase connectivity, but the rerun exceeded the 15-minute harness timeout before an `EXIT:0`; logs show E2E schema/fixture blockers (`important_dates.is_active` missing, `public.custom_data` missing) and repeated unauthenticated-session warnings.
- 2026-06-05: Added local-schema catch-up migrations for room-assignment employee columns, repayment marker columns, employee column change audit table, and `important_dates.is_active`; applied local migrations with `npx supabase migration up --local --include-all` and reloaded PostgREST schema.
- 2026-06-05: Aligned employee export custom-field handling to the current real-column model instead of querying the removed `public.custom_data` table.
- 2026-06-05: Hardened E2E dashboard row/selection waits that were flaky in long serial Playwright runs while preserving user-facing behavior.
- 2026-06-05: Final gates passed: `npx vitest run` exited `0` (283 files, 3002 tests), `npx eslint` exited `0` (322 existing warnings), `npx tsc --noEmit` exited `0`, and exact `npx playwright test` exited `0` (160 passed, 56 skipped).
- 2026-06-05: Applied all accepted code-review patches: restored future Supabase migration visibility, reconciled readiness evidence wording, expanded dev-only advisory coverage, hardened Story 22.3 evidence assertions, normalized existing `important_dates.is_active` values, and required visible E2E employee rows.
- 2026-06-05: Post-review gates passed: focused Story 22.3 Vitest, full `npx vitest run`, `npx eslint`, `npx tsc --noEmit`, and exact `npx playwright test` all exited `0`.

### Completion Notes

- Critical/high production dependency advisories are remediated; final production audit has 0 critical and 0 high advisories.
- Current production audit output is captured in `docs/commercial-readiness/evidence/dependency-audit-2026-06-05.md`.
- Residual moderate/low production advisories are documented with owner, target date, reason not fixed, and compensating controls in `docs/commercial-readiness/15_dependency_advisory_risk_register.md`.
- Blocker tracker `R-002`, readiness index, security overview, dependency/subprocessor notes, architecture notes, GDPR/security control table, and evidence index now reflect the current advisory state.
- All accepted code-review findings are resolved. Mandatory quality gates produce `EXIT:0`, including the exact unsharded Playwright command.

## File List

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `.gitignore`
- `docs/commercial-readiness/00_index.md`
- `docs/commercial-readiness/01_executive_summary.md`
- `docs/commercial-readiness/03_architecture.md`
- `docs/commercial-readiness/04_feature_capability_matrix.md`
- `docs/commercial-readiness/07_gdpr_and_privacy_overview.md`
- `docs/commercial-readiness/08_security_overview.md`
- `docs/commercial-readiness/09_operations_support_and_sla.md`
- `docs/commercial-readiness/10_dependencies_subprocessors_and_licenses.md`
- `docs/commercial-readiness/11_risk_register_and_open_questions.md`
- `docs/commercial-readiness/14_evidence_index.md`
- `docs/commercial-readiness/15_dependency_advisory_risk_register.md`
- `docs/commercial-readiness/evidence/dependency-audit-2026-06-05.md`
- `docs/sprint-artifacts/story-22.3.md`
- `docs/sprint-artifacts/epic-22-sprint-status.yaml`
- `docs/sprint-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `supabase/migrations/20251122150000_add_room_assignment_employee_columns.sql`
- `supabase/migrations/20251209110000_add_repayment_employee_columns.sql`
- `supabase/migrations/20251209130000_create_employee_column_changes.sql`
- `supabase/migrations/20260605151000_add_important_dates_is_active.sql`
- `src/app/api/employees/export/route.ts`
- `src/lib/types/database.ts`
- `tests/unit/epic-13/story-13.6/api/export-field-selection.test.ts`
- `tests/integration/epic-13/story-13.6/api/export-field-selection-integration.test.ts`
- `tests/e2e/epic-13/story-13.2/employee-selection.spec.ts`
- `tests/e2e/epic-13/story-13.6/export-field-selection.spec.ts`
- `tests/e2e/epic-13/story-13.11/employee-status-visual-indicators.spec.ts`
- `tests/unit/epic-22/story-22.3/dependency-advisory-evidence.test.ts`

## Change Log

- 2026-06-05: Marked Story 22.3 in progress and added AC-linked execution tasks.
- 2026-06-05: Remediated critical/high production dependency advisories, added advisory evidence tests, and updated readiness evidence/risk-register docs; Playwright gate was still pending at that point.
- 2026-06-05: Re-ran Playwright after Docker/Supabase recovery and recorded the then-current local E2E blocker; this was later resolved by schema catch-up migrations and test hardening.
- 2026-06-05: Resolved local schema/fixture blocker, updated export custom-field handling/tests, stabilized long-run E2E waits, passed full quality gates, and moved Story 22.3 to review.
- 2026-06-05: Applied code-review patches, re-ran gates, and moved Story 22.3 to done.
