# Environment Reconciliation Inventory (Stories 22.10, 22.13, and 22.15)

Prepared: 2026-06-14

Updated: 2026-09-01 — Story 22.15 clean reset/live evidence, manifest plan, and dated hosted observations synchronized

Story: 22.10 historical inventory, superseded for release execution by Story 22.15

Scope: a three-way inventory (production vs staging vs version-controlled migrations) of the Supabase schema/policy/function posture, with each difference classified, plus the reconciled end state encoded in migrations. This file records **counts, names, and classifications only** — no database URLs, project refs, keys, JWTs, or employee/personal rows. It is the AC1 evidence artifact for Story 22.10.

> **Production-change freeze (owner directive, 2026-06-13):** No production database was modified by these stories. The production schema side of this inventory uses the Story 22.8 **2026-05-28** nightly backup snapshot, which the owner confirmed on 2026-06-14 was still current; the production migration-history observation was captured read-only on **2026-06-11** and was empty. Story 22.10 historically wrote and verified hosted staging on 2026-06-14. No Story 22.15 hosted delta has been applied. All remaining hosted work is governed by the owner-run cutover runbook (`docs/commercial-readiness/27_supabase_cutover_runbook.md`).

## 1. Sources and method

| Side | Source | Basis |
| --- | --- | --- |
| Migration-defined (intended) | Version-controlled migrations, Story 22.13 high-port evidence, and Story 22.15 manifest/static/live evidence | Current repository target is 63 versions / 17 policies; a clean Story 22.15 reset on the managed `hr-masterdata` high-port stack passed on 2026-09-01 |
| Production | Story 22.8 2026-05-28 backup schema snapshot plus the 2026-06-11 read-only migration-list observation (`22_supabase_security_evidence_package.md`, `evidence/restore-drill-2026-06-11.md`) | Schema snapshot owner-confirmed current 2026-06-14; migration history observed empty 2026-06-11 |
| Staging | Story 22.8 REST/schema observations (staging-only `employees` columns) | Read-only; fresh staging dump captured at cutover by the operator |

No Story 22.15 hosted write has been made. Story 22.10's historical staging reconciliation and history baseline were executed and verified on 2026-06-14; production remained untouched. The current Story 22.15 delta is authored in migrations and must be proven/applied only through the cutover runbook.

## 2. Migration version-ordering and immutable-history anomaly (Story 22.15 resolution)

- `20250113000000_add_room_assignment_rpc.sql` previously sorted **nine months before** `20251027000000_initial_schema.sql`, so a clean `supabase db reset` applied the room-assignment RPCs before the `employees` table (and the `omc_date` / `hotel_required` / `room_number_shared` columns they reference) existed. It only succeeded because plpgsql defers name resolution to call time.
- **Story 22.15 superseding resolution:** Story 22.10's retimestamp-only disposition is no longer the release plan. Restore the original `20250113000000_add_room_assignment_rpc.sql` byte-for-byte and retain `20251122150001_add_room_assignment_rpc.sql` as the ordered redefinition after its column dependency. Hosted history is governed by fresh catalog proof plus the environment's explicit manifest-approved repair list; the original version is never replayed against represented state. Applied historical SQL is immutable, and renaming alone is not a complete history repair.

## 3. Function security posture

### 3.1 `search_path` pinning (advisor `function_search_path_mutable`)

Ten public functions lacked a pinned `search_path` (`get_user_role`, `update_updated_at_column`, `trigger_set_updated_at`, `remove_jsonb_key`, `add_custom_column_to_employees`, `update_staffing_need`, `update_date_spots`, `release_date_capacity`, `recalculate_rooms_for_date`, `calculate_room_number`; `track_employee_column_changes` was already pinned in `20260607193000`).

- **Classification: adopt into migrations.** The reconciliation migration pins `SET search_path = public, pg_temp` on all of them (re-asserting the already-pinned trigger for hosted environments whose history predates that migration). The convention matches the existing `20260607193000` pin; function bodies already schema-qualify cross-schema references (`auth.uid()`, `public.users`) or use bare `public` objects that resolve under this search_path, so no body changes were needed.

### 3.2 SECURITY DEFINER EXECUTE grants (advisors `anon`/`authenticated` `*_security_definer_function_executable`)

Callers verified in `src/` before any revoke.

