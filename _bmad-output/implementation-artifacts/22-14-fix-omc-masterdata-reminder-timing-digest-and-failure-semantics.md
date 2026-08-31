---
baseline_commit: e706c93680df65fb543632acb5a507188c0fd9cf
---

# Story 22.14: Fix ÖMC Masterdata Reminder Timing, Digest, and Failure Semantics

## Status

done

- **Priority:** P0
- **Story Points:** 8
- **Dependencies:** `22.11`
- **Supersedes:** Story 14.1 AC1's unlimited `date >= D + 3` catch-up policy

## Story

As an HR operations owner,
I want the ÖMC masterdata reminder to use a bounded Stockholm-date retry window, atomic assignment-scoped claims, and consolidated truthful digests,
so that missed runs can recover without releasing historical reminders or hiding delivery failures.

## Incident Context

The production behavior released 16 historical reminder candidates and generated 64 recipient deliveries. The implementation used an unbounded `daysDiff >= 3` rule, fixed three-day wording, a PostgREST mutation-plus-`.or()` claim that could fail silently, and a cron response that reported employee-level failures as HTTP 200 success.

## Acceptance Criteria

### AC1 - Stockholm timing is bounded and weekend-aware

- Let D be the resolved ÖMC date in the `Europe/Stockholm` calendar.
- Base due date is D + 3 calendar days. A Saturday/Sunday base due date moves to the following Monday.
- The employee is time-eligible from that notification date through D + 21 inclusive.
- D+2 is ineligible; weekday D+3, retry D+10, and D+21 are eligible; D+22 and D+88 are expired even with a null marker.
- CET and CEST calculations depend only on Stockholm calendar dates. Do not add custom DST, exact clock-alignment, public-holiday, or weekend-run rules.

### AC2 - Only mandatory masterdata drives eligibility

- Employees must be active, not archived, and have incomplete mandatory masterdata.
- `kvitto_c17_18=false` and `kvitto_c17_18=null` are accepted and never appear as missing.
- Every other current reminder-required field remains unchanged; `loneiva` remains required.
- Crewing and unrelated masterdata validation are unchanged.

### AC3 - One truthful Swedish digest is sent per recipient

- Each successfully claimed candidate appears exactly once with name, resolved ÖMC date, and missing mandatory fields.
- Subject uses durable count wording, for example: “ÖMC genomförd – ofullständig masterdata för 7 medarbetare”.
- Each row displays its independently calculated Stockholm elapsed days, for example: “ÖMC 2026-08-20, 7 dagar sedan”; singular/plural is correct.
- Subject, text, and HTML never claim a fixed three days.
- One execution with N candidates and R configured recipients performs R sends, not N×R. No claimed candidates means no email.
- Existing recipient lookup, per-recipient fan-out, and non-production suppression remain effective.

### AC4 - Assignment-scoped claims are atomic and retry-safe

- Keep `omc_masterdata_reminder_sent_at`; add no schema objects or migrations.
- Marker on/after D suppresses the current assignment; a genuinely later ÖMC assignment re-arms.
- Claim with two separate conditional PATCH operations: first marker `IS NULL`, then (only after an error-free zero-row result) marker `< D`. Both constrain employee ID and current `omc_date`; neither uses mutation `.or()`.
- Select compatible scalar returned columns and distinguish zero-row contention from query error. Overlapping executions cannot both include the same assignment.
- If every recipient send fails, clear only markers equal to that invocation's exact claim timestamp. If any send succeeds, retain every digest claim.
- Document the accepted hard-process-termination window after claiming and before sending; eliminating it requires durable schema state and is out of scope.

### AC5 - Operational failures are observable and PII-free

- Employee-query failure is a failure, never an empty successful run.
- Evaluation and claim failures continue safely where possible while making the final response `success:false` with a non-2xx status.
- Total or partial digest delivery failure returns `success:false` and non-2xx; total failure attempts exact-claim release, partial failure retains claims.
- Statistics distinguish total employees, evaluated, eligible, claimed, digest candidates, successful recipient deliveries, failed recipient deliveries, and processing errors where practical.
- New logs and API errors contain no candidate/recipient names, addresses, subjects, employee IDs, or other PII.

