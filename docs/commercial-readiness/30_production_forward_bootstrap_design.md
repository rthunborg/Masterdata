# Production Forward-Bootstrap Runbook and Design

> **Current collector-interval correction verification — 2026-09-29.** Clean, unchanged source `188bcf64f9c9dcbb5791a5bd636583a83ba8e64e` passed exact full Vitest 4,502/4,502 with zero skips/failures and exact full Playwright 163 passed / 47 independently matched historical skips / zero failures/errors. The required local matrix passed 8/8 tests (seven actual scenarios plus required admission), including 13 forwards, 55 synthetic repairs and final history 68 with unchanged catalog/preservation. The immutable admission and all periodic read-only renewals are wrapper-, source-, guard-, tool- and interval-bound. Build, TypeScript, zero-error lint, and fresh reviewed-pinned CI passed. [Collector interval verification](evidence/production-cutover-collector-interval-verification-2026-09-29.md) retains Final14 and Final15 failed runs, the incomplete Reviewbot-interrupted Final16 run, and the failed Final17 browser run followed by the same-source Final18 retry after an owned local credential refresh; none of those earlier runs is accepted as a passing gate. The earlier packet-deadline correction remains historical. Final documentation-head CI/review and the authorized staging merge remain pending. Story 22.15 stays in-progress, Epic23 on-hold, production paused/no-go; no hosted action authority is added.

> **Historical ordering correction verification — 2026-09-29.** The PR #121 chronology and protected CLI correction is locally verified at `1a5aa61937e34fa577a317afca4bca9bca64bf9a`: hash-leased cleanup start/completion with every initial control and independent probe before cleanup start, bounded host deadline headroom, required complete managed-writer profile and post-cleanup interval, actual-launch freshness under the caller age limit, non-overlapping final database/drain collection, reviewed Git repository-source/query/declaration binding for all three collectors with external runtime integrity still separately required, the pinned built-in vendor CLI profile, independently synchronized synthetic fault cancellation with bounded worker concurrency, an actual-clock recheck after all CLI preflight and journal flush, and encrypted partial-apply diagnostics with tested Windows DPAPI recovery. Full Vitest passed 4465/4465, zero skips/failures (863.04s); exact full Playwright passed 163 cases / 47 individually matched historical skips / zero failures/errors (1339.960638s); both exit 0 on this clean, unchanged source. TypeScript, zero-error lint (300 warnings), the staging-preview build and implementation CI passed. [Ordering verification](evidence/production-cutover-ordering-verification-2026-09-29.md) preserves earlier failures/successes with their actual source scope and hashes. Final documentation-head checks/review and staging merge remain pending; this evidence grants no hosted action authority. Production stays paused/no-go, Story 22.15 in-progress and Epic 23 on-hold. This successful receipt is historical evidence limited to `1a5aa61937e34fa577a317afca4bca9bca64bf9a`; it does not verify the later substantive host/worker packet-deadline correction at `0e014f3a8ad921b10758f186ee3afeba2601e895`.

> **Historical packet-deadline correction preparation — 2026-09-29.** The later host/worker correction at `0e014f3a8ad921b10758f186ee3afeba2601e895` is outside the successful `1a5aa619` ordering receipt and remains pending clean-source full-suite verification and final review. Its first clean full local run is retained failed evidence: 4,475 passed, three failures, zero skips, 371 files, exit 1; the local matrix read-only follow-up observed 68 history rows with catalog and preservation unchanged, without claiming a cause. Production remains paused/no-go; Story 22.15 stays in-progress and Epic 23 stays on-hold. No hosted action authority is added.

> **Historical candidate verification — 2026-09-28; superseded by ordering correction.** PR #121 consolidates the protected production route. Exact full Vitest passed 4349/4349 with zero skips/failures at 49e708ec99a8e74fb268e32d026bffc85bcb4a5c (389.86s). Exact full Playwright passed 163 with 47 individually matched historical skips and zero failures/errors at 2876b7a7915765182602f5cf2c2111df3c317d56 (1288.560973s); the only intervening code change is the reviewed synthetic unit-test loader portability fix, with byte-identical application/release code. The required CLI matrix is 8/8; TypeScript and zero-error lint pass. Build evidence is explicitly scoped to byte-identical application sources from the earlier working-tree build. Earlier failed runs remain recorded. No hosted change is claimed. Production remains paused/no-go, Story 22.15 in-progress and Epic 23 on-hold. [Measured results, source scopes and limits](evidence/production-consolidated-cutover-verification-2026-09-28.md).


