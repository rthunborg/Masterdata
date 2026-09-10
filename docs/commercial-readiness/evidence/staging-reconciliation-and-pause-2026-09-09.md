# Staging reconciliation and durable production pause — 2026-09-09

Status: preparation in progress. Story 22.15 remains **in-progress**; Epic 23 remains **on hold**. No hosted database write, history repair, production/manual deployment, hosted setting change, staging/main merge, or reopening occurred in this preparation. The authorized branch push triggered Vercel's normal automatic preview build.

## Authoritative Git baseline

Fresh fetch: staging `8c82bd8f4cc3c5076b2b6a37f4ced209bd8cba1c`, main `822350986f4c023948a7bbf490ddffc371185c4a`, PR #95 reviewed head `6a13898ec54c62632562c8504360ef9361b53ea5`. All match the owner-supplied state; no intervening commits. PR #95 was already explicitly authorized and merged. Isolated work uses `codex/story-22-15-reconcile-pause`. Earlier PR #95 local/remote tests remain historical evidence, not proof for this change.

## Fresh bounded staging preflight

Capture 2026-09-09T11:50:34.872Z from the unchanged staging baseline. The CurrentUser encrypted input blob hash, approved CLI **2.115.0** path/version/hash, approved psql path/version/hash, CA integrity, exact session-pooler mode, prior CLI link and three-way staging binding passed again. No credentials or private target values were printed. SQL used an explicit READ ONLY transaction, default_transaction_read_only=on, verified TLS root/hostname, 15-second statement timeout, 3-second lock timeout, and ROLLBACK. SQL SHA-256: `2ad23bcbcbb26fe263c06cb01dc740d25bb5b4bd8c61288aeeb512b2a557390a`.

| Saved-filter prerequisite | Count |
| --- | ---: |
| Total saved filters | 0 |
| Orphan auth.users references | 0 |
| Empty names | 0 |
| Names longer than 50 characters | 0 |

No row cleanup is needed for the observed snapshot. These predicates must be freshly re-proven at the reviewed pre-apply gate; they are not permanent facts.

| Repayment flag | True | False | NULL |
| --- | ---: | ---: | ---: |
| ÖMC | 0 | 1 | 32 |
| PE3 | 1 | 0 | 32 |

| Fixed column | Config rows | MD5 of permission JSON |
| --- | ---: | --- |
| diet_details | 1 | 608d8d6a5846555a137171568d7b82a5 |
| special_diet | 1 | 608d8d6a5846555a137171568d7b82a5 |
| repayment_needed_omc | 1 | 02b8319f6f054191fe4131b27e060f98 |
| repayment_needed_pe3 | 1 | 3a274a1d25cd34f07f378195bb080f29 |

A bounded name-equivalence query at 11:54:47Z confirmed `user_filters_user_id_name_key`, `user_filters_name_check`, and `user_filters_updated_at`; query SHA-256 `46f3e3b82f2a47fc8e3a41d4c373edf322b95646085fadd082b45eaa2c034b8c`. No row values were read. This supplements the prior redacted 15-check catalog failure and predicate-level diagnosis, not a passing release gate.

## Reconciliation decisions

- Preserve immutable historical migrations and all staging repayment/permission hashes. Preserve the documented admin_limited dietary view access without edit access. A clean database receives the same exact six-role dietary contract through the new forward migration; production remains subject to fresh inventory and an explicitly reviewed permission delta.
- Forward version `20260909115242` drops the filters default, canonicalizes UNIQUE/CHECK/trigger names, validates the auth.users cascade FK and nonempty/50-character name constraint, and creates the two exact standalone indexes. No historical CREATE TABLE replay, purge/reset, or data cleanup.
- Rebind the saved-filter timestamp trigger to the canonical invoker function with pinned search path. The pre-apply exception recognizes only the observed alias/body/attributes and exact shape. Post-apply requires the canonical contract.
- Canonicalize redundant room-function direct ACLs to PUBLIC + authenticated, preserving effective execution through PUBLIC. This is representation reconciliation, not a claim of broader function equivalence.
- Revised manifest: 64 versions; staging one repair then six applies; production candidate 57 catalog-proven repairs then seven applies. The new version is forward-only and cannot be repaired as applied. Every hosted gate remains separate.