| Function | App caller (verified) | Decision | Rationale |
| --- | --- | --- | --- |
| `remove_jsonb_key(text,text)` | **None** (no `supabase.rpc('remove_jsonb_key')` in `src/`) | Revoke from `PUBLIC`/`anon`/`authenticated`; grant `service_role` only | Privileged dynamic SQL; its own comment says service_role-only |
| `add_custom_column_to_employees(text,text)` | No API caller after Story 22.13 | Revoke `PUBLIC`/`anon`/`authenticated`/`service_role` | Raw DDL is retained only for owner/migration use; API roles cannot call it. |
| `create_employee_column_config(...)` | `column-config-repository.ts` through the server-only service client after HR Admin route authorization | Grant `service_role` only | Atomically rejects physical/config collisions, inserts metadata, adds the employee column, and creates its index. Non-HR callers are rejected before repository execution; the validated HR Admin classification is preserved. |
| `update_staffing_need(text,integer,uuid)` | `staffing-needs-repository.ts` via user-scoped client (`authenticated`) | Grant `authenticated` only; deny `anon`/`service_role` | The definer body resolves an active `public.users` actor from `auth.uid()`, permits only HR Admin/Crewing, and rejects a mismatched audit actor id. |
| `update_own_last_active_at()` | Middleware/login/activity repository through the user-scoped client | Grant `authenticated` only | Replaces whole-table `users` UPDATE with a caller-bound activity update for the active authenticated user. |
| `update_assigned_column_presentation(text,jsonb)` | `column-config-repository.ts` through the authenticated caller client | Grant `authenticated` only | Row-locks the assigned custom column, resolves the active caller from `auth.uid()`, rechecks the current role's edit permission, and limits updates to presentation fields. |
| `set_user_active_status(uuid,boolean)` | HR-admin user-status route through the authenticated caller client | Grant `authenticated` only | Serializes status transitions, resolves and authorizes the active HR caller, prevents self-deactivation, and preserves at least one active HR Admin atomically. |
| `delete_app_user(uuid)` | HR-admin DELETE route through the authenticated caller client | Grant `authenticated` only | Shares the status-transition advisory lock, re-authorizes the active HR caller, checks self/final-admin invariants, and deletes the app row in one transaction; Auth cleanup is a truthful second phase. |
| `get_user_role()` | Invoked during RLS policy evaluation | **Keep** `anon` + `authenticated` (documented residual) | Returns a role only for the active caller; inactive, missing, and anonymous callers receive NULL. Keeping anon execution preserves graceful RLS denial. |
| `track_employee_column_changes()` | Trigger function (not API-callable) | No grant change | Advisor excludes trigger functions |

Story 22.10's verified staging residual was `anon` 1 and `authenticated` 3. Story 22.15's intended authenticated set is six caller-bound or internally authorized functions: `get_user_role`, `update_staffing_need`, `update_own_last_active_at`, `update_assigned_column_presentation`, `set_user_active_status`, and `delete_app_user`; raw custom-column DDL is unavailable and the atomic creation RPC is service-role-only. These are migration-defined targets pending hosted apply/re-verification, not hosted advisor evidence.

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

Story 22.10 reconciled the migration-defined count to **19 across 9 tables**. Story 22.13's post-migration count is **17**: all `users` UPDATE policies are removed (INSERT + SELECT remain), and the two broad `employee_column_changes` policies become one scoped SELECT policy. `pe3_notifications_log` remains RLS-enabled with no policies (deny-by-default service-role log table). The 17-policy figure was observed on the rebuilt high-port stack; hosted staging must still confirm it after apply before it is treated as hosted evidence.

Story 22.15 retains the 17-policy count while changing every `user_filters` predicate to require both caller ownership and `get_user_role() IS NOT NULL`. An unexpired JWT for an inactive/missing app user therefore cannot view, insert, update, or delete filters. Existing own-`users` metadata and intentional public reads of `column_config` / `important_dates` remain the only documented exceptions.

**Newly-discovered drift (`column_config` HR-manage scope):** the migration-defined `column_config` manage policy restricted HR Admin to `is_masterdata = true`, but the app makes HR Admin the column administrator — `DELETE /api/admin/columns/[id]` deletes only custom (`is_masterdata = false`) columns and the create flow creates them, both through the user-scoped (authenticated) client. So a migration-built database could not create/delete custom columns via the app (RLS denied: `new row violates row-level security policy`), even though the hosted/production app works (dashboard-era broader policy). Surfaced as the `delete-column` Playwright e2e failure; DB-simulated as an authenticated `hr_admin`; confirmed pre-existing (the original two policies were equally restrictive — the merge was a faithful OR, not the cause). Story 22.10 broadened the merged policy and retained external ownership behavior at that revision. **Story 22.13 supersedes that lifecycle model:** active HR Admin alone manages `column_config`; external users retain only a field-limited assigned-column presentation PATCH through a checked service path, while lifecycle DELETE is rejected. The current direct-role and lifecycle regression suites passed on the rebuilt high-port stack.

## 5. Schema (column) drift (R-020)

The app supports **runtime custom columns** (`add_custom_column_to_employees` performs `ALTER TABLE`, tracked in `column_config.db_column_name`). Custom columns are therefore legitimately environment-specific and are not all migration schema.

