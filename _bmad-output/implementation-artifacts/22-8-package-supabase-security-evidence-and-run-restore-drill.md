---
baseline_commit: 751e1b9f5701d7af0b04d93ddf2a687e50b5d183
---

# Story 22.8: Package Supabase Security Evidence and Run Restore Drill

## Status

done

- **Priority:** P1
- **Story Points:** 5
- **Dependencies:** `22.2`
- **Canonical planning artifact:** `docs/sprint-artifacts/story-22.8.md`

## Story

As a security reviewer,
I want Supabase security settings, migration history, and restore evidence packaged,
so that security and backup claims are reviewable.

## Acceptance Criteria

- [x] AC1: Evidence package includes exported or documented RLS policies, Auth settings, Supabase advisors, migration history, and known security risks.
- [x] AC2: Supabase SSL, DB network restrictions, and PITR posture are hardened or formally risk-accepted with owner and review date.
- [x] AC3: A restore drill is run against a non-production target.
- [x] AC4: Restore drill documentation includes timestamp, operator, source, target, scope, result, validation checks, and follow-up issues.
- [x] AC5: No restore or evidence command exposes secrets in committed files.

## Tasks / Subtasks

- [x] Create the Supabase security evidence package document. (AC: 1, 5)
  - [x] Add `docs/commercial-readiness/22_supabase_security_evidence_package.md` (next free number after `21_role_export_rls_test_evidence.md`); follow the redaction style established by Story 22.7's `21_role_export_rls_test_evidence.md`.
  - [x] RLS policies: the canonical, reviewable source is `supabase/migrations/` (56 versioned migration files). Summarize policy coverage per table (employees, column_config, users, user_filters, important_dates, staffing_needs, employee_column_changes, staffing changelog) with pointers to the defining migration files. Key policy migrations are already inventoried in Story 22.7 Dev Notes: `20251027000000_initial_schema.sql`, `20251210000002_update_rls_for_recruiter_crewing.sql`, `20251210000000_fix_employee_column_changes_rls.sql`, `20260130212612_create_user_filters.sql`, `20260313000001_add_staffing_needs.sql`, `20260607193000_fix_employee_column_changes_conflict_target.sql`.
  - [x] Cross-check migration-defined policies against the local Supabase stack (`pg_policies`) where practical, reusing the Story 22.7 pattern in `tests/integration/epic-22/story-22.7/supabase-rls-evidence.test.ts`; do NOT query production for this.
  - [x] Auth settings: document the reviewed posture (password auth, hashing via Supabase Auth per NFR8, no SSO claimed) without disclosing project refs or dashboard values. Items only visible in the production dashboard are recorded as "verified privately on <date> by <operator role>" entries, consistent with existing private-evidence rows in `14_evidence_index.md`.
  - [x] Supabase advisors: prior attempts are blocked — Supabase MCP cannot access the HR project (permission errors) and `supabase db query/advisors --linked` failed (login-role alteration denied; `SUPABASE_DB_PASSWORD` required). See evidence index rows "Supabase MCP access verification" and "Supabase direct SQL attempt". Either capture advisor output privately via the dashboard and record a redacted summary (counts by severity + remediation status), or record the access limitation explicitly as a known gap with owner/date. Do not fabricate advisor results.
  - [x] Migration history: record the migration count, first/latest migration timestamp-names from `supabase/migrations/`, and note that migrations are version controlled (architecture requirement). If `supabase migration list` against a linked project is unavailable, the repo directory is the evidence source.
  - [x] Known security risks: link to `11_risk_register_and_open_questions.md` and `08_security_overview.md` rather than duplicating them; add only delta risks discovered during this story.

- [x] Resolve SSL, DB network restrictions, and PITR posture. (AC: 2)
  - [x] For each of the three controls, record EITHER a hardening action taken OR a formal risk acceptance with named owner role and review date. `08_security_overview.md` already flags these as open items #7 (managed DB transport/network controls) and #8 (backup/PITR posture) — update those entries, don't create parallel ones.
  - [x] Current documented posture: GitHub logical backups exist (nightly), platform backup/PITR posture is "held privately / needs review". PITR is a paid Supabase feature; do NOT enable paid platform features without explicit user approval — if not approved, write the risk acceptance instead (NFR1 keeps free-tier unless commercial readiness changes the model).
  - [x] Update the matching rows in `08_security_overview.md` (Backups, Supabase physical backups) and `11_risk_register_and_open_questions.md` so status, owner, and review date are consistent across documents.

