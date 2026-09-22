# Protected toolchain verification retry — 2026-09-22

Implementation under test: `357552ba506d2db3c0bdc4b0e2cf9403a36e4d94`.
Base/staging: `5a67cd26ad4c3900c219c8c363cb856aa179c92c`.
Main: `822350986f4c023948a7bbf490ddffc371185c4a`.

The owner reported Docker running and requested a fresh check. Ordinary Docker reported server 29.8.0. Resource Guard 0.9.12 admitted fresh starts for both retained local Compose fixtures; both reached active, verified readiness. This supersedes the current infrastructure blocker, but does not establish that Docker was stopped during the earlier worker failure. No user-owned stack was adopted, reset or stopped.

Reviewbot's final-head P1 on the previous PR head identified a named re-export whose comment contained a false closing brace. The implementation now refuses comments, quoted names, templates, nested braces and escapes within a named export list. Three regressions cover valid block-comment, line-comment and quoted-name re-export forms. The unchanged real four-module graph and plain local exports remain positive cases. Independent review of this narrow fix found no actionable findings.

The component remains local-only: externally reviewed package digest, fixed installed bytes, held leases, bounded version-only wrapper dispatch and observed Node startup modules. It adds no private-input loader, target binding, isolation attestation, database command or production apply capability. The documented trusted-user/administrator and syntactic/native-observation limitations remain.

This record preserves both failed full Vitest attempts. Neither successful stack startup, a passing subset, nor Linux CI substitutes for complete Windows/local-service evidence. PR #112 remains a draft; full Vitest is not waived.

Production remains paused/no-go. Story 22.15 remains in-progress; Epic 23 remains on-hold. No production settings, cleanup, history repair, main merge, production deployment or reopening is authorized by these local tests.

## Retained initial full-suite failure

The first exact-commit npx vitest run exited 1: 3,694 passed, one failed, zero skipped, 332 test files passed and one failed (333 total). Vitest duration was 154.24 seconds; orchestration receipt duration was 177.198 seconds. Source head, source plan and clean checkout were reverified unchanged. The failing live impersonation export aborted at its existing 10-second request limit. The owned Next log records a successful HTTP 200 response in 10.1 seconds, including 8.4 seconds of first-route compilation and 1.669 seconds of application code. Subsequent export requests completed in 256–701 milliseconds with expected response statuses. A full unchanged-suite rerun uses the already compiled local application. No timeout, assertion, skip classification, implementation byte or fixture target was altered. This initial run remains a failure, not a pass or waived result.

## Native fixture scope

The native fixture uses the real reviewed JavaScript CLI wrapper with a compiled synthetic CLI executable restricted to the version contract and controlled failure/timeout modes. It tests launcher/package/lease/pipe/containment behavior; it does not attest a production toolchain package, perform hosted Supabase access or replace exact executable/version/hash/TLS/target verification before future hosted operations. Supabase CLI 2.115.0 remains the reviewed production pin.

## Retained warm full-suite failure and exclusion diagnosis

The unchanged warm npx vitest run also exited 1: 3,669 passed, 26 setup-failure-skipped cases, 332 test files passed and one failed. Vitest duration 148.71 seconds; orchestration duration 160.470 seconds. The live export suite passed this time. The native launcher setup explicitly reported windhawk.dll at native admission before CLI dispatch. These 26 skips are failures to obtain evidence, not platform skips or passes. No allowlist was broadened and no further full rerun is justified without an environment change.

Read-only inspection confirmed the owner's variable-based toolchain exclusion is saved, the literal user-path exclusion is absent, and Windhawk 1.7.3 runs a SYSTEM service. The version-matched source uses ExpandEnvironmentStrings in its caller context for pattern matching. Therefore a USERPROFILE-based pattern is context-dependent and unreliable for this use. The owner was asked to replace only that entry with the absolute path to the same toolchain glob and restart Windhawk; other settings remain unchanged. The agent did not modify Windhawk or stop it. This explains a plausible mismatch; only a subsequent controlled native/full verification can establish recovery. Source: https://github.com/ramensoftware/windhawk/blob/v1.7.3/src/windhawk/engine/functions.cpp#L135-L203.

