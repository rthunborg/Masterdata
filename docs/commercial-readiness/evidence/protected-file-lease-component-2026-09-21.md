# Protected file-lease component — 2026-09-21

## Scope and status

This is local Windows-only preparation evidence for Story 22.15. The tested implementation is `7e54ae33d32d6cda791e3cd2143940573405e470`. It adds a narrowly scoped native file-and-directory lease primitive that a future trusted bootstrap may consume; it is not a production runner, target-admission path, installer attestation, deployment mechanism, or hosted operation.

The component opens each admitted root, ancestor, directory, and file by handle; rejects reparse points, hard links, untrusted owner/DACL states and mutation grants to untrusted principals; verifies canonical handle paths; hashes the same held file handles; and retains no-delete sharing through child launch. The trusted-owner exception for Windows servicing is limited to the actual volume root. The tests retain the sibling-creation distinction: a parent may permit creation of a sibling while still being unable to replace the held descendant, whereas destructive parent mutation rights are rejected.

No encrypted target inputs, target identifiers, production data, hosted database, Vercel setting, deployment, production migration, cleanup, history repair, main merge, or reopening was accessed or changed. Production remains paused and no-go. Story 22.15 remains in-progress and Epic 23 remains on hold.

## Local verification

The focused command covered the new native lease suite plus the existing retired-private-entrypoint and bootstrap-admission regressions: **53 passed, zero failed, zero skipped, 5.19 seconds**. Of these, the protected lease suite has **26 Windows-kernel-only cases**. They executed and passed on Windows. On Linux CI, the same 26 cases are explicitly skipped because they require Windows handle/ACL/kernel semantics; those skips are not passing evidence and do not substitute for the recorded Windows run.

TypeScript passed. ESLint passed with zero errors and 296 warnings. The local release gates below bind to the tested implementation `7e54ae33d32d6cda791e3cd2143940573405e470`:

| Gate | Result |
| --- | --- |
| `npx vitest run` | 3,651 passed; zero failures/skips; exit 0 |
| `npx playwright test` | 163 passed; 47 classified skips; zero failures/errors; exit 0 |
| Named staging-preview build | Passed; exit 0 |
| Final documentation-head focused/docs checks and CI/Vercel/Reviewbot | Pending at this snapshot; recorded through the PR |

The third unchanged managed full Vitest run passed **3,651 tests across 331 files**, zero skips/failures, exit 0 (117.28 seconds reported; 127.701 seconds wrapper). It includes the 26 native lease cases in 5.467 seconds and the existing maintenance pause coverage: six Vercel production-pause-guard tests, 19 backup-production-pause-guard tests, and 20 pause tests. That coverage validates existing local pause boundaries; it is not a fresh hosted pause inspection. A retained local strict-catalog wrapper passed 16/16 on this implementation using reviewed `psql` integrity metadata only; it was not a clean-chain replay or hosted proof.

The current production dependency audit remains a non-clean, separately tracked result: zero critical/high and one UUID moderate advisory (`GHSA-w5hq-g745-h8pq`), exit 1. The all-dependency audit remains exit 1 with one critical, 16 high and 10 moderate findings. Neither audit is represented as a release pass or changed by this component.

The retained failed attempts are not counted as passes. Before `7e54`, the native harness briefly used a Node-only environment (the repository setup then lacked `window`) and inherited a PowerShell 7 module path (so Windows PowerShell could not find `Get-FileHash`); both harness faults were corrected before the tested implementation. During release-gate setup, an early owned-Next launch raced its source-plan preflight, one later request ended `RESOURCE_INTERRUPTED`/`start_uncertain`, and the first Vitest launcher lacked its copied reviewed serializer before test spawn. Stop requests were accepted and a bounded guard List was checked; a later owned Next resource became active/verified and passed readiness before the managed full Vitest gate began. The first managed full Vitest attempt then failed without a source change: 3,650 passed, one failed, zero skipped, exit 1 (127.91 seconds reported; 149.216 seconds wrapper). The failing pre-existing `hr-admin-impersonation-export` test ended with `AbortError` while the owned Next route was compiling around its first request. A second unchanged full attempt also failed: 330 files passed and one suite failed; 3,643 tests passed, eight were setup-failure skips (not managed skips or passes), and zero tests were reported failed; exit 1 (123.60 seconds reported; 134.975 seconds wrapper). Its `beforeAll` surfaced `RESET ROLE` while the transaction was already aborted, masking the initial SQL error. The focused unchanged eight-test RLS suite passed 8/8 with zero skips/failures in 0.949 seconds reported (1.439 seconds wrapper), but it does not replace the failed full gate. The causes remain unproven. The third unchanged full run supplies the separate passing receipt recorded above; neither failed attempt is reclassified.

The planning YAML retains a pre-existing 15-test discrepancy between story-row sums and category tallies (427/412 at the base, 453/438 after the same 26-case increment). Its classification is unproved. Those planning tallies are not a canonical test inventory; the fresh full-suite result above is the verification evidence.

## Remaining bootstrap and production gates

The lease protects only caller-supplied local paths while its handles remain open. It does **not** establish a fixed trusted installation root, unforgeable bootstrap origin, complete module-graph closure, Node/CLI production launch integration, production-profile fixture admission, a full traffic-isolation collector, or a target-bound write authorization path. A future trusted launcher must independently prove its installation root, complete immutable module inventory and hashes, and every remaining bootstrap admission condition.

The current production non-dry-run block remains unchanged. The existing 55 repair-ledger rows remain **UNPROVED** and unsigned; the proposed 13 forward executes remain unexecuted; 48 saved filters with absent owners remain for separately approved cleanup; and full application/Data API/Realtime/direct-client isolation remains unproved. The seven dated production strict-catalog failures remain open. Any production history repair, cleanup, isolation/settings change, main merge, deployment, and reopening retain their separate owner gates.

## Staging baseline retained

PR #110 reviewed head `8575a25bea6ca5a66e9a9f76c4a504db5d3cb9cf` merged as staging `1860472755fa63802059203b2edda7d550dc2ba0`; the merge tree matched the reviewed head. Fresh post-merge staging proof passed migration history 68/68 with no pending version and strict catalog 16/16. Those are dated staging proofs, not proof of this local lease component or a production authorization.

[Redacted machine receipt](protected-file-lease-component-2026-09-21.json).

## Tested-implementation receipt

- Tested implementation: 7e54ae33d32d6cda791e3cd2143940573405e470
- Redacted full-gate receipt SHA-256: 34d28d1a8344fed29e9fc291397f5a85cd24f29a3a53b734f83604a353b05092
- Full Vitest on tested implementation: 3651 passed across 331 files; zero failures/skips; exit 0; 117.28 seconds reported / 127.701 seconds wrapper. Two prior failed attempts are retained above.
- Exact Playwright on tested implementation: 163 passed, 47 individually classified skips, zero failures/errors; exit 0; 1271.477060 seconds reported / 1285.584 seconds wrapper. All 47 skip identities match the retained inventory.
- Named staging-preview build on tested implementation: Passed, exit 0, 25.264 seconds wrapper; preview/staging environment markers verified.
- Final documentation-head focused/docs checks and CI/Vercel/Reviewbot: Pending at this committed evidence snapshot; exact documentation-head focused checks, CI/Vercel and final review are recorded through the PR.

## Reference semantics

The component’s held-handle and sharing model follows Microsoft’s documented [CreateFile sharing semantics](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilea) and [file security access rights](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights). The implementation and its native fixture remain the controlling source for the exact predicates.
