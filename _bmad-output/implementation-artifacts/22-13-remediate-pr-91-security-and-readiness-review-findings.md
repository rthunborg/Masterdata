---
baseline_commit: 192d2ecdecfae142e3d2fb200240e6fab2539fa9
---

# Story 22.13: Remediate PR 91 Security and Readiness Review Findings

## Status

done

- **Priority:** P1
- **Story Points:** 5
- **Dependencies:** `22.10`, `22.11`, `22.12`

## Story

As a technical owner preparing the Epic 22 staging-to-main handover,
I want the PR #91 review blockers remediated and the evidence artifacts synchronized,
so that the merge does not ship direct-database authorization bypasses, broken restore evidence, or inconsistent BMAD status records.

## Review Findings Source

This story is created from the BMAD code review of PR #91 plus Codex Review feedback on commits `148403a35a17e9da66dce3be04dc2b89ec6bed61` and `32621fdbc6ca19b2644cfbb725abd2f454ad4902`.

Primary findings to remediate:

1. `update_staffing_need` is a `SECURITY DEFINER` RPC granted to `authenticated` without an internal HR Admin/Crewing role check.
2. `add_custom_column_to_employees` is a `SECURITY DEFINER` DDL RPC callable by authenticated users without an internal HR Admin guard.
3. Authenticated users can update their own full `public.users` row, including privileged fields, through direct Supabase/PostgREST access.
4. `employee_column_changes` is globally readable/insertable by authenticated users, allowing audit disclosure or forged audit rows.
5. Epic 22 database evidence tests still fall back to old local Supabase ports (`54322`/`54321`) instead of the configured high ports (`15422`/`15421`).
6. The nightly staging restore can fail when production-only runtime custom columns such as `employees.seably_*` exist in production but not staging.
7. Story 22.11 status artifacts disagree: the story file says `backlog` while the epic and BMAD trackers say `done`.
8. Story 22.12 references a missing or gitignored `docs/operations/database-restore.md` artifact for AC3.
9. Story 22.10 is marked done despite recorded Playwright evidence showing a non-green e2e gate.

## Acceptance Criteria

### AC1 - Privileged database paths enforce authorization internally

- `public.update_staffing_need(...)` rejects any caller whose `public.get_user_role()` is not `hr_admin` or `crewing`, even when called directly through Supabase RPC.
- The staffing RPC either derives the acting `public.users.id` from `auth.uid()` or rejects a mismatched `p_user_id`; callers cannot spoof another valid user id to satisfy audit fields.
- The staffing RPC keeps a pinned `search_path` suitable for `SECURITY DEFINER` functions.
- `public.add_custom_column_to_employees(...)` is not executable by arbitrary authenticated users. The implementation must either revoke broad execute and use a controlled HR Admin/service-role path, or add an internal HR Admin guard that also works for direct RPC calls.
- Direct Supabase/PostgREST access cannot let a user update privileged fields on their own `public.users` row, including `role`, `is_active`, `email`, and `auth_user_id`. Keep legitimate activity tracking working through column-level grants, a dedicated RPC, or another narrowly scoped path.
- `employee_column_changes` cannot be forged by ordinary authenticated roles and is not globally readable by roles that do not need audit access.

### AC2 - Security tests cover direct database bypasses

- Add or update integration tests proving disallowed roles cannot call the staffing RPC directly and that HR Admin/Crewing can still use the intended path.
- Add or update integration tests proving non-HR Admin roles cannot call the custom-column DDL RPC directly.
- Add or update integration tests proving users cannot self-promote or toggle privileged `public.users` fields through direct table updates.
- Add or update integration tests proving ordinary authenticated roles cannot insert forged `employee_column_changes` rows or read unrelated global audit history.
- Tests must run against the same local Supabase stack configuration used by this repo, not another repo's default stack.

### AC3 - Evidence test configuration uses the current local Supabase ports

- Replace old fallback values for local Supabase database/API URLs (`54322`/`54321`) in Epic 22 evidence tests with the configured high ports from `supabase/config.toml` (`15422`/`15421`) or a shared helper that reads the configured local environment.
- If `.env.test` is absent, the tests must either target this repo's high-port Supabase stack or skip with an explicit diagnostic that names the missing configuration.
- Add or update a focused test or diagnostic assertion so `pnpm test:integration` cannot silently validate a different local Supabase project.