> **Current reviewed sequence — 2026-09-28.** This replaces the circular
> historical “55 repairs before 13 forwards” proposal below. It is an
> operational plan only: it authorizes no hosted write, cleanup, history
> repair, settings change, deployment, main merge, or reopening. Production
> remains paused/no-go. The migration source used for the local rehearsal was
> the clean, source-pinned commit
> `88cf3efcf7fdb8cdbfd00d850da6082b0f6fdd65`; a hosted candidate must bind
> its own reviewed final source identity.

## Current forward-first sequence

The production history table being absent does not require replaying the 55
older migrations. The reviewed CLI 2.115.0 can create its own history table
when it applies the isolated, source-only ordered 13-version subset. The
procedure is intentionally divided into separate gates:

1. Collect fresh read-only production observations. They must bind the
   admitted observed profile, target identity, and source candidate. The
   seven strict pre-apply catalog failures and the 48 orphaned saved filters
   are failures to resolve, never a passed catalog result or an accepted
   exception.
2. Prove application, direct-client, Data API, Realtime, database, and job
   isolation before any write. Complete separately authorized data cleanup
   only when its count-only and preservation prerequisites pass, then collect
   fresh post-cleanup observations and isolation proof. Hold isolation through
   the forwards, verification, and any separately authorized repairs. The
   existing production pause stays in place throughout; it is not by itself
   technical isolation.
3. Materialize a disposable source-only directory containing exactly the
   immutable 13 execute migrations. Reverify the full source, raw migration
   bytes, Git blobs, CLI/tool/TLS pins, three-way target binding, and a dry
   run whose output lists precisely that order. No raw SQL history insert,
   migration replay, reset, or forward-version repair is permitted.
4. After the separately reviewed production apply gate, run the normal pinned
   CLI apply from that directory. The expected CLI behavior is creation of the
   history table and exactly those 13 forward records.
5. Immediately collect fresh post-forward proof: exact 13 forward history,
   strict post-apply catalog 16/16 in the reviewed order, a complete
   independent canonical 68-migration schema fingerprint, and the complete
   preservation fingerprint. Any missing, reordered, duplicate, stale, or
   misbound receipt stops the procedure.
6. Prepare the 55-row baseline-adoption review. Every row remains `UNPROVED`
   until the live post-forward receipts support its current-final, source
   supersession, data-preservation, or seed-state disposition. This is not a
   claim that the historical migration ran. Historical seed identities are
   not recreated or assumed present.
7. Obtain the separate owner adoption decision and the separate exact
   history-repair approval. Only then may the pinned CLI record the 55 older
   source-bound versions as applied. Verify the resulting exact 68-version
   history, strict catalog, canonical fingerprint, and preservation evidence
   again before any later release decision.

The prior repair-first sequence is retained below only as dated,
non-executable history. It is superseded because it required material-effect
proof that itself depends on the post-forward canonical state. This update
does not weaken the 55-row ledger: it changes when the ledger can be reviewed,
not what it must prove.

## Local CLI rehearsal — 2026-09-28

The guarded, synthetic local matrix exercised the complete seven-case
transaction/history set with no hosted access. The required command produced
**8/8 passing tests**, zero failures and zero skips in **322.92 seconds**
(321.726 seconds test time). The eighth test enforces required local admission;
the other seven are the transaction/history cases.

In the successful post-cleanup synthetic case, the pinned CLI applied the
source-only 13-version subset from an absent migration-history table. It then
performed **55/55** serial `migration repair --status applied` operations and
the observer found exactly **68** history versions. The catalog and
preservation fingerprints before and after the repairs matched. The six
remaining cases preserved their expected stop classifications, including
rejected-before-current-effect, committed-but-unrecorded, rolled-back-but-
unrecorded, and timeout uncertainty. The rehearsal proves local CLI behavior
for the tested synthetic fixture only. It does not prove production data
mapping, target admission, isolation, cleanup, any historical execution, or
authority for a hosted operation.