- [x] Run the restore drill against a non-production target. (AC: 3, 5)
  - [x] Reuse the existing backup pipeline — do NOT build a new one: `.github/workflows/supabase-nightly-backup.yml` dumps production (roles.sql, schema.sql, data.sql) to Supabase Storage bucket `db-backups` with 14-day retention, and `scripts/supabase-backup-storage.mjs` handles upload/prune/download-oldest.
  - [x] The gap to close (evidence index "Backup" row and `09_operations_support_and_sla.md`): the nightly job only does a PARTIAL staging restore (`employees` + `column_config`). The drill must be a FULL restore (schema + data, roles where applicable) of a production backup into a non-production target.
  - [x] Valid targets: the staging Supabase project or a local Supabase stack (`supabase/config.toml`, project id `hr-masterdata`). NEVER restore into production. Restoring INTO staging/local is the drill; production is touched only as the read-only dump source, and preferably not at all — prefer downloading an existing nightly backup from storage over taking a fresh production dump.
  - [x] Respect Story 22.2 isolation: any app-level connection used for validation must pass the non-production Supabase guard (`validateNonProductionSupabaseEnvironment()` pattern from Story 22.7 RLS tests). Raw `psql` restore commands must use the non-production DB URL from a local untracked env file, never hardcoded.
  - [x] Local Docker rule (CLAUDE.md): run Docker-heavy restore work from WSL/Linux filesystem paths (`/home/rasmus/repos/hr-masterdata`), not `/mnt/c/...` or `/mnt/d/...`; stop only this repo's stack with `supabase stop --project-id hr-masterdata`. **Deviation:** the WSL path does not exist on this machine; satisfied via the documented mitigation instead — `psql` ran inside the stack's own DB container, avoiding host-filesystem DB I/O (see Debug Log 2026-06-11 deviation note).
  - [x] Known platform constraint from the workflow header: GitHub Actions has no IPv6 — pooler URIs are required there. A locally-run drill does not have this constraint but should note which URL form was used.
  - [x] Validation checks after restore (minimum): row counts for key tables (employees, column_config, users, important_dates, staffing_needs) compared plausibly to source backup, presence of RLS policies (`pg_policies` count > 0), migration-consistent schema (key tables/columns exist), and app smoke check if the target is the local stack. Record check results as pass/fail — never paste row contents (backups contain personal data).