### AC4 - Nightly staging restore handles runtime custom columns

- Update `.github/workflows/supabase-nightly-backup.yml` or its invoked restore logic so staging has production runtime custom columns before replaying production `public.employees` data.
- The restore path must handle runtime custom columns represented by `column_config` and production-only columns such as `employees.seably_*` without failing on staging.
- Update `docs/commercial-readiness/26_environment_reconciliation_inventory.md` so runtime custom columns are documented as restore-compatible operational data, not "no action" for staging.
- Add or update a unit, integration, or workflow-level test that proves production-only runtime custom columns are included or synced before staging data replay.

### AC5 - Story and evidence artifacts are synchronized

- Fix Story 22.11 status inconsistency by making `docs/sprint-artifacts/story-22.11.md`, `docs/sprint-artifacts/epic-22-sprint-status.yaml`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, and any matching BMAD story artifact agree on the same status and completion evidence.
- Resolve Story 22.12 AC3 by moving the restore decision into a tracked sanitized document or an existing tracked readiness document, then updating every reference to the missing/gitignored `docs/operations/database-restore.md`.
- Resolve Story 22.10's Playwright gate contradiction by either rerunning `npx playwright test` to `EXIT:0` and recording the evidence, or recording an explicit owner-approved waiver in every mandatory status surface. Do not leave a silent "done" status with failing e2e evidence.

### AC6 - Gate and documentation requirements are complete

- Update the relevant commercial readiness, security evidence, and sprint/BMAD artifacts with the final remediation evidence.
- No production database mutation, production secret change, Docker Desktop/global daemon change, or global network/volume change is in scope for this story.
- Every database change must be delivered through migrations or checked-in workflow/scripts. No manual-only database fix is acceptable as the final remediation.
- The story cannot move to `done` until the required status surfaces listed in `AGENTS.md` are synchronized and explicitly re-read.

## Tasks / Subtasks

- [x] Harden privileged database functions and grants.
  - [x] Add internal role checks and caller verification to `update_staffing_need`.
  - [x] Restrict or internally guard `add_custom_column_to_employees`.
  - [x] Restrict direct `public.users` self-update behavior to non-privileged activity fields only.
  - [x] Restrict `employee_column_changes` writes and reads to intended actors.
- [x] Add direct-database security regression tests for the four authorization issues.
- [x] Centralize or correct Epic 22 evidence test environment fallbacks to the repo's high-port Supabase stack.
- [x] Make the nightly staging restore schema-compatible with production runtime custom columns.
- [x] Update readiness/security documentation for the restore and authorization behavior.
- [x] Synchronize Story 22.10, 22.11, and 22.12 evidence/status artifacts as required by the project rules.
- [x] Run and record the required gates.

### Review Findings

**Round 1 of 3**

- [x] [Review][Patch] Fail closed when a migration-owned employee column is missing instead of recreating it as a bare mapped type [.github/backup/sync-runtime-employee-columns.sql:20]
- [x] [Review][Patch] Recheck external column-edit permission atomically before the service-role metadata update [src/lib/server/repositories/column-config-repository.ts:234]
- [x] [Review][Patch] Remove leaked-password protection from the Epic 22 production cutover gate because it was moved to Epic 23 [docs/sprint-artifacts/sprint-status.yaml:56]
- [x] [Review][Patch] Correct the reconciliation inventory claim that non-HR column-creation requests are coerced instead of rejected [docs/commercial-readiness/26_environment_reconciliation_inventory.md:44]
- [x] [Review][Patch] Make last-active-HR-admin validation and deactivation atomic [src/app/api/admin/users/[id]/route.ts:80]
- [x] [Review][Patch] Prevent same-day backup reruns from publishing mixed-snapshot artifacts under one date prefix [scripts/supabase-backup-storage.mjs:44]
- [x] [Review][Patch] Validate backup integrity before selecting the oldest compatible archive [.github/backup/backup-selection.mjs:7]
- [x] [Review][Patch] Surface activity-RPC failures without making login depend on activity tracking [src/lib/server/repositories/user-repository.ts:98]

**Round 2 of 3**