### AC6 - Documentation, gates, and delivery boundaries are complete

- The canonical operations documentation records timing, expiry, optional receipt, digest wording/fan-out, marker/re-arm/cleanup semantics, crash limitation, failure HTTP behavior, PII-free logs, suppression, and explicit Story 14.1 supersession.
- Authentication remains unchanged. No production data/settings/deployment, real-recipient cron, schema migration, or `main` merge occurs.
- All mandatory status surfaces stay synchronized at every transition and are explicitly re-read.
- Focused tests, full Vitest, full Playwright, lint, TypeScript, and `git diff --check` exit 0.
- Project-local BMAD code review runs under the three-round guard; every actionable in-scope finding is fixed within the allowed rounds.

## Tasks / Subtasks

- [x] Implement Stockholm notification/expiry calculations and optional `kvitto_c17_18` behavior in `src/lib/services/omc-masterdata-reminder.ts`.
- [x] Implement digest builders, two-step atomic claims, exact claim release, and aggregate delivery results.
- [x] Refactor `src/app/api/cron/omc-masterdata-reminder/route.ts` for digest orchestration, safe continuation, typed non-2xx failures, aggregate statistics, and PII-free observability.
- [x] Update stale Story 14.1 tests and add focused Story 22.14 unit/integration regressions covering all ACs and edge-matrix cases.
- [x] Update the cron E2E contract without invoking any real-recipient cron.
- [x] Update `docs/commercial-readiness/09_operations_support_and_sla.md` with the canonical behavior.
- [x] Run focused/full gates, guarded review, and post-review gates.
- [x] Synchronize and explicitly re-read all story/status artifacts at `review`.
- [x] Synchronize and explicitly re-read all story/status artifacts at `done`.

### Review Findings

**Round 1 of 3**

- [x] [Review][Patch] Sanitize the real SMTP failure log and cover it without mocking away the email service [`src/lib/services/email-service.ts`:170]
- [x] [Review][Patch] Keep active/not-archived eligibility guards on both atomic claim PATCHes [`src/lib/services/omc-masterdata-reminder.ts`:324]
- [x] [Review][Patch] Preserve per-recipient progress when an unexpected fan-out exception follows an earlier success [`src/lib/services/email-service.ts`:202]
- [x] [Review][Patch] Paginate the employee query so PostgREST row limits cannot silently truncate a successful run [`src/app/api/cron/omc-masterdata-reminder/route.ts`:113]
- [x] [Review][Patch] Capture one Stockholm calendar date per invocation and use it for every evaluation [`src/app/api/cron/omc-masterdata-reminder/route.ts`:137]
- [x] [Review][Patch] Count only successfully completed evaluations in `stats.evaluated` [`src/app/api/cron/omc-masterdata-reminder/route.ts`:174]
- [x] [Review][Patch] Distinguish recipient-query failure from a valid empty recipient configuration without exposing query details [`src/lib/services/notification-helpers.ts`:14]
- [x] [Review][Patch] Add a local-Supabase PostgREST contention/release test for one-winner claims and exact timestamps [`tests/integration/epic-22/story-22.14`:1]
- [x] [Review][Patch] Make the required-field regression use an independent expected allowlist [`tests/unit/epic-14/story-14.1/check-required-fields.test.ts`:43]
- [x] [Review][Patch] Restore explicit missing-header and production-missing-secret authentication coverage [`tests/integration/epic-14/story-14.1/scheduled-job.test.ts`:74]
- [x] [Review][Patch] Normalize control characters in candidate names before generating the plain-text digest [`src/lib/services/omc-masterdata-reminder.ts`:388]
- [x] [Review][Patch] Assert the employee projection includes every runtime-schema field [`tests/integration/epic-14/story-14.1/scheduled-job.test.ts`:80]
- [x] [Review][Patch] Assert digest fan-out receives the complete configured recipient list [`tests/integration/epic-22/story-22.14/reminder-claims-and-delivery.test.ts`:164]
- [x] [Review][Patch] Cover an in-window fully complete employee at the evaluation boundary [`tests/unit/epic-14/story-14.1/evaluate-omc-completion.test.ts`:134]
- [x] [Review][Defer] Batch or cache distinct `important_dates` lookups for large employee populations [`src/app/api/cron/omc-masterdata-reminder/route.ts`:174] — deferred, pre-existing

