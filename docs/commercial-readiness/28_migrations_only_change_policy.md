# Supabase Migrations-Only Change Policy

Status: active from Story 22.10 (2026-06-14), hardened by Story 22.15 (2026-09-01)

## Policy

All hosted Supabase **schema, RLS policy, function, grant, and trigger** changes — on **staging and production** — go through version-controlled migrations in `supabase/migrations/` applied with the Supabase CLI (or the equivalent reviewed migration apply). **No dashboard / SQL-editor schema or policy edits.**

This closes the drift that Story 22.8 found (production had 26 RLS policies vs 22 in migrations, an empty remote migration history, and `search_path`/grant advisory gaps — all from out-of-band dashboard edits; see `R-010`, `R-020`, `R-023`).

## Rules

1. **Author forward-only migrations.** Every hosted schema/policy/function/grant change is a new timestamped file in `supabase/migrations/` (`YYYYMMDDHHMMSS_<desc>.sql`), idempotent/guarded where practical (`DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`, `to_regprocedure` guards, `ADD/DROP COLUMN IF EXISTS`). Never edit, rename, or delete a migration version that may have been applied or materially represented on a hosted database.
2. **Verify locally first.** `supabase db reset` must apply cleanly and the RLS evidence suite (`tests/integration/epic-22/story-22.7/supabase-rls-evidence.test.ts`) plus the reconciliation evidence suite (`tests/integration/epic-22/story-22.10/`) must pass before any hosted apply.
3. **Prove before repairing history.** `supabase/migration-baseline-manifest.json` classifies every repository version exactly once. A version may be repaired as applied only when the machine fail-closed read-only catalog wrapper and environment-specific evidence prove its material state. The direct database URL, CLI link, and a separately supplied intended-project reference must all match without being logged. Any mismatch stops the cutover and requires an approved forward reconciliation migration.
4. **No wildcard repair.** Repair only the explicit reviewed version list for the selected environment, and repeat target binding immediately before each repair command. A newly added migration must never be swept into a historical repair loop. Unsafe historical versions, including repayment conversion, dietary-permission replacement, staffing creation/seed, and `user_filters` creation, must not be replayed over represented state.
5. **Dry-run the exact forward set.** After the approved repair list, run `supabase db push --linked --dry-run --skip-vault` from an immutable reviewed commit. The output must contain only the manifest-approved executable list; any extra/missing version stops the operation.
6. **Keep the remote history in sync.** After apply, `supabase migration list --linked` must show local↔remote in sync for staging and production. Never push net-new schema against an environment whose remote history is not baselined.
7. **Staging before production.** Apply and verify on staging, then production — never the reverse. Production applies happen only after a fresh backup, owner-approved maintenance window, and explicit go-live signal (see `27_supabase_cutover_runbook.md`).
8. **No dashboard schema edits.** Auth/platform settings that are genuinely dashboard-only (e.g. leaked-password protection, session/MFA config) are recorded as dated "changed on `<date>` by `<operator role>`" entries in the evidence index, since they are not expressible as SQL migrations.
9. **Local-stack parity is not hosted schema.** `supabase/seed.sql` grants the public-schema API-role table privileges that the hosted platform provisions automatically but the local CLI stack does not. It runs only on `supabase db reset`/`start` and is never applied to hosted environments — it is local parity, not a hosted change.

## Why

- A migrations-built environment must reproduce intended production behavior (rebuild, staging, disaster recovery). Out-of-band edits make the canonical source (`supabase/migrations/`) untrustworthy and were the root cause of the Story 22.8 drift findings.
- Reviewable, version-controlled change history is required for the commercial-readiness security posture (`08_security_overview.md`, `22_supabase_security_evidence_package.md`).

## See also

- `docs/commercial-readiness/27_supabase_cutover_runbook.md` — the staging baseline + production cutover runbook.
- `docs/commercial-readiness/26_environment_reconciliation_inventory.md` — the Story 22.10 drift inventory and reconciled end state.
- `docs/commercial-readiness/22_supabase_security_evidence_package.md` — migration-history, RLS-drift, and advisor evidence.