- [x] [Review][Patch] Serialize HR-admin deletion with the same last-active-admin lock and invariant [src/app/api/admin/users/[id]/route.ts:167]
- [x] [Review][Patch] Bound backup verification memory while preserving all-or-nothing publication to the restore directory [scripts/supabase-backup-storage.mjs:179]
- [x] [Review][Patch] Recreate the standard index when synchronizing a missing runtime employee column [.github/backup/sync-runtime-employee-columns.sql:123]
- [x] [Review][Patch] Remove date-wide E2E SSN cleanup patterns and scope cleanup to generated fixture names [tests/e2e/helpers/seed-data.ts:76]
- [x] [Review][Patch] Remove unresolved non-boolean pnpm allowBuilds placeholders [pnpm-workspace.yaml:1]
- [x] [Review][Patch] Map status-RPC authorization failures without misreporting every 42501 as final-admin protection [src/app/api/admin/users/[id]/route.ts:102]
- [x] [Review][Patch] Validate backup date and run identifiers before uploading immutable objects [scripts/supabase-backup-storage.mjs:36]
- [x] [Review][Patch] Reject zero-byte required backup artifacts during manifest creation and compatibility selection [.github/backup/backup-selection.mjs:23]
- [x] [Review][Patch] Add live PostgreSQL concurrency coverage for the atomic last-admin invariant [tests/unit/epic-22/story-22.13/privileged-path-callers.test.ts:43]
- [x] [Review][Patch] Fail closed before restore when production and staging database targets are identical [.github/workflows/supabase-nightly-backup.yml:128]
- [x] [Review][Patch] Keep roles.sql genuinely best-effort when its optional object is missing or corrupt [scripts/supabase-backup-storage.mjs:180]
- [x] [Review][Patch] Make inline-edit E2E employee seeds unique across Playwright retries [tests/e2e/inline-edit.spec.ts:91]
- [x] [Review][Patch] Bound nonessential activity-RPC latency so login cannot hang on tracking [src/app/api/auth/login/route.ts:94]
- [x] [Review][Patch] Behaviorally test corrupt-oldest backup fallback to the next valid manifest [tests/unit/epic-22/story-22.13/nightly-runtime-column-restore.test.ts:159]
- [x] [Review][Patch] Remove leaked-password enablement from remaining binding Story 22.10 Phase A/B text [_bmad-output/implementation-artifacts/22-10-reconcile-supabase-environments-and-baseline-migration-history.md:23]
- [x] [Review][Patch] Update role/readiness guidance to reflect the scoped employee-column audit policy [docs/commercial-readiness/05_user_roles_and_permissions.md:46]
- [x] [Review][Defer] Replace the invalid pre-existing auth.admin.signOut(auth_user_id) session-revocation call with a platform-compatible offboarding design [src/app/api/admin/users/[id]/route.ts:129] — deferred, pre-existing

**Round 3 of 3 — final automatic review round**

- [x] [Review][Patch] Preserve permitted custom-column values at their physical top-level keys so external-role filtering and TanStack sorting remain functional [src/lib/server/employee-field-access.ts:75]
- [x] [Review][Patch] Prevent raw employee Realtime rows from entering external-party browser state; external roles must refresh through the filtered employee API instead [src/lib/hooks/use-employees.ts:180]
- [x] [Review][Patch] Apply legacy field aliases only to masterdata columns and always read custom columns by their physical `db_column_name` [src/lib/server/employee-field-access.ts:71]

## Dev Notes

- Relevant migrations and policies:
  - `supabase/migrations/20251102000002_allow_user_activity_update.sql`
  - `supabase/migrations/20251107000001_add_custom_column_function.sql`
  - `supabase/migrations/20260314000001_add_update_staffing_need_rpc.sql`
  - `supabase/migrations/20260614000000_reconcile_environments_security_and_policies.sql`
- Relevant evidence and integration tests:
  - `tests/integration/epic-22/story-22.10/reconciliation-evidence.test.ts`
  - `tests/integration/epic-22/story-22.7/supabase-rls-evidence.test.ts`
  - `tests/integration/epic-22/column-config-checklist-column.test.ts`
- Relevant workflow and docs:
  - `.github/workflows/supabase-nightly-backup.yml`
  - `docs/commercial-readiness/26_environment_reconciliation_inventory.md`
  - `docs/sprint-artifacts/story-22.10.md`
  - `docs/sprint-artifacts/story-22.11.md`
  - `docs/sprint-artifacts/story-22.12.md`