**Round 2 of 3**

- [x] [Review][Patch] Replace mutable offset pagination with employee-ID keyset pagination so concurrent archive, termination, or assignment changes cannot shift later pages [`src/app/api/cron/omc-masterdata-reminder/route.ts`:120]
- [x] [Review][Patch] Separate digest delivery and exact-claim cleanup error boundaries so cleanup rejection is reported once as `claim-release`, never retried or misclassified as delivery [`src/app/api/cron/omc-masterdata-reminder/route.ts`:239]
- [x] [Review][Patch] Preserve partial employee-query observability when a later page fails instead of reporting a misleading zero count [`src/app/api/cron/omc-masterdata-reminder/route.ts`:173]
- [x] [Review][Patch] Distinguish valid empty recipient configuration from recipient-query failure in the route's aggregate error stages [`src/app/api/cron/omc-masterdata-reminder/route.ts`:244]
- [x] [Review][Patch] Make the safe cron E2E omit Authorization entirely so no configured secret value can accidentally authorize the job [`tests/e2e/epic-14/story-14.1/omc-reminder-workflow.spec.ts`:13]
- [x] [Review][Patch] Assert both active-assignment guards on real PostgREST claim URLs and behaviorally prove termination/archive changes between evaluation and claim suppress without writing a marker [`tests/integration/epic-22/story-22.14/postgrest-claim-contention.test.ts`:139]
- [x] [Review][Patch] Add a fail-closed required-evidence mode so the Story 22.14 real PostgREST gate cannot silently pass as skipped when local Supabase is unavailable [`tests/integration/epic-22/story-22.14/postgrest-claim-contention.test.ts`:85]
- [x] [Review][Patch] Fail and verify real-PostgREST fixture cleanup instead of swallowing DELETE errors and leaking local rows [`tests/integration/epic-22/story-22.14/postgrest-claim-contention.test.ts`:362]
- [x] [Review][Patch] Restore `CRON_SECRET` and `NODE_ENV` after every scheduled-job test to prevent cross-suite environment contamination [`tests/integration/epic-14/story-14.1/scheduled-job.test.ts`:109]
- [x] [Review][Patch] Restore the recipient-lookup `console.error` spy after each test so later tests retain the real console [`tests/integration/epic-14/story-14.1/notification-service.test.ts`:13]
- [x] [Review][Patch] Replace Story 22.14's zero implemented/passing test counts and stale Epic aggregate with evidence-backed current counts [`docs/sprint-artifacts/epic-22-sprint-status.yaml`:220]
- [x] [Review][Patch] Synchronize the pending local-PostgREST and full-Playwright environment blockers across the required story/status surfaces [`docs/sprint-artifacts/epic-22-sprint-status.yaml`:231]
- [x] [Review][Patch] Expand both story artifacts' File List and Change Log to enumerate the actual scoped implementation, tests, documentation, and Round 1 review work [`docs/sprint-artifacts/story-22.14.md`:151]
- [x] [Review][Defer] Normalize and case-insensitively deduplicate recipient addresses before fan-out [`src/lib/services/notification-helpers.ts`:34] — deferred, pre-existing recipient-management behavior outside Story 22.14's explicit unchanged-fan-out boundary

**Round 3 of 3**

