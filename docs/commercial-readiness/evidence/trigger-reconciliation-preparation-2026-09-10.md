# Story 22.15 Trigger Reconciliation Preparation — 2026-09-10

## Status and boundary

This is a read-only diagnosis and forward-migration preparation record. The diagnosis was captured at `2026-09-10T18:50:27.989Z` on staging commit `fb8580920f4237b41272a2e263b2147a54c61b31`; it exposed no employee rows and made no hosted change.

The completed PR #98 correction is historical baseline evidence: staging history is currently 66/66. Repository migration `20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql` is the proposed 67th version. Its staging plan is repair `[]` and one forward execute; it must never be repaired as applied. Production remains provisional at 57 repairs plus 10 forward applies after a fresh production inventory. Story 22.15 remains in progress, Epic 23 is on hold, and the production pause remains active.

## Read-only observed state

| Surface | Observation | Forward-only treatment |
| --- | --- | --- |
| `column_config.updated_at` | Absent. | Add nullable timestamp metadata with `DEFAULT now()`; that default initializes metadata for existing rows and does not reconstruct historical timestamps. |
| `column_config` timestamp trigger | Absent. | Create the missing trigger. |
| `display_order`, visibility, and indexes | `display_order` is integer, `NOT NULL`, `DEFAULT 0`; visibility/indexes are present and valid. | Preserve valid objects. |
| Audit conflict index | One expected unique conflict index; duplicate groups `0`. | Preserve; no duplicate cleanup. |
| `track_employee_column_changes` | Current body matches the older February form, inserts `auth.uid()` directly despite the `public.users` foreign key, and does not match the documented June correction. | Restore the June audit body. |
| Shared timestamp function | Body differs only by newline normalization; token sequence, invoker posture, and pinned search path are correct. | Preserve semantics while normalizing redundant timestamp ACLs to `PUBLIC` only. |
| Function grants | Timestamp function has redundant API-role grants; audit function has a service-role grant. | Keep timestamp execution `PUBLIC` only and limit the audit service-role grant to its owner-only intended posture. |

The diagnosis source is the redacted support artifact `C:\DEV\hr-masterdata-trigger-support-20260910\trigger-diagnosis-redacted.json` (SQL SHA-256 `5643d64929004f2a82a95c0822b59ff71f0b041a8af1c43230c25787390ee04a`).

## Reconciliation contract

Historical migrations remain immutable. The new migration preserves every valid represented object, adds the missing timestamp column and trigger, restores the represented June audit function body, and narrows the redundant ACLs. It performs no existing-row cleanup and no migration-history repair.

`staging_trigger_reconciliation_pre_apply` is the new strict phase. It accepts only the documented observed variants above. The strict post-apply profile has 16 checks: the prior 15 checks plus `represented_trigger_contracts`. The prior 66-version 15-check result is historical pre-trigger evidence only; it does not validate this 67-version change or full-schema equivalence.

## Reviewbot follow-up — 2026-09-11

Review 5178025999 on c92fe15467ff50b1b7d1b0237faa9fc0ef0c9510 found three issues: missing exact function-owner validation, independently accepted partial trigger profiles, and a stale current inventory table. The verifier and migration now require postgres ownership; the migration accepts the complete documented observed tuple or the complete canonical tuple, with coupled body/ACL/column/trigger contracts. Regression fixtures reject owner changes in pre/post phases and refuse partial reconciliation. The inventory now distinguishes the current 67-version/16-check target from the historical PR #98 result.

Fresh bounded read-only staging proof at 2026-09-11T11:18:17.161Z confirmed both managed functions are owned by postgres (2/2), with tooling/TLS/three-way target binding verified and no hosted write. Supporting artifact: trigger-owners-redacted-20260911.json; diagnostic SQL SHA-256 6768a337fba6ba8270bd249c2f1c15ba3e5f29fbe393b65b912a4439247f08cd. The revised migration SQL SHA-256 is 18e02462ba72d4a383991981a77e1ed8df190aa4aa3dec2c576156fd12bbd698.

