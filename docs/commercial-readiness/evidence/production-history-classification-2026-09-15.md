# Production history classification reassessment — 2026-09-15

> **Historical classification, superseded for current execution ordering.** This record preserves the then-current 56-repair/11-apply classification and its dated receipts. The later forward-only v68 ACL prerequisite raises the current production plan to 56 repairs plus 12 applies; see [the dated current ACL-prerequisite evidence](canonical-trigger-acl-prerequisite-2026-09-15.md). Do not rewrite the historical classifications below.

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

## PR #102 staging merge receipt — 2026-09-15

PR #102 reviewed head `841794efd9377f719a2262cfd1b2f633780c8a56` received a clean Codex Reviewbot comment `5686075592` at `2026-09-15T18:43:33Z`; Run Tests, Vercel, and Vercel Preview Comments were all successful. Under the standing owner authorization for reviewed staging PRs, it merged at `2026-09-15T18:49:46Z` as staging merge commit `3e41b35c269d606545b766d1445d1e361e92f88c`, with parents `a85f65ef882b85a035ae16183dcb95f39bbab810` and the reviewed head. The merge tree `777be3e97f176b1000eda84c86e92ec2273917a7` exactly matches the reviewed head; `main` remains `822350986f4c023948a7bbf490ddffc371185c4a`, with no unexpected intervening commits. The merge itself made no hosted database access or production change. The subsequent staging v68 `--include-all` dry run/apply is recorded below; production remains paused.

## Staging v68 execution receipt — 2026-09-15

Before private target access, the local package pin stopped because required reason metadata was absent. The exact reviewed reason was then recorded; inventory binding and strict semantic comparison passed 11/11 in 95.0931 ms, and no repository SQL changed. On merged staging `3e41b35c269d606545b766d1445d1e361e92f88c`, all six fresh pre-apply proofs passed from 18:54:48 to 18:55:08 UTC against manifest SHA-256 `d61d5cca0754f60e55dfea9ccfc4a8d4b39d0861aa3df732035fb12f4169ed01`. The reviewed dry run captured at 18:56:07 UTC listed exactly `20260910184840_reconcile_canonical_trigger_acl_prerequisite.sql` with SQL SHA-256 `fd4b331e61e830421516b99cac9eedb0ac55184ce4ae4216e58137012737723a`.

Under standing authorization, that one forward migration applied from `2026-09-15T18:56:23.673Z` to `2026-09-15T18:56:47.101Z`, exit `0` without timeout. Immediate history verification at `2026-09-15T18:56:31.866Z` recorded exact 68/68 repository/hosted history with no pending or remote-only versions. All five post-apply phases passed: strict catalog 16/16; advisors 0 security WARN-or-higher and three known performance WARN; repayment aggregates, four permission hashes, and audit preservation (353 rows, 90 nonnull actors, 0 unmapped, canonical hash `084def93b0dfd29df9076e2d007116ff`) remained unchanged. This is staging evidence only: no production write, setting change, main merge, deployment, or reopening occurred; production remains 56 repair candidates plus 12 applies and paused.

## References

The second review identified one indentation error in the BMAD YAML status file. The key is now aligned with its siblings. All three synchronized YAML status files were parsed successfully using the existing ESLint dependency's YAML parser; no dependency was added. This documentation correction changes no application code, tests, migration SQL or catalog SQL. Final exact-head review remains required.

- [Environment reconciliation inventory](../26_environment_reconciliation_inventory.md)
- [Supabase cutover runbook](../27_supabase_cutover_runbook.md)
- [Migrations-only change policy](../28_migrations_only_change_policy.md)
- [Story 22.15](../../sprint-artifacts/story-22.15-production-readiness-remediation.md)