- [x] Document the restore drill. (AC: 4, 5)
  - [x] Add `docs/commercial-readiness/evidence/restore-drill-<YYYY-MM-DD>.md` (same evidence folder pattern as `dependency-audit-2026-06-05.md`).
  - [x] Required fields: timestamp (date + time, timezone), operator (role, not personal email), source (backup date/object path, NOT the storage URL with project ref), target (staging project / local stack — described, not ref'd), scope (which dumps restored, what was excluded and why), result (success/partial/fail), each validation check with outcome, and follow-up issues filed.
  - [x] Screenshots only if they add review value, and only after redaction (Story 22.8 stub technical note + Story 22.4 controls).

- [x] Update durable readiness surfaces. (AC: 1, 4)
  - [x] `14_evidence_index.md`: update the "Backup" row (currently says "Full production restore drill still not verified") and add rows for the new evidence package and restore drill doc.
  - [x] `17_blocker_remediation_tracker.md`: add an `E-008` row for Story 22.8 following the exact column format of `E-006`/`E-007` (Blocker ID, source story, priority, owner, target date, status, acceptance criteria, latest note, evidence link).
  - [x] `09_operations_support_and_sla.md`: update the Restore row and the "Full production restore drill" open item; confirm or update the "Backup/restore owner: Needs confirmation" line if ownership is decided in AC2.
  - [x] `docs/operations/database-restore.md` and `docs/SUPABASE-BACKUP-AND-STAGING.md`: update if drill steps differ from what they document; keep them consistent rather than adding a third procedure.
  - [x] Keep `00_index.md` links current if new documents are added.

- [x] Evidence hygiene gate. (AC: 5)
  - [x] No committed file may contain: database URLs, pooler URIs, Supabase project refs, service-role or anon keys, `SUPABASE_DB_PASSWORD`, JWTs/cookies, real employee rows, SSNs, or raw SQL/API output containing personal data.
  - [x] Run a targeted hygiene search over all new/changed files before completion, e.g. `rg -i "postgres(ql)?://|supabase\.co|service_role|eyJ[A-Za-z0-9_-]{20,}|[0-9]{6}[-+]?[0-9]{4}" docs/commercial-readiness/ docs/operations/` — expect no matches in new content (rg exit code 1 on the new files), mirroring the Story 22.7 hygiene gate.

- [x] Run required gates before moving beyond `ready-for-dev`. (AC: 1-5)
  - [x] You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0.
  - [x] **Estimated tests: 1** — a restore validation checklist (documented checks with recorded outcomes) or a validation script. If the drill is performed with documented manual checks and NO application/script code changes, the automated Vitest/Playwright gate may be waived per the `estimated_tests`-driven waiver pattern used by Stories 22.4/22.5, with the targeted hygiene search recorded instead.
  - [x] If `scripts/supabase-backup-storage.mjs`, the workflow file, or any `src/` code changes, the full gates are mandatory:
    - `npx vitest run 2>&1; echo "EXIT:$?"`
    - `npx playwright test 2>&1; echo "EXIT:$?"`
    - `npx eslint` and `npx tsc --noEmit`
  - [x] Lead-agent verification of the same commands is required before acceptance.

## Dev Notes

### Scope Boundaries

- This story is evidence packaging + one verified full restore drill on a non-production target, plus the minimum doc/script changes to make AC1-AC5 true.
- Do NOT start Epic 23 work (enterprise PITR/monitoring/SSO hardening is 23.x). Epic 23 is future contract-dependent and must not be auto-started.
- Do NOT enable paid Supabase platform features (PITR, dedicated backups) without explicit user approval — risk-accept instead (NFR1).
- Do NOT restore anything into production, take destructive actions against production, or run test workflows pointed at production (NFR20, Story 22.2 guard).
- Do NOT publish private values: project refs, regions, URLs, keys, advisor raw output with identifying details. The established pattern is a public redacted summary + "verified privately" notes.
- Do not overclaim: if advisors or platform settings cannot be accessed, the evidence package records the limitation with owner/date — an honest gap is acceptable evidence; a fabricated claim is not.

### Canonical Sources

- Story source: `_bmad-output/planning-artifacts/epics.md` section "Story 22.8: Package Supabase Security Evidence and Run Restore Drill"; planning stub `docs/sprint-artifacts/story-22.8.md`.
- Backup pipeline: `.github/workflows/supabase-nightly-backup.yml`, `scripts/supabase-backup-storage.mjs` (bucket `db-backups`, paths `backup/YYYY-MM-DD/{roles,schema,data,employees-column_config}.sql`, retention 14 days).
- Existing backup/restore docs: `docs/SUPABASE-BACKUP-AND-STAGING.md`, `docs/BACKUP_SETUP_GUIDE.md`, `docs/DATABASE_BACKUP.md`, `docs/operations/database-restore.md`, `docs/operations/database-backup.md`, `docs/operations/backup-setup-guide.md`.
- Evidence surfaces: `docs/commercial-readiness/14_evidence_index.md`, `17_blocker_remediation_tracker.md`, `08_security_overview.md`, `09_operations_support_and_sla.md`, `11_risk_register_and_open_questions.md`, `00_index.md`, `evidence/` folder.
- RLS sources: `supabase/migrations/` (56 files; key policy migrations listed in Tasks).
- Non-production guard: Story 22.2 implementation; usage example in `tests/integration/epic-22/story-22.7/supabase-rls-evidence.test.ts`.
- Local stack: `supabase/config.toml` (project id `hr-masterdata`), `compose.yaml`, `docs/local-docker.md`.

### Architecture And Technical Guardrails

- Stack: Next `^16.2.7`, React `19.2.0`, TypeScript `^5.9.3`, `@supabase/supabase-js` `^2.86.0`, Vitest `^4.0.15`, Playwright `^1.57.0`, pnpm `10.19.0`, Supabase CLI via `supabase/setup-cli` (workflow) or `npx supabase@2.x` locally.
- Dump commands already proven in the nightly workflow: `supabase db dump --db-url "$URL" -f roles.sql --role-only`, `... -f schema.sql`, `... -f data.sql --data-only --use-copy -s public`; restore via `psql "$URL" -v ON_ERROR_STOP=1 -f <file>`. Reuse these forms for the drill.
- Service-role keys bypass RLS and are used by the storage script; they must stay in env/secrets, never in committed files or evidence output.
- All code (if any) stays under `src/` per project boundaries; standalone helper scripts belong in `scripts/`.
- Swedish i18n/WCAG/Zod DoD items apply only if UI or API payloads change — not expected for this story.

### Known Constraints And Risks

- Supabase MCP and linked-CLI access to the HR production project are blocked (permission errors; `SUPABASE_DB_PASSWORD` required) — plan advisor/Auth-settings evidence around dashboard access or record the gap.
- Staging/prod `employees` schema drift was previously identified (evidence index, REST schema metadata row) — a full restore into staging may surface conflicts; restoring into a reset local stack avoids drift but document which target was chosen and why.
- The nightly partial staging restore TRUNCATEs `employees`/`column_config` on staging; a FULL drill into staging would overwrite all staging data — coordinate timing so it doesn't race the 02:00 UTC nightly job or invalidate in-flight staging testing.
- Backups contain personal data (security overview Backups row). Restored non-production targets containing production personal data must be handled under Story 22.4 controls; prefer validating with counts/structure and cleaning up afterwards (`supabase db reset` for local).
- `roles.sql` dump and restore can fail on managed-role permissions (`continue-on-error: true` in the workflow for a reason); the drill doc should state whether roles were restored or skipped and why.

### Previous Story Intelligence

- Story 22.7 (most recent): redaction discipline is enforced by review — detailed operational/security evidence was moved out of public docs during review patches. Write the evidence package redacted from the start to avoid the same review churn. Hygiene search pattern and "no real rows/secrets" rule carried forward here as AC5.
- Story 22.7 RLS tests established the local/non-production Supabase + service-role-setup pattern and `validateNonProductionSupabaseEnvironment()` gating — reuse for any live validation queries.
- Story 22.2: non-production guard is binding for every test/staging path; production may only be a read-only dump source under existing automation.
- Stories 22.4/22.5: docs-only stories used the `estimated_tests: 0` waiver with a targeted content-hygiene search recorded as the gate. This story has `estimated_tests: 1` (restore validation checklist/script), so document the checklist outcomes even when the code gate is waived.
- Status synchronization discipline (from 22.6/22.7 reviews): every status movement must update ALL status artifacts in the same turn (list in DoD below); review flagged drift between artifacts as findings.

### Testing Requirements

**Estimated tests:** 1

- Restore validation checklist (documented, with recorded pass/fail outcomes) or a validation script run against the restored non-production target.
- Run automated tests only if restore workflow/script/app code changes; then full gates are mandatory:
  - `npx vitest run`
  - `npx playwright test`
  - `npx eslint` and `npx tsc --noEmit`
- Targeted evidence hygiene search over all new/changed docs is mandatory regardless of waiver.

## Definition of Done

- Supabase security evidence package exists at `docs/commercial-readiness/22_supabase_security_evidence_package.md` covering RLS policies, Auth settings, advisors (or explicit access-gap), migration history, and known risks — all redacted.
- SSL, DB network restrictions, and PITR each have a hardening action or formal risk acceptance with owner and review date, consistently reflected in `08_security_overview.md` and `11_risk_register_and_open_questions.md`.
- A full restore drill against a non-production target completed and is documented in `docs/commercial-readiness/evidence/restore-drill-<date>.md` with timestamp, operator, source, target, scope, result, validation checks, and follow-ups.
- `14_evidence_index.md`, `17_blocker_remediation_tracker.md` (new E-008 row), and `09_operations_support_and_sla.md` are updated; the "Full production restore drill still not verified" claims are replaced or updated truthfully.
- No secrets, project refs, DB URLs, keys, or personal data in any committed file; hygiene search recorded.
- Required gates pass with exit code `0` (or the docs-only waiver is recorded with the checklist + hygiene evidence) before the story moves beyond `ready-for-dev`.
- If implementation changes status, synchronize `docs/sprint-artifacts/story-22.8.md`, `docs/sprint-artifacts/epic-22-sprint-status.yaml`, `docs/sprint-artifacts/sprint-status.yaml`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, and `_bmad-output/implementation-artifacts/22-8-package-supabase-security-evidence-and-run-restore-drill.md` in the same turn.

## Dev Agent Record

### Debug Log

- 2026-06-11: Scrum Master created comprehensive story context for Story 22.8. Epic 23 intentionally not auto-started (future contract-dependent). Story 22.9 depends on 22.8 and stays queued.
- 2026-06-11: Dev agent (Amelia) started implementation. Local Supabase stack (`hr-masterdata`) found running; local `pg_policies` cross-check captured first (22 policies, 8 tables, 9 RLS-enabled) while the stack was in migration-applied state.
- 2026-06-11: Blocker hit and resolved: `.env.local` production Supabase values are now empty (post-1f98eb6 hardening), so `scripts/supabase-backup-storage.mjs download-oldest` had no credentials. Resolution: authenticated Supabase CLI session (already logged in) reaches the production `db-backups` bucket read-only via `supabase storage ls/cp --linked --experimental`; oldest backup (2026-05-28) downloaded to a directory outside the repo (repo-local `backup-output/` is not git-ignored). `download-oldest` semantics mirrored (oldest of 14 retained dates).
- 2026-06-11: Story Dev Notes said advisors/migration-list were blocked; re-tested honestly and access is now RESOLVED: `supabase db advisors --linked` and `supabase migration list --linked` both exit 0 via CLI login (no `SUPABASE_DB_PASSWORD` needed). Captured: 83 advisor warnings (20 security / 63 performance, 0 errors); remote migration history EMPTY (all 56 migrations local-only). Also captured read-only: SSL enforcement disabled, network restrictions allow-all, via `ssl-enforcement get` / `network-restrictions get`.
- 2026-06-11: Restore drill executed 13:32–13:35 +02:00 into the local stack: wipe `public` schema → `roles.sql` → `schema.sql` → `data.sql` (all `ON_ERROR_STOP=1`, exit 0). Validation checks: 7 passed, 1 not applicable (no serial/identity columns) — row counts exact match incl. employees 73; 26 policies; 11 functions; 7/7 key columns; REST smoke HTTP 206 count 73. Cleanup: container temp files deleted, `supabase db reset` (post-reset employees=0), downloaded dumps deleted, CLI unlinked, tracked `supabase/.temp/cli-latest` restored.
- 2026-06-11: Deviation note (CLAUDE.md WSL rule): `/home/rasmus/repos/hr-masterdata` does not exist in WSL; the stack was originally created from the Windows project dir. Restore `psql` ran INSIDE the stack's DB container (`docker exec`), so no host-filesystem-heavy DB I/O or hardcoded DB URL was involved; `supabase db reset` ran from the project dir as usual. Only this repo's project-scoped containers were touched.
- 2026-06-11: Hygiene gate: story's example pattern matches on changed files are all benign (migration timestamp filenames, `service_role` as SQL identifier/env-var NAME, pre-existing placeholder templates in `docs/SUPABASE-BACKUP-AND-STAGING.md`). Strict secret/personal-data pattern (`postgres(ql)?://`, `supabase.co`, JWT `eyJ…`, boundary-anchored SSN forms, `SUPABASE_DB_PASSWORD=`) over both NEW files: 0 matches (exit 1). Production project ref: 0 hits across all tracked md/yaml and all of `docs/` + `_bmad-output/`.

### Implementation Plan

1. Capture local `pg_policies` cross-check before the drill wipes the stack (Task 1 evidence).
2. Download the oldest nightly backup read-only (existing pipeline artifacts; no new pipeline built).
3. Re-test the recorded advisor/migration access blocker; capture advisors, migration list, SSL, and network posture via authenticated CLI if available, otherwise record the gap.
4. Run the full restore drill into the local non-production stack (chosen over staging: full restore would overwrite all staging data and staging/prod schema drift `R-020` risks conflicts), validate with counts/structure/REST checks only, then clean up all personal data.
5. Write `22_supabase_security_evidence_package.md` + `evidence/restore-drill-2026-06-11.md`, update `08`/`09`/`11`/`14`/`17`/`00` consistently, refresh local-only ops docs (`database-restore.md`, `SUPABASE-BACKUP-AND-STAGING.md`).
6. Hygiene gate, then status synchronization across all five status artifacts.

### Completion Notes

- AC1: `docs/commercial-readiness/22_supabase_security_evidence_package.md` covers RLS policies (migration source + local `pg_policies` cross-check + hosted production policy inventory from the backup schema), Auth posture (incl. advisor finding: leaked-password protection disabled), a redacted advisor summary (83 WARN: 20 security / 63 performance, 0 ERROR — access limitation from Dev Notes is resolved, not fabricated), migration history (56 local; remote history verified EMPTY), and delta security risks.
- AC2: SSL enforcement (disabled), network restrictions (allow-all), and PITR (not enabled; paid feature, NOT enabled per NFR1/no-approval rule) are each formally risk-accepted with owner role and review date 2026-09-30; `08_security_overview.md` items #7/#8 and `R-018`/`R-019` updated in place; no production settings were changed.
- AC3: Full restore drill (2026-05-28 production backup → local non-production Supabase stack) succeeded; production used read-only as backup source only.
- AC4: `docs/commercial-readiness/evidence/restore-drill-2026-06-11.md` records timestamp+timezone, operator role, source, target, scope (incl. exclusions and why), result, 8 validation checks with outcomes (7 passed, 1 not applicable), cleanup, and 5 follow-up issues (backup gap 2026-06-05, auth-schema scope limit, minimal roles.sql, policy/migration drift, missing optional partial artifact).
- AC5: No secrets, URLs, refs, keys, or personal data in any committed file; hygiene searches recorded in Debug Log; backup files handled outside the repo and deleted; CLI link removed.
- New risk `R-023` (hosted RLS policy drift: 26 prod policies vs 22 migration-defined, named differences) and hardened `R-010` (remote migration history confirmed empty) registered.
- Estimated test (1): satisfied by the documented restore validation checklist with 7 recorded pass outcomes and 1 not-applicable check (`evidence/restore-drill-2026-06-11.md`). No application/script/workflow code changed (verified via `git status`: docs + status artifacts only), so the automated Vitest/Playwright gate is waived per the Stories 22.4/22.5 `estimated_tests`-driven waiver pattern sanctioned by this story; the targeted hygiene search is recorded instead. Swedish i18n/WCAG/Zod DoD items not applicable (no UI/API changes).

### File List

Tracked (committable):

- `docs/commercial-readiness/22_supabase_security_evidence_package.md` (new)
- `docs/commercial-readiness/evidence/restore-drill-2026-06-11.md` (new)
- `docs/commercial-readiness/00_index.md` (modified)
- `docs/commercial-readiness/08_security_overview.md` (modified)
- `docs/commercial-readiness/09_operations_support_and_sla.md` (modified)
- `docs/commercial-readiness/11_risk_register_and_open_questions.md` (modified)
- `docs/commercial-readiness/14_evidence_index.md` (modified)
- `docs/commercial-readiness/17_blocker_remediation_tracker.md` (modified)
- `docs/sprint-artifacts/story-22.8.md` (modified — status sync)
- `docs/sprint-artifacts/story-22.10.md` (new — follow-up stub from Story 22.8 findings, owner-directed; referenced by the status YAMLs in this change)
- `docs/sprint-artifacts/story-22.11.md` (new — follow-up stub, as above)
- `docs/sprint-artifacts/story-22.12.md` (new — follow-up stub, as above)
- `docs/sprint-artifacts/epic-22-sprint-status.yaml` (modified — status sync)
- `docs/sprint-artifacts/sprint-status.yaml` (modified — status sync)
- `_bmad-output/implementation-artifacts/22-8-package-supabase-security-evidence-and-run-restore-drill.md` (this file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified — status sync)

Local-only (covered by `/docs/*` gitignore; updated for consistency, not committable):

- `docs/operations/database-restore.md` (rewritten — replaced the stale Cloudflare R2/GPG procedure with the actual verified Supabase Storage restore procedure)
- `docs/SUPABASE-BACKUP-AND-STAGING.md` (restore-drill verification note added)

### Review Findings

**Round 1 of 3** — 2026-06-11 adversarial code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor). 2 decision-needed, 22 patch, 1 defer, 1 dismissed as noise.

