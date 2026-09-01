---
title: 'Story 22.15: Close Production-Readiness Remediation Gaps'
type: 'chore'
created: '2026-08-31'
status: 'in-progress'
baseline_commit: 'bcb1a0e5bed3d06b9b7582320f491964ffc5a0b9'
review_loop_iteration: 0
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/commercial-readiness/27_supabase_cutover_runbook.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Candidate `bcb1a0e5bed3d06b9b7582320f491964ffc5a0b9` is not checklist-ready: inactive JWTs retain database authorization, user deletion can partially deactivate, historical replay is unsafe, the production audit has 28 advisories (15 high), and evidence is stale.

**Approach:** Use forward-only security changes, atomic deletion, a catalog-proven migration baseline, and three verified dependency batches. Preserve Story 22.14 behavior and finish with local gates plus an owner-gated staging plan.

## Boundaries & Constraints

**Always:** Work from the isolated `origin/staging` branch; create migrations with the Supabase CLI; preserve data, applied SQL, unrelated changes, Swedish copy, Story 22.14 behavior, and redacted evidence. Require direct-role tests, full Vitest/Playwright, type-check, zero-error lint, build, and fresh audit.

**Ask First:** Any hosted migration/history repair, database write, deployment, environment/Auth-setting change, credential action, staging workflow run, merge to `main`, production action, or local long-lived stack start without the required lifecycle wrapper.