- Prefer least-privilege database grants. For `SECURITY DEFINER` functions, keep `search_path` pinned and perform authorization checks inside the function body because RLS does not protect direct execution of broadly granted definer functions.
- For `public.users` activity tracking, prefer a narrow column-level privilege or a dedicated function over whole-row self-update permissions.

### Project Structure Notes

- Database authorization fixes belong in Supabase migrations under `supabase/migrations/`; do not rely on manual dashboard changes.
- Application-facing authorization changes, if needed, belong under `src/app/api/` for route handlers or `src/lib/` for shared logic.
- Evidence/security regression tests for this story should stay under `tests/integration/epic-22/` unless an existing unit-test pattern is a better fit for pure helpers.
- Workflow changes belong in `.github/workflows/supabase-nightly-backup.yml` or checked-in scripts referenced by that workflow.
- Documentation updates belong in tracked `docs/commercial-readiness/` or `docs/sprint-artifacts/` files. Do not make a gitignored operator-only document the sole source for an acceptance-criteria decision.

### References

- PR #91 review target: `rthunborg/Masterdata#91`, reviewed commit `148403a35a17e9da66dce3be04dc2b89ec6bed61`.
- Active Epic 22 tracker: `docs/sprint-artifacts/epic-22-sprint-status.yaml`.
- BMAD development tracker: `_bmad-output/implementation-artifacts/sprint-status.yaml`.
- Existing restoration/readiness docs: `docs/commercial-readiness/26_environment_reconciliation_inventory.md`, `docs/commercial-readiness/14_evidence_index.md`, and `docs/commercial-readiness/17_blocker_remediation_tracker.md`.

## Required Test Directive

You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0.

Minimum story-specific gates:

- `npx vitest run`
- `pnpm test:integration` or the exact checked-in integration command used for Epic 22 evidence tests
- `npx playwright test`
- `npx eslint` if configured
- `npx tsc --noEmit` if configured

If any gate is environment-blocked or owner-waived, record the same waiver and evidence in every mandatory story/status artifact.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Amelia dev-agent persona)

### Debug Log References

- Baseline commit: `192d2ecdecfae142e3d2fb200240e6fab2539fa9`.
- Project-local WSL mirror: `/home/rasmus/repos/hr-masterdata`; `supabase db reset` applied all 59 migrations through `20260709194903` on the `15421`/`15422` stack with exit `0`.
- Focused Story 22.13 live/static/API/restore command: 9 files, 64/64 passed.
- Full `npx vitest run`: 301 files passed, 2 skipped; 3,118 tests passed, 30 skipped; exit `0`.
- Full `npx playwright test`: 162 passed, 53 skipped; exit `0` (22.1 minutes).
- `npx tsc --noEmit`: exit `0`.
- `npm run lint`: exit `0`, 0 errors (315 pre-existing warnings).
- Adversarial database review and restore review both passed after in-review fixes; `git diff --check` passed.
- Review-remediation clean reset: `/home/rasmus/repos/hr-masterdata` applied all 61 migrations through `20260710150000` on the project-scoped `15421`/`15422` stack; exit `0`.
- Review-remediation focused live/static/API/restore batch: 12 files, 94/94 passed.
- Final full `npx vitest run`: 3,125 passed, 30 skipped, 0 failed; exit `0`.
- Final full `npx playwright test`: 162 passed, 53 skipped, 0 failed, 0 flaky; exit `0` (21.9 minutes).
- Final `npx tsc --noEmit`: exit `0`; final `npm run lint`: exit `0`, 0 errors (315 pre-existing warnings).
- Round 2 final verification (2026-07-12): clean reset through all 61 migrations; focused Story 22.13 batch 65/65; full `npx vitest run` EXIT:0 (3,135 passed/30 skipped); full `npx playwright test` EXIT:0 (161 passed/53 skipped/1 unrelated flaky retry), followed by the recorded flaky test passing 1/1 in isolation; `npx tsc --noEmit` and full `npx eslint .` EXIT:0.
- Round 3 final verification (2026-07-13): clean reset through all 61 migrations; review-specific regression batch 14/14 and compatibility batch 64/64 passed; full `npx vitest run`, `npx tsc --noEmit`, and full `npx eslint .` exited 0; full `npx playwright test` passed 162/162 with 53 skipped, 0 failed, and 0 flaky on the clean stack.
- Two intermediate full Playwright runs exposed shared SSN namespace collisions in the pre-existing inline-edit and Story 20.7 fixtures. Dedicated namespaces, explicit cleanup, and an empty-dashboard-safe Story 20.7 setup removed the cross-spec dependency; both focused files and the final full suite are green.

