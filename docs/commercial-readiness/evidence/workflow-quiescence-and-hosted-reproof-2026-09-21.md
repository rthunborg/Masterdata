# Workflow quiescence and hosted reproof — 2026-09-21

PR #109 reviewed head b827a7b merged as staging 0a8341f with an identical tree; main remains 8223509. On 2026-09-21 the owner-approved entire Supabase Nightly Backup workflow disable completed: disabled_manually, with zero runs in all five nonterminal states. Automated backups, pruning and staging refresh are paused; existing backups were untouched and re-enable needs a separate decision. Fresh staging proof passed 68/68 history, strict catalog 16/16, scoped advisors and unchanged repayment, four permission hashes and audit baseline. Read-only Vercel inspection reconfirmed the recorded production pause target, disabled automatic domain assignment and zero active crons. Fresh production count-only proof still finds 48 orphaned saved filters, zero empty/overlength names; its migration prerequisite fails. Full database isolation and protected bootstrap remain unproved; 55 ledger rows remain UNPROVED/unsigned and 13 executes remain proposed. Production stays paused/no-go, Story 22.15 in-progress and Epic 23 on-hold.

## Exact source and completed operation

- Reviewed PR #109 head: `b827a7b312d57f4a796485ce4d110c86b75b94e9`.
- Staging merge/source of every fresh hosted proof: `0a8341f6cfd8fb4f2371ad26a6646b7289d0472d`.
- Main: `822350986f4c023948a7bbf490ddffc371185c4a`, unchanged.
- Merge tree equals reviewed head; expected parents verified. Final-head CI and both Vercel checks passed; [final Reviewbot pass](https://github.com/rthunborg/Masterdata/pull/109#issuecomment-5759885686) had no new inline findings.
- Owner approval “Approve. Proceed with remaining items.” followed the exact request to disable workflow **235701425**, including production backups, pruning and staging refresh. Disable succeeded before the fresh observation at **12:51:49.9529884 UTC**. This is an observation time, not an invented write-completion timestamp.
- GitHub state: **disabled_manually**. Counts for in_progress, queued, requested, waiting and pending are each zero. Nothing was cancelled or dispatched. No backup contents were read or deleted. Re-enabling requires a separate owner decision.

The machine receipt embeds PR #109 merge-time history under `historicalMergeSnapshotBeforeWorkflowDisable`; those earlier false/pending fields describe only that pre-disable snapshot. Explicit current-state fields record the completed authorized disable and staging reproof.

This GitHub setting is the only hosted setting changed in this work. It is not full database writer isolation. No hosted database write, repair, cleanup, migration apply, Vercel change, deployment, main merge or reopening occurred.

## Fresh read-only evidence

The staging package was rebound to the exact reviewed merge in a clean isolated checkout. Frozen dependency installation passed. Source/manifest/migration/dependency identity, approved CLI **2.115.0**, reviewed psql **17.11**, certificate integrity and three-way target binding passed before access. Every CLI database operation used the repository runner; strict catalog proof used its reviewed wrapper. Additional SQL retained read-only transactions and bounded timeouts. Prior receipts were preserved.

| Gate | Fresh result |
|---|---|
| Staging history, 12:53:12 UTC phase start | 68 local / 68 remote; no pending versions |
| Scoped advisors, 12:53:22 UTC phase start | Security 0 WARN-or-higher; performance 3 multiple_permissive_policies WARN |
| Strict post_apply catalog, 12:53:28 UTC phase start | 16/16; no failed group |
| Aggregates, 12:53:31 UTC phase start | Repayment aggregates and all four permission hashes unchanged; staging saved filters 0, invalid counts 0 |
| Audit, 12:53:33 UTC phase start | 353 rows, 90 nonnull actors, 0 unmapped; canonical-history hash unchanged |
| Vercel, 12:52:58 UTC observation | Recorded pause target matches; automatic domain assignment disabled; zero active cron definitions |
| Production saved filters, 12:57:59 UTC capture | 48 total / 48 orphan auth references / 0 empty names / 0 overlength names; **data prerequisite false** |

The production collector succeeded in gathering evidence; its failed data prerequisite is not a passing release gate. No row identifiers or contents were emitted. The prior 48-orphan observation remains consistent, but no deletion is authorized by this receipt. Fresh production catalog, complete permissions and broader physical-state proofs were not rerun here; seven strict production failures remain the last observed result, not a refreshed count.

The advisor scope remains limited to pinned CLI WARN-or-higher commands: INFO and certain Management API security-definer/GraphQL checks are not covered. Vercel inspection proves the recorded target/settings, not fresh HTTP route probes or full traffic isolation. Matching staging aggregates do not prove that no intervening row change ever occurred.

## Local verification and retained limitations

- Documentation/migration and saved-filter collector Vitest: **51/51**, two files, zero failures/skips, exit 0, **1.21 seconds** on the documentation working tree based on staging `0a8341f`. All three YAML status assertions, frozen-spec equality, unchanged protected paths/55-row ledger and diff whitespace checks passed.
- Refreshed read-only support package contracts: **11/11**, zero failures/skips, Node test report **80.656 ms**.
- Both clean proof checkouts completed frozen dependency installs. No dependency version changed.
- Production local source validation initially stopped on checkout/Git-blob line-ending differences before private input loading or hosted access. Raw Git blobs were materialized in the new isolated checkout and its unchanged index metadata refreshed; final source/dependency checks passed. No source check was weakened.
- Supabase changelog checked on 2026-09-21: latest Health Check Advisors entry does not expand the pinned CLI proof scope. CLI remains 2.115.0; no upgrade, extension change or platform setting change followed from the changelog.
- This repository change is evidence/status documentation only. Application and release code remain identical to the reviewed PR #109 tree. Historical full Vitest 3625/3625 and Playwright 163 passed/47 classified skips belong to implementation `0f1162aa1a414f03820cc8aadc089dd190a552f5`; they are not fresh suites for this documentation update. The prior failed two-export-test Vitest run remains retained in its original evidence.

## Remaining work in order

1. Implement and review the protected bootstrap: fixed trusted root, full ancestor owner/DACL and reparse checks, held read-sharing locks over executables/module graph and source/output identity through launch, and a bootstrap origin callers cannot supply. Existing private preparation and production non-dry-run apply remain blocked.
2. Complete the production-profile fixture and pinned CLI transaction/history/failure-boundary matrix. Bind live cleanup and five-plane isolation evidence into the protected runner; keep ambiguous failure states blocked.
3. Prepare the exact technical isolation/settings action for separate approval, then prove it across application/jobs, Data API, Realtime and direct clients. The workflow disable and page pause alone do not satisfy this gate.
4. Only after isolation: obtain the separate exact cleanup approval, perform the bounded cleanup and refresh all production prerequisites. Standing authorization covers reviewed necessary migrations only after their prerequisites pass.
5. Verify strict final state and every material effect before signing any of the 55 ledger rows or requesting separate history-repair approval. Complete owner staging application verification, then separately gate main merge, deployment, restoration and reopening. Production remains paused throughout.

[Machine receipt and source receipt hashes](workflow-quiescence-and-hosted-reproof-2026-09-21.json). Owner backup statements remain attestations of secure local dumps; this work adds no restore-test claim and requires no backup path.