Production dependency audit repeated: pnpm audit --prod --json exits 1 with zero critical, zero high and one moderate (UUID GHSA-w5hq-g745-h8pq). This is the existing accepted threshold through 2026-09-30, not a clean audit, new waiver or expiry extension. No dependencies changed.

The Supabase changelog was rechecked on 2026-09-22; its latest entry remains the 2026-09-18 Health Check Advisors announcement. This does not expand the recorded pinned-CLI WARN-only advisor coverage or prove unavailable Management API checks. No CLI/library upgrade or hosted settings change was made. Source: https://supabase.com/changelog.

## Completed independent gates and current decision

Draft PR #112 implementation 357552ba506d2db3c0bdc4b0e2cf9403a36e4d94 fixes the Reviewbot named-export delimiter bypass; independent review found no actionable issues. Docker and guard readiness recovered. Exact Playwright passed 163 tests with 47 individually matched historical skips, zero failures/errors (1243.444392s, exit 0); staging build passed (30.782s). TypeScript and full ESLint passed (zero errors, 296 warnings). Full Vitest is NOT green: first run had 3694 passes and one cold-compilation export timeout; the warm run had 3669 passes and 26 setup-failure skips because windhawk.dll was detected. Both exited 1 and remain failures. The saved USERPROFILE-based exclusion was verified; the owner must confirm replacing it with the same absolute-profile glob before another full attempt. No setting was changed by the agent. Production remains paused/no-go; Story 22.15 stays in-progress and Epic 23 on-hold. The PR must not merge until full Vitest and final-head review/checks pass. See docs/commercial-readiness/evidence/protected-toolchain-verification-2026-09-22.md.

| Gate | Exact result |
| --- | --- |
| First full Vitest | 3694 passed, 1 failed, 0 skipped; 332 files passed / 1 failed; exit 1; 154.24s runner / 177.198s orchestration |
| Warm full Vitest | 3669 passed, 26 setup-failure skips; 332 files passed / 1 failed setup suite; exit 1; 148.71s runner / 160.470s orchestration |
| New component cases | First exact full run passed native 26/26 and inventory 18/18; the later setup failure remains unresolved and is not passing evidence |
| Exact npx playwright test | 163 passed, 47 skipped, 0 failed / 0 errors; exit 0; 1243.444392s report / 1264.999s orchestration |
| Skip reconciliation | All 47 match production-readiness-pr95-playwright-2026-09-09.md by path and test name; 9 capture-gated notification cases and 38 coverage-debt/superseded-flow cases remain non-passing |
| Staging-preview build | pnpm run build, exit 0, 30.782s orchestration |
| TypeScript and full lint | Both exit 0; lint 0 errors and 296 warnings; individual durations not separately recorded |
| Production dependency audit | Exit 1; 0 critical / 0 high / 1 existing accepted UUID moderate through 2026-09-30 |

Every full gate reverified the same source commit, clean checkout and complete 68-migration-plus-seed raw-byte source plan after completion. No migration SQL, manifest, hosted verifier or private-workspace denial changed. GitHub Run Tests and both Vercel checks passed on implementation 357552b; they are not final evidence-head approval. The final documentation head requires a separate Reviewbot/check inspection.

All seven managed resource IDs received lifecycle release/stop handling. CloseActor and the following single List succeeded. That List reported five stopped and two stop_requested resources; accepted stop requests are not verified shutdown. No polling for shutdown, user-owned stack intervention, resource deletion or retained-data reset occurred.

The next local action is owner confirmation of the corrected Windhawk exclusion, then a complete exact-head Vitest run with the local application routes compiled before timed functional requests. Do not retry until green without an explained environment change. Preserve the current unsigned 55-row repair ledger, 13 proposed executes, separately gated 48-filter cleanup and isolation/settings, history repair, main, production deployment and reopening boundaries. This component is not the completed protected production bootstrap.

Documentation verification after synchronization: production-readiness-migrations.test.ts passed 29/29, zero skips/failures, exit 0, 0.867 seconds. All three YAML surfaces parsed with Story 22.15 in-progress, Epic 23 on-hold and production paused/no-go; frozen specification and hosted migration/verifier boundaries remained unchanged; staged whitespace and redaction checks passed. Historical planning tallies remain explicitly historical; the 44 new component cases are recorded separately and are not a completed full-suite pass.