### Completion Notes List

- Added migration `20260709194903` with caller-bound staffing authorization, active-HR-only column lifecycle, service-only atomic custom-column creation, a narrow activity RPC, and scoped audit grants/policies.
- Revoked the legacy raw DDL and external column lifecycle paths, retained only field-limited presentation edits for assigned custom columns, and removed external create/delete controls from the dashboard.
- Centralized Epic 22 database evidence on the fingerprinted project high-port stack and added direct-role tests for allowed, denied, spoofed, inactive, collision, rollback, audit, and user-field paths.
- Made the runtime `column_config` + `employees` archive required and replayed config, validated schema synchronization, and employee data in one transaction; documented cascade, legacy-orphan, and snapshot-consistency caveats.
- Synchronized Story 22.11/22.12 evidence and resolved Story 22.10's historical Playwright contradiction with a fresh full-suite exit `0`.
- Updated commercial-readiness security, risk, cutover, restore, field/API matrix, and evidence artifacts. No production database, hosted secrets, global Docker settings, networks, or volumes were changed. Hosted staging apply/re-verification remains an owner-controlled release gate, not an implementation blocker.
- Adversarial code review on 2026-07-10 produced 0 decision-needed, 4 patch, 4 initially deferred, and 7 dismissed findings. The owner promoted all four deferred items into Story 22.13, leaving eight required patch tasks; at that checkpoint the story moved to `in-progress` pending the remediation recorded below.
- Resolved all eight promoted review findings: migration-owned restore columns now fail closed; external presentation edits and HR-admin status transitions recheck authorization atomically in caller-bound RPCs; backup runs are immutable, manifest-last, checksum-verified, and corrupt candidates are skipped; activity persistence failures return a non-success response while login remains independent; stale cutover and reconciliation wording is corrected.
- Added migrations `20260710144000` and `20260710150000`, refreshed the local database fingerprint to the latest migration, rebuilt the high-port stack from scratch, and retained the intended 17-policy catalog.
- Hardened the mandatory E2E gate by isolating inline-edit and Story 20.7 SSN namespaces and making Story 20.7 independently runnable from an empty employee table.
- The first review patch cycle completed all eight owner-promoted findings and returned Story 22.13 to `review`; Round 2 then produced and closed the sixteen additional patch findings recorded above. Hosted staging apply/re-verification remains a release gate, not local completion evidence.
- Round 2 closed all sixteen patch findings on 2026-07-12. The clean 61-migration reset and live concurrency proof passed; focused Story 22.13 verification passed 65/65; full Vitest exited 0 (3,135 passed, 30 skipped); full Playwright exited 0 (161 passed, 53 skipped, 1 unrelated flaky retry), and the recorded flaky export-selection test then passed 1/1 in isolation; typecheck and full lint exited 0. The single pre-existing session-revocation design item remains explicitly deferred outside this story.
- Round 3 closed all three final automatic-review findings on 2026-07-13. External clients retain permitted custom values at their physical top-level keys for filtering/sorting, custom fields never traverse masterdata aliases, and raw employee Realtime rows are disabled for external or unresolved roles. External dashboards instead refresh through the filtered employee API on focus and every 30 seconds. Six regression tests cover these paths, and all focused/full gates passed. Any further PR findings require human triage under the three-round review guard.

### File List

