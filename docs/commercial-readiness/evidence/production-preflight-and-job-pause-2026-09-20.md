# Production prerequisite collector and backup pause — 2026-09-20–21

Story 22.15 remains **in-progress**, Epic 23 **on-hold**, and production **paused / no-go**. This component provides evidence collection and a durable job safeguard. It does not enable the production bootstrap or authorize a hosted change.

**Workflow review follow-up:** The two P1 findings are resolved in implementation `0f1162aa1a414f03820cc8aadc089dd190a552f5`: only the default-branch ref can reach the pause prerequisite, the Production checkout uses the exact checked SHA, and a checkout-free alert handles prerequisite or backup failures. Tests assert complete actual YAML conditions and mock-execute the actual inline alert. Renewed local gates passed; final-head remote checks/review remain pending at this committed snapshot.

## Source and preceding merge

PR #108 merged into staging as `fa68141121fc46cd9949d9ff36cb39fde4a35ced`, from reviewed head `cce6e2eb283bf9ab9018b3018467c71e86b7e9d1`. Its merge tree exactly matched the reviewed tree, `d2079d7db38d9db523662f852c0ed3fabd7f4aea`; final GitHub/Vercel checks passed and the [final Reviewbot response](https://github.com/rthunborg/Masterdata/pull/108#issuecomment-5751175106) reported no major issues. Main remains `822350986f4c023948a7bbf490ddffc371185c4a`. No post-merge hosted database reproof is claimed.

## Implemented scope

- A production-only read-only saved-filter prerequisite collector returns four aggregate counts: total rows, missing auth owners, empty names, and overlength names. SQL bytes are hash-bound before target/tool/TLS access and passed to reviewed psql on stdin. Counts are strictly validated. Evidence explicitly grants no cleanup or migration authorization.
- The backup workflow now checks the tracked production-pause lock in a separate job without production secrets. A paused, absent, or malformed lock prevents the backup/restore job. Only a valid separately authorized reopening record permits it. Both scheduled and manual invocations using this workflow revision are gated.
- The production bootstrap remains unconditionally denied. The collector is not yet bound into a complete protected live admission path. Historical migration SQL, the baseline manifest, strict catalog verifier, production pause lock, and frozen specification remain unchanged.

## Newly confirmed staging-preservation blocker

Read-only GitHub inspection at `2026-09-20T17:54:54.7113753Z` found workflow `235701425`, **Supabase Nightly Backup**, active. Its three latest scheduled runs completed successfully on September 18, 19, and 20, all from old main `822350986f4c023948a7bbf490ddffc371185c4a`. That workflow can truncate and reload staging from a stored backup. Success alone does not prove which rows changed; no job logs, backup contents, or row data were read.

Merging this component into staging cannot change the old-main workflow. Approval has been requested, but not received, to disable the **entire workflow**, including manual dispatch. Before relying on staging preservation, verify the workflow is disabled and no queued or running job remains, then repeat fresh staging catalog/history/data-preservation proofs. Disabling also pauses automated production backups and storage pruning; existing backups are not deleted. Re-enabling requires a separate decision. No hosted setting change was performed for this evidence.

## Verification

Initial implementation `64eef64291530fc4a73e1986be0a04ebf6b7e07f` passed 62 focused tests, including six live synthetic SQL cases; full `npx vitest run` passed 3,603 tests across 329 files with zero skips/failures, exit 0, 103.89 seconds reported / 112.483 seconds wrapper duration. TypeScript passed; ESLint had zero errors and 296 warnings. The staging-preview build passed in 19.508 seconds. These are intermediate results, not the final revised-head gate.

Independent review then identified a local fixture admission gap: a loopback port alone did not prove guard ownership before the test created its synthetic database. The revised implementation requires an expected PostgreSQL system identity obtained independently through the guard-selected container. Both database connections must match that identity before any write. Missing, malformed, mismatched, and unreadable identities fail closed; the expected identity is trusted launcher input, never derived from the tested connection itself.

The revised implementation `122c2fe1c50ecab14554d16b7516d912a944f111` adds 16 fixture-identity regression cases. Its separate focused batch passed **78/78**, including the six live SQL cases, with zero skips/failures, exit 0, in 1.70 seconds. The paired JSON's `intermediate122Focused` entry preserves this revised batch, distinct from the preceding 62-test batch. TypeScript and zero-error lint passed on the revised implementation.

Historical full `npx playwright test` passed on the intermediate `122c2fe` implementation: **163 passed, 47 skipped, zero failures/errors**, exit 0; report duration 1,000.886682 seconds, wrapper duration 1,017.270 seconds. All 47 skip identities exactly match the retained individual inventory (nine notification-authorization cases and 38 superseded/fixture-debt cases); none is counted as passing. Full `npx vitest run` passed **3,619 tests across 330 files, zero skips/failures**, exit 0, 103.45 seconds reported / 111.952 seconds wrapper duration. The staging-preview build passed on the same commit in 20.419 seconds. The retained guard-owned application fixture passed strict post-apply catalog **16/16** through the reviewed verifier. This is local evidence; no new clean migration-chain replay or hosted proof is claimed. All 68 immutable migrations and seed bytes still match the bound source plan. The [paired redacted receipt](production-preflight-and-job-pause-2026-09-20.json) records exact identities and hashes. The `intermediate122FullGates` receipt preserves these results; they precede the workflow P1 corrections.