See [the redacted rehearsal receipt](evidence/production-forward-first-local-rehearsal-2026-09-28.md)
and its [machine-readable summary](evidence/production-forward-first-local-rehearsal-2026-09-28.json).

## Backup statement

The owner attests that the newest locally stored backup was restore-tested and
is the rollback source. This is an owner statement, not independently verified
restore evidence. No backup path, contents, credentials, or records are
included in this repository.

> **Historical repair-first decision — 2026-09-23.** This snapshot recorded a repair-first proposal after fresh read-only production proof found the migration-history table physically absent. It required the reviewed 55-row history-repair ledger to be completed and separately authorized **before** an exact thirteen-version dry run or forward apply. That order is now superseded by the current 2026-09-28 forward-first proposal above. The dated strict `production_pre_apply` catalog result had seven named failures; its repair-first gate required a fresh exact observed-state profile and individually proved repair effects, without reporting that catalog phase as passed. The strict `post_apply` catalog still required all 16 groups. This historical snapshot does not control current cutover gates; the canonical [cutover runbook](27_supabase_cutover_runbook.md) controls the current proposed order. No cleanup, history repair, settings change, migration apply, deployment, main merge, or reopening is authorized by this design note; production stays paused.

> **Local CLI matrix verification — 2026-09-23.** PR #113 merged as `c193235efa3bc3a00ad3d78e152e80dec6cf382f` with the reviewed tree unchanged; main remains `822350986f4c023948a7bbf490ddffc371185c4a`. PR #114 implementation `a8634ec58992a8a474f0b16fb48f1d8d00764fd0` passes the local seven-case Supabase CLI 2.115.0 matrix, focused 174/174, full Vitest 3935/3935 with zero skips/failures, and exact full Playwright 163 passed / 47 individually matched historical skips / zero failures or errors. TypeScript, zero-error lint, staging-preview build and the fresh 68-migration-plus-seed strict catalog 16/16 pass. No hosted proof was refreshed in this component. The local result does not establish production-profile mapping, traffic isolation, target-write admission, cleanup or repair authority. Production stays paused/no-go; Story 22.15 in-progress; Epic 23 on-hold. The 55-row ledger, 13 proposed executes, 48-filter cleanup and seven strict production failures retain their separate prerequisites. Earlier dated records remain historical evidence. [Detailed receipt and limits](evidence/local-synthetic-cli-matrix-2026-09-23.md).

> **Historical post-quiescence evidence — 2026-09-21.** PR #109 reviewed head b827a7b merged as staging 0a8341f with an identical tree; main remains 8223509. On 2026-09-21 the owner-approved entire Supabase Nightly Backup workflow disable completed: disabled_manually, with zero runs in all five nonterminal states. Automated backups, pruning and staging refresh are paused; existing backups were untouched and re-enable needs a separate decision. Fresh staging proof passed 68/68 history, strict catalog 16/16, scoped advisors and unchanged repayment, four permission hashes and audit baseline. Read-only Vercel inspection reconfirmed the recorded production pause target, disabled automatic domain assignment and zero active crons. Fresh production count-only proof still finds 48 orphaned saved filters, zero empty/overlength names; its migration prerequisite fails. Full database isolation and protected bootstrap remain unproved; 55 ledger rows remain UNPROVED/unsigned and 13 executes remain proposed. Production stays paused/no-go, Story 22.15 in-progress and Epic 23 on-hold. [Receipt and remaining gates](evidence/workflow-quiescence-and-hosted-reproof-2026-09-21.md).

> **Status — 2026-09-19: non-executable design proposal.** This document records a potential way to establish the production migration baseline without replaying unsafe historical SQL or claiming that missing effects are already present. It authorizes no database, history, setting, deployment, main-merge, or reopening action. Production remains paused.

The current design source is PR #105 staging candidate `51f1adbf9cf3446dd2405bc4bee57cd22a005759`. A future implementation must bind its own final reviewed source SHA/tree; this dated candidate is not a release authorization.

