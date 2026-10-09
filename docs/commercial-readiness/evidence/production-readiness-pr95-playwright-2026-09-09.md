# PR #95 Exact-Commit Playwright Evidence — 2026-09-09

Scope: local-only regression evidence for Story 22.15. This record does not constitute hosted staging or production proof.

## Authoritative revision and result

| Item | Verified result |
| --- | --- |
| PR #95 head tested | `3b75d5e78829426edfddce3207d4c16fb767aff1` |
| Fetched origin/staging | `a39f0e83bc892c970d8471137134f6fbe33c40f6` |
| Fetched origin/main | `822350986f4c023948a7bbf490ddffc371185c4a` |
| Checkout | Isolated, detached, clean before and after the run; exact PR head |
| Dependency install | pnpm 10.19.0 frozen lockfile install exited 0; lockfile unchanged |
| Runtime | Bundled Node v24.19.0; locked Playwright 1.58.0; Chromium; one worker |
| Exact command | `npx playwright test`, unchanged checked-in configuration and tests |
| Result | **163 passed / 47 skipped / 0 failed / 0 errors**; 210 total; exit **0** |
| Playwright report duration | **1,049.606579 seconds (17.5 minutes)** |
| Command wall time including setup/reporting | 1065.5924072 seconds |
| Command UTC interval | 2026-09-09T05:59:20.8255849Z to 2026-09-09T06:17:06.4164973Z |
| Local database | User-started hr-masterdata stack; all 63 migration history versions, latest 20260831200026; local Auth health passed |
| Delivery boundary | DISABLE_EMAIL_DELIVERY=true; RUN_CRON_E2E=false; remote app/database overrides disabled |
| Test teardown | Reported successful cleanup of E2E test data; does not claim removal of all test Auth accounts |
| Resource lifecycle | Guard launch through Windows PowerShell 5.1; CloseActor and List both ok=true / verified=true; zero unresolved owned resources |
| Documentation verification | Existing migration/readiness regression suite passed 20/20 after the evidence update; no code changes |
| User-owned stack | Left running under the user's ownership; not adopted or stopped by the agent |

The test runner read only the checked-in public local example configuration into its process environment. No private hosted target record or environment file was used. No hosted Supabase action occurred. The reviewed Supabase CLI remains 2.115.0; no CLI upgrade, migration/history repair, db push, hosted setting change, main merge, or production deployment was performed.

## Attempts and evidence limits

A preliminary temporary-runner port mismatch was corrected outside the checkout before test execution. The 2026-09-08 full attempt was interrupted by an overnight host pause after test 153; expired sessions appeared on resume. Its owned processes were stopped with verified cleanup. Neither attempt contributes passing results to this gate. The fresh 2026-09-09 invocation above is the sole completed full result.

The 47 skips retain the existing boundary: **9 notification/cron cases require explicit capture authorization; 38 are removed/superseded flows or deterministic local fixture coverage debt**. No skip is passing evidence. No test, skip condition, app code, migration, or verifier was changed. The historical category totals in the 2026-09-01 record remain dated evidence; the per-test list below is authoritative for this run. JUnit does not preserve individual skip reasons, so requirements below are reconciled with the unchanged test source and prior evidence, not presented as machine-reported reasons.

## Exact skipped-test inventory

Paths are relative to tests/e2e. The following table has exactly 47 entries.

