# Environment Reconciliation Inventory (Story 22.10)

Prepared: 2026-06-14

Story: 22.10 — Reconcile Supabase Environments and Baseline Migration History

Scope: a three-way inventory (production vs staging vs version-controlled migrations) of the Supabase schema/policy/function posture, with each difference classified, plus the reconciled end state encoded in migrations. This file records **counts, names, and classifications only** — no database URLs, project refs, keys, JWTs, or employee/personal rows. It is the AC1 evidence artifact for Story 22.10.

> **Production-change freeze (owner directive, 2026-06-13):** No production database was modified by this story. The production side of this inventory uses the Story 22.8 **2026-05-28** nightly backup schema snapshot, which the owner confirmed on 2026-06-14 is still current (production unchanged since 2026-05-28). The staging side and the production execution are delivered as an owner-run cutover runbook (`docs/commercial-readiness/27_supabase_cutover_runbook.md`); staging baseline/apply and production cutover are executed outside this session.

## 1. Sources and method

| Side | Source | Basis |
| --- | --- | --- |
| Migration-defined (intended) | Local non-production stack rebuilt with `supabase db reset` (project id `hr-masterdata`), introspected via `pg_proc` / `pg_policies` / `information_schema` | Authoritative "intended" baseline from `supabase/migrations/` (56 files at inventory time; 57 after this story's reconciliation migration) |
| Production | Story 22.8 2026-05-28 backup schema snapshot (`22_supabase_security_evidence_package.md`, `evidence/restore-drill-2026-06-11.md`) | Read-only; owner-confirmed current 2026-06-14 |
| Staging | Story 22.8 REST/schema observations (staging-only `employees` columns) | Read-only; fresh staging dump captured at cutover by the operator |

No production or staging writes were made from this session. The reconciliation is authored in migrations, verified on the local rebuild, and executed on staging/production via the cutover runbook.

## 2. Migration version-ordering anomaly (fixed)

- `20250113000000_add_room_assignment_rpc.sql` previously sorted **nine months before** `20251027000000_initial_schema.sql`, so a clean `supabase db reset` applied the room-assignment RPCs before the `employees` table (and the `omc_date` / `hotel_required` / `room_number_shared` columns they reference) existed. It only succeeded because plpgsql defers name resolution to call time.
- **Resolution (classify: fix ordering):** re-timestamped to `20251122150001_add_room_assignment_rpc.sql` — immediately after `20251122150000_add_room_assignment_employee_columns.sql` (function bodies unchanged). A clean `supabase db reset` now applies in correct dependency order (verified, exit 0).

## 3. Function security posture

### 3.1 `search_path` pinning (advisor `function_search_path_mutable`)

Eleven public functions lacked a pinned `search_path` (`get_user_role`, `update_updated_at_column`, `trigger_set_updated_at`, `remove_jsonb_key`, `add_custom_column_to_employees`, `update_staffing_need`, `update_date_spots`, `release_date_capacity`, `recalculate_rooms_for_date`, `calculate_room_number`; `track_employee_column_changes` was already pinned in `20260607193000`).

- **Classification: adopt into migrations.** The reconciliation migration pins `SET search_path = public, pg_temp` on all of them (re-asserting the already-pinned trigger for hosted environments whose history predates that migration). The convention matches the existing `20260607193000` pin; function bodies already schema-qualify cross-schema references (`auth.uid()`, `public.users`) or use bare `public` objects that resolve under this search_path, so no body changes were needed.

### 3.2 SECURITY DEFINER EXECUTE grants (advisors `anon`/`authenticated` `*_security_definer_function_executable`)

Callers verified in `src/` before any revoke.

| Function | App caller (verified) | Decision | Rationale |
| --- | --- | --- | --- |
| `remove_jsonb_key(text,text)` | **None** (no `supabase.rpc('remove_jsonb_key')` in `src/`) | Revoke from `PUBLIC`/`anon`/`authenticated`; grant `service_role` only | Privileged dynamic SQL; its own comment says service_role-only |
| `add_custom_column_to_employees(text,text)` | `column-config-repository.ts` via the user-scoped server client (role `authenticated`); app gates HR Admin | Revoke `PUBLIC`/`anon`; keep `authenticated` (+ `service_role`) | Runs DDL; real authenticated caller, app-layer authz gates it. Future hardening: move to a service-role-only call. |
| `update_staffing_need(text,integer,uuid)` | `staffing-needs-repository.ts` via user-scoped client (role `authenticated`); RLS + app restrict to hr_admin/crewing | Revoke `PUBLIC`/`anon`; keep `authenticated` (+ `service_role`) | Real authenticated caller |
| `get_user_role()` | Invoked during RLS policy evaluation | **Keep** `anon` + `authenticated` (documented residual) | Returns only the caller's own role (NULL for anon), leaks nothing; revoking anon would turn graceful row-level denials into "permission denied for function" errors |
| `track_employee_column_changes()` | Trigger function (not API-callable) | No grant change | Advisor excludes trigger functions |

Residual after reconciliation: `anon` SECURITY-DEFINER-executable 4 → 1 (`get_user_role`, by design); `authenticated` 4 → 3 (`get_user_role`, `add_custom_column_to_employees`, `update_staffing_need` — all real authenticated callers, app-gated).

## 4. RLS policy three-way comparison (R-023)

Migration-defined baseline: **22 policies across 9 RLS-enabled tables** (matches the Story 22.8 local cross-check). Production (2026-05-28 snapshot): **26 policies** with dashboard-era extras and differing names.

| Object | Production (snapshot) | Migration-defined | Classification | Reconciliation action |
| --- | --- | --- | --- | --- |
| `employees` policies | 6 (incl. `HR Admin can do anything with employees`, `External parties can view active employees`, `Admin Limited can view all employees`, `Admin Limited can update employees`) | 2 (`HR Admin and Recruiter can manage employees`, `External parties can view employees`) | dashboard-era extras → **remove**; canonical → **keep** | `DROP POLICY IF EXISTS` the 4 dashboard-era names; re-assert the 2 canonical policies (scoped `TO authenticated`, `(select …)`-wrapped) |
| `important_dates` policies | 3 (incl. `Admin Limited can view important dates`, `HR Admin can read important dates`) | 2 (`Everyone can read important dates`, `HR Admin and Recruiter can manage important dates`) | dashboard-era extras → **remove** | drop dashboard-era names; re-assert canonical |
| `user_filters` policies | 3 (missing `update own filters`) | 4 (incl. update) | production missing canonical → **forward-port** | re-assert all 4 canonical policies (the missing update policy is created on hosted at apply) |
| `column_config` policy names | differ (e.g. `Anyone can read column config`) | `Everyone can read column configs` + 2 manage | rename drift → **remove** old / **keep** canonical; **HR-manage scope gap → forward-port** | drop `Anyone can read column config`; canonical SELECT kept; 2 manage policies merged into one `Manage column configs`, **broadened so HR Admin manages all column_config** (see note) |
| staffing policy names | differ (`staffing_needs_select_authenticated`, `staffing_needs_update_hr_admin_crewing`) | `staffing_needs_select`, `staffing_needs_update` | rename drift → **remove** old / **keep** canonical | drop the differently-named hosted policies; re-assert canonical |
| `admin_limited` direct-DB access | dashboard-era `Admin Limited` policies present | none (app-layer limitation, documented in Story 22.7) | intentional → **keep app-layer** | not reproduced in migrations (documented limitation) |

Performance advisors addressed at the same time (semantics-preserving):
- `auth_rls_initplan` (9): all role/`auth` lookups wrapped in `(select …)` so they evaluate once per query.
- `multiple_permissive_policies` (54): role-checked policies scoped `TO authenticated` (removes anon-side duplication); `users` SELECT (2→1) and UPDATE (2→1) merged; `column_config` manage (2→1). **Residual (documented follow-up):** the intentional "public read + role-scoped manage" overlap on `column_config`, `employees`, and `important_dates` SELECT for the `authenticated` role is left in place — collapsing it further would change semantics or add policy sprawl.

Reconciled migration-defined policy count: **19 across 9 tables** (`users` 5→3, `column_config` 3→2; others unchanged). `pe3_notifications_log` remains RLS-enabled with no policies (deny-by-default service-role log table).

**Newly-discovered drift (`column_config` HR-manage scope):** the migration-defined `column_config` manage policy restricted HR Admin to `is_masterdata = true`, but the app makes HR Admin the column administrator — `DELETE /api/admin/columns/[id]` deletes only custom (`is_masterdata = false`) columns and the create flow creates them, both through the user-scoped (authenticated) client. So a migration-built database could not create/delete custom columns via the app (RLS denied: `new row violates row-level security policy`), even though the hosted/production app works (dashboard-era broader policy). Surfaced as the `delete-column` Playwright e2e failure; DB-simulated as an authenticated `hr_admin`; confirmed pre-existing (the original two policies were equally restrictive — the merge was a faithful OR, not the cause). **Reconciled** by broadening the merged `Manage column configs` policy so HR Admin manages all `column_config`; external parties are unchanged (still manage only their own custom columns where `role_permissions ? role`). Guarded by a focused RLS regression test in the Story 22.10 reconciliation evidence suite.

## 5. Schema (column) drift (R-020)

The app supports **runtime custom columns** (`add_custom_column_to_employees` performs `ALTER TABLE`, tracked in `column_config.db_column_name`). Custom columns are therefore legitimately environment-specific and are not all migration schema.

| Column(s) | Where | Classification | Action |
| --- | --- | --- | --- |
| `employees.asdas`, `employees.testerere` | staging only (junk test columns) | **remove** | `ALTER TABLE employees DROP COLUMN IF EXISTS` (no-op on local/production; removes on staging; persists across the data-only nightly restore) |
| `employees.seably_*` | production only | **keep as runtime custom data** (NOT migration schema) | none — these are operator-created runtime custom columns managed via the custom-column feature + `column_config`, intentionally not in migrations |
| `employees.tester`, `employees.sodexo_meal_plan` | migration-defined (example custom columns) | keep | already in migrations |
| `important_dates.deadline_submit`, `important_dates.deadline_cancel` | hosted (production/staging) only — **missing from migrations** | **adopt into migrations** (intended core schema) | `ALTER TABLE important_dates ADD COLUMN IF NOT EXISTS … text` (no-op on hosted; adds on migration-built envs). Discovered during Story 22.10 e2e verification — see note below |

**Newly-discovered drift (`important_dates` deadline columns):** the app uses `important_dates.deadline_submit` / `deadline_cancel` throughout (`src/lib/services/date-capacity.ts` deadline checks, `src/app/api/important-dates/*`, `src/lib/validation/important-date-schema.ts`, the add/import/card components), but **no migration ever created them** — they exist only on the dashboard-built hosted databases. A migration-built environment was therefore missing them, which broke date-capacity employee assignment ("Failed to fetch date information") and important-date deadline features on any rebuilt stack (this surfaced as ~30 Playwright e2e failures, confirmed identical with and without the rest of the reconciliation migration — i.e. pre-existing drift, not introduced by Story 22.10). The columns are `text` (mirroring the existing `important_dates.date_value` text-date convention) and nullable (matching the `z.string().nullable().optional()` app contract). This is the same dashboard-era drift root cause as `R-010`/`R-023`, for a different object.

Nightly-restore compatibility: the nightly job is **data-only for `employees` + `column_config`** (`TRUNCATE … RESTART IDENTITY CASCADE` + `pg_dump --data-only`), so it carries production's column list. The reconciliation keeps staging's column set a superset of production's (only drops staging-only junk that production lacks), so the restore stays compatible and the junk-column removal persists.

## 6. Remote migration history (R-010)

- Production remote history is empty (all 56 migrations local-only; Story 22.8). Staging history is captured fresh at cutover.
- **Reconciliation:** baseline the remote history (`supabase migration repair --status applied <version>` for the historical migrations) **before** applying the reconciliation migration — staging first, production at the Epic 22 cutover. Never `db push` net-new schema before the repair baseline (an empty remote history can attempt to replay all migrations). Steps are in `docs/commercial-readiness/27_supabase_cutover_runbook.md`.

## 7. Local-stack grant parity

A migration-built **local** stack does not receive the public-schema API-role table grants that the hosted Supabase platform provisions automatically (the local CLI's `postgres` default table ACL grants only `Dxtm` to `anon`/`authenticated`/`service_role`). `supabase/seed.sql` grants the missing table/sequence privileges so a local rebuild reproduces hosted API-role access (RLS remains the row boundary). `seed.sql` runs only on `supabase db reset`/`start` and is never applied to staging/production, so it does not affect hosted environments or the change freeze.

## 8. Verification (local + staging)

### Staging execution (2026-06-14) — applied and verified on `masterdata-staging`

The reconciliation migration was applied to the staging project via the Supabase MCP (`apply_migration`), and the remote migration history was baselined (the reconciliation recorded + the 56 historical migrations inserted into `supabase_migrations.schema_migrations`). Production was not touched.

| Measure | Before | After |
| --- | --- | --- |
| Remote migration history | empty (table absent) | **57 migrations, local↔remote in sync** |
| RLS policies (public) | 26 (dashboard-era drift) | **19 (canonical set)** |
| `employees` junk columns (`asdas`, `testerere`) | present | **removed** |
| `function_search_path_mutable` (security) | 12 | **0** |
| `anon_security_definer_function_executable` (security) | 5 | **1** (`get_user_role`, by design) |
| `authenticated_security_definer_function_executable` (security) | 5 | **3** (`get_user_role`, `add_custom_column_to_employees`, `update_staffing_need` — justified real callers) |
| `auth_rls_initplan` (performance) | 9 | **0** |
| `multiple_permissive_policies` (performance) | 54 | **3** (intentional public-read + role-manage overlaps on `column_config`/`employees`/`important_dates`) |
| `auth_leaked_password_protection` | disabled | **moved to Epic 23 (Story 23.4)** — Auth/dashboard setting (+ CAPTCHA), enterprise hardening, out of this story's scope (owner decision 2026-06-14) |

Accepted residual advisors on staging (out of scope / by design): `pg_graphql_anon_table_exposed` + `pg_graphql_authenticated_table_exposed` (the app's tables are intentionally API-accessible; RLS gates rows), `unindexed_foreign_keys` / `unused_index` (INFO, index tuning), and `rls_enabled_no_policy` on `pe3_notifications_log` (deny-by-default service-role log table).

### Local



- `supabase db reset` applies all migrations + reconciliation cleanly (exit 0), correct dependency order.
- Story 22.7 RLS evidence suite green (8/8) against the reconciled build — external read-only, HR/recruiter write, `admin_limited` documented limitation, crewing-only staffing all preserved.
- Story 22.10 reconciliation evidence suite green (11/11): `search_path` pinned on all 11 functions; SECURITY DEFINER grant matrix as classified; dashboard-era policies absent; `users` collapsed to one policy per action; junk columns removed; policies scoped `TO authenticated` with `(select …)` wrapping.
- Expected hosted advisor impact after apply (for reference; the verified staging results are in the table above): `function_search_path_mutable` → 0; `anon` SECURITY-DEFINER-executable → 1 and `authenticated` → 3 (justified); `multiple_permissive_policies` materially reduced; `auth_rls_initplan` → ~0. `auth_leaked_password_protection` is **not** addressed by this migration — it moved to Epic 23 (Story 23.4). The production advisor re-run happens at the Phase B cutover.