## Historical problem and proposal boundary — 2026-09-19 snapshot

The dated production observation recorded zero migration-history rows and seven failed strict catalog groups; it was not a refreshed complete proof at this design date. The current source proposes 55 history repairs and 13 forward executions, but normal `db push` cannot reach the later saved-filter reconciliation while the earlier unsafe `20260130212612_create_user_filters.sql` is unrecorded. That historical file must not be replayed over its existing table.

The proposed alternative is **forward-first bootstrapping**. It is not yet a safe or approved procedure. It would run only the existing 13 execute migrations through the normal reviewed Supabase CLI, from a separately materialized migration directory. It never runs raw `psql` DDL, manually inserts migration history, marks a forward version as repaired, or recreates weaker legacy policies solely to satisfy a ledger row.

The 13-file source set is the current proposed execute order from `supabase/migration-baseline-manifest.json`. A later reviewed reconciliation may change that proposal:

1. `20260314000001`
2. `20260314000002`
3. `20260614000000`
4. `20260615000000`
5. `20260709194903`
6. `20260710144000`
7. `20260710150000`
8. `20260831200026`
9. `20260909115242`
10. `20260910094517`
11. `20260910115024`
12. `20260910184840`
13. `20260910184841`

## Historical required implementation — superseded proposal

A future code PR must add, test, and review a dedicated forward-bootstrap mode. It must bind an immutable full-repository source SHA/tree and a separate subset manifest containing the ordered file names, raw-byte SHA-256 values, and Git blob identities. The subset manifest must be derived from the immutable source and kept outside the asserted source identity so it is not self-referential.

Admission must fail closed in stages. Before executable verification, target access, or TLS access, validate the dedicated mode, standing authorization scope, immutable clean source identity, and exact subset plan locally. Then verify the approved executable versions and hashes, certificate integrity, verify-full TLS, and three-way target binding before performing the bounded read-only preflight. Before spawning any write-capable CLI operation, require fresh exact observed-state and prerequisite proofs, matching dry-run output, and evidence that the separately approved cleanup and isolation gates are satisfied. Unknown drift or incomplete proof stops admission. Standing authorization for reviewed required forward migrations remains applicable; this design adds no separate per-apply owner approval requirement.

The mode must create a disposable, access-controlled working copy containing only those byte-identical migration files, keep any CLI link and target material private, and use the normal reviewed Supabase CLI `db push` path. A dry run must print exactly the ordered 13-file set before any future apply. The CLI must record the applied forward migrations; the implementation must verify the relationship between committed effects and history rather than assume it. Any extra, missing, reordered, or changed file stops the operation.

Pinned CLI 2.115.0 must prove its history-recording and transaction behavior for these files before this design can be used; several immutable files contain explicit transaction boundaries. On any failure or uncertain result, stop, preserve redacted output, and inspect the current migration's physical effects and history through fresh connections before a reviewed continuation plan. Do not assume a recorded prefix fully describes physical state, retry automatically, or use history repair to pretend that a forward file applied.

## Historical preconditions and proof model

Before **any** write, including the separately gated cleanup of the 48 saved filters whose owners are absent, complete and prove database, Data API, Realtime, direct-client, and application traffic isolation. The seasonal pause is retained but is not sufficient technical isolation. Isolation must remain active through every forward migration, proof, and any later repair.

The forward subset must first pass against a guarded local fixture that reproduces the redacted production pre-forward profile, including zero initial history rows, all guard dependencies, and the seven dated failed catalog groups. A reviewed fixture-profile manifest must enumerate the exact admitted objects, attributes, data aggregates, known variants, and unknown-state rejection cases. A clean canonical chain is not enough. The new saved-filter prerequisite SQL test requires its launcher to obtain the exact guarded container's PostgreSQL `system_identifier` through guard-selected `docker exec`, pass that value as an explicit expected marker, and requires the test to compare it on both the admin and newly opened fixture connections before any write; a loopback URL or the tested connection cannot establish ownership. Rehearsals must cover successful prefixes and failures at each relevant transaction/history boundary. After a failure, distinguish original drift, a proved successful prefix, and uncertain current-file or partial effects using fresh physical-state and history evidence; leave ambiguous effects unclassified and prohibit automatic continuation. The current trigger attributes may fail the strict guards in `20260910184840` and `20260910184841`; that is a stop condition requiring an additional reviewed forward migration, never a weakened guard or history workaround. The saved-filter migration keeps its in-transaction zero-orphan/empty/overlength guard, so cleanup is a separate approval and must happen before a future subset apply.

