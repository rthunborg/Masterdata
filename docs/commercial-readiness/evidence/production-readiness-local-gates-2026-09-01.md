# Production Readiness Local Gate Evidence — 2026-09-01

Scope: local-only verification of the Story 22.15 remediation candidate derived from `origin/staging` `bcb1a0e5bed3d06b9b7582320f491964ffc5a0b9`. This record contains counts and non-sensitive outcomes only. It is not hosted staging or production evidence.

## Fresh results

| Gate | Result |
| --- | --- |
| Frozen install | Exit `0`; bundled Node `v24.19.0`; lockfile unchanged |
| Clean local database rebuild | Exit `0`; all 63 migrations plus seed applied; 17-policy target present |
| Story 22.15 live database | 11/11 passed, including active/inactive authorization, saved-filter denial, catalog proof, rollback/final-admin behavior, and a synchronized two-client race |
| Story 22.14 PostgREST contention | 1/1 passed |
| Live Next-plus-Supabase export | 5/5 passed; generated workbook parsed through ExcelJS |
| Full Vitest with live gates enabled | Exit `0` in 525.97s; 317/317 files and 3,342/3,342 tests passed; zero skipped |
| TypeScript | Exit `0` |
| ESLint | Exit `0`; 0 errors / 297 warnings |
| Production build | Exit `0` with ephemeral local-only Supabase configuration; 33 pages generated. The preceding no-env invocation failed because required Supabase configuration was absent and is not a code failure. |
| Full Playwright | Exit `0` in 22.2 minutes; 163 passed / 47 skipped / 0 failed; test teardown removed local test data |
| Production dependency audit | 0 critical / 0 high / 1 moderate / 0 low across 281 production dependencies; command exit `1` only because the registered ExcelJS-to-UUID moderate remains |
| Whitespace/diff validation | Candidate-wide `git diff origin/staging...HEAD --check` exits `0` under one explicit path-scoped `.gitattributes` exception for the byte-preserved `20250113000000_add_room_assignment_rpc.sql`. Only that file's historical trailing whitespace on lines 28, 38, 63, 139, 147, 160, and 197 and blank EOF are exempt; the candidate excluding that path is clean, and the migration-manifest test pins SHA-256 `1e3ec6aa1ec00b768806743ae4cf07500fe1717efc4c399088cca11a459e003a`. |
| PR #94 review-patch verification | Focused migration-readiness suite 20/20 and active-user middleware suite 12/12; TypeScript exit `0`; full ESLint exit `0` with 0 errors / 297 pre-existing warnings; production build exit `0` with 33 pages; candidate, index, and worktree diff checks exit `0`. An initial unconstrained full Vitest run had one load-sensitive 15-second timeout in the pre-existing lazy-loading suite; that file passed 5/5 on immediate retry, and the latest bounded full rerun passed 308 files / 3,293 tests with 9 environment-gated files / 51 tests skipped. The latest exact full Playwright rerun applied all 63 migrations and seed to a project-scoped local stack, then passed 163 / skipped 47 / failed 0 in 24.0 minutes; teardown removed test data and both the owned Next server and local Supabase stack were verified stopped. |

No environment file was written, no credential was rotated, no hosted database was mutated, no deployment was performed, and no production data was accessed.

## Playwright skip classification

The 47 skipped tests are not counted as passing and do not prove their named behaviors.

| Category | Count | What is required to execute or retire it |
| --- | ---: | --- |
| PE3 notification cron/delivery | 9 | Set `RUN_CRON_E2E=true` only in an explicitly authorized non-production delivery-capture environment with approved recipient/capture controls. Real-recipient execution is prohibited. |
| PWA installation | 8 | PWA/offline support was removed and the application now unregisters service workers. Retire the obsolete Story 12.4 expectations or make a new product decision to restore PWA; no environment authorization can make the current expectations valid. |
| Crew-ready auto-selection / prerequisites | 7 | Legacy Story 13.5 and prerequisite journeys are marked superseded by Story 20.1. Retire or rewrite them against the current filter/selection UX; no hosted access is required. |
| Fixture-dependent employee status/highlighting/repayment/external export | 12 | Add deterministic local seed fixtures for terminated, combined-status, changed-field, repayment-lifecycle, externally visible, and exportable employees. No hosted access is required. |
| Crew-ready export eligibility | 4 | Add deterministic locally seeded employees that satisfy the current crew-ready eligibility rules, including filtered-state coverage. No hosted access is required. |
| Legacy capacity/concurrency/realtime/room/termination flows | 5 | Rewrite against the current Radix forms, room model, Realtime harness, and date restoration UI, or retire with traceability to replacement coverage. No hosted access is required. |
| Pagination export | 1 | Seed more than one page of employees and enable deterministic pagination in the local suite. No hosted access is required. |
| Filter export crew-ready state | 1 | Add a deterministic locally seeded crew-ready employee that survives the selected filter. No hosted access is required. |

The category counts total 47. Until the non-cron groups are retired or made deterministic, the result supports a green current-path regression run but not a claim of complete legacy acceptance-path coverage.

## Release boundary

Local evidence is complete for the implemented remediation. Release status remains `NO-GO` until PR #94 has an immutable reviewed head, its remaining redirect-loop thread is resolved, its checks pass, and the remediation is merged into `staging`; owner-authorized hosted staging proof/repair/five-version apply must then succeed and staging must be verified at 63 migration versions / 17 policies. Production additionally requires the runbook's fresh backup, signed 57-row history ledger, six-version dry run/apply, technical isolation, exact-SHA deployment, smoke, and restoration gates.

Epic 23 remains explicitly on hold.
