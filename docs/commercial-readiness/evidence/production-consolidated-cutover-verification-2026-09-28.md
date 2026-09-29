# Consolidated Production Cutover Verification — 2026-09-28

Story 22.15 remains **in-progress**, Epic 23 **on-hold**, and production **paused/no-go**. PR #121 prepares the consolidated cutover; it performs no hosted write, setting change, deployment, main merge or reopening. The actual 55-row ledger remains UNPROVED and unsigned.

The exact unit-tested implementation is `49e708ec99a8e74fb268e32d026bffc85bcb4a5c`. Staging base is `88cf3efcf7fdb8cdbfd00d850da6082b0f6fdd65`; main is `822350986f4c023948a7bbf490ddffc371185c4a`. Playwright ran on clean `2876b7a7915765182602f5cf2c2111df3c317d56`; its only subsequent code difference is the reviewed synthetic unit-test loader portability change. Application and release code are byte-identical. Final evidence/status changes are documentation only.

| Gate | Measured result |
| --- | --- |
| `npx vitest run` | 4349 passed, zero skips/failures; 367 files; exit 0; 389.86s report / 399681ms wrapper |
| `npx playwright test` | 163 passed, 47 historical skips, zero failures/errors; exit 0; 1288.560973s JUnit / 1294318ms wrapper |
| Required pinned CLI matrix | 8/8, zero skips/failures; 386813ms; exact protected command and minimal work-directory shape |
| TypeScript / ESLint | exit 0 / exit 0; zero lint errors, 298 warnings |
| Staging-preview build | exit 0; 39714ms; earlier working-tree build of byte-identical application sources |
| Pause safeguards | 45 unit checks; page routes, API/mutation 503, jobs and deployment controls; static artifact has no functions or crons |
| Dependency audit | zero high/critical; one documented moderate finding; audit exit 1 is retained, not called a clean audit |

All 47 Playwright skip identities match the earlier dated report exactly: nine notification/cron authorization cases and 38 fixture/superseded coverage-debt cases. Skips are not passes. Full identities and hashes are in the JSON companion. Required local service, database and live application flags were enabled for the full unit run; none of those gates was silently skipped.

GitHub Node 20 CI at the implementation passes both jobs: unit 4,156 passed / 193 skipped / zero failures (265.90s), integration 827 passed / 95 skipped / zero failures (72.80s). The unit skips are individually inventoried in the JSON: 95 missing local-fixture cases, 94 Windows-native cases, and four guarded-CLI admission cases. Those CI skips are not passes or hosted proof; the complete guarded local run covers all 4,349 tests without skips. Final documentation-head remote checks remain a separate gate.

The successful synthetic CLI case begins with absent history, applies the exclusive 13 files, runs 55 actual pinned-CLI repair commands and reaches exactly 68 versions. Catalog and preservation fingerprints stay unchanged across repair. The work directory has a manifest and synthetic private-link shape, no config.toml and only 13 migrations. The six fault cases preserve stop/rollback/uncertain-outcome classifications. This proves the tested local transaction/history protocol, not production schema compatibility or permission to repair.

The native test uses the actual compiled C# host, signed ready-nonce protocol, work-copy materialization and real worker/factory. Only encrypted-input loading, CLI execution and target/TLS leaf checks are synthetic. It validates the redacted attempt receipt and rejects untrusted arguments and altered evidence before CLI access. It never loads genuine encrypted inputs, contacts a hosted target or scans private profile directories.

The earlier clean 68-migration chain plus seed passed strict 16/16. All 68 SQL files and both strict catalog verifier files remain byte-identical to staging base; that clean-chain receipt is separately scoped and is not relabelled as a hosted or final-head run.

Earlier failures remain failures: the initial full run had two failed setup suites and 25 setup-affected skips; the next had a stale test assertion and a 60-second offline inventory timeout; the initial GitHub Node 20 run failed the synthetic loader API. Fixes retained all behavior assertions, changed only the long inventory case to a bounded 180 seconds, and used Node 20-supported asynchronous loader registration without changing CI or production runtimes. Native fixture injection failures were resolved through the existing owner toolchain exclusion, without a system-setting change.

An earlier full run at the final implementation had 4,348 passes and one live-export AbortError (zero skips, exit 1; 394.44s). The first request hit the unchanged 10-second timeout while the local development server compiled the export route; later exports completed in under half a second. The external local runner now checks bounded unauthenticated login/export route-compilation readiness (400/401) before the exact suite. This changes no repository source, test timeout, assertion, production behavior or skip classification. The final complete rerun above supersedes that failed run without erasing it.

Next gates: exact-head remote checks/review and the authorized staging merge; fresh source/target/tool/TLS-bound read-only proofs and full isolation; separately approved exact filter cleanup; protected 13-forward attempt; independent history-13/strict-16/canonical-68/preservation proof; owner adoption of all 55 rows and separately approved repairs; final history-68 proof. Retain the pause throughout. Main merge, deployment and reopening are separate decisions.

[Earlier rehearsal and its limits](production-forward-first-local-rehearsal-2026-09-28.md).