After a successful future bootstrap and strict final catalog proof, ledger rows may be signed only as **observed**, **reconstructed**, or **superseded** state-equivalence evidence. Each row must enumerate every material effect of the exact source migration, its precise state-equivalence predicate, independent pre- and post-forward evidence, applicable data-preservation evidence, and any exact ordered later forward lineage that reconstructs or supersedes that effect. Missing historical execution evidence must be stated explicitly. A catalog pass, representation fingerprint, or lexical match alone cannot establish semantic equivalence or sign a row. Any unsupported effect keeps the row UNPROVED. This supports a future history baseline; it does not claim that the historical migration originally executed. The existing 55-row ledger remains entirely unsigned and unproved until that work is complete.

## Historical gates and ordering — not active next actions

The implementation is proposed as these explicitly ordered, independently reviewed PRs. This scope split is part of PR #107 review; it does not waive the complete bootstrap acceptance gate:

1. **Design PR #106 (merged):** documentation and evidence pointers only.
2. **Offline preparation PR #107 (merged):** a non-executable source-only subset preparer, its negative regression cases, full local application/pause verification and synchronized evidence. Its receipt confers no approval, contains no target material, and cannot be used by the hosted runner. The dated 2026-09-19 record below is preserved as history; it is not a current review gate.
3. **Preparation/rehearsal component PR #108 (merged):** the bounded captured-schema reconstruction, synthetic 13-file rehearsal, redacted repayment permission-profile collection, and offline admission controls. The private feature is currently retired fail closed. Any future private feature must begin from an explicit trusted PowerShell/protected-bootstrap installation root, not arbitrary options or environment flags; prove the trusted owner chain and a negative untrusted-parent-owner case; and provide an unforgeable bootstrap origin. A proposed read-sharing handle must exclude write/delete while it is held, according to [FileShare](https://learn.microsoft.com/en-us/dotnet/api/system.io.fileshare) and [CreateFile sharing semantics](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilea). It must additionally prove process-launch compatibility and a race-negative fixture. The complete protected bootstrap is not implemented or attested today. The preparation component passed its local suites, quality checks, exact-head review, and synchronized-evidence gate before its recorded PR #108 merge. It remains blocked from a target until the next component is reviewed.

A local synthetic experiment has demonstrated only the proposed locking primitive: a read-sharing handle held through hash and child launch rejected write and rename attempts while the synthetic child completed. It does not establish a trusted owner chain, directory-replacement resistance, bootstrap origin, intended-launch compatibility, or a private/hosted operation.
4. **Future bootstrap implementation PR:** the complete guarded admission path, production-profile fixture coverage, pinned-CLI transaction/history and uncertain-failure tests, cleanup/isolation collectors, exact dry-run matching, production-fixture migration proof, full local suites, and synchronized runbook/policy changes. The current production non-dry-run block remains unchanged until this separate implementation passes review. Only then may a future hosted operation be proposed under all existing gates.

Standing authorization covers reviewed required forward migration applies after their prerequisites pass. It does not cover the separate cleanup, traffic-isolation/settings changes, history repair, main merge, deployment, or reopening decisions. The current production non-dry-run block remains in force until an implementation PR changes it under review.

Evidence for the observed policy/function differences is recorded separately in [production definition comparison](evidence/production-definition-comparison-2026-09-19.md). This design does not classify those differences as equivalent or accepted.

## Implementation progress — 2026-09-19