| Column(s) | Where | Classification | Action |
| --- | --- | --- | --- |
| `employees.asdas`, `employees.testerere` | staging only (junk test columns) | **remove** | `ALTER TABLE employees DROP COLUMN IF EXISTS` (no-op on local/production; removes on staging; persists across the data-only nightly restore) |
| `employees.seably_*` | production only | **keep as runtime custom data** (NOT migration schema) | Story 22.13 restores `column_config` first, validates and adds any missing config-backed employee columns using a fixed type map, then replays employees in the same transaction. No `seably_*` name is hard-coded. |
| `employees.tester`, `employees.sodexo_meal_plan` | migration-defined (example custom columns) | keep | already in migrations |
| `important_dates.deadline_submit`, `important_dates.deadline_cancel` | hosted (production/staging) only — **missing from migrations** | **adopt into migrations** (intended core schema) | `ALTER TABLE important_dates ADD COLUMN IF NOT EXISTS … text` (no-op on hosted; adds on migration-built envs). Discovered during Story 22.10 e2e verification — see note below |

**Newly-discovered drift (`important_dates` deadline columns):** the app uses `important_dates.deadline_submit` / `deadline_cancel` throughout (`src/lib/services/date-capacity.ts` deadline checks, `src/app/api/important-dates/*`, `src/lib/validation/important-date-schema.ts`, the add/import/card components), but **no migration ever created them** — they exist only on the dashboard-built hosted databases. A migration-built environment was therefore missing them, which broke date-capacity employee assignment ("Failed to fetch date information") and important-date deadline features on any rebuilt stack (this surfaced as ~30 Playwright e2e failures, confirmed identical with and without the rest of the reconciliation migration — i.e. pre-existing drift, not introduced by Story 22.10). The columns are `text` (mirroring the existing `important_dates.date_value` text-date convention) and nullable (matching the `z.string().nullable().optional()` app contract). This is the same dashboard-era drift root cause as `R-010`/`R-023`, for a different object.

Nightly-restore compatibility (Story 22.13): the job creates one required custom-format snapshot archive containing `column_config` and `employees`, then chooses the oldest retained backup that contains that archive. It extracts each table separately and runs one `psql --single-transaction` sequence: truncate both tables → replay config → execute `.github/backup/sync-runtime-employee-columns.sql` → replay employees. The synchronizer processes both masterdata and custom config rows, validates lowercase identifiers and PostgreSQL's 63-byte limit, rejects conflicting/unsupported types, maps only `text`/`number`/`date`/`boolean`, quotes identifiers with `%I`, and adds missing columns only. A failed config replay, schema sync, or employee replay rolls back the entire staging refresh. Legacy backups without the archive now fail the job rather than silently leaving staging stale.

Scope caveats are explicit. `TRUNCATE public.employees ... CASCADE` also clears employee-dependent party-data and audit tables; those tables are not replayed by this partial refresh, while `users`, Auth, `user_filters`, and `important_dates` remain untouched. This is pre-existing successful-run behavior, not something the single transaction changes. Story 22.13 makes new column creation atomic, preventing new metadata/physical-column orphans. A legacy orphan physical column with no `column_config` row can still make employee replay fail; the job now alerts and rolls back instead of leaving partial data, and the source invariant must be repaired by an approved migration/operator procedure.

## 6. Remote migration history and catalog-proof-gated baseline (R-010)

- The latest committed production migration-history observation is the read-only 2026-06-11 result: remote history empty. Hosted staging was observed at 57 rows through `20260614000000` on 2026-06-14. Both require fresh inventory before action.
- The dated restore record says `staffing_needs.target_headcount`, while migrations and application code require `headcount_need`. Preserve that historical claim but do not treat it as representation proof. Fresh read-only production catalog evidence must confirm `headcount_need` and its exact `0..9999` constraint before any staffing-history repair; `target_headcount` requires an approved forward reconciliation and a stop.
- `supabase/migration-baseline-manifest.json` partitions all 63 repository versions exactly once: 57 `repair-after-catalog-proof` and six `execute`.
- Staging requires one repair (`20250113000000`) only after environment-specific catalog proof, plus five applies. Production requires fresh proof and a signed ledger for the explicit 57-version repair list, plus six applies. No hosted proof is currently claimed and no wildcard repair is permitted.
- The read-only verifier covers room function signatures/body, repayment Boolean columns/indexes/config, staffing tables/typed columns/exact `0..9999` constraint/index/RLS/seeds/RPC, dietary column types/permissions, and the exact six-column `user_filters` structure, constraints, two indexes, update trigger/function, plus a phase-specific policy profile. Production pre-apply uses the dated dashboard aliases and three owner-filter policies; staging pre-apply uses the canonical four-policy profile. It is the automated minimum for known unsafe-replay surfaces; fresh production evidence must prove the exact dated policy semantics, and a signed per-version ledger remains mandatory for all 57 repairs.
- The target gate requires the direct database URL, CLI link, and separately supplied intended-project reference to all match without printing them. The catalog wrapper repeats that gate and exits nonzero with failed check names only. Any mismatch halts before repair/apply; binding is repeated immediately before each repair. After repair, `supabase db push --linked --dry-run --skip-vault` must show only the environment's exact forward list. Full commands and owner gates are in `27_supabase_cutover_runbook.md`.

