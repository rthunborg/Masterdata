# Production history classification reassessment — 2026-09-15

## Scope and outcome

This is a redacted planning and read-only-diagnosis record for Story 22.15. It records no hosted database write, history repair, migration apply, deployment, hosted-setting change, or reopening action. Production remains paused; Story 22.15 remains in progress and Epic 23 remains on hold.

Fresh production inventory found the required staffing column but only its lower-bound CHECK. The unchanged historical migration `20260314000002_add_headcount_upper_bound.sql` is therefore not materially represented and cannot truthfully be repaired as applied. The production plan is revised from **57 repair candidates plus 10 apply candidates** to **56 repair candidates plus 11 apply candidates**.

## Revised classification and ordering

`20260314000002_add_headcount_upper_bound.sql` remains immutable. It moves from the production repair-candidate set to the first production apply candidate. The read-only precondition for that migration is exact lower-bound-only representation and zero out-of-range `headcount_need` values. Later catalog phases retain the exact `0..9999` requirement.

The complete apply order is:

1. `20260314000002_add_headcount_upper_bound.sql`
2. `20260614000000_reconcile_environments_security_and_policies.sql`
3. `20260615000000_add_is_checklist_item_to_column_config.sql`
4. `20260709194903_remediate_pr_91_security_findings.sql`
5. `20260710144000_atomic_external_column_presentation.sql`
6. `20260710150000_atomic_user_status_transition.sql`
7. `20260831200026_enforce_active_authorization_and_atomic_user_deletion.sql`
8. `20260909115242_reconcile_saved_filters_and_room_acl.sql`
9. `20260910094517_reconcile_repayment_defaults.sql`
10. `20260910115024_reconcile_post_apply_acl_and_policy_initplans.sql`
11. `20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql`

The historic staffing migration is older than the repair candidates. The reviewed production command must therefore use the production-only include-all shape so that the operator can verify the exact dry run lists all eleven candidates. The runner enforces the reviewed command shape; it does not replace the operator's recorded review of dry-run output. A runner that cannot accept that exact shape is a stop condition; operators must not use an unreviewed native CLI invocation or mark the version as applied.

## Current no-go status

The strict production catalog gate has not passed. The reclassification accepts only the specifically observed lower-bound-only staffing pre-profile and preserves the zero-out-of-range prerequisite; it does not weaken the remaining strict contracts. The other current production failures, the complete 56-row signed effect-proof ledger, approved isolation/settings actions, and the separately authorized history-repair batch remain open.

The owner confirmed fresh database and schema dumps were made locally and verified to contain the real data. This record neither requests nor records a backup location or contents, and it does not claim an independent restore test.

## Validation

The supporting contract-detail diagnostic completed 18 focused tooling tests with 0 failures, skips, cancellations, or todos. The reviewed migration/runner-focused combined gate later passed **87/87** in **798 ms** with exit `0`. These are interim focused results; full release gates remain pending the reviewed implementation changes.

## Context gap

The Story 22.15 status carrier references `_bmad-output/implementation-artifacts/spec-22-15-production-readiness-remediation.md` as a frozen specification. That file is absent from this worktree and no matching file was found under `C:\DEV`. This is a documentation-context gap only: no replacement specification was invented, and the current change follows the reviewed migration, verifier, and runbook evidence available in the repository.

## References

- [Environment reconciliation inventory](../26_environment_reconciliation_inventory.md)
- [Supabase cutover runbook](../27_supabase_cutover_runbook.md)
- [Migrations-only change policy](../28_migrations_only_change_policy.md)
- [Story 22.15](../../sprint-artifacts/story-22.15-production-readiness-remediation.md)