| Test file | Skipped test | Required to execute or retire |
| --- | --- | --- |
| `capacity-management.spec.ts` | Capacity Management E2E Journey › AC8: Capacity management workflow | Rewrite the legacy form, concurrency, Realtime, room, or restoration flow against the current app, with replacement traceability. |
| `concurrent-users.spec.ts` | Concurrent User E2E Scenario › AC5: Concurrent assignment to last spot | Rewrite the legacy form, concurrency, Realtime, room, or restoration flow against the current app, with replacement traceability. |
| `epic-12/story-12.4/pwa-installation.spec.ts` | PWA Installation E2E › should register service worker on page load | Retire removed-PWA expectations or approve a new PWA product scope. |
| `epic-12/story-12.4/pwa-installation.spec.ts` | PWA Installation E2E › should show install prompt when criteria met | Retire removed-PWA expectations or approve a new PWA product scope. |
| `epic-12/story-12.4/pwa-installation.spec.ts` | PWA Installation E2E › should cache static assets | Retire removed-PWA expectations or approve a new PWA product scope. |
| `epic-12/story-12.4/pwa-installation.spec.ts` | PWA Installation E2E › should handle service worker updates | Retire removed-PWA expectations or approve a new PWA product scope. |
| `epic-12/story-12.4/pwa-installation.spec.ts` | PWA Installation E2E › should display app in standalone mode when installed | Retire removed-PWA expectations or approve a new PWA product scope. |
| `epic-12/story-12.4/pwa-installation.spec.ts` | PWA Installation E2E › should have manifest.json linked in page head | Retire removed-PWA expectations or approve a new PWA product scope. |
| `epic-12/story-12.4/pwa-installation.spec.ts` | PWA Installation E2E › should have theme color meta tag | Retire removed-PWA expectations or approve a new PWA product scope. |
| `epic-12/story-12.4/pwa-installation.spec.ts` | PWA Installation E2E › should have apple touch icon | Retire removed-PWA expectations or approve a new PWA product scope. |
| `epic-13/story-13.11/employee-status-visual-indicators.spec.ts` | Story 13.11: Employee Status Visual Indicators › terminated employees show red tint in table | Deterministic terminated and combined-status fixtures at this test's execution point. |
| `epic-13/story-13.11/employee-status-visual-indicators.spec.ts` | Story 13.11: Employee Status Visual Indicators › terminated employees take precedence over crew ready (red tint only) | Deterministic employees combining terminated and crew-ready status at this test's execution point. |
| `epic-13/story-13.11/employee-status-visual-indicators.spec.ts` | Story 13.11: Employee Status Visual Indicators › selected + terminated shows both tints | Deterministic terminated and combined-status fixtures at this test's execution point. |
| `epic-13/story-13.4/export-selected-employees.spec.ts` | Story 13.4: Export Selected Employees Workflow › export crew ready only exports and marks selected employees | Deterministic crew-ready eligible employees, including the required filtered/selection state. |
| `epic-13/story-13.4/export-selected-employees.spec.ts` | Story 13.4: Export Selected Employees Workflow › export includes selected employees from multiple pages | Deterministic multi-page fixtures and pagination coverage. |
| `epic-13/story-13.5/crew-ready-auto-selection.spec.ts` | Story 13.5: Crew Ready Auto-Selection Workflow - SKIPPED (Story 20.1) › user activates crew ready filter and employees are auto-selected | Retire or rewrite the journey superseded by Story 20.1. |
| `epic-13/story-13.5/crew-ready-auto-selection.spec.ts` | Story 13.5: Crew Ready Auto-Selection Workflow - SKIPPED (Story 20.1) › user can uncheck individual employees when crew ready filter is active | Retire or rewrite the journey superseded by Story 20.1. |
| `epic-13/story-13.5/crew-ready-auto-selection.spec.ts` | Story 13.5: Crew Ready Auto-Selection Workflow - SKIPPED (Story 20.1) › user switches to another filter and selection clears | Retire or rewrite the journey superseded by Story 20.1. |
| `epic-13/story-13.5/crew-ready-auto-selection.spec.ts` | Story 13.5: Crew Ready Auto-Selection Workflow - SKIPPED (Story 20.1) › user deactivates crew ready filter and selection clears | Retire or rewrite the journey superseded by Story 20.1. |
| `epic-13/story-13.5/crew-ready-auto-selection.spec.ts` | Story 13.5: Crew Ready Auto-Selection Workflow - SKIPPED (Story 20.1) › employee count display shows correct number of selected employees | Retire or rewrite the journey superseded by Story 20.1. |
| `epic-13/story-13.5/crew-ready-auto-selection.spec.ts` | Story 13.5: Crew Ready Auto-Selection Workflow - SKIPPED (Story 20.1) › selected employees show greyish tint when crew ready filter is active | Retire or rewrite the journey superseded by Story 20.1. |
| `epic-13/story-13.7/export-workflow.spec.ts` | Story 13.7: Export Workflow E2E › should export crew ready only selected employees | Deterministic crew-ready eligible employees, including the required filtered/selection state. |
| `epic-13/story-13.9/repayment-field-visibility.spec.ts` | Story 13.9: Repayment Field Visibility › edit modal hides repayment fields for non-terminated employees | Retire/rewrite the removed edit-modal journey and add deterministic termination/reactivation fixtures. |
| `epic-13/story-13.9/repayment-field-visibility.spec.ts` | Story 13.9: Repayment Field Visibility › edit modal shows repayment fields for terminated employees | Retire/rewrite the removed edit-modal journey and add deterministic termination/reactivation fixtures. |
| `epic-13/story-13.9/repayment-field-visibility.spec.ts` | Story 13.9: Repayment Field Visibility › marking employee as terminated shows repayment fields immediately | Retire/rewrite the removed edit-modal journey and add deterministic termination/reactivation fixtures. |
| `epic-13/story-13.9/repayment-field-visibility.spec.ts` | Story 13.9: Repayment Field Visibility › reactivating employee hides repayment fields immediately | Retire/rewrite the removed edit-modal journey and add deterministic termination/reactivation fixtures. |
| `epic-14/story-14.2/pe3-deadline-workflow.spec.ts` | PE3 Deadline Notification Workflow › should send submit deadline notification when deadline matches | Explicitly authorized non-production notification capture and RUN_CRON_E2E=true; no real-recipient delivery. |
| `epic-14/story-14.2/pe3-deadline-workflow.spec.ts` | PE3 Deadline Notification Workflow › should send cancel deadline notification when deadline matches | Explicitly authorized non-production notification capture and RUN_CRON_E2E=true; no real-recipient delivery. |
| `epic-14/story-14.2/pe3-deadline-workflow.spec.ts` | PE3 Deadline Notification Workflow › should include all affected PE3 dates in notification | Explicitly authorized non-production notification capture and RUN_CRON_E2E=true; no real-recipient delivery. |
| `epic-14/story-14.2/pe3-deadline-workflow.spec.ts` | PE3 Deadline Notification Workflow › should include employee names or "Unassigned" in notification | Explicitly authorized non-production notification capture and RUN_CRON_E2E=true; no real-recipient delivery. |
| `epic-14/story-14.2/pe3-deadline-workflow.spec.ts` | PE3 Deadline Notification Workflow › should not send duplicate notifications | Explicitly authorized non-production notification capture and RUN_CRON_E2E=true; no real-recipient delivery. |
| `epic-14/story-14.2/pe3-deadline-workflow.spec.ts` | PE3 Deadline Notification Workflow › should send both notifications if both deadlines same day | Explicitly authorized non-production notification capture and RUN_CRON_E2E=true; no real-recipient delivery. |
| `epic-14/story-14.2/pe3-deadline-workflow.spec.ts` | PE3 Deadline Notification Workflow › should handle timezone correctly (Europe/Stockholm) | Explicitly authorized non-production notification capture and RUN_CRON_E2E=true; no real-recipient delivery. |
| `epic-14/story-14.2/pe3-deadline-workflow.spec.ts` | PE3 Deadline Notification Workflow › should reject unauthorized requests | Explicitly authorized non-production notification capture and RUN_CRON_E2E=true; no real-recipient delivery. |
| `epic-14/story-14.2/pe3-deadline-workflow.spec.ts` | PE3 Deadline Notification Workflow › should handle errors gracefully | Explicitly authorized non-production notification capture and RUN_CRON_E2E=true; no real-recipient delivery. |
| `epic-16/story-16.5/field-highlighting.spec.ts` | Story 16.5: Field Highlighting in Employee Table › highlights appear on changed fields in table view | Deterministic editable/changed-field fixtures and a verified external-user path; keep every existing conditional skip explicit. |
| `epic-16/story-16.5/field-highlighting.spec.ts` | Story 16.5: Field Highlighting in Employee Table › highlights work with inline editing | Deterministic editable/changed-field fixtures and a verified external-user path; keep every existing conditional skip explicit. |
| `epic-16/story-16.6/real-database-highlighting.spec.ts` | Story 16.6: Real Database - External User Highlighting › External user should see highlights for changed visible columns (real database) | Deterministic editable/changed-field fixtures and a verified external-user path; keep every existing conditional skip explicit. |
| `epic-16/story-16.6/real-database-highlighting.spec.ts` | Story 16.6: Real Database - External User Highlighting › External user should NOT see banner or highlights when logged in as HR Admin makes changes | Deterministic editable/changed-field fixtures and a verified external-user path; keep every existing conditional skip explicit. |
| `epic-17/story-17.4/export-external-users.spec.ts` | Story 17.4: Export Functionality for External Users › [P0] Export dialog shows only viewable fields for external users | Deterministic externally visible, selectable employees and viewable export fields. |
| `epic-17/story-17.4/export-external-users.spec.ts` | Story 17.4: Export Functionality for External Users › [P1] External user can export with permission-based field filtering | Deterministic externally visible, selectable employees and viewable export fields. |
| `epic-17/story-17.4/export-external-users.spec.ts` | Story 17.4: Export Functionality for External Users › [P2] Export dialog can be cancelled | Deterministic externally visible, selectable employees and viewable export fields. |
| `epic-20/story-20.7/export-with-filters.spec.ts` | Story 20.7: Export with Filters › AC 4.2: Crew Ready export respects filtered state | Deterministic crew-ready eligible employees, including the required filtered/selection state. |
| `prerequisites-export.spec.ts` | Prerequisites & Export E2E Journey - SKIPPED (Story 20.1) › AC4: Prerequisites completion and export workflow | Retire or rewrite the journey superseded by Story 20.1. |
| `real-time-sync.spec.ts` | Real-time Sync E2E Journey › AC6: Real-time sync between users | Rewrite the legacy form, concurrency, Realtime, room, or restoration flow against the current app, with replacement traceability. |
| `room-assignment.spec.ts` | Room Assignment E2E Journey › AC7: Room assignment workflow | Rewrite the legacy form, concurrency, Realtime, room, or restoration flow against the current app, with replacement traceability. |
| `termination-reactivation.spec.ts` | Termination & Reactivation E2E Journey › Legacy termination/reactivation variants › skipped: old data-testid-based date restoration placeholder flows | Rewrite the legacy form, concurrency, Realtime, room, or restoration flow against the current app, with replacement traceability. |

## Release boundary

Story 22.15 remains **in-progress** and Epic 23 remains **on hold**. The previously outstanding exact amendment-branch Playwright gate is now satisfied for the tested commit. The evidence update changes documentation only. Check the evidence commit's exact-head GitHub/Vercel checks and final Codex Reviewbot result, then obtain explicit owner authorization before merging PR #95 into staging. Record the resulting immutable staging SHA before fresh hosted read-only proof. No staging-to-main merge or hosted write is authorized.

CI and Codex Reviewbot were already clean for the tested head. Fresh results must be checked on the new evidence commit; this record does not pre-approve those results or the PR merge. After an explicitly authorized staging merge, the next phase is read-only proof from the resulting authoritative staging commit. The single staging history repair and later five-version forward apply require separate explicit authorizations.