The focused follow-up gate passed 50 tests across three files, no failures or skips, in 4.77 seconds. Full suites, clean-chain proof, final exact-head review/checks, and hosted execution remain pending for this revision. All implementation 6139242 results below remain historical evidence only.

## Historical verification before review fixes

The tested implementation is `61392422bde5f4a8b7546a2131d9094ef8564936`. Full `npx vitest run` passed **3,454/3,454 tests across 322 files, no skips or failures**, exit `0`, report duration **80.86 seconds** (wall duration 82.410 seconds). Required live export and local reconciliation evidence were enabled. The run includes 26 production-pause tests covering page/API/mutation routing, the static artifact, empty cron configuration, and production build refusal. These local contract tests do not substitute for hosted Vercel response and setting checks.

The fresh guard-owned database passed all **67 migrations**, seed, canonical reconciliation reapply, and strict **16/16** catalog checks in **1.646 seconds**, with its generated database clone removed and absence verified. This is separate from the validated borrowed local Supabase service used by browser tests, which retains its 63-version baseline and has not been migrated or reset by this work. The focused reconciliation run passed **140/140 tests**, no skips or failures, in **5.49 seconds**. The earlier dirty-tree local runs (16/16 catalog in 1.45 seconds and 3/3 integration in 3.63 seconds) remain supporting evidence only.

TypeScript (`npx tsc --noEmit`) passed, exit `0`, in **10.655 seconds**. ESLint (`npx eslint .`) passed, exit `0`, in **27.226 seconds**, with **0 errors and 296 warnings**. The SQL SHA-256 is `8f9123e6b9b9c610d61b41e1b088a1de74383641033365c32ab60a9aa7f21bc9`.

The first full Vitest attempt on `da18a8ca2de576e2d45896a4f0d257bf4af011ec` failed: **3,446 passed, 8 failed, no skips**, exit `1`, **85.20 seconds**. Two assertions still expected 15 catalog checks; five RLS cases counted another concurrent suite's fixture employees; one export request timed out during cold compilation. The catalog assertions were updated, and RLS visibility is now checked against that test's own active and archived employee IDs. No permission predicate or timeout was weakened. The RLS/export focused retest passed **13/13** in **2.83 seconds** before the successful full rerun. Failed-attempt reports are retained in the supporting directory.

Exact full `npx playwright test` passed on the same implementation: **163 passed / 47 skipped / 0 failed / 0 errors**, 210 total, exit **0**, report duration **1333.475657 seconds** and wall duration **1344.6858555 seconds**. UTC interval: 2026-09-10T19:16:56.3670951Z to 2026-09-10T19:39:21.0504452Z. JUnit SHA-256: `cf4dd2eb7fcecc75970ea623693040f72676df1ef29bd40a780a86af92dcbda0`. All 47 skip identities match the reviewed prior inventory: nine notification/cron cases require separate capture authorization; 38 are superseded-flow or deterministic-fixture coverage debt. No skip is passing evidence; the [individually classified inventory](production-readiness-pr95-playwright-2026-09-09.md) remains applicable because every identity matches. Final exact-head PR review/checks and hosted staging pre-/post-apply evidence remain pending. No hosted apply is claimed here.

The next private hosted acceptance proposal is independently tested locally: **21/21 rollback checks**, **12/12 contract tests**, and **five negative mutations detected**, with fixture/staffing restoration and generated-clone cleanup verified (0.837 seconds). It adds employee UPDATE actor mapping and exact configuration timestamp behavior. SQL SHA-256: `79e0ce87d9ff970f173bcd138f22f320d758ad21cc9719407382fba4ba5f2595`. Hosted execution is still blocked pending separate exact approval for synthetic fixtures and the temporary existing Göteborg staffing-row update. This is preparation, not hosted acceptance evidence.

Standing authorization covers merging reviewed PRs into staging and required reviewed migration applies, including production applies after all production prerequisites pass. Fixture writes, history repair, main merges, deployments, hosted setting changes, and production reopening still require separate authorization. This record does not waive any remaining prerequisite or separate approval gate.
