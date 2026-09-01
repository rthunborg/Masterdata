# Restore Drill — 2026-06-11

Story: 22.8 (AC3, AC4)

Privacy note: this record contains counts, structure checks, and command outcomes only. No employee rows, personal data, database URLs, pooler URIs, project refs, key values, or storage URLs are recorded. Backup files containing personal data were handled under the Story 22.4 controls and deleted after the drill.

## Drill Record

| Field | Value |
| --- | --- |
| Timestamp | 2026-06-11, 13:32–13:35 (+02:00, Europe/Stockholm); cleanup completed 13:36 |
| Operator | Project technical owner (developer workstation), executing through the supervised AI dev agent session for Story 22.8. Role recorded, not personal email. |
| Source | Nightly production logical backup dated **2026-05-28** — the oldest of 14 retained backups in the private `db-backups` Supabase Storage bucket (object path `backup/2026-05-28/`). Chosen to mirror the existing pipeline's `download-oldest` semantics. Production was used only as a read-only backup source; no fresh production dump was taken and no production data or settings were modified. Retention note: under the 14-day retention policy, the `backup/2026-05-28/` source object is pruned by the next nightly run after the drill, so the source is not retrievable for re-runs — this record is the durable evidence. |
| Target | Local non-production Supabase stack, project id `hr-masterdata` (`supabase/config.toml`), PostgreSQL 17.6 in Docker. Chosen over the staging project because a full restore would overwrite all staging data and known staging/prod `employees` schema drift (`R-020`) could cause conflicts; the local stack provides a clean, isolated target. |
| Scope | Full restore: `roles.sql` (role settings), `schema.sql` (full `public` schema DDL: 9 tables, 11 functions, 26 policies, 9 RLS-enabled tables), `data.sql` (all 9 `public` tables). Excluded: `employees-column_config.sql` (optional partial-refresh artifact, not present for 2026-05-28); `auth`/`storage` schemas (not in logical backup scope by design — see follow-ups). |
| Result | **Success** — all restore steps exited 0; 7 of 8 validation checks passed and one (sequence restore) was not applicable. |

## Method

1. Backup files were downloaded read-only from the production `db-backups` bucket through an authenticated Supabase CLI session (`supabase storage cp`, HTTPS Storage API) into a directory outside the repository working tree. No service-role key was placed in any file; the repo-local `backup-output/` path was avoided because it is not git-ignored.
2. The non-production target was verified first: only the project-scoped local stack containers (`supabase_*_hr-masterdata`) were touched, and the pre-drill state was captured (all 9 public tables at 0 rows, 22 migration-defined policies). `psql` ran inside the local stack's own DB container, so no database URL was hardcoded or exposed; connection details for app-level checks came from the untracked `.env.test` file, which passes the Story 22.2 non-production guard.
3. Restore sequence (all with `-v ON_ERROR_STOP=1`): wipe local `public` schema (`DROP SCHEMA public CASCADE; CREATE SCHEMA public;` + role grants), then `roles.sql`, `schema.sql`, `data.sql`. The data dump sets `session_replication_role = replica` (standard Supabase CLI dump form), so FK/trigger ordering did not block the load.
4. URL form note: the GitHub Actions pipeline requires pooler URIs (no IPv6 on runners). This locally-run drill did not use a database URI at all for the restore itself (container-internal socket); the only remote access was the HTTPS Storage API download.

## Validation Checks

