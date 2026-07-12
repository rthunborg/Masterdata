# Epic 22 Supabase Cutover Runbook (Stories 22.10 and 22.13)

Status: **Story 22.10 staging reconciliation was executed and verified on 2026-06-14. Story 22.13 is locally verified but its four post-22.10 migrations are not yet applied/re-verified on hosted staging. Production is prepared, not executed.** Hosted changes require owner approval and the Epic 22 maintenance window.

This runbook preserves the dated Story 22.10 staging evidence and adds the Story 22.13 delta. The repository now has 61 migrations. Hosted staging was observed in sync through 57 on 2026-06-14; `20260615000000_add_is_checklist_item_to_column_config.sql`, `20260709194903_remediate_pr_91_security_findings.sql`, `20260710144000_atomic_external_column_presentation.sql`, and `20260710150000_atomic_user_status_transition.sql` must be applied in order and re-verified there. Production still needs the migration-history baseline plus every net-new migration through `20260710150000`.

> **Auth attack protection (leaked-password + CAPTCHA) is NOT part of this runbook** — it was moved to **Epic 23 (Story 23.4)** on 2026-06-14 (Auth/dashboard setting, enterprise hardening, not a schema change).

> **Production-change freeze:** Production steps (Section B) run ONLY after all of Epic 22 is merged to staging, the owner verifies staging, Epic 22 is merged to production, and the owner approves a production maintenance window. Until then, production stays untouched.

## Binding sequence (per environment — do not reorder)

1. Read-only inventory (migration list, advisors, policy counts, grants).
2. **Baseline only migrations already represented by the hosted schema** with `migration repair --status applied` — records them as applied **without re-running**. This step is required for production's empty history; do not mark a net-new migration applied without executing it.
3. **Apply all pending migrations in version order.** For staging after the 2026-06-14 baseline, that means `20260615000000`, `20260709194903`, `20260710144000`, then `20260710150000`. For production after the historical baseline, prepend `20260614000000` to that sequence.
4. Verify (61 migrations in sync, 17 intended policies after Story 22.13, grants, direct-role behavior, advisors).

> Auth attack protection (leaked-password / CAPTCHA) is handled separately in Epic 23 (Story 23.4), not in this sequence.

> **Never run `supabase db push` (or any apply) before the repair baseline.** The remote history is empty (R-010); a push against an empty history can try to replay all migrations against the live schema and corrupt it. Repair records history without executing.

## Pre-flight (both environments)

- Authenticate the Supabase CLI for the **hr-masterdata** account and link the target project: `supabase login`, then `supabase link --project-ref <TARGET_PROJECT_REF>`. Resolve the ref from a private source at runtime; never commit it.
- Confirm you are NOT inside the 02:00 UTC nightly window (`.github/workflows/supabase-nightly-backup.yml`, which refreshes staging `column_config` and `employees`). Staging is owner-only, but do not overlap a migration apply with that job.
- The Story 22.13 partial refresh requires a compatible custom-format archive, restores config, synchronizes config-backed runtime columns, and then restores employees in one transaction. A failed replay rolls back and alerts. A successful `TRUNCATE ... CASCADE` still clears employee-dependent party/audit tables that the partial job does not replay; this accepted scope is documented in `09_operations_support_and_sla.md` and `26_environment_reconciliation_inventory.md`.
- Before hosted apply, require the Story 22.13 focused local high-port evidence (94/94 passed on `15421`/`15422`) and full Vitest, Playwright, type-check, and lint gates tracked by `E-012`. These local preconditions are green and the story is in review; they do not authorize or substitute for the owner-controlled hosted apply.

---

## A. STAGING execution (Story 22.10 Phase A) — ✅ HISTORICAL EXECUTION VERIFIED 2026-06-14

> **Done 2026-06-14 via the Supabase MCP** against `masterdata-staging` (`<STAGING_REF>`): `apply_migration` applied the reconciliation atomically; the remote history was baselined by recording the reconciliation + inserting the 56 historical versions into `supabase_migrations.schema_migrations`. Verified: 19 canonical policies (was 26), junk columns dropped, deadline columns present, `migration list` 57 in sync; advisors `function_search_path_mutable` 12→0, security-definer-executable anon 5→1 / authenticated 5→3, `auth_rls_initplan` 9→0, `multiple_permissive_policies` 54→3. Production untouched. The CLI steps below are retained as the reference method (and the basis for Section B).

**A1 — Read-only inventory (baseline before changes)**
```bash
supabase migration list --linked                 # expect: 56 local, remote history EMPTY
supabase db advisors --linked --type security     # record counts (expect leaked-password + search_path + secdef warnings)
supabase db advisors --linked --type performance  # record counts (multiple_permissive, auth_rls_initplan)
```
MCP alternative for reads: `list_migrations`, `get_advisors(type: security|performance)`, and `execute_sql` for `pg_policies` counts.

**A2 — (optional) Fresh staging schema dump for the record**
```bash
supabase db dump --linked -f /tmp/staging-schema.sql   # private, do NOT commit
```
Record the staging-only junk columns (`asdas`, `testerere`) and whether config-backed production runtime columns (`seably_*`-style) are absent or present. Do not hard-code a particular runtime column as required schema; Story 22.13 derives the restore schema from `column_config`.

