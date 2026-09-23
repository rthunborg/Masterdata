# Protected production dry-run-only component — 2026-09-22

## Status and scope

PR #112's preceding protected-toolchain component is complete: reviewed final head `e4ab223` merged as staging `8aec314`, with the required GitHub/Vercel checks and Codex review clean. Its earlier local test receipt remains historical evidence for that component.

PR #113 production implementation 7bc00317e790dc3226367ee7a333b805b9d59be1 is unchanged at test/evidence head 602a3cd9d9c964a494bb4bcd8cc636a65e31f6cb. Exact full npx vitest run at that head passed 3,769/3,769 tests across 337 files, zero skips/failures, exit 0 (167.79s runner; 177299ms orchestration), including all 74 new component regressions. Exact full npx playwright test on the identical production implementation passed 163 with 47 individually matched historical skips, zero failures/errors, exit 0 (1248.546564s runner; 1258009ms orchestration). The later changes contain only Vitest/support tests and documentation; application, migrations, release tooling, Playwright tests/configuration and dependencies are byte-identical. Build, TypeScript and zero-error lint evidence is recorded in the companion dry-run verification receipt. Exact final-head CI/Vercel and Codex review are separate merge prerequisites; their receipts are recorded on PR #113. Synthetic verification accessed no real private inputs or hosted targets. Production stays paused/no-go, Story 22.15 in-progress and Epic 23 on-hold.

The locally installed production dry-run path is deliberately narrow:

- an installer materializes an immutable local package from a reviewed package manifest and fixed file list;
- the compiled host owns fixed paths for the private-input root and separately supplied project-link record, retains protected read leases, creates a fresh restricted working directory with only the manifest and thirteen proposed forward migrations, and starts only the fixed worker;
- the worker emits a fresh nonce, accepts one signed exact packet, and can request only the reviewed Supabase CLI dry-run command shape; and
- the result is a redacted planning receipt that marks apply, repair, and cleanup unauthorized.

When invoked after its review and admission gates, the installed launcher loads the real fixed-root encrypted inputs and can connect to production through the reviewed dry-run wrapper. Installation and the synthetic verification reported here did neither. This capability must not be confused with a claim that no hosted access is possible.

The private-input interface is local-memory only. It is intended to validate a fixed production/session-pooler/verify-full capture schema, current-user DPAPI protection, record hashes, certificate path/hash metadata and an independent project-link match before producing its minimal wrapper environment. It does not expose a supported general credential API or authorize a network operation by itself.

## Authorization and trust boundary

The package digest must first be recorded in an independently reviewed release record for the exact candidate. The installer is then invoked by the trusted release operator with that record; a caller-supplied digest is not authority on its own. The installer does not establish a production release decision, target admission, or a production write authorization. Future operational invocation must retain that distinction in the command/runbook and must not describe a structurally valid package receipt as approval.

The trusted current user, local Administrators and SYSTEM remain inside the stated Windows trust boundary. The module scanner and manifest snapshot constrain reviewed file paths, declared static/dynamic imports and file hashes; they do not establish full semantic equivalence, prove every runtime/native dependency, defend against those trusted principals, or replace the wrapper's executable/version/hash, certificate, TLS and three-way target checks. Any unrecognized module, reparse point, unexpected file, writer conflict or packet shape is intended to fail closed.

## Fixture and evidence limits

The native fixtures use generated synthetic DPAPI blobs, synthetic certificate bytes, a synthetic project reference and a constrained fake CLI. They must not open the real private input record, certificate, approved project-link record, hosted database, Vercel, or a production deployment. A passing synthetic result only tests the local boundary and failure handling. It cannot prove the real package, the real production profile, migration transaction/history behavior, traffic isolation, data preservation, or a hosted action.

Windows native cases passed locally. Linux CI skips the 39 new Windows-kernel/DPAPI cases; these are not passing evidence. The complete local run has no skips.

## Remaining gates

1. Complete final documentation-head checks and review; the exact implementation local gates below are complete.
2. Prove the thirteen-file CLI transaction/history and uncertain-failure matrix against the representative production-profile fixture. A clean canonical chain is insufficient.
3. Recollect fresh production target/TLS/observed-state evidence through the reviewed wrappers, then complete five-plane technical isolation: application and jobs, Data API, Realtime, direct clients and database/pooler access.
4. Obtain a separate exact cleanup approval before changing the 48 orphaned filters; re-prove prerequisites afterward.
5. Resolve the seven strict catalog groups and build independently supported, signed lineage for each of the 55 repair-ledger rows.
6. Complete reviewed implementation, exact prerequisites and strict proof before any standing-authorized required forward migration apply. Separately gate any hosted settings/isolation action, history repair, staging-to-main merge, production deployment and reopening. Preserve the production pause until the explicit reopening decision.

Story 22.15 remains in-progress, Epic 23 remains on hold, and production remains paused/no-go.
## Exact implementation verification

