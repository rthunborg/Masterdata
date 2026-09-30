---
title: 'Story 22.15 staffing foreign-key forward reconciliation'
type: bugfix
created: '2026-09-30'
status: in-progress
baseline_commit: 5f69f47f904b9c004b4c6bda217165a4359b3ac6
review_loop_iteration: 0
context:
  - 'C:/Users/Rasmus/.codex/worktrees/production-isolation/hr-masterdata/AGENTS.md'
  - 'C:/Users/Rasmus/.codex/worktrees/production-isolation/hr-masterdata/docs/sprint-artifacts/sprint-status.yaml'
  - 'C:/Users/Rasmus/.codex/worktrees/production-isolation/hr-masterdata/docs/sprint-artifacts/epic-22-sprint-status.yaml'
  - 'C:/Users/Rasmus/.codex/worktrees/production-isolation/hr-masterdata/docs/sprint-artifacts/story-22.15-production-readiness-remediation.md'
  - 'C:/Users/Rasmus/.codex/worktrees/production-isolation/hr-masterdata/supabase/migration-baseline-manifest.json'
  - 'C:/Users/Rasmus/.codex/worktrees/production-isolation/hr-masterdata/docs/local-docker.md'
---

<frozen-after-approval reason="existing owner-authorized canonical staging baseline; no new hosted-action authorization">

## Intent

Production read-only proof at the merged PR122 source found one exact staffing dependency mismatch: its validated `staffing_needs_updated_by_fkey` targets `public.users(id)` with `ON DELETE SET NULL`, while canonical staging requires `NO ACTION`. None of the existing 13 production forwards changes it. Add one guarded forward reconciliation and exact pre-/post-proof support. Preserve staffing records and the production pause.

## Boundaries & Constraints

**Always:** Work only in the clean `codex/story-22-15-staffing-fk-reconciliation` worktree. Keep the 68 existing migration SQL files, 55 repair-ledger identities, original frozen specification region and portable pause behavior unchanged. Story22.15 stays in-progress, Epic23 on-hold, production paused/no-go. Use pinned reviewed Supabase CLI2.115.0 `migration new` for a new later version; do not invent/rewrite a historical version. Prefer existing release architecture. Update active contracts and status/evidence together; preserve dated 13/68 evidence as historical.

**Ask First:** Unexpected material catalog/data findings, destructive changes, cleanup/adoption/history repair, hosted settings, main merge, production deployment or reopening require the owner. This implementation does not execute hosted changes. Existing standing authorization covers preparation and later clean-reviewed staging PRs; it does not prove production admission.

**Never:** Read or disclose records, backups, credentials, private identifiers/hosts; replay old staffing CREATE TABLE; reset a database; weaken arbitrary catalog checks; accept SET NULL as canonical; launch unmanaged services or reuse another actor's guard context. Do not commit/push or request external reviews; the lead handles those after independent verification.

## I/O & Edge-Case Matrix

| State | Expected behavior |
|---|---|
| Exact canonical named single-column validated/nondeferrable FK, MATCH SIMPLE, both NO ACTION | Migration no-op; strict final proof passes; preserve OID/data |
| Exact observed FK differing only by DELETE SET NULL, zero non-null updated_by and zero public/auth orphan actors | Source-bound pre-proof identifies required new version; migration replaces only this FK; final proof requires NO ACTION |
| Wrong name/target/key, competing FK, composite mapping, other action/match, unvalidated/deferrable/initially deferred | Abort migration/pre-proof; strict final proof fails |
| Observed variant with non-null actor or either orphan count | Abort without changing data/catalog |
| Stale/tampered/mismatched source, manifest, target or missing new-forward lineage | Pre-proof blocked, never execution authority |
| Post-apply still SET NULL | Strict catalog failure |

</frozen-after-approval>

## Code Map

