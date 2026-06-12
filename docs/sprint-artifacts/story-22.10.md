# Story 22.10: Reconcile Supabase Environments and Baseline Migration History

## Status

backlog

- **Priority:** P1
- **Story Points:** 5
- **Dependencies:** `22.8`

## Description

As a technical owner, I want production, staging, and the versioned migrations reconciled into one authoritative schema/policy source with a baselined remote migration history, so that any rebuilt or staged environment reproduces intended production behavior and all future schema changes go through migrations.

Production is the primary source of truth for current behavior (hotfixes were applied there directly), except for intentional Epic 22-era adjustments made in staging that have not yet been promoted to production. The drift inventory must classify each difference instead of assuming one direction.

Source findings (Story 22.8): remote migration history is empty (`R-010` confirmed), hosted RLS policy drift — 26 production policies vs 22 migration-defined (`R-023`), staging/prod `employees` schema drift (`R-020`), and Supabase advisor security warnings (11 `function_search_path_mutable`, 8 security-definer execute grants for `anon`/`authenticated`, leaked-password protection disabled). Evidence: `docs/commercial-readiness/22_supabase_security_evidence_package.md`.

## Acceptance Criteria

- [ ] AC1: A three-way drift inventory (production vs staging vs migrations) exists with each difference classified: adopt into migrations (production hotfixes), forward-port to production (intentional staging/Epic 22 changes), or remove (junk, e.g. staging-only test columns).
- [ ] AC2: Reconciliation migrations encode the intended end state, including policy dedup (drop redundant permissive policies), `search_path` pinning on flagged functions, and reviewed `anon`/`authenticated` EXECUTE grants on SECURITY DEFINER functions.
- [ ] AC3: Remote migration history is baselined (staging first, verified, then production); `supabase migration list --linked` shows local and remote in sync for both projects.
- [ ] AC4: Staging matches the production-intended schema afterward; `R-020` can be closed or narrowed.
- [ ] AC5: Leaked-password protection is enabled in Supabase Auth.
- [ ] AC6: A migrations-only change policy for hosted schema changes is documented, and `R-010`/`R-023` register entries are updated.

## Technical Notes

- Sequence is binding: inventory → reconcile in migrations → baseline staging → verify → baseline production → push reconciliation. Never `db push` against production before the baseline.
- The Story 22.8 drill output provides the production policy inventory; use a fresh staging schema dump for the staging side.
- Production changes require explicit owner approval and a rehearsal on staging; coordinate with the 02:00 UTC nightly job.
- No paid platform features.

## Testing Requirements

**Estimated tests:** 2

- Local stack rebuilt from reconciled migrations passes the Story 22.7 RLS evidence suite.
- Post-reconciliation policy-count/structure verification recorded (staging and production), plus full mandatory gates because migrations change.

## Definition of Done

- Drift inventory, reconciliation migrations, and baselined histories exist and are verified.
- Staging is aligned; risk register and security overview updated.
- Full gates pass (`npx vitest run`, `npx playwright test`, `npx eslint`, `npx tsc --noEmit`).
