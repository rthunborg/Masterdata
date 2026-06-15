# Story 22.10: Reconcile Supabase Environments and Baseline Migration History

## Status

done

> **2026-06-14 (dev):** Phase A complete and verified. Authoring + local verification done (inventory, migration-ordering fix, reconciliation migration `20260614000000`, local `seed.sql` parity, docs, runbooks, tests; full local gates green). **Staging reconciliation executed + verified** on `masterdata-staging` via the Supabase MCP: migration applied, remote history baselined (57 in sync), advisors re-verified (function_search_path 12→0, security-definer anon 5→1/auth 5→3, auth_rls_initplan 9→0, multiple_permissive 54→3, policies 26→19); production untouched (freeze honored). **AC5 (leaked-password protection) + CAPTCHA MOVED to Epic 23 (Story 23.4)** by owner decision 2026-06-14 — Auth/dashboard enterprise hardening, not this schema-reconciliation story. All remaining ACs (AC1–AC4, AC6) met → **status: review**. **Phase B** (production cutover) is deferred to the Epic 22 → production merge (`docs/commercial-readiness/27_supabase_cutover_runbook.md` §B).

> SM created the full implementation story context on 2026-06-13: `_bmad-output/implementation-artifacts/22-10-reconcile-supabase-environments-and-baseline-migration-history.md`. Use that file for implementation (binding reconcile→baseline sequence, concrete remediation targets, full-gates testing). This stub is the canonical planning artifact.

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
- [x] AC5: Leaked-password protection — **MOVED to Epic 23 (Story 23.4 AC6)** on 2026-06-14 (Auth/dashboard setting + CAPTCHA; enterprise hardening, not this schema-reconciliation story). Not a Story 22.10 requirement.
- [ ] AC6: A migrations-only change policy for hosted schema changes is documented, and `R-010`/`R-023` register entries are updated.

## Technical Notes

- **Production-change freeze (owner directive, 2026-06-13):** do NOT modify production during this story. Production changes happen only after all of Epic 22 is merged to staging, the owner verifies staging, and the change is merged to production. Phase A (this story) does inventory + author migrations + baseline/apply/verify on STAGING + staging leaked-password + docs + the production cutover runbook. Phase B (production history baseline, production apply, production leaked-password, production verification, R-010/R-023/R-020 closure) is deferred to the Epic 22 production cutover. Phase A completes the story.
- Sequence is binding (per environment): inventory → reconcile in migrations → baseline staging → verify staging → [Phase B, later] baseline production → push. Never `db push` against production before the baseline — and during this story, never `db push` to production at all (Phase B only).
- The Story 22.8 drill output provides the production policy inventory (read-only); use a fresh staging schema dump for the staging side. Read-only production inventory is allowed; the 22.8 snapshot is an acceptable fallback.
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

## Review Findings

**Round 1 of 3** — adversarial code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor), 2026-06-14. Scope: full uncommitted working tree (Story 22.10 + Story 22.9, per reviewer request). Triage: 0 decision-needed, 6 patch, 5 deferred, 4 dismissed. Story 22.9 audited clean (AC1–AC5 pass). Highest-risk artifact (the reconciliation SQL migration) verified: search_path pinning, SECURITY DEFINER grant changes (per-caller), and policy rewrites are correct; production-change freeze, binding sequence, and 5-file status sync all PASS.

**Round 1 resolution (2026-06-14):** All 6 patch findings fixed in this review turn (checked below); 5 deferred items logged to `_bmad-output/implementation-artifacts/deferred-work.md`. `.mcp.json` is now gitignored and all hosted project refs/regions are redacted to placeholders in committed files (hygiene sweep clean). The reconciliation evidence suite is now **11/11** (added a canonical-policy-set assertion that catches policy drops/extras, patch 6) and re-verified green.

**Gate verification (2026-06-15):** Lead-agent full-gate run — `npx vitest run` **3057 passed / 0 failed**, `pnpm test:integration` **780 passed / 0 failed** (reconciliation 11/11, RLS evidence 8/8), `npx tsc --noEmit` **0 errors**, `npx eslint` **0 errors** (321 pre-existing warnings). The Playwright e2e suite could **not** complete cleanly in this session due to local-stack / dev-server degradation (the `next dev --webpack` server crashed ~3/4 through a ~50-min run, and the employee seed stopped repopulating on subsequent fresh runs). Every e2e spec passed at least once across runs (full run **162/216 green** incl. `field-highlighting`; targeted batch green incl. `room-assignment`, `inline-edit`, `saved-filters`, `export-with-filters`, `termination-reactivation`); all failures were "no employee data rendered" timeouts — **not assertion regressions** — and this review changed no application/e2e/migration code. The dev's prior full e2e run on this branch was green (160 passed / 55 skipped / 1 known `delete-column` flake). On that basis the owner directed status → **done** (2026-06-15). Phase B production cutover remains the Epic 22 completion gate (E-010).

