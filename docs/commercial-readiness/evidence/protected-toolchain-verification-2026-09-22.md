# Protected toolchain verification retry — 2026-09-22

Implementation under test: `357552ba506d2db3c0bdc4b0e2cf9403a36e4d94`.
Base/staging: `5a67cd26ad4c3900c219c8c363cb856aa179c92c`.
Main: `822350986f4c023948a7bbf490ddffc371185c4a`.

The owner reported Docker running and requested a fresh check. Ordinary Docker reported server 29.8.0. Resource Guard 0.9.12 admitted fresh starts for both retained local Compose fixtures; both reached active, verified readiness. This supersedes the current infrastructure blocker, but does not establish that Docker was stopped during the earlier worker failure. No user-owned stack was adopted, reset or stopped.

Reviewbot's final-head P1 on the previous PR head identified a named re-export whose comment contained a false closing brace. The implementation now refuses comments, quoted names, templates, nested braces and escapes within a named export list. Three regressions cover valid block-comment, line-comment and quoted-name re-export forms. The unchanged real four-module graph and plain local exports remain positive cases. Independent review of this narrow fix found no actionable findings.

The component remains local-only: externally reviewed package digest, fixed installed bytes, held leases, bounded version-only wrapper dispatch and observed Node startup modules. It adds no private-input loader, target binding, isolation attestation, database command or production apply capability. The documented trusted-user/administrator and syntactic/native-observation limitations remain.

This record preserves both failed full Vitest attempts. Neither successful stack startup, a passing subset, nor Linux CI substitutes for complete Windows/local-service evidence. The subsequent successful full run below closes the local test blocker; full Vitest was not waived.

Production remains paused/no-go. Story 22.15 remains in-progress; Epic 23 remains on-hold. No production settings, cleanup, history repair, main merge, production deployment or reopening is authorized by these local tests.

## Retained initial full-suite failure

The first exact-commit npx vitest run exited 1: 3,694 passed, one failed, zero skipped, 332 test files passed and one failed (333 total). Vitest duration was 154.24 seconds; orchestration receipt duration was 177.198 seconds. Source head, source plan and clean checkout were reverified unchanged. The failing live impersonation export aborted at its existing 10-second request limit. The owned Next log records a successful HTTP 200 response in 10.1 seconds, including 8.4 seconds of first-route compilation and 1.669 seconds of application code. Subsequent export requests completed in 256–701 milliseconds with expected response statuses. A full unchanged-suite rerun uses the already compiled local application. No timeout, assertion, skip classification, implementation byte or fixture target was altered. This initial run remains a failure, not a pass or waived result.

## Native fixture scope

The native fixture uses the real reviewed JavaScript CLI wrapper with a compiled synthetic CLI executable restricted to the version contract and controlled failure/timeout modes. It tests launcher/package/lease/pipe/containment behavior; it does not attest a production toolchain package, perform hosted Supabase access or replace exact executable/version/hash/TLS/target verification before future hosted operations. Supabase CLI 2.115.0 remains the reviewed production pin.

## Retained warm full-suite failure and exclusion diagnosis

Before the owner corrected the exclusion, the unchanged warm npx vitest run also exited 1: 3,669 passed, 26 setup-failure-skipped cases, 332 test files passed and one failed. Vitest duration 148.71 seconds; orchestration duration 160.470 seconds. The live export suite passed this time. The native launcher setup explicitly reported windhawk.dll at native admission before CLI dispatch. These 26 skips are failures to obtain evidence, not platform skips or passes. No allowlist was broadened and no further full rerun is justified without an environment change.

Earlier read-only inspection confirmed the owner's variable-based toolchain exclusion was saved, the literal user-path exclusion was absent, and Windhawk 1.7.3 runs a SYSTEM service. The version-matched source uses ExpandEnvironmentStrings in its caller context for pattern matching. Therefore a USERPROFILE-based pattern is context-dependent and unreliable for this use. The owner was asked to replace only that entry with the absolute path to the same toolchain glob and restart Windhawk; other settings remain unchanged. The agent did not modify Windhawk or stop it. This explains a plausible mismatch; only a subsequent controlled native/full verification can establish recovery. Source: https://github.com/ramensoftware/windhawk/blob/v1.7.3/src/windhawk/engine/functions.cpp#L135-L203.

Production dependency audit repeated: pnpm audit --prod --json exits 1 with zero critical, zero high and one moderate (UUID GHSA-w5hq-g745-h8pq). This is the existing accepted threshold through 2026-09-30, not a clean audit, new waiver or expiry extension. No dependencies changed.

The Supabase changelog was rechecked on 2026-09-22; its latest entry remains the 2026-09-18 Health Check Advisors announcement. This does not expand the recorded pinned-CLI WARN-only advisor coverage or prove unavailable Management API checks. No CLI/library upgrade or hosted settings change was made. Source: https://supabase.com/changelog.

## Completed independent gates and current decision

PR #112 local verification passed on head 3e191a1ed5b07d638b73a09debee8df26499ff9d: exact npx vitest run passed 3695/3695 tests across 333 files, zero skips/failures, exit 0 (149.42s runner; 161.149s orchestration). The owner installed the absolute-path Windhawk exclusion and restarted it; read-only verification confirmed the entry, and focused native/inventory tests passed 44/44 before the full suite. Docker was initially unavailable in this follow-up and became reachable after the owner started it; guarded fixtures then passed readiness. Local routes were prewarmed without authentication; no timeouts, allowlists or skip rules changed. Both earlier failed runs remain recorded. Implementation bytes are unchanged from 357552b, whose exact Playwright passed 163 with 47 individually matched skips, staging build passed, and TypeScript/lint passed. Reviewbot found no major issues on 3e191a1; final documentation-head checks/review remain required before the authorized staging merge. Production remains paused/no-go; Story 22.15 stays in-progress and Epic 23 on-hold. This version-only component is not the complete protected production bootstrap. See docs/commercial-readiness/evidence/protected-toolchain-verification-2026-09-22.md.

