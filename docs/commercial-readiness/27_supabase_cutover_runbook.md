# Epic 22 Supabase Cutover Runbook (Story 22.10)

Status: **Staging (Section A) EXECUTED + verified 2026-06-14 via the Supabase MCP. Production (Section B) is prepared, not yet executed** — it requires explicit owner approval and a maintenance window at the Epic 22 → production cutover.

This runbook covers the hosted side of the Story 22.10 reconciliation: baseline the remote migration history, apply the reconciliation migration (`20260614000000_reconcile_environments_security_and_policies.sql`), and verify. It is split into **STAGING execution** (Story 22.10 Phase A — done) and **PRODUCTION cutover** (Phase B, run at the Epic 22 → production cutover).

> **Auth attack protection (leaked-password + CAPTCHA) is NOT part of this runbook** — it was moved to **Epic 23 (Story 23.4)** on 2026-06-14 (Auth/dashboard setting, enterprise hardening, not a schema change).

> **Production-change freeze:** Production steps (Section B) run ONLY after all of Epic 22 is merged to staging, the owner verifies staging, Epic 22 is merged to production, and the owner approves a production maintenance window. Until then, production stays untouched.

## Binding sequence (per environment — do not reorder)

1. Read-only inventory (migration list, advisors, policy counts).
2. **Baseline** the remote migration history with `migration repair --status applied` for the historical migrations — records them as applied **without re-running**.
3. **Apply** only the net-new reconciliation migration.
4. Verify (migration list in sync, advisors, policy counts).

> Auth attack protection (leaked-password / CAPTCHA) is handled separately in Epic 23 (Story 23.4), not in this sequence.

> **Never run `supabase db push` (or any apply) before the repair baseline.** The remote history is empty (R-010); a push against an empty history can try to replay all migrations against the live schema and corrupt it. Repair records history without executing.

## Pre-flight (both environments)

- Authenticate the Supabase CLI for the **hr-masterdata** account and link the target project: `supabase login`, then `supabase link --project-ref <TARGET_PROJECT_REF>`. Resolve the ref from a private source at runtime; never commit it.
- Confirm you are NOT inside the 02:00 UTC nightly window (`.github/workflows/supabase-nightly-backup.yml`, which truncates+reloads staging `employees`/`column_config`). Staging is owner-only, so no scheduling is needed, but do not let a reconciliation apply overlap a nightly refresh.
- The reconciliation migration is environment-agnostic and idempotent; the data-only nightly restore stays compatible (it only drops staging-only junk columns that production lacks).

---

## A. STAGING execution (Story 22.10 Phase A) — ✅ EXECUTED + VERIFIED 2026-06-14

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
Confirm staging-only junk columns (`asdas`, `testerere`) and that production runtime custom columns (`seably_*`) are present as expected.

**A3 — Baseline the remote migration history (repair, does NOT re-run)**
Repair every historical migration (all except the new reconciliation `20260614000000`) to `applied`:
```bash
for f in supabase/migrations/*.sql; do
  v=$(basename "$f" | cut -d_ -f1)
  if [ "$v" != "20260614000000" ]; then
    supabase migration repair --status applied "$v" --linked
  fi
done
supabase migration list --linked   # historical migrations now show as applied remotely
```

**A4 — Apply the reconciliation migration**
```bash
supabase db push --linked          # applies ONLY 20260614000000 (the rest are baselined)
```
MCP alternative: `apply_migration(name: "reconcile_environments_security_and_policies", query: <contents of 20260614000000_*.sql>)` — `apply_migration` runs the SQL and records one migration row, so it does not replay history. If you use the MCP apply, still complete A3 via the CLI so the remote history is fully baselined.