**A3 — Baseline the remote migration history (repair, does NOT re-run)**
Repair only the 56 historical migrations that predate the reconciliation. The exclusions below are net-new migrations and must execute normally:
```bash
for f in supabase/migrations/*.sql; do
  v=$(basename "$f" | cut -d_ -f1)
  case "$v" in
    20260614000000|20260615000000|20260709194903|20260710144000|20260710150000) ;;
    *) supabase migration repair --status applied "$v" --linked ;;
  esac
done
supabase migration list --linked   # historical migrations now show as applied remotely
```

**A4 — Apply the reconciliation migration (historical 2026-06-14 execution)**
```bash
supabase db push --linked          # on 2026-06-14 this applied ONLY 20260614000000
```
MCP alternative: `apply_migration(name: "reconcile_environments_security_and_policies", query: <contents of 20260614000000_*.sql>)` — `apply_migration` runs the SQL and records one migration row, so it does not replay history. If you use the MCP apply, still complete A3 via the CLI so the remote history is fully baselined.

**A5 — Verify**
```bash
supabase migration list --linked                  # local ↔ remote IN SYNC
supabase db advisors --linked --type security      # function_search_path_mutable -> 0; secdef anon 5->1, authenticated 5->3 (justified)
supabase db advisors --linked --type performance   # multiple_permissive materially reduced; auth_rls_initplan -> ~0
```
Historical Story 22.10 policy/grant spot checks (CLI `db` query or MCP `execute_sql`), redacted to counts/names:
```sql
SELECT tablename, count(*) FROM pg_policies WHERE schemaname='public' GROUP BY tablename ORDER BY tablename;
SELECT has_function_privilege('anon','public.remove_jsonb_key(text,text)','EXECUTE');         -- expect false
SELECT proname, proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proconfig IS NULL; -- expect no row missing search_path among the 11 reconciled functions
SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name IN ('asdas','testerere'); -- expect 0 rows
```

**A6 — Enable leaked-password protection on staging Auth** — **MOVED to Epic 23 (Story 23.4 AC6)** (owner decision 2026-06-14). Leaked-password protection + CAPTCHA are Auth attack-protection settings handled with Epic 23 enterprise hardening, not this reconciliation. (Dashboard location for reference: Authentication → Attack Protection → "Prevent use of leaked passwords".)

**A7 — Record staging results** — done (see §A banner; `26_…inventory.md` §8 and `22_…evidence_package.md` updated)
Update `docs/commercial-readiness/22_supabase_security_evidence_package.md` (migration-history, RLS-drift, advisor sections) and `26_environment_reconciliation_inventory.md` §8 with the staging advisor deltas (counts only). Confirm `migration list --linked` in sync.

### A8 — Apply and verify the Story 22.13 staging delta — PENDING

Do not rewrite the 2026-06-14 observations above. Capture a fresh pre-apply inventory, then apply the four migrations added after the observed 57-migration staging baseline:

```bash
supabase migration list --linked                  # expect hosted staging through 20260614000000
supabase db advisors --linked --type security
supabase db advisors --linked --type performance
supabase db push --linked                          # applies 20260615000000 through 20260710150000 in order
supabase migration list --linked                  # expect 61 local ↔ remote in sync
```

Verify the Story 22.13 target directly (redacted catalog/grant results only):

```sql
SELECT count(*)
FROM pg_policies
WHERE schemaname = 'public';                       -- expect 17

SELECT has_function_privilege('authenticated', 'public.add_custom_column_to_employees(text,text)', 'EXECUTE');
                                                     -- expect false
SELECT has_function_privilege('service_role', 'public.add_custom_column_to_employees(text,text)', 'EXECUTE');
                                                     -- expect false
SELECT has_function_privilege('authenticated', 'public.create_employee_column_config(text,text,text,boolean,text,text,jsonb,boolean)', 'EXECUTE');
                                                     -- expect false
SELECT has_function_privilege('service_role', 'public.create_employee_column_config(text,text,text,boolean,text,text,jsonb,boolean)', 'EXECUTE');
                                                     -- expect true
SELECT has_function_privilege('authenticated', 'public.update_staffing_need(text,integer,uuid)', 'EXECUTE');
                                                     -- expect true; function still enforces active HR Admin/Crewing + actor binding
SELECT has_function_privilege('authenticated', 'public.update_own_last_active_at()', 'EXECUTE');
                                                     -- expect true; function binds auth.uid() and updates last_active_at only
SELECT has_function_privilege('authenticated', 'public.update_assigned_column_presentation(text,jsonb)', 'EXECUTE');
                                                     -- expect true; function rechecks caller role/assignment while row-locked
SELECT has_function_privilege('authenticated', 'public.set_user_active_status(uuid,boolean)', 'EXECUTE');
                                                     -- expect true; function enforces active HR authorization and last-admin invariant atomically
SELECT has_table_privilege('authenticated', 'public.users', 'UPDATE');
                                                     -- expect false
SELECT has_table_privilege('authenticated', 'public.employee_column_changes', 'INSERT');
                                                     -- expect false
```

