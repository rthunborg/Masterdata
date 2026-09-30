# Production staffing FK verification - 2026-09-30

This public-safe local verification record binds clean candidate `eff0bd4e5bbcdf3e7217efd0b1b068cee2d86913`. It reports no hosted database, Vercel setting, deployment, migration, history-repair, merge, or reopening action.

- Focused Story 22.15 verification passed **222/222** across 10 files, zero skips/failures, exit 0.
- Refreshed local fixture prerequisite verification passed **12/12** across two files, zero skips/failures, exit 0. It verified local token signatures and a normal invalid-credential Auth response without exposing token values.
- Exact `npx vitest run` passed **4,544/4,544** across 372 files, zero skips/failures, exit 0. The report duration was **1022.60 seconds**; the guard-contained wrapper duration was **1,030,899 ms**.
- A clean local 69-migration SQL fixture passed strict catalog **16/16**. This is local fixture proof, not a canonical hosted verifier phase. The separate 58-migration historical template also completed successfully.
- TypeScript, zero-error lint (304 warnings), and the local staging-preview build passed. The build took **20,262 ms**.
- Exact `npx playwright test` passed **163**, with **47 individually matched historical skips** and zero failures/errors, exit 0. The report duration was **1,048.319612 seconds** and the guard-contained wrapper duration was **1,057,967 ms**. Nine skips are notification/cron authorization cases and 38 are removed, superseded, or fixture-debt cases; skips are not counted as passes. The normalized report status multiset and all 210 unique ordinals matched the JUnit binding; JUnit does not itself provide individual skip reasons or a duration-multiset comparison.
- Portable pause artifact verification found seven files, no functions or crons, page-route handling, and HTTP 503 for API/mutation requests. A forced production build was refused; staging-preview build remained allowed.

The prior clean candidate `e50a5cd856081a0c8ca7c9a9c4ee5a50ba11d2d3` full-Vitest run is retained as non-admitting historical failure evidence: 4,526 passed, two failed, 15 skipped and four failed files over 1,614.01 seconds. It exposed expired local fixture JWTs and synthetic test assumptions about a 13-migration subset and a fixture missing executed version 69. Those test-only/local-fixture issues, including the stale clone fingerprint, were corrected before this candidate; the earlier result does not verify this candidate.

The fresh public Vercel receipt records exactly two read-only GET requests. The production target matched the pause deployment, automatic domain assignment was disabled, and active cron definitions were zero. It does not claim deployment function enumeration or production readiness.

Hosted staging remains last verified at **68/68**. The repository declares 69 migrations; only forward `20260930091123` is pending staging application after fresh reviewed prerequisites. Production still has its separate isolation, filter-cleanup, signed-repair, history-repair, main, deployment, and reopening gates. Story 22.15 remains in-progress, Epic 23 remains on-hold, and production remains paused/no-go. Final independent review and final-head GitHub/Vercel checks remain pending.

## Redacted receipt binding

| Evidence | Receipt SHA-256 | Log SHA-256 |
| --- | --- | --- |
| Focused 222/222 | `adea3b4f64cb4dd7f8199918dd31ee102899a4a9899b3ca126679cf4dca01089` | `f4eee248d51f2b5ccded0476e181b0a3b1671266433ec5ff9e3e9c3812966828` |
| Fixture prerequisite 12/12 | `6e7e33c3beb895221a82f50d506cf2ab013f93bd0b89e61090ae5c7bc9199944` | `cf11c2c05dd259e947b8021a60098b80473e8f1baa896f47cd2de03a0cee5564` |
| Full Vitest | `5dbc1092dce763f883cc6fdd7608adc6dc3e277da5701d652d47f66faa5918f3` | `93716b1e57b29fff351fb98935958820395746f036e26190a5bbd11a80b3e642` |
| Clean 69 fixture | `cca58e48ea88fd026d7af4f9a339cc6e5c48aafafcc7eddef559be4be1d10420` | n/a |
| Historical 58 template | `77a1593d0750f8becabd82578a3d631abe49d887eb4d61d6c6ccb3cbcb3c61f5` | n/a |
| TypeScript/lint | `7e63ff490d0553fdfd50c022e223295950b726b8813b0deeaaf33b96f0db7596` | receipt-bound |
| Build | `64dc5017d695f434ca557f6826b12adfaf58a3e35d664347639b698d72c39d3e` | `aab49e465389433b17db8f9c478fa258498369c4a2a721a2e42ace83a5bc603a` |
| Pause artifact | `de713e15da8ae9ebe22389e92276daf79f599a5b98728bc84f122247102560a2` | receipt-bound |
| Full Playwright | `00ce1d88cb51d50a9bcea9878526ea4c858f2bc58bf90c7d53826341d57f7f6a` | `2ee33c55f0df18d411a7c429de75f2a60b5ee854d5f1862136e14c5a418b843f` |
| Historical failed e50 Vitest | `2feec0eccebf421d88d7b7d18f3259dc9dcc65dd30143a5d6663bb5548635532` | `4d8c44354dd848e4694c2104699e1c73903c8900d8aa80b0e29506e9f8c44ac7` |

The public Vercel receipt SHA-256 is `109733760cfd4a794d360be23370e108844cf134b4ad45e96a423e8a39a72df6`; its containing redacted evidence JSON SHA-256 is `7a1e7d341f3a2d6a28b6bfa51bb6f336d1b526e51b427d6b84673e469ac0fd43`.

Independent Playwright binding JSON SHA-256: 3475dfdc80ab278a73cb08a4c8df53bb1bfde1436812588c5e5853eac1a95e69. It confirms the report is within the wrapper interval, the normalized report-status multiset and all 210 unique ordinals match, and the exact 47 historical skip identities match. It does not claim individual JUnit skip reasons or duration-multiset comparison.
## Documentation follow-up

The unchanged readiness regression suite passed 29/29, zero skips/failures, exit 0 (0.755 seconds) after synchronization. The first docs-only attempt failed 1/29 because the current-plan banner lost its required label and explicit 69/14/55 count text; the documentation was corrected and tests/runtime stayed unchanged. That failed attempt is retained as non-admitting evidence. Its log SHA-256 is b868a50ed7556ebb053ff430f1d6fb66843367127cbee5ffd5683d22b1c10c00; the corrected log SHA-256 is 73b0573ed45a95f5771cb8bf0c20eb83004076f78d331d775546c2c852adbdc6. These scoped checks ran with the documentation follow-up uncommitted; the full-suite evidence above remains bound to the clean implementation eff0bd4e5bbcdf3e7217efd0b1b068cee2d86913.