- [x] [Review][Patch] Guard both claim PATCHes with the evaluated mandatory-masterdata snapshot so a mid-flight completion cannot produce a stale digest row [`src/lib/services/omc-masterdata-reminder.ts`:617]
- [x] [Review][Patch] Cover resolved all-recipient delivery failures through total-failure classification and exact-claim release [`tests/integration/epic-22/story-22.14/reminder-claims-and-delivery.test.ts`:768]
- [x] [Review][Patch] Cover a rejected candidate-claim promise continuing to later candidates while preserving aggregate non-success semantics [`tests/integration/epic-22/story-22.14/reminder-claims-and-delivery.test.ts`:532]
- [x] [Review][Patch] Reject malformed or mismatched PostgREST returned rows instead of treating any returned object as a successful claim or release [`src/lib/services/omc-masterdata-reminder.ts`:393]
- [x] [Review][Patch] Correct Story 22.14 and Epic 22 test totals so existing Story 22.11 tests are not recounted as new Story 22.14 coverage [`docs/sprint-artifacts/epic-22-sprint-status.yaml`:220]
- [x] [Review][Patch] Isolate real-PostgREST test environment loading and evaluate the required-evidence flag after loading without leaking environment overrides [`tests/integration/epic-22/story-22.14/postgrest-claim-contention.test.ts`:17]
- [x] [Review][Patch] Prove concurrent stale-marker re-arming produces exactly one winner through real PostgREST [`tests/integration/epic-22/story-22.14/postgrest-claim-contention.test.ts`:93]
- [x] [Review][Patch] Assert the preserved null-email and active-recipient filters in the notification-service regression [`tests/integration/epic-14/story-14.1/notification-service.test.ts`:117]
- [x] [Review][Patch] Prove total delivery failure passes every claimed digest candidate to exact-claim cleanup [`tests/integration/epic-22/story-22.14/reminder-claims-and-delivery.test.ts`:768]
- [x] [Review][Patch] Document exact-claim release and retry behavior for valid-empty recipient configuration and recipient-lookup failure [`docs/commercial-readiness/09_operations_support_and_sla.md`:233]
- [x] [Review][Patch] Carry calculated weekend and retry elapsed-day values through both text and HTML digest assertions, with no fixed three-day claim [`tests/unit/epic-14/story-14.1/email-template.test.ts`:70]
- [x] [Review][Patch] Prove `kvitto_c17_18=false` cannot trigger a reminder when every mandatory field is complete [`tests/unit/epic-14/story-14.1/evaluate-omc-completion.test.ts`:163]
- [x] [Review][Defer] Add an SMTP delivery deadline and avoid the final-recipient delay [`src/lib/services/email-service.ts`:662] — deferred because the shared transport behavior predates Story 22.14 and requires separately scoped email-delivery hardening

## Dev Notes

- Existing marker migration remains unchanged: `supabase/migrations/20251122130617_add_omc_masterdata_reminder_sent_at.sql`.
- Supabase troubleshooting guidance for mutation `.or()`: https://supabase.com/docs/guides/troubleshooting/postgrest-error-400-column-example_tableexample_column-does-not-exist-when-using-or-operators-46ff23
- PostgREST bug evidence: https://github.com/PostgREST/postgrest/issues/3707
- Separate `.is(..., null)` and `.lt(...)` PATCHes avoid the affected returned-representation path and keep each compare-and-set atomic.
- Historical Story 14.1 is read-only evidence at commit `2a5c9ea`; do not resurrect or edit it.

## Required Test Directive

You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0.

Required gates:

- Focused reminder unit/integration tests
- `npx vitest run`
- `npx playwright test`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex (Amelia development persona)

### Debug Log References

- Fetched baseline: `origin/staging` and `HEAD` both `e706c93680df65fb543632acb5a507188c0fd9cf`.
- Worktree contained only the preserved unrelated untracked `.bmad-loop/` and `.codex/` directories before story work.
- Historical Story 14.1 AC1 verified from commit `2a5c9ea`.
- Official Supabase/PostgREST guidance reviewed before implementation.

### Completion Notes List