- `supabase/migrations/20260313000001_add_staffing_needs.sql`: immutable canonical FK and table shape.
- `src/lib/release/production-staffing-pre-execute{.sql,-contract.mjs,-collector.mjs}`: current boolean FK dependency; replace with bounded exact profile and counts.
- `supabase/verify/production-baseline-catalog.sql`: current staffing FK predicate is loose; enforce exact canonical final contract within existing group.
- `supabase/migration-baseline-manifest.json`, `production-bootstrap-admission.mjs`, forward/outcome/package/worker/host contracts: existing13-forward/68-final plan; append new version, preserve55 repairs.
- Unit/integration Story22.15 tests and local PostgreSQL fixtures: existing release matrix and clean-chain support.
- `docs/commercial-readiness/{11*,14*,17*,22*,26*,27*,28*}`, story/spec and three status YAML: active plan/evidence synchronization.

## Tasks & Acceptance

- [x] Generate and implement one later migration. Lock affected tables/relations appropriately before testing prerequisites; atomic constraint-only change with bounded locks and no row mutation. Canonical no-op stays safe with legitimate non-null actors. Captured variant requires zero actors/orphans and exactly the metadata above; reject extra relevant constraints. Validate explicitly and assert final canonical shape.
- [x] Update manifest and production forward lineage to69 total,14 executes,55 unchanged repairs. Staging gains only this new pending version; retire its already-completed prerequisite from active pending list. Rename active apply-forward-13 contracts/receipt kinds consistently to14, without relabeling historical evidence.
- [x] Extend redacted staffing observation and assessment with exact FK metadata/actor counts; accept only canonical or captured prerequisites tied to the new execute version and source manifest. Preserve strict routine/ACL checks and non-admitted body provenance. Keep every strict catalog phase canonical; the captured state is pre-observation only and never catalog acceptance or execution authority.
- [x] Add meaningful matrix tests including real PostgreSQL canonical no-op, captured reconciliation/data preservation, negative aborts, pre-proof binding, strict post-gate rejection. Verify representative prestate and full clean chain.
- [x] Synchronize active planning/status and evidence; reread all copies. Lead will publish fresh redacted production receipts and exact test results, not invented passes. Document no staffing-row cleanup required for captured state, 48 saved-filter orphans separately gated, and full isolation/admission still open.

Acceptance: existing13 forwards and55 repair identities unchanged; all matrix rows covered by executed passing tests; final catalog canonical and no data writes; source/target/manifest mismatch fails closed; pause pages/APIs/mutations/jobs safeguards retained. Review completion never grants hosted execution.

## Verification

You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is0.

Run focused release tests, representative database fixture, clean migration chain, TypeScript, zero-error lint, build and diff check. The lead independently verifies full commands and exact tested commit. Existing guarded local fixture records can be inspected, but only your latest trusted hook context authorizes your launches; missing context is a precise test blocker, not permission for unmanaged processes. Preserve failed/skipped results; never treat unavailable database tests as passes.

## Spec Change Log

Implementation supplement prepared under the owner's continuing autonomous remediation instruction. No hosted action or new owner catalog exception was approved by creating this file.

The automatic review rejected changes to the persistent production catalog verifier after identifying the proposed `production_pre_apply` exception as a safety-control change. The active task therefore keeps every strict catalog phase canonical. The separately source-bound staffing observation may classify the captured `ON DELETE SET NULL` state only as the prerequisite for this migration; it neither passes the strict verifier nor grants execution authority.

## Historical pre-v4 draft checkpoint — 2026-09-30

The migration and bounded source-bound observation/contract are drafted. Real PostgreSQL negative/no-op/preservation cases and related unit contracts pass83/83 across five files, with no skips/failures, exit0. TypeScript and zero-error lint pass on the uncommitted draft. Complete v4 local safety-control approval is pending: runner/catalog, fixed protected protocol/vector/inventories and canonical69 baseline-adoption coverage are preserved as an unapplied reviewable patch. Full clean-source suites, complete69-file chain, final review/CI and PR remain pending; no completion is claimed. No hosted change occurred. Status/evidence surfaces are synchronized and remain in-progress/on-hold/paused-no-go. See the production-staffing-fk-preparation-2026-09-30 evidence.