The checked-in Epic 22 database suites intentionally reject hosted targets, so do not point them at staging. Use owner-approved, transaction-scoped operator probes (rolled back after assertions) or a separately reviewed staging-safe harness. Confirm that inactive HR users cannot manage `column_config`, ordinary authenticated users cannot forge audit rows or mutate privileged `users` fields, staffing audit actors cannot be spoofed, and the runtime-column restore is config-before-schema-before-employees. Re-run advisors and record the hosted counts; do not copy local results into the hosted evidence column.

---

## B. PRODUCTION cutover (Story 22.10 Phase B — Epic 22 production cutover only)

> **Do not run until:** all of Epic 22 is merged to staging → owner verifies staging → Epic 22 merged to production → owner approves a maintenance window. Coordinate around the nightly job.

**B1** — Pre-flight + read-only inventory against production (`migration list --linked`, `db advisors --linked`). Expect empty remote history (R-010). Capture a fresh private schema dump and compare tables, columns, constraints, functions/signatures, policies, triggers, and grants against the 56-migration historical baseline. Stop and classify every mismatch before repair; the dated 2026-05-28 snapshot is not sufficient authority to mark current production DDL as applied.

**B2** — Baseline production remote history only after B1 proves and records that each of the 56 historical migrations is materially represented by the current hosted schema. Use the A3 repair method for that verified set. If any historical migration is not represented, stop and write an approved reconciliation migration; never repair past missing DDL. Do **not** mark `20260614000000`, `20260615000000`, `20260709194903`, `20260710144000`, or `20260710150000` applied without executing them.

**B3** — Apply the pending production migrations in order: `supabase db push --linked` should apply `20260614000000`, `20260615000000`, `20260709194903`, `20260710144000`, then `20260710150000`. Stop if the pre-flight migration list does not match that plan. Confirm `migration list --linked` shows 61 local↔remote entries in sync.

**B4** — ~~Enable leaked-password protection on production Auth~~ **MOVED to Epic 23 (Story 23.4 AC6)** — not part of the production reconciliation cutover.

**B5** — Verify production: re-run `db advisors --linked` (security + performance), capture the redacted 17-policy catalog, and repeat the Story 22.13 grant/direct-role checks from A8. Verify application smoke paths for HR column administration, external assigned-value editing, the field-limited service path for assigned-column presentation metadata (`column_name`, `category`, `category_color`), staffing updates, user activity, and scoped change history.

**B6** — Close-out:
- Update `docs/commercial-readiness/11_risk_register_and_open_questions.md`: `R-010`, `R-023`, `R-020` → **Closed** (production reconciled), keeping the advisor follow-ups noted.
- Update `R-005`/`R-014` with the hosted Story 22.13 verification result; keep the accepted partial-refresh caveats under `R-024` unless the scope is changed.
- Update `22_supabase_security_evidence_package.md` and `26_environment_reconciliation_inventory.md` with production-verified counts.
- Set the Epic 22 completion gate `story-22.10-phase-b` to `done` in `docs/sprint-artifacts/epic-22-sprint-status.yaml`.

## Rollback / safety

- The Story 22.10 reconciliation is guarded (`DROP ... IF EXISTS`, `to_regprocedure` checks, `ADD/DROP COLUMN IF EXISTS`) and transactional. Story 22.13 is also transactional; its atomic column-creation RPC commits metadata and physical DDL together or not at all.
- `migration repair` only records history (no DDL), so baselining is non-destructive.
- If a policy/grant change causes an app regression, restore the specific least-privilege behavior via a reviewed follow-up migration (do not dashboard-edit and do not broadly re-grant the raw DDL or client table writes — see `28_migrations_only_change_policy.md`).
- Take a fresh backup (run the nightly workflow via `workflow_dispatch`) immediately before the production apply.

## Sign-off checklist

- [x] Staging: history baselined; reconciliation applied; `migration list --linked` in sync (57); advisors re-run — DONE 2026-06-14 via MCP.
- [x] Local: project-scoped high-port stack rebuilt through `20260710150000`; focused Story 22.13 live verification 94/94 — DONE 2026-07-10.
- [x] Story 22.13 final full gates green: Vitest 3,125 passed / 30 skipped; Playwright 162 passed / 53 skipped / 0 flaky; type-check and lint exit 0 (`E-012`) — DONE 2026-07-10.
- [ ] Hosted staging: apply `20260615000000` through `20260710150000` in order; 61 migrations in sync; 17 policies/grants/direct-role behaviors re-verified; advisors recorded.
- [ ] Owner verified staging.
- [ ] Production maintenance window approved.
- [ ] Production: backup taken; historical migration history baselined; all five pending migrations applied in order; 61 in sync; 17 policies/grants/direct-role behaviors and advisors re-verified.
- [ ] (Epic 23 / Story 23.4) Auth attack protection — leaked-password + CAPTCHA — enabled on staging and production.
- [ ] `R-010` / `R-023` / `R-020` closed; evidence package + inventory updated; `story-22.10-phase-b` gate set to `done`.