## 7. Local-stack grant parity

A migration-built **local** stack does not receive the public-schema API-role table grants that the hosted Supabase platform provisions automatically (the local CLI's `postgres` default table ACL grants only `Dxtm` to `anon`/`authenticated`/`service_role`). `supabase/seed.sql` grants the general table/sequence parity, then Story 22.13 explicitly re-revokes authenticated/anon `UPDATE` on `public.users` and `INSERT` on `employee_column_changes` so the blanket local grant cannot reopen privileged writes. `seed.sql` runs only on local reset/start and is never applied to staging/production.

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

- Historical Story 22.10 evidence: `supabase db reset` clean; Story 22.7 RLS 8/8; Story 22.10 reconciliation 11/11 at that time.
- Story 22.13 centralizes Epic 22 tests on the configured `hr-masterdata` high-port stack (`15421` API / `15422` Postgres), rejects a reachable wrong-port/wrong-fingerprint database, and prints an explicit diagnostic only when the expected stack is unreachable.
- On 2026-07-10 the WSL/Linux project mirror rebuilt the Docker-backed high-port stack through migration `20260710150000`. The focused twelve-file batch passed **94/94**, including direct-RPC/table authorization, atomic presentation and user-status transitions, runtime-column restore and backup-manifest integrity, Story 22.7 RLS, and Story 22.10 reconciliation suites; the migration-built catalog remained at 17 policies.
- The final mandatory local gates are complete: Vitest **3,125 passed / 30 skipped**, Playwright **162 passed / 53 skipped / 0 flaky**, `npx tsc --noEmit` exit `0`, and lint exit `0` with no errors. Story 22.13 is review-ready locally. Hosted staging still requires the ordered migration apply, catalog/advisor re-inventory, and revised workflow run before production; local results are not hosted proof.

### Story 22.15 local/static evidence

- The manifest/static suite asserts 63 unique repository versions, 57 repair classifications, six execute classifications, exact staging/production plans, unsafe-replay exclusions, the restored migration digest, and a mutation-free catalog verifier.
- Middleware/login/API tests cover inactive/missing fail-closed behavior, current-session global sign-out, atomic deletion, foreign-key failure behavior, and explicit Auth partial-cleanup reporting.
- A clean high-port reset applied all 63 migrations and the seed on 2026-09-01. The Story 22.15 live suite passed 11/11 for active/inactive role, employee/RPC/filter denial, documented exceptions, catalog proof, foreign-key rollback, final-admin protection, and the synchronized two-client race. Story 22.14 PostgREST passed 1/1 and live export passed 5/5.
- Production's six forward files are not an all-or-nothing transaction. The first temporarily grants legacy execution before a later file revokes/hardens it, so the runbook requires a fresh private inventory of affected-table `supabase_realtime` membership and current/known client connections, then separately authorized temporary Realtime-service disablement plus application/Data API/direct-DB isolation. An existing non-operator Realtime connection must be observed disconnecting, a fresh reconnect must be rejected, and all controls must remain proven through post-apply verification, exact-candidate deployment, and smoke (`R-025`). Vercel ingress and Data API controls do not stop existing/reconnecting Realtime clients; a seasonal user pause is not evidence of isolation. After smoke, restore and catalog/connection-verify the exact prior Realtime and remaining settings. This is a temporary cutover control, not Epic 23 work.
- Hosted catalog proof is bound to an owner-approved absolute `psql` executable by exact version and SHA-256, and to a reviewed explicit CA PEM by SHA-256 with `sslmode=verify-full`; ambient libpq target/TLS overrides and a bare `PATH` executable are rejected before credentials reach the verifier process.
- The final fresh full `npx vitest run` with all local live gates enabled exited `0` on 2026-09-01 with 317/317 files and 3,342/3,342 tests passing with zero skips. Exact full Playwright exited `0` with 163 passed / 47 classified skips / 0 failed; 9 skips require an explicitly authorized notification-capture run and 38 are obsolete/superseded or deterministic-fixture coverage debt. The Next `16.3.3` production build passed. Hosted evidence remains open.