The design PR #106 merged at staging `7cbbb11e7f5038a14519d89f2de524e6463dbf98`. The first implementation component is an offline, source-only subset preparer. It is not the dedicated bootstrap mode or the private CLI working copy. PR #107 proposes independent review of this non-executable component while retaining every complete-bootstrap acceptance gate above. The refreshed 01abdf7 component evidence records 3,519 passing Vitest tests and 163 passed / 47 classified skipped Playwright tests; the prior 856c933 receipts remain historical evidence. The [preparation evidence](evidence/forward-subset-preparation-2026-09-19.md) records its trusted-input boundary, completed component checks, and outstanding production-profile, CLI transaction/history and final review gates. Production apply remains blocked.

## Preparation/rehearsal component — 2026-09-20

PR #107 review status is historical and superseded by the later staging baseline at `aac11ff8527e5c6696f4cee7089ae86a7cbc87f2`; it is not a pending acceptance gate for this component. Local work retained failed schema reconstructions 1–4, then matched 14/14 captured groups on attempt 5. The declared synthetic post-cleanup derivative applied the unchanged 13-file subset and passed strict 16/16. The separate redacted production permission collection recorded an unchanged 61-row baseline and the two repayment-map hashes with four and five represented roles. PR #108's `00dfc4d086f5d151ef25e0f1b3c2ad9bee0efd8c` verification snapshot is historical: reviewed `cce6e2eb283bf9ab9018b3018467c71e86b7e9d1` merged as staging `fa68141121fc46cd9949d9ff36cb39fde4a35ced` with an identical tree. It retires private preparation fail closed before options/process/import/approval access; historical private smoke is not a supported API or ACL waiver. Future private capability requires protected installation/origin, trusted-owner ACL, read-sharing executable locks, and unforgeable bootstrap origin. The current collector and backup-pause implementation 0f1162a passes all local gates (Vitest 3625/3625, Playwright 163 passed/47 classified skips/zero failures); PR #109 records final-head CI/review and merge outcomes; this pre-merge source snapshot does not assert their completion. These facts support preparation only: all 55 repair-ledger rows remain UNPROVED and unsigned, the collector is not bootstrap admission, full technical isolation remains unimplemented, and no target bootstrap is complete. [Preparation evidence](evidence/production-bootstrap-preparation-2026-09-20.md); [current component verification](evidence/production-preflight-and-job-pause-2026-09-20.md).

## Protected local file-lease component — 2026-09-21

Protected Windows file-lease component at 7e54ae33d32d6cda791e3cd2143940573405e470. The 26 native Windows cases passed in the focused 53/53 run (5.19s); Linux CI classifies those 26 as Windows-kernel-only skips, never passes. Tested-implementation receipt SHA-256 34d28d1a8344fed29e9fc291397f5a85cd24f29a3a53b734f83604a353b05092. Production remains paused/no-go; Story 22.15 remains in-progress; Epic 23 remains on-hold. The component proves only a held-handle file/directory lease. It does not satisfy this design's trusted installation/origin, complete module inventory, production-profile fixture, isolation, target binding, dry-run or uncertain-failure requirements. Historical file-lease snapshot: trusted installation/origin, module closure and runner integration were still open at that stage. The later protected-toolchain and dry-run records below supersede those local implementation gaps; production-profile, traffic-isolation and target-write admission remain open. The 55 ledger rows are UNPROVED/unsigned, 13 executes are proposed, 48 orphan filters need separate approved cleanup, and seven dated strict production failures remain open.


## Protected toolchain component — 2026-09-22

PR #112 reviewed final head `e4ab223` merged as staging `8aec314`; all required GitHub/Vercel checks and Codex review were clean. The component's earlier local evidence remains historical: the corrected-environment full Vitest run on `3e191a1ed5b07d638b73a09debee8df26499ff9d` passed 3,695/3,695 tests across 333 files with zero skips or failures, and its implementation bytes were `357552b`. This merge completes that version-only protected-toolchain component. It does not establish private-input admission, a production database target, full technical isolation, cleanup, repair, apply, deployment, or reopening authority.

## Protected production dry-run-only component — 2026-09-22

