# Local synthetic CLI transaction and history matrix — 2026-09-23

Production remains **paused/no-go**. Story 22.15 remains **in-progress** and Epic 23 **on-hold**. This component made no hosted connection or change and did not load real production inputs. It used fresh, retained synthetic databases on guard-owned local services.

## Exact source and scope

- Tested implementation: `a8634ec58992a8a474f0b16fb48f1d8d00764fd0`.
- Staging base: `c193235efa3bc3a00ad3d78e152e80dec6cf382f`, the authorized PR #113 merge with the reviewed tree unchanged.
- Main: `822350986f4c023948a7bbf490ddffc371185c4a`.
- Supabase CLI: **2.115.0**, with independently checked executable hashes and versions. No upgrade.
- All 68 historical migration files, manifest, strict catalog verifier, app code, dependency lockfile and pause safeguards are unchanged from the staging base.
- The [machine receipt](local-synthetic-cli-matrix-2026-09-23.json) binds the thirteen measured migration files by Git blob and raw-byte SHA-256, records the tool identities, and contains only redacted hashes, counts and terminal classifications.

The seven cases apply the immutable proposed subset through the pinned CLI. Each has a separate database and independently checked physical/history observations. The required gate rejects missing admission or an incomplete case set. The portable admission helper verifies current guard ownership/readiness, selected-container IPv4 loopback mapping and database system-identifier hash. Its declared Compose recipe hash is **not** independent attestation of the daemon's complete configuration; the trusted operator selects the resource from the reviewed Compose admission record.

## Seven measured outcomes

| Case | Terminal classification | Meaning |
|---|---|---|
| Observed 48-filter guard | proven_rejected_before_current_effect | The current file rejects before its enumerated physical effects; eight prior history versions remain. |
| Zero-filter derivative | proven_complete_local_rehearsal | All thirteen versions recorded, preservation checks pass and strict catalog passes 16/16. This does not authorize production cleanup. |
| Explicit transaction/history insert fault | committed_unrecorded_current | The headcount constraint commits, but the current history row is absent. No retry or repair follows. |
| Implicit transaction/history insert fault | rolled_back_unrecorded_current | The separate column-absent derivative rolls back the current column addition and leaves no current history row. |
| Trigger profile guard 184840 | proven_rejected_before_current_effect | Rejection before current effects, with eleven prior history versions. |
| Trigger profile guard 184841 | proven_rejected_before_current_effect | Rejection before current effects, with twelve prior history versions. |
| Explicit transaction/history timeout | uncertain_current_file | The fault hook fires and the server later settles, but the interrupted child result remains uncertain. |

No failed or uncertain database was reset, dropped, repaired, retried or continued. Synthetic databases and their data remain retained. Manual creation of the synthetic history table is fault-injection setup, **not** proof of CLI history bootstrap and not permission for hosted manual history writes.

The fixture has 73 employees; each repayment flag has 70 null, two true and one false; 1,025 audit rows include 202 nonnull actors mapped to one synthetic actor; and 61 configuration rows, two staffing locations and nonempty user/date/staffing-change collections are checked. These are declared synthetic aggregates, not production row evidence. The column-absent implicit case is a separate derivative whose production mapping is unproved. Permissions outside the specifically modeled rows remain synthetic/unproved. Observer fingerprints cover enumerated public object groups and complete selected synthetic row collections; they are not universal all-schema catalog proof.

## Verification at the implementation commit

| Gate | Result |
|---|---|
| Focused regression tests | 174 passed, zero skipped/failed; 2.30s |
| Exact `npx vitest run` | 3935 passed, zero skipped/failed; 344 files; 290.39s runner, 299766ms orchestration; exit 0 |
| Exact `npx playwright test` | 163 passed, 47 skipped, zero failures/errors; 1056.230892s runner, 1074212ms orchestration; exit 0 |
| Fresh complete chain | 68 immutable migrations plus seed; strict catalog 16/16; 10414ms |
| TypeScript | Exit 0 |
| ESLint | Zero errors, 296 warnings; exit 0 |
| Staging-preview build | Exit 0; 24002ms |
| Pause safeguards | 45 tests passed within the full Vitest run; no hosted pause reinspection |

Vitest used four workers without relaxing test or request deadlines. Playwright's 47 skip identities exactly match the reviewed prior report: nine notification/cron authorization cases and 38 fixture/superseded debt cases. Each identity is listed in the machine receipt; none counts as a pass.

Implementation-head GitHub and both Vercel checks are green. GitHub's main test job reports 3,747 passed and 188 skipped: 93 managed local-service/admission cases and 95 native Windows-only cases, listed by file in the receipt. All 188 execute in the local Windows full-suite pass. Final documentation-head checks and review remain a separate gate.

The unchanged-lockfile dependency audit remains nonzero: production has zero critical/high and one moderate finding under the existing acceptance expiring **2026-09-30**; the development-inclusive audit has one critical, 16 high and ten moderate findings under the existing tooling follow-up. This component grants no new waiver.

## Earlier attempts and limits

The receipt preserves failed attempts rather than replacing them with the final pass. Initial matrix heads had observer/fixture/boundary defects (0/7 and 3/7 passed), corrected before the subsequent seven-case pass. At `b185986`, full Vitest had 3,892 passes and two deadline failures; a focused package diagnosis later passed 12/12. Deadlines were not relaxed.

The `dd4ecf1` full run had 3,928 passes, three failing matrix cases and a completion-guard failure after review preparation mistakenly created an untracked helper folder in the live checkout. Source-integrity checks correctly rejected those cases; that run is invalid evidence. The folder was moved outside, and the clean `a8634ec` run above supersedes it. The exact removal timestamp is unavailable. An earlier clean-chain invocation stopped at local argument parsing before database creation; the fresh successful invocation is separately bound in the receipt.

## Remaining production gates

Complete PR #114's exact final-head review/check gate and authorized staging merge. Then collect fresh protected real-input, target/TLS and preservation proofs and prepare isolation across application/jobs, Data API, Realtime, direct clients and database, with target-write admission. This local matrix is a completed test component; it is not production admission.

The **55 repair-ledger rows remain UNPROVED and unsigned**, **13 executes remain proposed**, **48 orphan filters require separately approved cleanup**, and **seven strict production catalog groups remain unresolved**. Backup statements remain owner attestations, without invented restore proof. Isolation/settings, cleanup, history repair, main merge, production deployment and reopening retain separate owner gates. Preserve the existing static pause, API/mutation shutdown and empty scheduled-job configuration; the last hosted pause observation remains dated evidence, not a fresh check in this component.