Each live collector test run creates its own synthetic database only after identity verification. Those databases are intentionally retained with the managed fixture volume; repeated runs accumulate synthetic state for owner-managed disposal. Tests close their clients but do not drop databases or terminate unrelated sessions.

Stop requests for the test processes and both guard-owned fixture services were accepted; saved state was retained. A `stop_requested` acknowledgment is not a claim of synchronous verified shutdown. Final actor closure/List is an operational completion check after review, not a claimed result in this snapshot.

The initial guarded Next.js attempt produced no readiness receipt and was stopped. A second attempt produced the source-bound readiness receipt used by the successful intermediate Vitest run. Neither guard admission alone nor the first launch is counted as a passing readiness check.

Production dependency audit remains zero critical/high and one accepted UUID moderate through 2026-09-30; audit exits 1 for that finding. The all-dependency audit remains one critical, 16 high, and 10 moderate findings. Advisory identities/severities match the preceding accepted records; these are not zero-finding audits.

### Renewed final implementation gates — 2026-09-21

The first full Vitest attempt on this commit failed: **3,623 passed, two failed, zero skipped**, exit 1, 166.86 seconds reported / 178.996 seconds wrapper duration. Both failures were `AbortError` results in the unchanged live impersonation-export suite. An initial focused diagnostic refused mixed fixture ports before running tests; after using the same bound fixture environment as the full runner, all five export tests passed in 2.47 seconds (2.930 seconds wrapper duration). No code, request timeout, concurrency setting, or skip policy changed before the full rerun reported below. The cause of the two aborted requests is not established; the failed attempt remains part of the evidence and is not recategorized as passing.

Implementation `0f1162aa1a414f03820cc8aadc089dd190a552f5` passed **84/84** focused tests (six live synthetic SQL cases and 16 identity cases), zero skips/failures, exit 0, 1.68 seconds. A separate 37-test batch (29 readiness-document regressions and eight legacy alert cases) passed in 1.01 seconds. Full `npx vitest run` passed **3625/3625** across 330 files, zero skips/failures, exit 0, 150.34 seconds reported / 162.773 seconds wrapper duration. Exact full `npx playwright test` passed **163**, with **47** individually classified skips and zero failures/errors, exit 0, 1457.525906 seconds reported / 1479.645 seconds wrapper duration. The unchanged 47 skip identities match the retained inventory; they are not passes. TypeScript and ESLint passed (zero errors, 296 warnings). The staging-preview build passed in 35.697 seconds. Retained guard-owned local strict catalog remains 16/16. No fresh clean-chain replay or hosted proof is claimed.

Earlier launch attempts are excluded: one source-cleanliness/pin preflight refusal; an interrupted run whose buffered output was mistaken for absence of execution; a retained-temporary-environment refusal; and the September 20 run stopped without a completion receipt. Only the completed resumed command supplies the renewed full result. Local fixture input files left by interrupted runs were hash-checked and retained outside the checkout before resuming.

Read-only reinspection at `2026-09-21T10:59:53.8797054Z` found the legacy workflow still active and another successful scheduled run that morning from unchanged old main. This does not prove row changes or authorize disabling it. The earlier September 20 check found zero runs in all five nonterminal API statuses; that was a point-in-time observation, not post-disable or database-writer isolation proof.

## Remaining release gates

1. Quiesce the old-main backup/restore writer under separately approved hosted settings scope, then refresh staging preservation evidence and complete owner staging verification.
2. Complete the protected bootstrap installation, trusted ancestor ownership, runtime/module integrity and held-lock launch proof. Synthetic file/directory locking experiments are primitive evidence only; no private bootstrap has been re-enabled.
3. Complete production-profile fixture and pinned CLI transaction/history/failure-boundary rehearsals; integrate fresh cleanup and full isolation proof into protected admission.
4. Obtain separate isolation/settings and saved-filter cleanup authorization after the exact action is reviewable. The dated 48-filter observation is not a fresh cleanup authorization or proof.
5. Apply reviewed required forward migrations only after all prerequisites pass; prove the final catalog and all material effects. All 55 repair-ledger rows remain unsigned and UNPROVED, and the 13-file execute set remains a proposal. Seven production catalog failures are last-observed findings, not newly refreshed counts.
6. Obtain separate history-repair authorization once its proof ledger is complete; then complete final production readiness, main merge, deployment, and reopening gates. Preserve the pause and API/job shutdown through every intermediate step.

No hosted database write, history repair, cleanup, production deployment, main merge, hosted setting change, or reopening was performed by this component.
