# Story 22.15: Close Production-Readiness Remediation Gaps

## Status

in-progress

## Source of Truth

The approved frozen implementation specification is [`spec-22-15-production-readiness-remediation.md`](../../_bmad-output/implementation-artifacts/spec-22-15-production-readiness-remediation.md). This status carrier does not duplicate or modify its human-owned intent. The spec's dated `Recorded 2026-09-01` execution paragraph is preserved as an intermediate historical snapshot; the fresh verification results below supersede that paragraph.

## Verification Status

- PR #94 is merged into `origin/staging` at `a39f0e83bc892c970d8471137134f6fbe33c40f6`. Status remains `in-progress` because the owner-authorized IPv4 session-pooler runbook/verifier amendment still requires review and merge, after which fresh hosted proof and separately owner-controlled hosted actions remain incomplete.
- `pnpm install --frozen-lockfile`: exit `0` with bundled Node `v24.19.0`; lockfile unchanged.
- `pnpm type-check`: exit `0` after the remediation-local middleware null narrowing fix.
- Clean local `supabase db reset --local`: exit `0`; all 63 migrations and the parity seed applied. The post-reset catalog has 17 policies, the required missing-only column configuration rows, and cleanup-outbox access restricted to `postgres`.
- Story 22.15 live database suite: 11/11 passed, including active/inactive direct-role behavior, saved-filter denial, documented exceptions, atomic rollback/final-admin protection, and the synchronized two-client race. The Story 22.14 PostgREST contention test passed 1/1. The live Next-plus-Supabase export suite passed 5/5 against a real generated workbook.
- Final fresh full `npx vitest run` with every local live gate enabled on 2026-09-01: exit `0` in 525.97s; 317/317 files passed and 3,342/3,342 tests passed, with zero skips.
- `pnpm lint`: exit `0`; 0 errors / 297 pre-existing warnings.
- `pnpm build`: the first invocation failed closed because no Supabase URL/key was supplied; the fresh rerun with ephemeral local-only Supabase configuration exited `0` and generated 33 pages. No environment file or hosted setting was changed.
- `pnpm audit --prod --json`: command exit `1` for the accepted advisory; threshold passes at 0 critical / 0 high / 1 moderate / 0 low (ExcelJS→UUID only).
- Candidate-wide `git diff origin/staging...HEAD --check`: exit `0` under the explicit path-scoped `.gitattributes` exception for the byte-preserved `supabase/migrations/20250113000000_add_room_assignment_rpc.sql`. The exception covers only its historical trailing whitespace on lines 28, 38, 63, 139, 147, 160, and 197 plus the blank line at EOF; excluding that path is independently clean, and the migration-manifest test pins SHA-256 `1e3ec6aa1ec00b768806743ae4cf07500fe1717efc4c399088cca11a459e003a`. Repository migration count is 63.
- Fresh PR #94 review-patch verification: focused migration-readiness suite 20/20 and focused active-user middleware suite 12/12; TypeScript exit `0`; full ESLint exit `0` with 0 errors / 297 pre-existing warnings; production build exit `0` with 33 pages; candidate, index, and worktree diff checks exit `0`. An initial unconstrained full Vitest run had one load-sensitive 15-second timeout in the pre-existing lazy-loading suite; that file passed 5/5 on immediate retry, and the latest bounded full rerun passed 308 files / 3,293 tests with 9 environment-gated files / 51 tests skipped.
- Latest exact full `npx playwright test`: exit `0` in 24.0 minutes; 163 passed / 47 skipped / 0 failed against a fresh project-scoped local Supabase stack that applied all 63 migrations and seed. Playwright owned and stopped its bounded Next.js server, global teardown removed the local test users/data, and the local Supabase stack was stopped and verified absent.
- The 47 Playwright skips are explicitly classified in `docs/commercial-readiness/evidence/production-readiness-local-gates-2026-09-01.md`: 9 authorized notification-delivery/cron cases require `RUN_CRON_E2E=true` plus an approved capture/delivery target; 38 require no hosted permission and are removed-PWA, superseded/legacy-flow, or deterministic fixture coverage debt. These skips are not counted as passing and do not prove the skipped behaviors.
- Hosted staging/production actions are not authorized by this story implementation.
- PR #94 was merged into `staging` on the authoritative merge commit recorded above. The owner subsequently authorized a narrow amendment for IPv4-only operator networks: retain direct mode and add fail-closed Shared Supavisor session mode on port `5432`, with an explicit mode, project-bound pooler username, separately approved exact pooler hostname, and the existing reviewed CA/`verify-full` path. Transaction pooling on `6543` remains prohibited. This amendment is not hosted authorization and requires its own reviewed immutable merge before staging proof resumes.
- Focused amendment verification: the target-binding, catalog-runner, and migration-readiness suites pass **65/65**. This includes 28 binding cases across direct/session mode selection, exact host/project/port/TLS enforcement, transaction/custom/ambiguous rejection, and a catalog-runner check that keeps private binding inputs out of the `psql` command line and inherited environment.
- Fresh amendment-branch full Vitest passes: 308 files / **3,309 tests passed**, with 9 files / 51 managed local-service tests skipped because no local stack was started. The 16-test increase over the merged PR #94 patch gate exactly matches this amendment. Full ESLint exits `0` with 0 errors / 297 pre-existing warnings, and TypeScript exits `0` with incremental cache disabled for the protected worktree. The exact full Playwright gate has not been rerun for this amendment and is not claimed complete; the merged PR #94 result remains historical evidence only.
- No hosted write was started. The user-authorized local-only Supabase lifecycle was stopped and verified before handoff; all hosted cutover gates remain open.

