# Story 22.15: Close Production-Readiness Remediation Gaps

## Status

in-progress

## Source of Truth

The approved frozen implementation specification is [`spec-22-15-production-readiness-remediation.md`](../../_bmad-output/implementation-artifacts/spec-22-15-production-readiness-remediation.md). This status carrier does not duplicate or modify its human-owned intent. The spec's dated `Recorded 2026-09-01` execution paragraph is preserved as an intermediate historical snapshot; the fresh verification results below supersede that paragraph.

## Verification Status

- Repository remediation and local evidence are complete; status remains `in-progress` because remote PR review, the final immutable remediation SHA, fresh hosted proof, and owner-controlled hosted actions are not complete.
- `pnpm install --frozen-lockfile`: exit `0` with bundled Node `v24.19.0`; lockfile unchanged.
- `pnpm type-check`: exit `0` after the remediation-local middleware null narrowing fix.
- Clean local `supabase db reset --local`: exit `0`; all 63 migrations and the parity seed applied. The post-reset catalog has 17 policies, the required missing-only column configuration rows, and cleanup-outbox access restricted to `postgres`.
- Story 22.15 live database suite: 11/11 passed, including active/inactive direct-role behavior, saved-filter denial, documented exceptions, atomic rollback/final-admin protection, and the synchronized two-client race. The Story 22.14 PostgREST contention test passed 1/1. The live Next-plus-Supabase export suite passed 5/5 against a real generated workbook.
- Final fresh full `npx vitest run` with every local live gate enabled on 2026-09-01: exit `0` in 525.97s; 317/317 files passed and 3,342/3,342 tests passed, with zero skips.
- `pnpm lint`: exit `0`; 0 errors / 297 pre-existing warnings.
- `pnpm build`: the first invocation failed closed because no Supabase URL/key was supplied; the fresh rerun with ephemeral local-only Supabase configuration exited `0` and generated 33 pages. No environment file or hosted setting was changed.
- `pnpm audit --prod --json`: command exit `1` for the accepted advisory; threshold passes at 0 critical / 0 high / 1 moderate / 0 low (ExcelJS→UUID only).
- Candidate-wide `git diff origin/staging...HEAD --check`: exit `0` under the explicit path-scoped `.gitattributes` exception for the byte-preserved `supabase/migrations/20250113000000_add_room_assignment_rpc.sql`. The exception covers only its historical trailing whitespace on lines 28, 38, 63, 139, 147, 160, and 197 plus the blank line at EOF; excluding that path is independently clean, and the migration-manifest test pins SHA-256 `1e3ec6aa1ec00b768806743ae4cf07500fe1717efc4c399088cca11a459e003a`. Repository migration count is 63.
- Fresh PR #94 review-patch verification: focused migration-readiness suite 20/20; TypeScript exit `0`; full ESLint exit `0` with 0 errors / 297 pre-existing warnings; candidate, index, and worktree diff checks exit `0`. An initial unconstrained full Vitest run had one load-sensitive 15-second timeout in the pre-existing lazy-loading suite; that file passed 5/5 on immediate retry, and the bounded full rerun passed 308 files / 3,292 tests with 9 environment-gated files / 51 tests skipped.
- Exact full `npx playwright test`: exit `0` in 22.2 minutes; 163 passed / 47 skipped / 0 failed. Playwright owned and stopped its bounded Next.js server, and global teardown removed the local test users/data.
- The 47 Playwright skips are explicitly classified in `docs/commercial-readiness/evidence/production-readiness-local-gates-2026-09-01.md`: 9 authorized notification-delivery/cron cases require `RUN_CRON_E2E=true` plus an approved capture/delivery target; 38 require no hosted permission and are removed-PWA, superseded/legacy-flow, or deterministic fixture coverage debt. These skips are not counted as passing and do not prove the skipped behaviors.
- Hosted staging/production actions are not authorized by this story implementation.
- PR #91 was checked on 2026-09-01: it had no merge conflict and all five checks succeeded, but GitHub reported `MERGEABLE` and `BLOCKED` with two unresolved review threads. Their remediations exist only in this local branch until committed, pushed, and reviewed.
- No hosted write was started. The user-authorized local-only Supabase lifecycle was stopped and verified before handoff; all hosted cutover gates remain open.

## Dev Agent Record

- Authoritative branch observations: `origin/staging` `bcb1a0e5bed3d06b9b7582320f491964ffc5a0b9`; `origin/main` `822350986f4c023948a7bbf490ddffc371185c4a`.
- The `origin/staging` SHA is the immutable baseline only; neither observed branch SHA is the final reviewed remediation commit, which must be recorded before any staging cutover action.
- Branch: `codex/production-readiness-remediation`
- Epic 23 remains explicitly on hold.

## File List

- Authorization/application: `middleware.ts`, login route, admin-user route, and their focused tests.
- Database/migration safety: restored room migration, forward Story 22.15 migration, 63-version manifest, read-only catalog verifier, path-scoped immutable-migration whitespace rule, helper/live/static tests.
- Dependencies: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, Nodemailer compatibility test, audit evidence/register.
- Readiness/status: committed frozen Story 22.15 specification, commercial-readiness index, security/auth/role/dependency/evidence/risk/reconciliation/runbook/policy surfaces plus all Story 22.15 sprint/BMAD status carriers.

## Change Log

- 2026-08-31: Story 22.15 status surface created and synchronized to in-progress.
- 2026-09-01: Clean 63-migration reset, all 3,342 Vitest cases with zero skips, live database/PostgREST/export evidence, exact full Playwright (163 passed / 47 classified skips / 0 failed), type-check, zero-error lint, production build, and dependency audit completed. Remote PR review, final immutable SHA, fresh hosted proof, and owner gates remain incomplete, so synchronized status stays `in-progress`.
- 2026-09-01: PR #94 review remediation committed the linked frozen specification and replaced the misleading unscoped diff claim with a path-scoped Git whitespace exception plus synchronized evidence and regression assertions. The restored migration bytes and SHA-256 remain unchanged; Story 22.15 remains `in-progress`.
