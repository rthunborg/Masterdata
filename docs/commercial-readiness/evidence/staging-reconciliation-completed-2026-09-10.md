# Staging reconciliation completed — 2026-09-10

**Staging schema reconciliation is complete. Story 22.15 remains in-progress and Epic 23 on hold.** Hosted direct-role/RPC acceptance, owner staging verification and production-specific preparation remain open. Production stays paused.

## Candidate and authorization

PR #98 final reviewed head `ac38f8e874b61948809c5dfdb09ca2df054da254` passed GitHub CI run `34488474306`, both Vercel checks and final Codex Reviewbot at 14:23:51Z with no new findings; all four prior inline findings were addressed. [Final head evidence](https://github.com/rthunborg/Masterdata/pull/98#issuecomment-5620425786).

The owner separately approved its merge. It merged at 14:48:57Z to **`62a52e32aae8302d6c6be4b35ec39da298c5061c`**, first parent `4aa2143dc42b4bc82a8ca7fa6efd7a95e9bde3be`. Both approved-head and merge trees are `d6f223e35cd26157a25cf93726d1ffe620f3119f`. Fresh fetches showed no unrelated intervening staging changes; main remains `822350986f4c023948a7bbf490ddffc371185c4a`. All hosted operations below ran from a clean isolated checkout pinned to that merge. [Post-merge proof](https://github.com/rthunborg/Masterdata/pull/98#issuecomment-5620698635).

After the exact one-migration action was presented, the owner stated: “You are authorized to apply all future migrations you need to apply. Proceed.” This standing authorization covers required migration applies while preserving reviewed prerequisites. It does not authorize history repair, data cleanup outside reviewed migrations, deployments, hosted setting changes, merges, or production reopening. No further staging history repair is permitted or needed.

## Exact completed action

- Version/file: `20260910115024_reconcile_post_apply_acl_and_policy_initplans.sql`.
- SQL SHA-256: `7b4f11898f43d88d36fbc1661fb45175629a950750350d43c3f639e959afc74d`.
- Command: `node supabase/verify/run-reviewed-supabase-cli.mjs db push --reviewed-target --skip-vault`.
- Apply started: **2026-09-10T15:12:39.328Z**; exit **0**, no timeout.
- Immediate history verified: **15:12:44.291Z**, **66/66**, zero pending and remote-only versions.
- One attempt only; no history repair, reset, replay, or retry.

The transactional correction removed the extra explicit service_role EXECUTE grant on `public.get_user_role()` and normalized three caller identity expressions across two policies: column_config USING/WITH CHECK and employee_column_changes USING. The active-role, employee visibility and column permission requirements remain intact. The migration contains no application row INSERT/UPDATE/DELETE; no data cleanup occurred.

## Verification

Reviewed executable paths, exact versions/hashes (Supabase CLI **2.115.0** and approved psql), root certificate integrity, encrypted input integrity and three-way staging/session-pooler target binding were reverified. Private inputs stayed encrypted at rest and in process memory during execution. Every hosted CLI operation used the reviewed runner; both release catalog phases used `verify-production-baseline-catalog.mjs`.

| Proof | UTC | Result |
| --- | --- | --- |
| Pre-apply history/catalog/dry run | Immediately before apply | 65 applied, only the exact correction pending; 15/15 current pre-apply checks; exact one-file dry run |
| Repeated post-apply history | 15:13:27.658 | 66/66; zero pending/remote-only |
| Exact runbook advisors | 15:13:31.767 | Security 0 WARN+; performance 3 multiple_permissive_policies WARN; both auth_rls_initplan warnings removed |
| Strict post_apply catalog | 15:13:47.823 | **15/15 passed**, no failed groups; exact 17-policy profile, enabled RLS and restrictive ACL/grant-option contracts |
| Read-only aggregates/hashes | 15:13:50.261 | Identical to pre-apply and prior 65-version baseline |
| Production-domain deployment lookup | 15:14:50.232 | Still targets recorded READY production pause deployment |

The aggregate SQL uses an explicit READ ONLY transaction, 15-second statement timeout, 3-second lock timeout, verify-full TLS and ROLLBACK. Saved-filter total/orphan/empty/overlength counts are all **0**. Repayment OMC true/false/NULL counts are **0/1/32**; PE3 **1/0/32**. Each configuration has one row. Permission MD5 values remain:

| Column | Permission hash |
| --- | --- |
| special_diet | `608d8d6a5846555a137171568d7b82a5` |
| diet_details | `608d8d6a5846555a137171568d7b82a5` |
| repayment_needed_omc | `02b8319f6f054191fe4131b27e060f98` |
| repayment_needed_pe3 | `3a274a1d25cd34f07f378195bb080f29` |

A separately reviewed READ ONLY role probe at **15:24:41.869Z** passed **8/8 booleans**: unknown and anonymous identities resolve to NULL application roles; the unknown identity sees no rows in users, employees, staffing, staffing history, audit and saved filters. Zero visible rows does not prove each table contained rows that RLS hid. The probe verified synthetic identity absence, exact clean candidate, strict catalog and SQL hash `bd4ad169db845f4360909e02b78406730effbac863f09dda25c7c3cef5e8bace`; it used local claims/roles, bounded timeouts and ROLLBACK. No fixture rows were written. [Completed apply and bounded role proof](https://github.com/rthunborg/Masterdata/pull/98#issuecomment-5621130666).

Advisor scope is the pinned CLI default WARN-or-higher database query. INFO severity and certain Management API security-definer/GraphQL checks are not covered. The remaining three performance warnings are classified evidence, not zero findings or an unqualified security clearance.

## Remaining gates and proof limits

1. Prepare and review a transaction-scoped hosted direct-role/RPC acceptance probe. The checked-in live test suites reject hosted targets. The prior temporary probe is unreviewed, untested and has a known final-admin verification gap; it was not executed. Rollback-scoped fixture writes require authorization beyond a read-only query or a migration apply.
2. Obtain owner verification of the exact staging application candidate. Do not claim production readiness from schema proof alone.
3. Prepare fresh production-specific catalog/history/publication inventory and the signed representation ledger before any history repair. The manifest production plan remains provisional at 57 represented repairs plus nine applies; do not make production or staging conform to a stale database snapshot.
4. Preserve the current pause, API/mutation shutdown and job shutdown. Production backup, isolation/settings changes and history repair retain their separate gates. Main merges, deployments/promotions and reopening remain separately owner-controlled.

The Vercel connector proves the production-domain deployment target, but does not expose current automatic domain-assignment or active cron settings. Their last independent proof is 2026-09-09; refresh those settings before any production-targeted action. A production-targeted upload can affect aliases or cron definitions even without ordinary custom-domain promotion.

The manifest remains the reviewed reconciliation plan, not mutable execution history. Its staging execute entry is already applied; use fresh migration history and strict post_apply for current validation. Do not rerun the completed pre-apply/apply sequence.

Read-only probe review found that the old artifact deliberately emits a false pending-final-admin result, omits successful/idempotent deletion handoff, and lacks a two-session concurrency check. The replacement should distinguish self-delete denial and static count/lock proof from the reachable concurrent delete/deactivate invariant. A two-session fixture procedure needs committed synthetic setup visible to both sessions and explicit cleanup verification; it cannot be described as wholly rollback-scoped. No real users should be deactivated to construct a final-admin case. The ordinary active/inactive role, filter CRUD, RPC denial and FK rollback cases can use one rollback transaction with approved synthetic fixtures. Exact executable probe review/local testing and authorization remain open.

## Test evidence scope

This follow-up changes documentation and status evidence only. Application, migration, verifier, dependency, deployment and test source remain identical to the reviewed merge. No new full-suite result is claimed and Story 22.15 is not moved to done/review. The full verification remains [scoped to its tested commits](post-apply-staging-reconciliation-2026-09-10.md): Vitest 3,451 passed with zero skips on `269e3d5634c68e1bc502839678247833e1cccc54`; exact Playwright 163 passed / 47 individually classified skips / zero failures or errors and complete clean 66-migration fixture on `2c8f0066bb4eda847f2ed6ae294a56dd87125652`. PR #98 final CI/Reviewbot results above close that prior head's remote gate.

The evidence follow-up receives targeted documentation/static checks and its own remote CI/Vercel/review before any merge approval. Operational JSON, private orchestration, encrypted inputs and deployment identifiers remain outside version control. No new managed resources were needed for the hosted apply/proofs; user-owned resources were untouched.

Targeted static verification on this documentation tree: `npx vitest run tests/unit/epic-22/story-22.15/production-readiness-migrations.test.ts` passed **26/26**, zero skips/failures, exit **0**, report duration **14.41 seconds** (15 ms test execution). This verifies the unchanged manifest/runbook contract; it does not replace hosted acceptance or claim a new full-suite run.

PR #99 review of `276fac63fcfdc2c513cca44e5d1d87558c073752` found two P2 documentation inconsistencies: the active spec still described the correction as pending, and the active production procedure still demanded a new migration-apply approval. Both are corrected: the acceptance criterion now requires current 66/66 post-apply state, and the production procedure/policy explicitly binds the standing authorization to the exact candidate and migration hashes without waiving any other gate. Repeated targeted static checks pass **26/26**, zero skips/failures, exit **0**, **1.04 seconds** (13 ms tests). CloseActor and one List succeeded after operational work, with all 26 returned resources stopped; no user-owned resource was altered. The resulting documentation head requires fresh remote checks and final review.

The next PR #99 review on `bd459baabb0c0f615bd883bd9c672c3a8076986a` found stale active epic blockers and active inventory/policy/index sections that the initial supersession banner did not adequately resolve. These entries are now replaced directly, including the risk/tracker rows and executive/security/operations overviews; retained pre-correction narratives have explicit historical headings. The repeated static suite passes **26/26**, zero skips/failures, exit **0**, **1.02 seconds** (13 ms tests). YAML parsing, edited table shapes and diff checks pass. These are documentation corrections only; no migration or hosted action was repeated.

Review on `b52ebb05cb6788730d6255a588ca35956bc2bc72` identified three remaining active copies: the BMAD amendment label, story Dev Agent Record/File List notes, and E-010 tracker criteria. The amendment is now explicitly historical; the current story notes state 66/66 and no pending migration; E-010 requires the nine-version production dry run and retains all non-migration gates. A repository search confirms the obsolete active labels/criteria are removed. Repeated static checks pass **26/26**, zero skips/failures, exit **0**, **1.00 second** (13 ms tests). Final exact-head remote verification is attached to the PR after these documentation fixes.