## Dev Agent Record

- Authoritative branch observations after a fresh fetch on 2026-09-03: `origin/staging` `a39f0e83bc892c970d8471137134f6fbe33c40f6`; `origin/main` `822350986f4c023948a7bbf490ddffc371185c4a`.
- The observed `origin/staging` SHA is the merged PR #94 baseline. The final reviewed SHA containing the connection-mode amendment must be recorded before staging proof resumes.
- Branch: `codex/story-22-15-session-pooler-runbook`
- Epic 23 remains explicitly on hold.

## File List

- Authorization/application: `middleware.ts`, login route, admin-user route, and their focused tests.
- Database/migration safety: restored room migration, forward Story 22.15 migration, 63-version manifest, read-only catalog verifier, path-scoped immutable-migration whitespace rule, helper/live/static tests.
- Dependencies: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, Nodemailer compatibility test, audit evidence/register.
- Readiness/status: committed frozen Story 22.15 specification, commercial-readiness index, security/auth/role/dependency/evidence/risk/reconciliation/runbook/policy surfaces plus all Story 22.15 sprint/BMAD status carriers.
- IPv4 operator amendment: mode-aware target-binding verifier, direct/session-pooler unit coverage, catalog-runner secret-isolation coverage, and synchronized runbook/evidence/status surfaces.

## Change Log

- 2026-08-31: Story 22.15 status surface created and synchronized to in-progress.
- 2026-09-01: Clean 63-migration reset, all 3,342 Vitest cases with zero skips, live database/PostgREST/export evidence, exact full Playwright (163 passed / 47 classified skips / 0 failed), type-check, zero-error lint, production build, and dependency audit completed. Remote PR review, final immutable SHA, fresh hosted proof, and owner gates remain incomplete, so synchronized status stays `in-progress`.
- 2026-09-01: PR #94 review remediation committed the linked frozen specification and replaced the misleading unscoped diff claim with a path-scoped Git whitespace exception plus synchronized evidence and regression assertions. The restored migration bytes and SHA-256 remain unchanged; Story 22.15 remains `in-progress`.
- 2026-09-01: Remediated the subsequent PR #94 authenticated lookup-failure redirect loop. Uncertain Auth/app-user resolution now returns a retryable, `no-store` 503 without revoking or dropping refreshed session cookies; focused tests cover protected routes and `/login`, and the full local quality gate was rerun. Story 22.15 remains `in-progress` pending remote review/final SHA and owner-controlled hosted staging gates.
- 2026-09-03: Confirmed PR #94 merged as `a39f0e83bc892c970d8471137134f6fbe33c40f6`. By explicit owner authorization, added a reviewed-mode design for IPv4-only networks using Shared Supavisor session pooling on `5432`; exact host, project-bound username, CA/`verify-full`, and CLI-link checks fail closed, and transaction port `6543` remains rejected. No hosted read/write or setting change was performed. Story 22.15 remains `in-progress` pending amendment review/merge and fresh staging proof.