PR #113 production implementation 7bc00317e790dc3226367ee7a333b805b9d59be1 is unchanged at test/evidence head 602a3cd9d9c964a494bb4bcd8cc636a65e31f6cb. Exact full npx vitest run at that head passed 3,769/3,769 tests across 337 files, zero skips/failures, exit 0 (167.79s runner; 177299ms orchestration), including all 74 new component regressions. Exact full npx playwright test on the identical production implementation passed 163 with 47 individually matched historical skips, zero failures/errors, exit 0 (1248.546564s runner; 1258009ms orchestration). The later changes contain only Vitest/support tests and documentation; application, migrations, release tooling, Playwright tests/configuration and dependencies are byte-identical. Build, TypeScript and zero-error lint evidence is recorded in the companion dry-run verification receipt. Exact final-head CI/Vercel and Codex review are separate merge prerequisites; their receipts are recorded on PR #113. Synthetic verification accessed no real private inputs or hosted targets. Production stays paused/no-go, Story 22.15 in-progress and Epic 23 on-hold.

The independently approved package digest is a required **external trusted-operator authorization boundary**. A caller-provided digest is not approval by itself; the installer must be invoked only with the reviewed record for the exact candidate. The static module scanner and installed-file snapshot constrain the reviewed graph but do not prove semantic behavior, protect against the trusted current user/Administrator, or substitute for executable/version/hash/TLS/target checks. Fixtures are synthetic only and do not load production inputs or demonstrate a production package, production-profile migration behavior, or live isolation.

Production remains paused/no-go. Story 22.15 remains in-progress and Epic 23 remains on-hold. The open gates remain: final-head checks and review; production-profile fixture plus CLI transaction/history and uncertain-failure tests; fresh target/TLS/observed-state proof; five-plane traffic isolation (application/jobs, Data API, Realtime, direct clients and database); separately approved 48-filter cleanup; strict catalog and signed 55-row ledger work; separately authorized settings/history-repair/main/deployment/reopening decisions. See [protected dry-run evidence](evidence/protected-production-dry-run-2026-09-22.md).

### Packet deadline correction — 2026-09-29

The automatic review at `1a5aa61937e34fa577a317afca4bca9bca64bf9a` found a further P2: the ten-second packet deadline started while the native host was still preparing its signed packet. The correction preserves the nonce/signature protocol and 64 KiB input cap, allows a separately bounded 60-second wait for the first nonempty packet byte, and starts the unchanged ten-second transmission-to-EOF deadline only at that byte. Missing, late, empty, oversized or interrupted input refuses before packet verification and CLI execution. The native host checks its preparation interval before the first write and uses one monotonic 360-second worker lifetime, including preparation and terminal drains, rather than granting a fresh lifetime after transmission. The explicit bounds total 282 seconds, leaving 78 seconds for prerequisite/journal work within the same outer limit. Existing evidence freshness, CLI timeouts, strict catalog checks and production pause remain unchanged. Meaningful input regressions and an actual native handoff with an eleven-second synthetic post-ready input load verify the reported trigger. Complete clean-source gates and exact final-head review of this correction are pending. The preceding ordering receipt remains successful evidence for its exact `1a5aa619` source; it does not verify this later correction. No hosted action authority is added.

### Historical collector interval preparation — 2026-09-29

The pending-verification wording in this preparation snapshot is superseded by the complete source-bound verification above.

Reviewbot identified that completion alone cannot prove a post-cleanup snapshot: staffing could start before cleanup and finish afterward. The same bounded audit found the analogous full-profile collection gap. Both source-bound collectors capture an immutable clock value immediately after the final source recheck and before the first target query; the profile retains this start across schema, aggregate and strict-catalog queries. Missing, noncanonical, reversed, future or stale intervals fail closed. The managed-writer collector already had this interval proof and remains unchanged. Current receipt contracts intentionally reject older completion-only records; fresh post-cleanup collection is required. No historical migration, strict catalog predicate, production data, pause behavior or hosted setting changes.

Regression coverage includes both pre-cleanup-start/post-cleanup-completion bypasses, equality at cleanup completion, invalid starts, actual collector call ordering, and signed worker/executor rejection before a CLI command. The interrupted full16 support record is retained outside the repository until the final source-bound evidence publication; it started at `2026-09-29T11:36:50.408Z` on clean `5a27d77cd04dae9fef90e8f94adb8432636f0b4c`, was stopped for this finding, and did not start build or Playwright. Complete verification and final review remain pending.