## Fresh production-pause inspection

Read-only Vercel dashboard inspection completed around 12:03 UTC. The current Production Deployment panel's private deployment-ID hash matched the recorded pause ID. The production environment's Auto-Assign Custom Production Domains checkbox was off. The Cron Jobs page showed the empty onboarding state with no configured jobs. No values were revealed, buttons toggled, or settings saved. The connector's project summary does not expose the complete target/settings record, so the missing fields were verified through the authenticated dashboard; a summary of the latest preview is not production-target proof.

The original untracked pause deployment remains unchanged. Versioned preparation adds a portable static artifact, committed paused lock, production-build refusal/ignore safeguards, and empty root cron definitions. Platform-admin promotions/prebuilt uploads bypass source controls and remain explicit owner gates. These observations must be repeated before any approved production-target operation.

## Local verification and remaining gates

Pinned dependency installation with frozen lockfile and lifecycle scripts disabled passed. An agent-owned PostgreSQL 17.11 instance was started through the trusted resource guard on a distinct loopback port. An empty local Supabase auth schema was read from the healthy user-owned local stack; all original 63 immutable migration files replayed successfully in the fresh isolated database. The shared stack was not reset, stopped, adopted, or reconfigured. The full 64-file chain was then verified by cloning that freshly replayed 63-file database, applying the new forward migration and local parity seed, and invoking the reviewed catalog-verifier entrypoint with a strictly loopback-only test adapter: all 15 post-apply checks passed. The disposable clone was dropped and its absence verified. This is local SQL proof, not hosted target/TLS or migration-history proof. Full-suite, exact-commit, final review and turn cleanup evidence remain pending.