- Core implementation, documentation, and focused regression coverage completed.
- Round 1 fixed all 14 actionable findings; one pre-existing date-lookup optimization was deferred.
- Round 2 fixed all 13 actionable findings and deferred one pre-existing recipient-normalization item.
- Final automatic Round 3 fixed all 12 actionable findings and deferred one pre-existing SMTP-transport item; any further review finding requires human triage.
- Focused reminder suite: 9 files / 129 tests passed. TypeScript, scoped ESLint, and diff checks passed.
- Full `npx vitest run` passed with 302 files passed / 9 skipped and 3181 tests passed / 64 skipped (exit 0).
- All 117 unique Story 22.14 tests are evidenced passing without recounting 14 pre-existing Story 22.11 cases: 64 unit, 52 integration (including the required real PostgREST case), and one safe unauthorized-only E2E case.
- Required fail-closed real PostgREST evidence passed 1/1 against the reset project-scoped local Supabase stack. The test proved null/stale one-winner contention, later-assignment re-arming, active/current-assignment guards, and exact-marker release.
- Exact full `npx playwright test` passed with 163 passed / 47 skipped (exit 0). Remote `.env.test` and `.env.local` files were safely withheld and restored byte-for-byte; email delivery and authorized cron execution stayed disabled, so no real-recipient delivery occurred.
- The user authorized a task-scoped direct lifecycle exception because the machine-level resource wrapper is absent. Only the `hr-masterdata` local Supabase project was started/reset; it will be stopped and verified before handoff.
- Story 22.14 is done with all acceptance criteria, test gates, and guarded review requirements complete. Epic 22 remains in progress because its separate owner-approved production release gate is outside this staging-only task.

### File List

- `_bmad-output/implementation-artifacts/22-14-fix-omc-masterdata-reminder-timing-digest-and-failure-semantics.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/commercial-readiness/09_operations_support_and_sla.md`
- `docs/sprint-artifacts/epic-22-sprint-status.yaml`
- `docs/sprint-artifacts/sprint-status.yaml`
- `docs/sprint-artifacts/story-22.14.md`
- `playwright.config.ts`
- `src/app/api/cron/omc-masterdata-reminder/route.ts`
- `src/lib/services/email-service.ts`
- `src/lib/services/notification-helpers.ts`
- `src/lib/services/omc-masterdata-reminder.ts`
- `tests/e2e/epic-14/story-14.1/omc-reminder-workflow.spec.ts`
- `tests/integration/epic-14/story-14.1/notification-service.test.ts`
- `tests/integration/epic-14/story-14.1/scheduled-job.test.ts`
- `tests/integration/epic-22/story-22.14/postgrest-claim-contention.test.ts`
- `tests/integration/epic-22/story-22.14/reminder-claims-and-delivery.test.ts`
- `tests/integration/epic-22/story-22.14/reminder-route-failures.test.ts`
- `tests/unit/epic-14/story-14.1/check-required-fields.test.ts`
- `tests/unit/epic-14/story-14.1/email-template.test.ts`
- `tests/unit/epic-14/story-14.1/evaluate-omc-completion.test.ts`
- `tests/unit/epic-22/story-22.11/email-suppression.test.ts`
- `tests/unit/epic-22/story-22.14/reminder-window.test.ts`

## Change Log

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2026-08-29 | 0.1 | Created Story 22.14 from the ÖMC reminder production incident and moved it to in-progress | Amelia (Codex) |
| 2026-08-29 | 0.2 | Implemented the bounded Stockholm-date reminder window, digest delivery, assignment-scoped claims, observable failure semantics, regression coverage, and canonical operations documentation | Amelia (Codex) |
| 2026-08-29 | 0.3 | Completed Review Round 1: fixed 14 actionable findings and deferred one pre-existing date-lookup optimization | Amelia (Codex) |
| 2026-08-31 | 0.4 | Completed Review Round 2: fixed all 13 actionable findings, deferred one pre-existing recipient-normalization item, and synchronized current evidence/blockers | Amelia (Codex) |
| 2026-08-31 | 0.5 | Completed final automatic Review Round 3: fixed all 12 actionable findings, added 16 regressions, deferred one pre-existing SMTP-transport item, and corrected unique Story/Epic evidence totals | Amelia (Codex) |
| 2026-08-31 | 0.6 | Passed the full Vitest gate and recorded the failed-closed real PostgREST/full Playwright attempts plus the missing approved local-runtime wrapper; story remains in-progress | Amelia (Codex) |
| 2026-08-31 | 0.7 | Passed required local PostgREST and full Playwright gates under the user-authorized project-scoped runtime exception and synchronized the story to review | Amelia (Codex) |
| 2026-08-31 | 0.8 | Synchronized Story 22.14 to done after explicit review-state verification; Epic 22 remains in progress for its separate production release gate | Amelia (Codex) |