### Patch (action items)

- [x] [Review][Patch] `.mcp.json` is committed (not gitignored) and exposes the staging project ref — add it to `.gitignore`; it is local Claude Code MCP config, not a story deliverable [.mcp.json:5]
- [x] [Review][Patch] Staging project ref + regions written into committed evidence/status docs (Task 9 hygiene violation; dev's scan claimed only a `<STAGING_REF>` placeholder) — redact to placeholders [docs/commercial-readiness/27_supabase_cutover_runbook.md:32, docs/sprint-artifacts/epic-22-sprint-status.yaml:176, _bmad-output/implementation-artifacts/22-10-reconcile-supabase-environments-and-baseline-migration-history.md:229]
- [x] [Review][Patch] Reconciliation test-count published as "8/8" but the suite had 10 tests — corrected to 11/11 after adding the canonical-policy-set assertion (patch 6) [docs/commercial-readiness/14_evidence_index.md:67, docs/commercial-readiness/26_environment_reconciliation_inventory.md:119]
- [x] [Review][Patch] Risk register still credits Story 22.10 with "leaked-password enablement" after AC5 was moved to Epic 23 (Story 23.4) — remove the overclaim [docs/commercial-readiness/11_risk_register_and_open_questions.md:38]
- [x] [Review][Patch] Doc figure nits — inventory "56 files" should be 57; runbook CLI comment "secdef anon 4->1 / authenticated 4->3" should be "5->1 / 5->3" (matching the verified §A result); evidence-index header date 2026-06-13 should be 2026-06-14 [docs/commercial-readiness/26_environment_reconciliation_inventory.md:15, docs/commercial-readiness/27_supabase_cutover_runbook.md:69, docs/commercial-readiness/14_evidence_index.md:4]
- [x] [Review][Patch] Reconciliation evidence test does not assert the intended per-table policy set / total count, so a regression that drops or over-creates policies on most tables (e.g. a user_filters lockout) would still pass — add canonical policy-set assertions [tests/integration/epic-22/story-22.10/reconciliation-evidence.test.ts]

### Deferred (real, non-blocking / pre-existing — verify at production cutover)

- [x] [Review][Defer] Reconciliation drop-and-recreate excludes the 4 party-data tables (sodexo_data/omc_data/payroll_data/toplux_data); the name-agnostic drop will not reach any dashboard-era policy drift on them [supabase/migrations/20260614000000_reconcile_environments_security_and_policies.sql:153] — deferred, pre-existing; R-023 scope was the 8 managed tables and staging verified clean; Phase B runbook should verify party-data policy parity on production
- [x] [Review][Defer] `staffing_needs` has no INSERT/DELETE RLS policy (writes go through the SECURITY DEFINER `update_staffing_need` RPC) [supabase/migrations/20260614000000_reconcile_environments_security_and_policies.sql:201] — deferred, preserves prior hosted behavior; e2e green; confirm no authenticated-client INSERT/DELETE path
- [x] [Review][Defer] `supabase/seed.sql` grants `anon` broader table DML than hosted defaults, so the local RLS suite runs a more permissive grant posture than hosted (grant-level regressions won't be caught locally) [supabase/seed.sql] — deferred, local-only, RLS still the boundary
- [x] [Review][Defer] `update_user_filters_updated_at()` / `track_employee_column_changes()` search_path pins + grant revokes are guarded by `to_regprocedure`, silently no-op on hosted signature drift, and are untested on hosted [supabase/migrations/20260614000000_reconcile_environments_security_and_policies.sql:47,57] — deferred, guard is correct; verify advisors clear at production cutover
- [x] [Review][Defer] `important_dates.deadline_submit/deadline_cancel` adopted as `text` with no format CHECK [supabase/migrations/20260614000000_reconcile_environments_security_and_policies.sql:131] — deferred, matches the existing `date_value text` convention; consider DB-level validation later

### Dismissed (4)

- `column_config` "removes the `is_masterdata = true` guard so HR can delete masterdata columns" (Edge) — false positive: HR Admin could already RLS-manage masterdata columns under the prior `USING (is_masterdata = true)` policy; the change only **adds** custom-column management (the intended R-023 fix), and the app layer still restricts masterdata deletion.
- `search_path` pinned to `public, pg_temp` rather than `''` (Blind) — safe: `public` stays on the path so bare object references resolve; matches the repo's existing convention (20260607193000).
- Non-transactional-applier total-lockout window (Blind) — the migration is wrapped in `BEGIN/COMMIT` and was applied atomically via `apply_migration`; only a latent risk for a non-transactional applier, which is not used.
- "Everyone can read" `important_dates`/`column_config` `USING (true)` exposes rows to `anon` (Blind/Edge) — intentional, pre-existing role-unscoped public read, explicitly documented in the migration.