Supabase changelog checked 2026-09-09. Relevant current notices include public-table exposure/grant changes, extension version pinning, and Realtime schema restrictions. This change adds no table/API exposure, creates no extension version pin, and changes no Realtime schema. CLI remains 2.115.0. Sources: [changelog](https://supabase.com/changelog), [table exposure](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).

Required remaining sequence: finish local gates and exact-head reviews -> explicit staging-merge authorization -> immutable merged staging checkout -> repeat reviewed read-only proofs -> separate single-history-repair authorization -> immediate history verification -> separate exact six-version apply authorization -> staging validation -> separate production inventory/rollout gates. Production reopening is never implied by database readiness.

## Review and verification attempts

Draft [PR #96](https://github.com/rthunborg/Masterdata/pull/96) targets staging. Implementation `0d3fcdf44efbbe8fbe2a6812b24483b6f8e2ca28` passed GitHub Test Check and both Vercel checks; read-only inspection also confirmed an actual READY preview for that exact commit, rather than relying only on a check that could represent an ignored build. The production pause target was not replaced.

On that implementation, focused verification passed 174/174 in 7.51 seconds. Full `npx vitest run` passed 3,426 tests with five skipped live-export tests (319 files passed, one skipped), exit 0, report duration 113.43 seconds. The five skips required an attached application server and were not counted as passes. TypeScript passed; ESLint passed with zero errors and 297 existing warnings. Preview-environment `pnpm build` passed in 7.933 seconds. The 21 portable-pause tests passed, covering page/API/mutation routing, artifact contents, cron absence, and production-build refusal. Local routing emulation is not a hosted HTTP proof.

The first exact full `npx playwright test` on that implementation **failed**: 162 passed, 47 skipped, one failed, zero errors, report duration 1,649.05198 seconds (wall 1,656.1937658 seconds). The custom-column presentation test could not find `Hantera kolumner`; Next.js had reported an empty manifest for `/api/columns`. The failed report, log, and generated cache were retained. After stopping the owned test process and moving its generated cache aside, both tests in `tests/e2e/delete-column.spec.ts` passed in 44.2 seconds (exit 0, wall 55.4309044 seconds). No test, retry, or skip rule was weakened. This targeted pass does not replace the full gate.

Codex Reviewbot identified a duplicate filters-default predicate that did not express the documented staging representation. Inspection also found that SQL NULL could be ignored by `bool_and`. Review remediation `76e69e0ed890b311fea728b640605dff93fe2798` makes every represented column/function row explicitly true, permits only the exact staging `[]::jsonb` default, and retains NULL post-apply. A fresh isolated 58-migration template models the observed staging state, passes all 15 pre-apply checks, executes all six forward migrations in manifest order, and passes all 15 post-apply checks. Negative tests reject unexpected defaults and missing pinned function search paths. Independent review found no further material issue in this patch. Lead focused verification passed 177/177 in 3.79 seconds; the exact full Playwright rerun is pending.

Subsequent review found case-folded filesystem traversal in the pause builder and incomplete generated-output ignores. Commit `9b60f5d4137040b3d45058c18ddd68c188d96a26` preserves path casing for traversal, limits comparison folding to Windows, rejects an uppercase output prefix on case-sensitive systems, and ignores the complete generated directories. It also makes the existing Select All integration test await the background stats render before clicking; the exact checked-state/export assertions remain unchanged. This resolved the observed CI test failure on `76e69e0`: 3,366 passed / 67 environment skips / one failed, 453.53 seconds, exit 1. The seven-case export file passed locally in 9.32 seconds after the wait correction. Lead combined focused verification passed 186/186 in 6.60 seconds, including all 23 pause tests.

A local full-suite attempt on `9b60f5d` exposed an empty installed `rimraf` directory and E2E fixtures left by the interrupted browser run: 11 failed files, seven failed / 3,351 passed tests, nine suite-load errors, 62.60 seconds, exit 1. A frozen-lockfile reinstall with lifecycle scripts disabled restored the package; dependency files and versions remained unchanged. The repository's local E2E fixture cleanup completed with zero reported errors. Full `npx vitest run` then passed **3,436/3,436 tests in 320/320 files with zero skips**, exit 0, report duration **62.02 seconds**, wall **63.1719848 seconds**, UTC **13:34:04.7423627Z–13:35:07.9114368Z**. All five live export tests and both Story 22.15 database fixture suites were required. TypeScript passed; ESLint passed with zero errors / 297 existing warnings. An actual production-targeted local `pnpm build` was refused by the committed pause lock with expected exit 1; no deployment was attempted. The full 64-migration local chain again passed all 15 post-apply checks and verified clone cleanup.

Browser attempts on `76e69e0` and `9b60f5d` were interrupted through exact guard Stop after new review findings; neither has a completed suite result or counts as a passing gate. Their logs and verified process cleanup were retained. The pending final browser run must test the complete final implementation. Review also identified a stale six-apply production completion instruction (corrected to seven) and the English static notice; the portable page, document language, accessibility label, and API notice are now Swedish, with updated regression assertions. This changes only future source artifacts, not the currently deployed pause.

## Newly detected dependency gate

Fresh `pnpm audit --prod --json` on 2026-09-09 exited 1: **0 critical / 3 high / 3 moderate**. The prior 0-high/1-moderate result is historical. Two high findings affect Browserslist 4.28.1, and one high affects Sharp 0.35.3. New moderate findings affect baseline-browser-mapping 2.9.19 and Nodemailer 9.1.0, alongside the prior UUID advisory. No dependency version was changed. Targeted fixes are awaiting owner direction because this is a material finding beyond the focused reconciliation/pause change. The release audit gate is failed, not waived.

Primary advisory records: [Browserslist cache growth](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [Browserslist custom stats](https://github.com/advisories/GHSA-73wf-gq98-2v4g), [Sharp/libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c). Proposed bounded fix versions are Browserslist >=4.28.7, Sharp 0.35.4, baseline-browser-mapping >=2.11.0 and Nodemailer 9.1.1, followed by fresh audit and all affected gates. Supabase CLI remains 2.115.0.

## Dependency remediation evidence — 2026-09-10

The narrow compatible patch was applied after the dated 2026-09-09 failure evidence above. Before the patch, `pnpm audit --prod --json` exited `1` with **0 critical / 3 high / 3 moderate / 0 low**. After the patch, the same command still exited `1`, solely because the accepted `exceljs` transitive `uuid 8.3.2` finding (`GHSA-w5hq-g745-h8pq`) remains: **0 critical / 0 high / 1 moderate / 0 low** across 282 production dependencies. This exit code is not a blanket waiver; the only residual is covered by the existing time-bounded acceptance through 2026-09-30. No new risk waiver was created, and the deliberately incompatible UUID major override was not used.

| Dependency / constraint | Before | After |
| --- | --- | --- |
| Nodemailer | `9.1.0` | `9.1.1` |
| Sharp | `0.35.3` | `0.35.4` |
| `browserslist` compatible workspace floor | `>=4.0.0 <4.28.7` | `4.28.7` |
| `baseline-browser-mapping` compatible workspace floor | `>=2.0.0 <2.11.0` | `2.11.0` |
| `sharp` compatible workspace floor | `>=0.35.0 <0.35.4` | `0.35.4` |

The approved Supabase CLI remains `2.115.0`. The sanitized post-patch audit artifact is retained as `C:\DEV\hr-masterdata-22-15-support-20260909\audit-patched-20260910.json`. Relevant advisories: [Browserslist cache growth](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [Browserslist custom stats](https://github.com/advisories/GHSA-73wf-gq98-2v4g), [Nodemailer](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv), [Sharp/libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), and [baseline-browser-mapping](https://github.com/advisories/GHSA-8m3c-c648-2xjj).

The fresh trusted resource-guard hook is now available, resolving the historical `ACTOR_CLOSING` restart blocker. Renewed full local Vitest and Playwright gates are pending and must not be inferred from earlier candidate results. Exact-head CI on `7826a339414fccf6694798ef039a2e1e4403a8b6` is green: `test:silent` 3,372 passed / 67 skipped in 502.41 seconds and integration 827 passed / 67 skipped in 151.06 seconds. GitHub and Vercel checks are green; Reviewbot reported no findings in comment `5603868237`, and all eight inline threads are resolved. These remote results do not replace the pending fresh local full gates or authorize hosted actions, deployment, merging, or reopening.

## Full local candidate evidence before the custom-preview correction

Application, test, migration and build-control implementation: `5f60e58c9aa9a7e117bc589ec82d0b99a5846839`. Exact full browser candidate: `2ea1077aec62729303116bb85c49b4c44e98639f`; only readiness Markdown changed between those revisions. The final evidence commit also changes documentation only.

| Gate | Result |
| --- | --- |
| Full `npx vitest run` | 3,436 passed / zero skipped; 320 files passed; exit 0; 68.04 seconds report / 69.1462035 seconds wall |
| Full `npx playwright test` | 163 passed / 47 skipped / 0 failed / 0 errors; 210 total; exit 0 |
| Playwright timing | 1127.916442 seconds report / 1129.5184701 seconds wall; 2026-09-09T13:56:03.9223551Z to 2026-09-09T14:14:53.4388139Z |
| TypeScript / lint | Both exit 0; lint zero errors / 297 existing warnings |
| Preview build | Local `pnpm build` exit 0 in 14.1891017 seconds on the implementation SHA; actual Vercel preview READY was independently verified for that SHA |
| Production build guard | Actual local production-target build refused by the committed paused lock, expected exit 1; no deployment |
| Database proof | All 15 pre-apply checks, six exact ordered applies, all 15 post-apply checks on the observed-state fixture; all 64 immutable/forward files plus parity seed on the fresh local chain |
| Pause tests | 23 passed; Swedish document/notice/API message, page/API/mutation routing, no functions/crons, path containment/casing, Git ignores and production/preview target guards |
| Dependency audit | Failed, exit 1: 0 critical / 3 high / 3 moderate; unchanged locked versions and no new waiver |

The final 47 skipped test names/classes match the first run exactly, and E2E source/config remain unchanged from staging. The [individual classifications](production-readiness-pr95-playwright-2026-09-09.md) still apply: nine require separately authorized notification capture, and 38 are obsolete/superseded or deterministic-fixture coverage debt. No skipped case counts as passing. Report XML SHA-256: `84ef766042187c02e0fb63cee1946f2ab3dbf8f9de554091336f5d03a649e7b5`.

The earlier failed and interrupted attempts above remain part of the record. Final exact-head GitHub/Vercel/Reviewbot results are checked on PR #96 after this result-only commit; these local results do not pre-approve them or a merge. The failed audit prevents merge-readiness.

Resource cleanup was verified at 2026-09-09T14:15:42.6073493Z: actor-scoped CloseActor succeeded with verified=true, followed by List with verified=true and zero unresolved owned resources. The owned PostgreSQL and Playwright/Next.js trees are stopped; no lease remains. The borrowed user-owned Supabase stack was not stopped or adopted. Child exit hooks had previously failed closed; no child-owned managed resources were launched, and root cleanup does not represent those hook failures as successes.

## Custom-preview review correction and renewed verification gate

Custom-preview review correction (2026-09-09): VERCEL_ENV is authoritative for the deployment class; a named VERCEL_TARGET_ENV is accepted only for a preview class. Production in either marker remains paused; missing/invalid base markers and conflicting built-in targets fail closed. Both guards now share the same target and lock policy. The new focused gate passes 49/49 (25 pause tests plus 24 release checks), including active Next config import for named staging/QA previews and negative marker cases. Full local Vitest/Playwright renewal is blocked: after verified CloseActor/List cleanup, a managed PostgreSQL restart was rejected with ACTOR_CLOSING. No unmanaged fallback was launched and no skip classification was changed. Earlier full results are historical evidence for 5f60e58/2ea1077, not a pass for this correction. A fresh hook-established lifecycle context is required before managed full verification; dependency-audit resolution and final exact-head remote review also remain open. Story 22.15 remains in-progress and Epic 23 remains on hold.

The Vercel contract is documented at [System environment variables](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_target_env).

Additional correction checks: TypeScript exits 0; lint exits 0 with zero errors and 297 existing warnings. An initial bounded preview build compiled but failed during prerender because local Supabase fixture inputs had not been loaded (exit 1, 26.0489055 seconds). Reusing the reviewed loopback-only input loader produced a successful named staging preview build (exit 0, 8.3803021 seconds). These runs used the correction working tree; exact committed-head checks are recorded on PR #96. No hosted connection or deployment was involved in those local builds. The earlier bf00933 GitHub run 34362653764 completed successfully, but Reviewbot found the custom-preview issue, so it is not a clean final-head review.

## Blank reopening-record review correction

The subsequent review of be8076ca1a67e851decc73acb3f102beb4238695 found whitespace-only reopeningDecision records were accepted. The shared lock reader now requires nonblank trimmed content while retaining the 160-character raw bound and newline rejection. A new regression checks empty, spaces, tabs and nonbreaking spaces through both guards without changing the committed paused lock. Focused verification is now 50/50 (26 pause tests plus 24 release checks), zero failures/skips, 3.08 seconds; TypeScript passes. Renewed full local gates remain blocked by ACTOR_CLOSING, and the failed dependency audit still needs owner direction. No reopening or hosted action occurred.