PR #113 production implementation 7bc00317e790dc3226367ee7a333b805b9d59be1 is unchanged at test/evidence head 602a3cd9d9c964a494bb4bcd8cc636a65e31f6cb. Exact full npx vitest run at that head passed 3,769/3,769 tests across 337 files, zero skips/failures, exit 0 (167.79s runner; 177299ms orchestration), including all 74 new component regressions. Exact full npx playwright test on the identical production implementation passed 163 with 47 individually matched historical skips, zero failures/errors, exit 0 (1248.546564s runner; 1258009ms orchestration). The later changes contain only Vitest/support tests and documentation; application, migrations, release tooling, Playwright tests/configuration and dependencies are byte-identical. Build, TypeScript and zero-error lint evidence is recorded in the companion dry-run verification receipt. Exact final-head CI/Vercel and Codex review are separate merge prerequisites; their receipts are recorded on PR #113. Synthetic verification accessed no real private inputs or hosted targets. Production stays paused/no-go, Story 22.15 in-progress and Epic 23 on-hold.

The selected regression for the captured-byte correction passed before commit (one selected test; eleven tests excluded by the selector, never counted as passes). The full 7bc0031 run independently executed all twelve package tests and all 68 new component tests without skips. A review found that before/after dependency inspection did not bind the retained bytes during a transient replacement. The correction hashes both captured PapaParse files against the approved dependency receipt before materialization; the regression checks each replacement independently and the valid pair. No caller-controlled hook was added.

Initial focused attempt 1 failed: 4 passed, 4 failed, 17 setup-skipped, 117.69s. Attempts 2 and 3 failed: each 32 passed, 2 failed, 33 setup-skipped, in 50.30s and 51.74s. A separate input-fixture diagnosis failed with 17 setup-skipped. These were fixture compilation/assembly loading, URL handling, source-commit lookup, mode-variable shadowing and junction-cleanup defects, not waived checks. Focused attempt 4 then passed 67/67 in 111.37s (wrapper 107620ms, separately measured), before the additional captured-byte regression. The historical full 37e7e2f run passed 3762/3762 and Playwright 163/47/0; those results do not substitute for the fresh corrected-head gates.

The managed fixtures retained the reviewed 68-migration-plus-seed baseline, whose source plan was verified before and after every full gate. No new migration or fresh clean-chain rebuild occurred in this component. Every migration, baseline manifest and hosted verifier remains byte-identical to the staging base. Local routes were prewarmed without authentication; assertions, timeouts and skip classifications were unchanged. Native fixtures used synthetic DPAPI/PEM/reference values and a fake CLI; the positive installer test did not start its installed launcher.

Production audit repeated on the unchanged lockfile: 0 critical/high and 1 accepted UUID moderate, exit 1, existing acceptance through 2026-09-30 only. Development-inclusive audit remains 1 critical, 16 high, 10 moderate, exit 1, the previously documented tooling follow-up; no new waiver or dependency upgrade.

Resource cleanup is recorded below. The exact final-head GitHub/Vercel and external Codex review receipts are recorded on PR #113 rather than self-attested by this local evidence.

## Final test-only review follow-up

Six added negative cases exercise empty/placeholder/NUL/CR/LF passwords after valid synthetic DPAPI encryption and integrity capture, plus a nonzero launcher argument with no CLI invocation. An unexpectedly accepted input is disposed before the fixture fails. The final full Vitest evidence above includes these cases; no production behavior was changed. The 7bc0031 full Vitest 3,763/3,763 receipt remains prior implementation evidence in the JSON, and its exact full Playwright result remains scoped to byte-identical application, release and browser-test sources. It was not rerun solely for these test/documentation additions.

## Resource lifecycle and review

All remaining actor-owned test resources received successful Stop requests, followed by successful CloseActor and one successful List inspection. Stop acceptance is not verified shutdown; retained containers, data and fixture files were not deleted. No user-owned resource was adopted or stopped. Redacted acknowledgment receipts are in the companion JSON.

The four local BMAD review layers and five resolved follow-ups are recorded in [the triage receipt](protected-production-dry-run-review-2026-09-22.md). External Codex review and GitHub/Vercel checks must match the exact final PR head before merge; consult PR #113 for those later receipts. This document does not predict their outcomes.

## External review follow-up

Codex review of 662cff2 completed with one P2: canonical next-action and BMAD story-comment fields still described the earlier file-lease stage. Those active planning fields now describe the locally verified dry-run component and the remaining production-profile, failure, target and isolation gates; older local implementation limitations are explicitly historical. This documentation-only correction changes no tested code or authorization. Revised exact-head checks and review are required on PR #113.

The next local CLI matrix has seven distinct cases: observed orphan guard stop; post-cleanup derivative success; explicit history-write failure; implicit history-write failure; strict trigger-profile rejection at each of 20260910184840 and 20260910184841; and uncertain explicit history-write timeout. It must use the exact thirteen immutable migrations, guard-bound local identity and fresh independent observers. This is a plan, not proof or hosted authority.

Documentation-correction checks passed before commit: focused production-readiness migration regressions 29/29, zero skips/failures, exit 0 (0.920s runner; 2122.0787ms wrapper); all three YAML surfaces parsed with equal canonical next actions, unchanged Story/Epic/production states, frozen-spec identity, immutable hosted migration/verifier identity, and clean diff checks. Full suites were not rerun for this Markdown/YAML-only correction; the exact implementation receipts above remain applicable.
