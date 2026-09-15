# Production history classification reassessment — 2026-09-15

## Scope and outcome

This is a redacted planning and read-only-diagnosis record for Story 22.15. It records no hosted database write, history repair, migration apply, deployment, hosted-setting change, or reopening action. Production remains paused; Story 22.15 remains in progress and Epic 23 remains on hold.

Fresh production inventory found the required staffing column but only its lower-bound CHECK. The unchanged historical migration `20260314000002_add_headcount_upper_bound.sql` is therefore not materially represented and cannot truthfully be repaired as applied. The production plan is revised from **57 repair candidates plus 10 apply candidates** to **56 repair candidates plus 11 apply candidates**.

## Revised classification and ordering

`20260314000002_add_headcount_upper_bound.sql` remains immutable. It moves from the production repair-candidate set to the first production apply candidate. The read-only precondition for that migration is exactly `headcount_need >= 0`, with no upper-bound conjunct, and zero out-of-range `headcount_need` values. Later catalog phases retain the exact `0..9999` requirement.

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

The strict production catalog gate has not passed. The reclassification accepts only the specifically observed lower-only `headcount_need >= 0` staffing pre-profile and preserves the zero-out-of-range prerequisite; it does not weaken the remaining strict contracts. The other current production failures, the complete 56-row signed effect-proof ledger, approved isolation/settings actions, and the separately authorized history-repair batch remain open.

The owner confirmed fresh database and schema dumps were made locally and verified to contain the real data. This record neither requests nor records a backup location or contents, and it does not claim an independent restore test.

## Validation

The supporting contract-detail diagnostic completed 18 focused tooling tests with 0 failures, skips, cancellations, or todos. The reviewed migration/runner-focused combined gate later passed **87/87** in **798 ms** with exit `0`. These are interim focused results; full release gates remain pending the reviewed implementation changes.

## Current implementation candidate — 2026-09-15

Initial implementation commit `5d004cafafcacef7c29d19c361e982d0ea1641a2` is the recorded initial head of draft PR #102. It is not the ongoing review-fix head, is not merged, and is not a release-candidate approval.

- Initial focused migration/runner regression: 189/189 passed; 0 skipped and 0 failed; 2.69 seconds. This pre-commit result covered code identical to the initial implementation commit.
- Initial post-apply regression: 5/5 passed in 8.52 seconds. The saved-filter regression (20/20 in 5.81 seconds) and exact clean 67-migration-chain receipt (16/16 in 7.653 seconds) were run on the initial implementation commit.
- Review-fix pre-commit checks: focused migration/runner regression passed 190/190 with zero failures or skips in 3.29 seconds; the corrected lower-only pre-apply/post-apply regression passed 5/5 with zero failures or skips in 6.10 seconds. Type checking and scoped lint also pass.
- Type checking passed. Lint passed with 0 errors and 296 warnings. A normal `pnpm build` passed in 11.824 seconds after the local dependency junction issue was resolved with a frozen install; no lockfile changed.
- Production dependency audit reports 0 critical and 0 high findings with one accepted UUID moderate finding. The audit command exits 1 for that accepted residual; the documented threshold passes.
- GitHub CI on the initial implementation commit is successful: full Vitest via `pnpm test:silent` (underlying `vitest run --silent=passed-only`) reports 3,393 passed with 76 managed local-service skips in 11 files (179.56 seconds), and integration reports 827 passed with the same 76 managed skips (54.46 seconds). The integration result is not counted as additional unique tests. Both Vercel checks are green. These results do not certify the future review-fix head.

The lead-agent full local `npx vitest run` and exact `npx playwright test` gates are **blocked pending broker recovery, not passed**. After stale guard-owned Compose state was cleared, fresh controlled retries under the root context returned `BROKER_UNAVAILABLE` and then `RESOURCE_UNCERTAIN`; no further retry is planned until broker recovery. No `.env.test` content was used and no user-owned local stack was accessed. CI does not replace those lead-agent gates. The reviewed-code receipt records guard cleanup; it does not waive either full gate.

The first Codex review of the initial implementation completed with two P1 findings, both addressed in the current review fix: strict production pre-apply now accepts only the documented lower-only contract, and the tracked frozen specification is correctly synchronized. Final Codex review for the future exact head, PR readiness, merge, hosted database work, and production release remain pending. Production remains paused.

## Frozen specification confirmation

The tracked frozen Story 22.15 specification at `_bmad-output/implementation-artifacts/spec-22-15-production-readiness-remediation.md` was re-read from its absolute worktree path on 2026-09-15. Its human-owned intent is unchanged. This evidence records the non-frozen execution classification and preparation results only; it does not amend the frozen intent or overwrite its dated historical records.

## Reviewed-code verification receipt

Review-fix implementation `34236674d4875a16402a66b677027463e8d6a54d` passed the combined release, pause, helper and PostgreSQL reconciliation suites: **215 passed across 13 files, zero failures or skips, exit 0, 6.75 seconds**. Only documentation/status evidence was being synchronized; the tested code and SQL match that commit. The fresh 67-migration-plus-seed chain passed all 16 post-apply catalog checks in **6.985 seconds**, exit 0, with disposable database cleanup verified. Catalog SHA-256: `642ba6a70049dd81239a4e1d23deea89d6ba3c88e0565211c0ffb5554dbd8097`.

After testing, native PostgreSQL and the uncertain Compose attempt were stopped through the guard. `CloseActor` acknowledged the stop request; the single following `List` at revision 4107 reported both root-owned resources stopped. Saved files and volumes were preserved, and user-owned resources were untouched. No managed application server or full Playwright run was launched. The full local gates remain blocked; this receipt does not waive them. Final documentation-head CI/Vercel/review results are recorded on PR #102 without changing this tested-code receipt.

## References

The second review identified one indentation error in the BMAD YAML status file. The key is now aligned with its siblings. All three synchronized YAML status files were parsed successfully using the existing ESLint dependency's YAML parser; no dependency was added. This documentation correction changes no application code, tests, migration SQL or catalog SQL. Final exact-head review remains required.

- [Environment reconciliation inventory](../26_environment_reconciliation_inventory.md)
- [Supabase cutover runbook](../27_supabase_cutover_runbook.md)
- [Migrations-only change policy](../28_migrations_only_change_policy.md)
- [Story 22.15](../../sprint-artifacts/story-22.15-production-readiness-remediation.md)