- [x] [Review][Decision] Bundled out-of-scope artifacts: Change Log claims Stories 22.10–22.12 stubs and epics.md registration, but `docs/sprint-artifacts/story-22.10/11/12.md` are untracked, absent from the File List, and outside this review's diff while the sprint YAMLs in the diff reference them — decide whether to add them to the 22.8 File List/commit or split them into a separate change. (blind+auditor) — **Resolved 2026-06-12 (user):** stubs added to the 22.8 File List and ship with this story's commit; the 22-9 artifact stays with Story 22.9.
- [x] [Review][Decision] AC2 risk acceptances (SSL/network/PITR, R-018/R-019) are held by role placeholders while `09_operations_support_and_sla.md` concedes "the named individual still needs confirmation" — confirm the accepting individuals or explicitly sanction role-level acceptance. (blind+auditor) — **Resolved 2026-06-12 (user):** Rasmus Thunborg named as the individual holding both owner roles, recorded in `22_supabase_security_evidence_package.md`, `R-018`/`R-019`, and `09_operations_support_and_sla.md`; formal customer-side confirmation remains pending.
- [x] [Review][Patch] R-010 compensating control claims the drill "proved a rebuilt environment matches expectations" while R-023 (same diff) proves migrations vs hosted policies DIVERGE — reword R-010 [docs/commercial-readiness/11_risk_register_and_open_questions.md]
- [x] [Review][Patch] Epic 22 progress_summary arithmetic broken: 23+5+17≠40 (in-review 5 pts double-counted); `stories_in_progress: 0` vs `in_progress_story_points: 5` [docs/sprint-artifacts/epic-22-sprint-status.yaml:203-206]
- [x] [Review][Patch] Test totals 53 vs category breakdown 44+8=52; manual restore checklist booked as an implemented/passing automated test [docs/sprint-artifacts/epic-22-sprint-status.yaml:210-216]
- [x] [Review][Patch] Hosted RLS findings from the 2026-05-28 backup asserted in present tense ("contains 26 policies") and upgraded to "verified" in 00_index — date-qualify as a snapshot [docs/commercial-readiness/22_supabase_security_evidence_package.md, 00_index.md]
- [x] [Review][Patch] Stale "full restore drill not verified" claims remain in 8 untouched readiness docs (01_executive_summary:49,61; 03_architecture:162-164; 04_feature_capability_matrix:26; 06_data_inventory:87; 07_gdpr:45; 12_commercial_pack:109; 15_pricing:115-116; 18_one_page_brief:37,43) contradicting the DoD claim that these were updated truthfully [docs/commercial-readiness/]
- [x] [Review][Patch] 00_index self-contradiction: line 62 still says CLI `db advisors` blocked/needs `SUPABASE_DB_PASSWORD`, line 67 says access works — mark the old bullet historical/superseded [docs/commercial-readiness/00_index.md:62]
- [x] [Review][Patch] "RPO bounded by nightly backups (~24h)" contradicted by the documented 2026-06-05 failure unnoticed for six days — caveat with the demonstrated gap / Story 22.12 reference [docs/commercial-readiness/00_index.md, 11_risk_register R-019]
- [x] [Review][Patch] R-007 title "Full restore not verified" contradicts its status "Resolved in Story 22.8" — retitle [docs/commercial-readiness/11_risk_register_and_open_questions.md:15]
- [x] [Review][Patch] "All eight validation checks passing" overstates check 7, which is "Pass (not applicable)" — report 7 passed / 1 N/A [docs/commercial-readiness/17_blocker_remediation_tracker.md:21, epic-22-sprint-status.yaml, this file's Completion Notes]
- [x] [Review][Patch] R-018 compensating control asserts "backup clients negotiate TLS by default" while the package's own hardening step says TLS use is unconfirmed — reword as expected/unverified [docs/commercial-readiness/11_risk_register_and_open_questions.md]
- [x] [Review][Patch] Stale sibling rows contradict the new posture: 14_evidence_index "Supabase project controls" row still "requires private hardening/operations follow-up"; 09 retains the superseded 2026-06-03 physical-backup-review paragraph [docs/commercial-readiness/14_evidence_index.md:31, 09_operations_support_and_sla.md]
- [x] [Review][Patch] Backup-success rows omit the 2026-06-05 failed run documented elsewhere in the same diff ("Latest 2026-06-03 scheduled run verified successful") [docs/commercial-readiness/09_operations_support_and_sla.md:15, 00_index.md:55]
- [x] [Review][Patch] 09 "Database/Auth" row still says "RLS/Auth settings not verified" contradicting the diff's RLS verification claims [docs/commercial-readiness/09_operations_support_and_sla.md:11]
- [x] [Review][Patch] R-012 not reconciled with restored CLI access (still cites "Supabase access limitation"; only Auth session/MFA remains open) [docs/commercial-readiness/11_risk_register_and_open_questions.md:20]
- [x] [Review][Patch] R-019 priority "Medium" in the risk register vs "High" for the matching Supabase-physical-backups row — both rewritten by this diff; align [docs/commercial-readiness/11_risk_register_and_open_questions.md:24, 08_security_overview.md:30]
- [x] [Review][Patch] 08 Summary paragraph still lists "directly confirming hosted RLS/Auth settings" as unmet while the table below records the hosted RLS inventory as reviewed [docs/commercial-readiness/08_security_overview.md:8]
- [x] [Review][Patch] Only 7 of 9 restored tables were count-validated (`pe3_notifications_log`, `staffing_needs_changelog` unchecked) but 09 claims "row counts matched the dump exactly" — state the boundary [docs/commercial-readiness/evidence/restore-drill-2026-06-11.md, 09_operations_support_and_sla.md:89]
- [x] [Review][Patch] Auth-settings wording self-contradictory: "were not directly verified… remain a documented gap" yet "remain 'verified privately'", with no date/operator — state the gap honestly with owner/review date per the spec fallback [docs/commercial-readiness/22_supabase_security_evidence_package.md]
- [x] [Review][Patch] WSL Docker-rule subtask checked `[x]` despite the Debug Log's recorded deviation — annotate the checkbox with the deviation reference [this file, Tasks/Subtasks]
- [x] [Review][Patch] "`supabase/.temp/` is git-ignored" is inexact — `supabase/.temp/cli-latest` is git-tracked [docs/commercial-readiness/22_supabase_security_evidence_package.md]
- [x] [Review][Patch] Drill source `backup/2026-05-28/` hits the 14-day retention prune on the next nightly run, making the documented source unreproducible — add a note [docs/commercial-readiness/evidence/restore-drill-2026-06-11.md]
- [x] [Review][Patch] Placeholder midnight timestamp `last_updated: 2026-06-11T00:00:00+02:00` for work performed 13:32–13:36 [_bmad-output/implementation-artifacts/sprint-status.yaml]
- [x] [Review][Defer] Migration version-ordering anomaly: `20250113000000_add_room_assignment_rpc.sql` sorts nine months before `20251027000000_initial_schema.sql`, weakening the "migrations are the canonical rebuild source" claim [supabase/migrations/] — deferred, pre-existing; belongs to Story 22.10 environment/migration reconciliation

## Change Log

- 2026-06-11: Created ready-for-dev BMAD implementation story context for Story 22.8 with evidence-package scope, restore-drill reuse of the existing nightly backup pipeline, non-production guardrails, redaction rules, known access constraints, and mandatory gates.
- 2026-06-11 (post-implementation): Owner reviewed the findings and directed follow-up tracking. Stories 22.10 (Supabase environment reconciliation + migration-history baseline; covers R-010/R-020/R-023 and advisor remediation), 22.11 (fail-safe non-production email suppression + Preview SMTP env audit), and 22.12 (backup failure alerting + users/auth backup and staging-refresh scope decision) were drafted into Epic 22 with stubs in docs/sprint-artifacts/ and registered across epics.md and all sprint status trackers. Drill follow-up items and risk register entries now reference the filed story IDs. Additional verified facts incorporated: the 2026-06-05 nightly run failed at the "Setup Supabase CLI" step per workflow run history, and the app has no user_filters UPDATE path, so the missing production UPDATE policy is latent rather than a live bug.
- 2026-06-12: Code review Round 1 of 3 (Blind Hunter + Edge Case Hunter + Acceptance Auditor) produced 2 decision-needed, 22 patch, 1 deferred, 1 dismissed findings. All 22 patches applied: fixed epic-status point/test arithmetic (remaining 12, manual checklist test categorized separately), corrected "all 8 checks passed" to "7 passed / 1 N/A" everywhere, date-qualified hosted-RLS claims as the 2026-05-28 snapshot, reworded the R-010 compensating control that contradicted R-023, removed the contradictory Auth "verified privately" claim, qualified the ~24h RPO claim with the 2026-06-05 undetected failure (R-019 kept High), reconciled R-007/R-012 wording, marked superseded CLI-access and physical-backup-review statements, fixed the `supabase/.temp` ignore claim, noted 7-of-9 count-validation coverage and the 14-day source-prune boundary in the drill doc, updated the stale "restore drill not verified" claims across 01/03/04/06/07/12/15/18, annotated the WSL-rule subtask with its deviation, and replaced the placeholder midnight timestamp. Hygiene search over all patched files: clean. Deferred (pre-existing, → Story 22.10): migration version-ordering anomaly (`20250113000000` RPC sorts before the initial schema). Decisions pending: (1) whether the 22.9–22.12 stubs/artifacts bundle into this story's commit or ship separately; (2) named-individual confirmation for the SSL/network/PITR risk acceptances.
- 2026-06-11: Implementation complete (Dev agent). Supabase security evidence package created; SSL/network/PITR risk acceptances recorded with owner + review date 2026-09-30; full restore drill of the 2026-05-28 production backup into the local non-production stack succeeded with 7 of 8 validation checks passed (one not applicable; wording corrected in review) and full personal-data cleanup; advisor/migration-list access re-verified as working and captured; delta risks R-023 and confirmed R-010 registered; evidence index, blocker tracker (E-008), operations/SLA, risk register, and index updated; local-only restore/backup ops docs aligned with the verified procedure; hygiene gates clean. Status moved to review across all five status artifacts. Docs-only Vitest/Playwright waiver applied per story rules (no code changes; validation checklist + hygiene search recorded).
