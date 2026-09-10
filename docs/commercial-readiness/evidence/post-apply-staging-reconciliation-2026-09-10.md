# Post-Apply Staging Reconciliation Evidence — 2026-09-10

## Scope

This redacted record covers the owner-authorized staging repair/apply sequence. It contains no database URLs, project refs, credentials, raw row data, or employee rows. Production remained paused and untouched; no further hosted action is authorized.

## Staging result

- Owner-approved PR #97 `5ec0deb81d921923330ddecc93fcb3b1e57d8ec9` merged into staging `4aa2143dc42b4bc82a8ca7fa6efd7a95e9bde3be`; the tree is identical.
- Repair `20250113000000` succeeded at `2026-09-10T11:26:32.913Z`; immediate history was 58 rows.
- Applies `20260615000000`, `20260709194903`, `20260710144000`, `20260710150000`, `20260831200026`, `20260909115242`, and `20260910094517` succeeded at `2026-09-10T11:34:32.834Z`.
- History was 65/65 with zero pending at `2026-09-10T11:34:43.467Z`.

## Post-apply catalog

Only `story_22_15_phase_contracts` failed: `get_user_role()` retains extra `service_role` EXECUTE. All three checked function bodies/attributes and all eight outbox subchecks pass. Aggregate/hash evidence is unchanged and no rows were exposed. Security advisors report 0 WARN-or-higher findings at pinned CLI coverage. Performance advisors report 5 WARN: three prior `multiple_permissive_policies` and two `auth_rls_initplan` findings on `column_config` and `employee_column_changes`. INFO-severity findings and certain Management API checks are not covered.

## Forward correction and gates

Proposed `20260910115024_reconcile_post_apply_acl_and_policy_initplans.sql` revokes the grant and changes caller identity predicates in two policies: `column_config` `USING` and `WITH CHECK`, plus `employee_column_changes` `USING` (three expressions total); it writes no application data. The candidate is 66 repository versions: staging repair `[]`, execute `[20260910115024]`; provisional production is 57 repairs plus nine executes after fresh inventory. The new `staging_reconciliation_pre_apply` phase accepts the exact 65-version staging state before this correction; strict post-apply expects the correction. New correction tests are pending; no prior test gate is claimed for this candidate. Story 22.15 remains in-progress, Epic 23 on hold, production paused, and all further hosted actions separately owner-gated.

Private source reports: `C:\DEV\hr-masterdata-pr97-gate-support-20260910`; review summary: PR #97 comment `5618074350`.