**A5 — Verify**
```bash
supabase migration list --linked                  # local ↔ remote IN SYNC
supabase db advisors --linked --type security      # function_search_path_mutable -> 0; secdef anon 5->1, authenticated 5->3 (justified)
supabase db advisors --linked --type performance   # multiple_permissive materially reduced; auth_rls_initplan -> ~0
```
Policy/grant spot checks (CLI `db` query or MCP `execute_sql`), redacted to counts/names:
```sql
SELECT tablename, count(*) FROM pg_policies WHERE schemaname='public' GROUP BY tablename ORDER BY tablename;
SELECT has_function_privilege('anon','public.remove_jsonb_key(text,text)','EXECUTE');         -- expect false
SELECT has_function_privilege('authenticated','public.add_custom_column_to_employees(text,text)','EXECUTE'); -- expect true
SELECT proname, proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND proconfig IS NULL; -- expect no row missing search_path among the 11 reconciled functions
SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='employees' AND column_name IN ('asdas','testerere'); -- expect 0 rows
```

**A6 — Enable leaked-password protection on staging Auth** — **MOVED to Epic 23 (Story 23.4 AC6)** (owner decision 2026-06-14). Leaked-password protection + CAPTCHA are Auth attack-protection settings handled with Epic 23 enterprise hardening, not this reconciliation. (Dashboard location for reference: Authentication → Attack Protection → "Prevent use of leaked passwords".)

**A7 — Record staging results** — done (see §A banner; `26_…inventory.md` §8 and `22_…evidence_package.md` updated)
Update `docs/commercial-readiness/22_supabase_security_evidence_package.md` (migration-history, RLS-drift, advisor sections) and `26_environment_reconciliation_inventory.md` §8 with the staging advisor deltas (counts only). Confirm `migration list --linked` in sync.

---

## B. PRODUCTION cutover (Story 22.10 Phase B — Epic 22 production cutover only)

> **Do not run until:** all of Epic 22 is merged to staging → owner verifies staging → Epic 22 merged to production → owner approves a maintenance window. Coordinate around the nightly job.

**B1** — Pre-flight + read-only inventory against production (`migration list --linked`, `db advisors --linked`). Expect empty remote history (R-010).

**B2** — Baseline production remote history: same repair loop as A3 against the linked production project (repair all historical migrations to `applied`).

**B3** — Apply the reconciliation migration to production: `supabase db push --linked` (applies only `20260614000000`). Confirm `migration list --linked` in sync.

**B4** — ~~Enable leaked-password protection on production Auth~~ **MOVED to Epic 23 (Story 23.4 AC6)** — not part of the production reconciliation cutover.

**B5** — Verify production: re-run `db advisors --linked` (security + performance), capture redacted policy counts and the function grant/`search_path` spot checks (as in A5).

**B6** — Close-out:
- Update `docs/commercial-readiness/11_risk_register_and_open_questions.md`: `R-010`, `R-023`, `R-020` → **Closed** (production reconciled), keeping the advisor follow-ups noted.
- Update `22_supabase_security_evidence_package.md` and `26_environment_reconciliation_inventory.md` with production-verified counts.
- Set the Epic 22 completion gate `story-22.10-phase-b` to `done` in `docs/sprint-artifacts/epic-22-sprint-status.yaml`.

## Rollback / safety

- The reconciliation migration is guarded (`DROP ... IF EXISTS`, `to_regprocedure` checks, `ADD/DROP COLUMN IF EXISTS`) and wrapped in a transaction; a failed apply rolls back cleanly.
- `migration repair` only records history (no DDL), so baselining is non-destructive.
- If a policy/grant change causes an app regression, re-grant or restore the specific policy via a follow-up migration (do not dashboard-edit — see `28_migrations_only_change_policy.md`).
- Take a fresh backup (run the nightly workflow via `workflow_dispatch`) immediately before the production apply.

## Sign-off checklist

- [x] Staging: history baselined; reconciliation applied; `migration list --linked` in sync (57); advisors re-run — DONE 2026-06-14 via MCP.
- [ ] Owner verified staging.
- [ ] Production maintenance window approved.
- [ ] Production: backup taken; history baselined; reconciliation applied; in sync; advisors re-run.
- [ ] (Epic 23 / Story 23.4) Auth attack protection — leaked-password + CAPTCHA — enabled on staging and production.
- [ ] `R-010` / `R-023` / `R-020` closed; evidence package + inventory updated; `story-22.10-phase-b` gate set to `done`.