**Never:** Start or absorb Epic 23; replay represented historical migrations; wildcard migration repair; run production `db push` before the catalog-proven baseline; expose secrets/production data; blanket-upgrade dependencies to latest majors; alter production or merge staging to main.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Inactive session | Valid unexpired JWT; `public.users.is_active=false` | App/middleware reject it; role-gated RLS/RPC and `user_filters` deny it | Own account metadata and intentional public reads remain the only documented exceptions |
| Delete failure | Target is FK-referenced or final active admin | No deactivation or deletion commits | Return truthful 4xx/5xx; original row state remains |
| Auth cleanup failure | Atomic app-row deletion succeeds; Auth delete fails | No app role or database access remains | Return explicit partial-cleanup status and record a safe owner follow-up |
| Represented hosted schema | History absent/divergent but catalog proof passes | Repair only manifest-approved versions; preserve repayment flags and permission JSON | Any mismatch halts before repair/push |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20251027000000_initial_schema.sql` and `20260614000000_reconcile_environments_security_and_policies.sql` -- current role helper and `user_filters` policies; supersede forward, never edit.
- `supabase/migrations/20250113000000_add_room_assignment_rpc.sql` / `20251122150001_add_room_assignment_rpc.sql` -- restore the original immutable version and retain the ordered redefinition.
- `src/app/api/admin/users/[id]/route.ts`, `src/app/api/auth/login/route.ts`, `middleware.ts` -- invalid sign-out, split deletion, and inactive-route handling.
- `tests/integration/epic-22/story-22.13/direct-database-authorization.test.ts`, `tests/integration/api/admin-users.test.ts`, `tests/helpers/epic-22-supabase-test-environment.ts` -- reusable live authorization, API, and latest-migration evidence.
- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `src/lib/services/email-service.ts` -- dependency batches and SMTP compatibility surface.
- `docs/commercial-readiness/{00_index,11_risk_register_and_open_questions,14_evidence_index,15_dependency_advisory_risk_register,17_blocker_remediation_tracker,26_environment_reconciliation_inventory,27_supabase_cutover_runbook,28_migrations_only_change_policy}.md` -- binding claims and release sequence.

## Tasks & Acceptance

**Execution:**
- [x] Restore the original room-assignment migration; add a manifest, read-only catalog verifier, and tests that classify every version exactly once and prohibit unsafe replay.
- [x] Create one forward migration making `get_user_role()` active-only, active-gating `user_filters`, and providing caller-bound atomic app-user deletion; update middleware/login/admin routes and tests.
- [x] Upgrade in three checkpoints: Next `16.2.12` plus `brace-expansion 1.1.18/2.1.4`, `postcss 8.5.23`, `nanoid 3.3.18`, `@babel/core 7.29.6`; Nodemailer `9.1.0`/types `8.0.1`; then Next/ESLint/analyzer `16.3.3` plus Sharp `0.35.3`. Retain only the time-bounded ExcelJS→UUID moderate risk if confirmed.
- [x] Reconcile commercial-readiness evidence, the new Story 22.15/status surfaces, PR findings, migration counts/deltas, skipped-test requirements, and production-day prerequisites.

**Acceptance Criteria:**
- Inactive users cannot obtain a database role, access role-gated data/RPCs, or CRUD saved filters; active-role behavior remains green.
- Deletion invariant checks and app-row deletion are one transaction; a failed delete cannot change `is_active`.
- The manifest partitions every migration. Expected end state is 63 repository versions; staging is one history repair plus five applies, production is 57 catalog-proven repairs plus six applies, all subject to fresh inventory. Instructions require explicit lists, `--dry-run --skip-vault`, an immutable commit, and backup/go-live gates.
- Fresh `pnpm audit --prod` reports zero critical/high advisories; the sole expected residual is documented ExcelJS→UUID moderate risk with control and review date.
- Story 22.14 focused reminder/PostgREST evidence and the full quality suite pass without real-recipient delivery; all skips identify the missing environment/authorization.
- All readiness/status artifacts agree, PR review blockers are addressed, and Epic 23 remains explicitly on hold.

## Spec Change Log

## Design Notes

Hosted historical SQL is not made idempotent after the fact. The safe model is: prove the material catalog state, repair only the explicit historical allowlist, dry-run the exact forward set, then apply only after the environment-specific owner gate.

## Verification

**Commands:**
- `pnpm type-check && pnpm lint && npx vitest run && pnpm build` -- all exit `0` with lint errors `0`.
- `npx playwright test` -- exit `0`; skipped cases are itemized.
- `REQUIRE_OMC_POSTGREST_EVIDENCE=true npx vitest run tests/integration/epic-22/story-22.14/postgrest-claim-contention.test.ts` -- real local PostgREST evidence passes.
- `pnpm audit --prod --json` -- `0` critical/high; only approved residual is recorded.
- Candidate-wide `git diff origin/staging...HEAD --check` plus migration-manifest/static evidence tests -- clean under the single path-scoped `.gitattributes` exception for the byte-preserved `20250113000000_add_room_assignment_rpc.sql`; all other paths retain normal whitespace enforcement.

**Recorded 2026-09-01:** frozen install, type-check, zero-error lint, Next `16.3.3` production build (with repository public local example values), dependency audit, and the scoped candidate diff gate passed their acceptance thresholds. The restored migration deliberately retains historical trailing whitespace on lines 28, 38, 63, 139, 147, 160, and 197 plus a blank line at EOF; `.gitattributes` exempts only that path and the manifest test pins its SHA-256 to `1e3ec6aa1ec00b768806743ae4cf07500fe1717efc4c399088cca11a459e003a`. The final fresh full `npx vitest run` exited `0` in 68.59s: 308 files passed / 9 skipped (317 total) and 3,289 tests passed / 51 skipped (3,340 total). Obsolete and harness-based skips were remediated; every remaining skip is an explicit managed local service gate: 45 database tests, one Story 22.14 PostgREST test, and five local Next-plus-Supabase export tests. Those services were not started, so none of the 51 is claimed as passing. Full Playwright, remote PR review, hosted owner gates, and the final immutable remediation commit SHA also remain open, so status stays `in-progress`.

## Suggested Review Order

1. [`middleware.ts`](../../middleware.ts#L68) — verify the retryable, non-cacheable 503 response and the uncertain-session branch at [line 257](../../middleware.ts#L257); definitive rejected sessions must still clear cookies and redirect, while ordinary unauthenticated requests must still reach login.
2. [`middleware-active-user.test.ts`](../../tests/unit/epic-22/story-22.15/middleware-active-user.test.ts#L160) — verify the protected-route lookup-error assertions and the explicit `/login` loop regression at [line 260](../../tests/unit/epic-22/story-22.15/middleware-active-user.test.ts#L260).
3. [`story-22.15-production-readiness-remediation.md`](../../docs/sprint-artifacts/story-22.15-production-readiness-remediation.md) and the synchronized readiness evidence — verify that remote and hosted gates remain open, Story 22.15 remains `in-progress`, and Epic 23 remains on hold.