| Gate | Exact result |
| --- | --- |
| Corrected-exclusion full Vitest | 3695 passed, 0 failed/skipped; 333 files passed; head 3e191a1; exit 0; 149.42s runner / 161.149s orchestration |
| First full Vitest | 3694 passed, 1 failed, 0 skipped; 332 files passed / 1 failed; exit 1; 154.24s runner / 177.198s orchestration |
| Warm full Vitest | 3669 passed, 26 setup-failure skips; 332 files passed / 1 failed setup suite; exit 1; 148.71s runner / 160.470s orchestration |
| New component cases | First exact full run passed native 26/26 and inventory 18/18; the later setup failure remains historical failed evidence; the corrected-environment focused and full runs below now pass |
| Exact npx playwright test | 163 passed, 47 skipped, 0 failed / 0 errors; exit 0; 1243.444392s report / 1264.999s orchestration |
| Skip reconciliation | All 47 match production-readiness-pr95-playwright-2026-09-09.md by path and test name; 9 capture-gated notification cases and 38 coverage-debt/superseded-flow cases remain non-passing |
| Staging-preview build | pnpm run build, exit 0, 30.782s orchestration |
| TypeScript and full lint | Both exit 0; lint 0 errors and 296 warnings; individual durations not separately recorded |
| Production dependency audit | Exit 1; 0 critical / 0 high / 1 existing accepted UUID moderate through 2026-09-30 |

The original gates above reverified implementation 357552b, clean checkout and complete 68-migration-plus-seed raw-byte source plan after completion. No migration SQL, manifest, hosted verifier or private-workspace denial changed. GitHub Run Tests and both Vercel checks passed on implementation 357552b; they are not final evidence-head approval. The final documentation head requires a separate Reviewbot/check inspection.

All seven managed resource IDs received lifecycle release/stop handling. CloseActor and the following single List succeeded. That List reported five stopped and two stop_requested resources; accepted stop requests are not verified shutdown. No polling for shutdown, user-owned stack intervention, resource deletion or retained-data reset occurred.

The local test blocker is closed. The next PR gate is review and CI on the final documentation head, then the standing-authorized reviewed staging merge. Preserve the current unsigned 55-row repair ledger, 13 proposed executes, separately gated 48-filter cleanup and isolation/settings, history repair, main, production deployment and reopening boundaries. This component is not the completed protected production bootstrap.

Historical documentation verification before the corrected-exclusion follow-up: production-readiness-migrations.test.ts passed 29/29, zero skips/failures, exit 0, 0.867 seconds. All three YAML surfaces parsed with Story 22.15 in-progress, Epic 23 on-hold and production paused/no-go; frozen specification and hosted migration/verifier boundaries remained unchanged; staged whitespace and redaction checks passed. Historical planning tallies remain explicitly historical; the 44 new component cases were recorded separately and at that time did not establish a completed full-suite pass.

## Corrected exclusion and complete full-suite recovery

The owner confirmed the absolute-path exclusion and restarted Windhawk. A read-only boolean check verified the saved entry without publishing machine settings. Focused native/inventory verification on clean head `3e191a1ed5b07d638b73a09debee8df26499ff9d` passed 44/44, zero skips/failures, exit 0: 76.88s runner and 77.371s orchestration. This head changes documentation only from implementation `357552ba506d2db3c0bdc4b0e2cf9403a36e4d94`. No executable bytes or test semantics changed.

Docker initially lacked its engine pipe in this follow-up. After the owner started Docker, server 29.8.0 became reachable; the broker admitted both retained fixtures and verified active readiness. The separate guard-owned Next application was ready at the same pinned head. Unauthenticated local POST prewarm returned export 401 (1.612s) and login 400 (0.312s); no records or credentials were supplied. The exact `npx vitest run` then passed **3695/3695 tests, 333/333 files, zero skipped/failed, exit 0**, in **149.42s runner / 161.149s orchestration**. The receipt reverified unchanged head, clean checkout and complete 68-migration-plus-seed source plan. No failure was reclassified or waived. Prior Playwright/build/TypeScript/lint results remain bound to byte-identical implementation 357552b and were not unnecessarily rerun for documentation changes.

Reviewbot completed a clean review of 3e191a1 and all three GitHub/Vercel checks passed at that head; the only inline finding is the fixed, outdated P1 on 5dcf6f7. The final documentation commit requires its own checks and review. All five follow-up managed resources received successful Stop acknowledgments (stop_requested, not proof of shutdown); no user-owned resources or saved data were changed. Production stays paused/no-go, Story 22.15 in-progress, Epic 23 on-hold.

Follow-up cleanup: CloseActor and the following single List both succeeded; all five follow-up resources were reported stopped. Saved resources/data were retained. After synchronizing the follow-up documentation, production-readiness-migrations.test.ts passed 29/29 with zero skips/failures, exit 0, 0.906 seconds.

## Merge outcome

The previously open final documentation-head gate is closed. PR #112 reviewed final head `e4ab223` merged as staging `8aec314`; required GitHub/Vercel checks and Codex review were clean. Statements above that describe final review or checks as pending are historical to their dated local verification. This merge completes only the version-only protected-toolchain component. It does not provide private-input admission, target binding, traffic isolation, cleanup, history repair, non-dry-run apply, deployment, or reopening authority.