- `.github/workflows/supabase-nightly-backup.yml`
- `.github/backup/backup-selection.mjs`
- `.github/backup/sync-runtime-employee-columns.sql`
- `scripts/supabase-backup-storage.mjs`
- `scripts/notify-backup-failure.mjs`
- `supabase/migrations/20260709194903_remediate_pr_91_security_findings.sql`
- `supabase/migrations/20260710144000_atomic_external_column_presentation.sql`
- `supabase/migrations/20260710150000_atomic_user_status_transition.sql`
- `supabase/seed.sql`
- `middleware.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/admin/users/[id]/update-activity/route.ts`
- `src/app/api/columns/route.ts`
- `src/app/api/columns/[id]/route.ts`
- `src/app/dashboard/page.tsx`
- `src/components/dashboard/manage-columns-dropdown.tsx`
- `src/lib/server/repositories/column-config-repository.ts`
- `src/lib/server/repositories/user-repository.ts`
- `src/lib/services/column-service.ts`
- `src/lib/hooks/use-employees.ts`
- `src/lib/server/employee-field-access.ts`
- `playwright.config.ts`
- `tests/helpers/epic-22-supabase-test-environment.ts`
- `tests/unit/epic-22/story-22.13/*`
- `tests/unit/hooks/use-employees.test.ts`
- `tests/unit/epic-22/story-22.7/role-field-permissions.test.ts`
- `tests/integration/epic-22/story-22.13/*`
- `tests/integration/api/columns-create.test.ts`
- `tests/integration/api/columns.test.ts`
- `tests/integration/api/admin-users.test.ts`
- `tests/integration/api/user-activity.test.ts`
- `tests/integration/api/auth-login.test.ts`
- `tests/integration/epic-22/story-22.13/atomic-user-status-transition.test.ts`
- `tests/e2e/delete-column.spec.ts`
- `tests/e2e/global-setup.ts`
- `tests/e2e/inline-edit.spec.ts`
- `tests/e2e/helpers/seed-data.ts`
- `tests/e2e/epic-20/story-20.7/export-with-filters.spec.ts`
- `tests/unit/components/manage-columns-dropdown.test.tsx`
- `tests/integration/external-party-dashboard.test.tsx`
- `tests/unit/repositories/column-config-repository.test.ts`
- `tests/unit/repositories/user-repository.test.ts`
- `tests/unit/github-branch-protection-config.test.ts`
- `tests/unit/utils/deadline-validator.test.ts`
- `tests/integration/epic-22/story-22.10/reconciliation-evidence.test.ts`
- `tests/integration/epic-22/story-22.7/supabase-rls-evidence.test.ts`
- `tests/integration/epic-22/column-config-checklist-column.test.ts`
- `docs/commercial-readiness/00_index.md`, `02_system_overview.md`, `04_feature_capability_matrix.md`, `05_user_roles_and_permissions.md`, `06_data_inventory_and_data_flows.md`, `08_security_overview.md`, `09_operations_support_and_sla.md`, `11_risk_register_and_open_questions.md`, `14_evidence_index.md`, `17_blocker_remediation_tracker.md`, `19_api_auth_matrix.md`, `20_field_access_matrix.md`, `21_role_export_rls_test_evidence.md`, `22_supabase_security_evidence_package.md`, `26_environment_reconciliation_inventory.md`, `27_supabase_cutover_runbook.md`, `evidence/backup-failure-alerting-2026-06-16.md`
- Story/sprint/BMAD status and evidence artifacts for Stories 22.10–22.13.

## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-07-09 | 0.1 | Created follow-up remediation story from PR #91 review findings | Codex |
| 2026-07-09 | 1.0 | Implemented authorization, restore, evidence, UI, and test remediations; all mandatory gates passed; moved to review | Amelia (Codex) |
| 2026-07-10 | 1.1 | Adversarial review recorded four unresolved patch action items and four deferred pre-existing risks; moved to in-progress | Codex |
| 2026-07-10 | 1.2 | Owner promoted all four deferred findings into Story 22.13; eight patch tasks are now required before re-review | Codex |
| 2026-07-10 | 1.3 | Resolved all eight review findings, hardened E2E test isolation, rebuilt the 61-migration local stack, passed focused and full gates, and moved back to review | Amelia (Codex) |
| 2026-07-12 | 1.4 | Closed all sixteen Round 2 patch findings, passed clean reset/live concurrency/focused/full gates, retained one pre-existing deferred design item, and moved Story 22.13 to done | Codex |
| 2026-07-13 | 1.5 | Reopened Story 22.13 for the final automatic review round after three current Codex Review findings on PR #91 commit 32621fd | Codex |
| 2026-07-13 | 1.6 | Closed all three Round 3 findings, added six regression tests, passed clean-stack focused/full gates, and returned Story 22.13 to done | Codex |