## Approved v4 continuation — 2026-09-30

The owner approved exact local v4 patch SHA-256 23dc7f3305d196af8f7ef8af0d74f7539e92ad3cf37f7172c48cb8d019925b4a; root applied it after ref/hash/apply validation. Its earlier pending checkpoint remains historical. Fresh read-only Vercel inspection confirms the recorded ready pause target, disabled automatic domain assignment and zero active crons. At that applied-v4 checkpoint, full clean-source gates were pending; the completed local verification below supersedes that checkpoint. No hosted change occurred.

## Completed local verification - 2026-09-30

Clean tested implementation eff0bd4e5bbcdf3e7217efd0b1b068cee2d86913 passed focused 222/222, local fixture preflight 12/12, exact full npx vitest run 4544/4544 across 372 files with zero skips/failures (1022.60 seconds), and exact full npx playwright test 163 passed / 47 individually matched historical skips / zero failures or errors (1048.319612 seconds). The complete 69-migration local SQL chain passed strict catalog 16/16; TypeScript, zero-error lint (304 warnings), staging-preview build and portable pause artifact checks passed. The original 68 SQL files and original frozen specification remain unchanged. See [source-bound redacted verification](../../docs/commercial-readiness/evidence/production-staffing-fk-verification-2026-09-30.md) for hashes, archived failures and limitations.

## Review gate

Final independent review and final-head GitHub/Vercel checks are pending. The owner requirement retains status in-progress, including this supplemental specification, throughout preparation; the BMAD review step does not transition Story 22.15 to in-review. Epic 23 remains on-hold and production paused/no-go. This local result grants no hosted execution or release authority. Hosted staging is last verified 68/68 with only 20260930091123 pending fresh reviewed prerequisites.

## Suggested Review Order

**Migration and strict proof**

- Review the captured mismatch and exact new forward lineage.
  [migration-baseline-manifest.json:145](../../supabase/migration-baseline-manifest.json#L145)

- Lock prerequisites before the atomic constraint-only reconciliation.
  [20260930091123_reconcile_staffing_updated_by_foreign_key.sql:8](../../supabase/migrations/20260930091123_reconcile_staffing_updated_by_foreign_key.sql#L8)

- Require canonical metadata in every strict catalog phase.
  [production-baseline-catalog.sql:1665](../../supabase/verify/production-baseline-catalog.sql#L1665)

**Source-bound admission and release safeguards**

- Observe only the exact captured alternative; grant no execution authority.
  [production-staffing-pre-execute-contract.mjs:251](../../src/lib/release/production-staffing-pre-execute-contract.mjs#L251)

- Append one version to the fixed reviewed forward vector.
  [production-bootstrap-admission.mjs:3](../../src/lib/release/production-bootstrap-admission.mjs#L3)

- Retain the blocked public production-apply entry point.
  [run-reviewed-supabase-cli.mjs:602](../../supabase/verify/run-reviewed-supabase-cli.mjs#L602)

**Regression and evidence**

- Exercise captured-state reconciliation and rejection using real PostgreSQL.
  [production-staffing-pre-execute-local-sql.test.ts:278](../../tests/integration/epic-22/story-22.15/production-staffing-pre-execute-local-sql.test.ts#L278)

- Reject known metadata drift in every strict phase.
  [post-apply-reconciliation.test.ts:1921](../../tests/integration/epic-22/story-22.15/post-apply-reconciliation.test.ts#L1921)

- Assess exact tests, source bindings, classified skips and remaining gates.
  [production-staffing-fk-verification-2026-09-30.md:1](../../docs/commercial-readiness/evidence/production-staffing-fk-verification-2026-09-30.md#L1)