| # | Check | Expected | Observed | Outcome |
| --- | --- | --- | --- | --- |
| 1 | Restore step exit codes (`roles.sql`, `schema.sql`, `data.sql`) | all 0 | 0 / 0 / 0 | Pass |
| 2 | Row counts vs dump COPY counts: `employees` 73, `column_config` 61, `users` 18, `important_dates` 22, `staffing_needs` 2, `employee_column_changes` 872, `user_filters` 40 | exact match | exact match for all 7 tables | Pass |
| 3 | RLS policies present (`pg_policies`, schema `public`) | > 0 | 26 (matches the 26 `CREATE POLICY` statements in the backup schema) | Pass |
| 4 | RLS enabled on restored tables | 9 tables | 9 tables | Pass |
| 5 | Functions restored (`pg_proc`, schema `public`) | 11 | 11 | Pass |
| 6 | Migration-consistent key columns exist (`employees.archived_at`, `employees.is_anonymized`, `employees.dietary_requirements`, `column_config.role_permissions`, `column_config.display_order`, `users.role`/`is_active`/`auth_user_id`, `staffing_needs.target_headcount`) | 7 checked column groups present | 7/7 present | Pass |
| 7 | Sequence restore | `setval` coverage for any serial/identity columns | no serial/identity columns exist (UUID keys); 0 `setval` lines needed | Pass (not applicable) |
| 8 | App-surface smoke check: PostgREST through the local stack API gateway, service-role count-only HEAD request on `employees` | HTTP 2xx with restored count | HTTP 206, `Content-Range: 0-0/73` | Pass |

No row contents were read or recorded during validation (counts and structure only); backups contain personal data.

Coverage note: row counts were validated for the 7 key tables listed in check 2. The two log tables (`pe3_notifications_log`, `staffing_needs_changelog`) were restored by the same `data.sql` load (exit 0) but not count-validated.

## Cleanup

- Local stack reset to migration-defined state with `supabase db reset` (production personal data removed from the target; post-reset `employees` count 0).
- All downloaded backup files and container-side copies deleted.
- Supabase CLI project link removed (`supabase unlink`); `supabase/.temp/` contents are git-ignored except the already-tracked `supabase/.temp/cli-latest`, which was restored to its committed state.

## Follow-Up Issues

1. **Backup gap 2026-06-05**: the bucket holds backups for 2026-05-28 through 2026-06-11 except 2026-06-05 — confirmed via workflow run history as a failed run (transient "Setup Supabase CLI" step) that went unnoticed. Owner: operations owner. **Filed as Story 22.12** (backup failure alerting + retry).
2. **Auth users are outside backup scope**: the logical backup covers `public` schema only, so `auth.users` is not restorable from it. A real disaster recovery needs auth users re-provisioned (Supabase platform restore, or an auth-provisioning runbook step) before logins work; `public.users.auth_user_id` links would also need re-mapping. This extends RTO and should be reflected in recovery planning. **Scope decision filed as Story 22.12** (depends on Story 22.11 email suppression).
3. **`roles.sql` is minimal**: the role-only dump contains just `statement_timeout` settings (managed-role permission limits). Role recreation relies on Supabase defaults plus the schema dump's grants — acceptable for Supabase-to-Supabase restores, documented here so it is not assumed to carry full role definitions.
4. **Hosted policy/migration drift surfaced by the restored schema**: 26 production policies vs 22 migration-defined, and empty remote migration history — tracked as `R-023` and the hardened `R-010` in `11_risk_register_and_open_questions.md`, detailed in `22_supabase_security_evidence_package.md`. **Remediation filed as Story 22.10** (environment reconciliation and migration-history baseline).
5. **Partial-refresh artifact missing for some dates**: `employees-column_config.sql` did not exist for 2026-05-28 (it is optional in the storage script); no action needed, recorded for accuracy.

No screenshots were taken: command results above carry the review value, and screenshots of a restored production dataset would require redaction without adding evidence.

## 2026-09-01 Readiness-Audit Addendum

Validation check 6 above is preserved verbatim as the dated Story 22.8 record, but its `staffing_needs.target_headcount` label conflicts with the version-controlled schema and current application contract, which use `staffing_needs.headcount_need`. The original backup and drill copies were deleted under the documented cleanup, so this record alone cannot establish which name is currently hosted or whether the required `headcount_need >= 0 AND headcount_need <= 9999` constraint is present.

This is an open production-baseline evidence contradiction. Before any staffing migration history is repaired, the operator must obtain fresh read-only production catalog proof. If the hosted column is `headcount_need` with the exact bound, append a dated correction with redacted catalog evidence. If the hosted column is `target_headcount`, stop and prepare an approved forward reconciliation migration; do not mark the staffing migrations represented and do not replay them.
