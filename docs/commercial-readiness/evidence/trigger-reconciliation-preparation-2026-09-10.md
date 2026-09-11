# Story 22.15 Trigger Reconciliation Preparation — 2026-09-10

## Status and boundary

This is a read-only diagnosis and forward-migration preparation record. The diagnosis was captured at `2026-09-10T18:50:27.989Z` on staging commit `fb8580920f4237b41272a2e263b2147a54c61b31`; it exposed no employee rows and made no hosted change.

The completed PR #98 correction is historical baseline evidence: staging history is currently 66/66. Repository migration `20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql` is the proposed 67th version. Its staging plan is repair `[]` and one forward execute; it must never be repaired as applied. Production remains provisional at 57 repairs plus 10 forward applies after a fresh production inventory. Story 22.15 remains in progress, Epic 23 is on hold, and the production pause remains active.

## Current audit foreign-key finding — 2026-09-11

Additional audit-FK reconciliation is prepared but unverified: staging changed_by references public.users.auth_user_id, with 353 audit rows and 90 nonnull actors, all mapped to existing application users. The forward migration must translate those 90 current references and replace the FK together with the June audit function, preserving rows and timestamps. Prior full results on b4bbdb2 are historical and do not verify this revision. Managed database restart failed BROKER_UNAVAILABLE; representative/clean-chain and renewed full Vitest/Playwright gates are blocked. No merge or hosted apply is permitted before those gates and final review. Standing authorization for reviewed staging merges and required migrations remains; unrelated fixture writes/history repair/main/deploy/settings/reopening stay separately gated. Story 22.15 in-progress; Epic 23 on hold; production paused.

Reviewbot review 5178159252 / inline 3988711847 identified missing FK action/match/deferrability predicates. Bounded staging diagnostics at 2026-09-11T12:00:41.086Z found the actions already match (SET NULL / NO ACTION / SIMPLE / nondeferrable), but the referenced column is auth_user_id instead of id. There is exactly one FK involving changed_by, with the canonical constraint name, no custom audit-table triggers, and no audit rewrite rules. All 90 nonnull actor rows currently lack a matching canonical public-user ID and all 90 have a valid Auth-to-application mapping; the remaining 263 actors are null. Diagnostic SQL SHA-256: 410cdc44fbcc653a1b29c9ba329325313492fd843ea8f567552528faaccd4d09. The failed canonical proof remains a failure, not a passing pre-apply result.

This corrects the earlier assumption that the hosted FK already referenced public.users.id. The earlier local 23503 case remains a valid negative fixture for a different partial state; it is not evidence of that failure on the actual hosted representation. The proposed migration now locks the user mapping and audit table, rejects additional FKs and audit write side effects, maps changed_by without deleting audit rows or altering historical timestamps, then validates the canonical FK and restores the matching June function in one transaction. Canonical reapply performs no actor remapping. The strict observed pre-profile must require the documented Auth-ID representation; post-apply must require application IDs with exact FK actions, match, deferrability, ownership, ACLs and trigger contracts.

PR #100 is draft while new representative fixture, clean-chain, full Vitest, exact full Playwright and final review gates are outstanding. The previous reviewed migration hash and private apply package are stale and remain fail-closed/unpinned. No hosted write or history repair occurred.

Scoped follow-up validation: migration-readiness and catalog-runner unit tests pass **46/46** across two files, exit 0, **0.868s**. TypeScript passes; full ESLint passes with **0 errors / 296 warnings**. These ordinary checks do not execute the actor remapping or replace the required database/full-suite gates. Managed native database startup failed with BROKER_UNAVAILABLE twice, including after a successful guard List response; no unmanaged or borrowed database was substituted. The earlier Playwright stop request also failed with the same broker error, so that teardown is not claimed verified.

## Earlier read-only observed state (reference-column assumption corrected above)

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

The focused follow-up gate passed **50/50** tests across three files, no failures or skips, in **4.77 seconds**. Independent review found no remaining issue in these fixes.

Implementation b4bbdb25e291d37fe3743d2db88fb25751c52c8c: Vitest 3455 passed across 322 files, zero skips/failures (80.67s); exact npx playwright test 163 passed, 47 individually classified skips, zero failures/errors (1310.568207s); both exit 0. Clean 67-migration chain and canonical reapply pass 16/16 (3.534s), with cleanup verified. TypeScript and preview build pass; lint has zero errors and 296 warnings. Production application build is correctly refused while paused. Final PR-head CI/Vercel/Reviewbot and hosted staging verification remain pending.

Full Vitest UTC interval: 2026-09-11T11:25:26.2365947Z to 2026-09-11T11:26:51.0601211Z; wall duration **84.8265258s**. Required live export and local reconciliation were enabled, including the 26 pause tests. Exact Playwright UTC interval: 2026-09-11T11:28:01.9432035Z to 2026-09-11T11:50:02.5134456Z; wall duration **1320.5722423s**; JUnit SHA-256 **779abc8c92e55db9f156d6ebe10999e9d7ae95ebec99d07672302ee925c83e54**. All 47 skip identities match the individually classified prior inventory (9 notification/cron authorization cases and 38 superseded-flow/fixture-debt cases); none is passing evidence.

TypeScript exit 0 in **61.685846s**; ESLint exit 0 in **48.3304805s**, 0 errors/296 warnings. A clean separate checkout of the same commit passed the frozen offline install and exact pnpm build for a named staging preview in **20.064280699999998s**. A production-targeted local build correctly returned exit 1 with the committed pause refusal in **1.7680954999999998s**. The first separate-checkout preview attempt failed because its node_modules junction crossed Turbopack's filesystem root; the junction was replaced with a frozen offline install, with no dependency/version or repository change. That failed attempt is retained separately.

Fresh pnpm audit --prod --json at 2026-09-11T11:29:42.5642463Z returned exit **1** solely for the accepted moderate ExcelJS→uuid 8.3.2 advisory GHSA-w5hq-g745-h8pq: 0 critical, 0 high, 1 moderate, 0 low across 282 production dependencies. It matches the registered residual through 2026-09-30; it is not a zero-advisory or exit-zero audit.

The separately gated acceptance proposal was refreshed against b4bbdb25e291d37fe3743d2db88fb25751c52c8c: **21/21** rollback checks, **16** catalog checks, **five** negative mutations detected, fixture/staffing restoration and generated-clone cleanup verified in **7.756s**. Contract tests passed **12/12** (lead verification 0.5374053s). SQL SHA-256 remains **79e0ce87d9ff970f173bcd138f22f320d758ad21cc9719407382fba4ba5f2595**. Hosted fixture execution remains separately approval-gated.

Final documentation/runbook regression checks pass 27/27, exit 0, in 0.777s. These results supersede the implementation 6139242 scope below. Final exact-head review/checks and hosted staging reconciliation remain pending; no hosted apply or acceptance is claimed here.

## Historical verification before review fixes

The tested implementation is `61392422bde5f4a8b7546a2131d9094ef8564936`. Full `npx vitest run` passed **3,454/3,454 tests across 322 files, no skips or failures**, exit `0`, report duration **80.86 seconds** (wall duration 82.410 seconds). Required live export and local reconciliation evidence were enabled. The run includes 26 production-pause tests covering page/API/mutation routing, the static artifact, empty cron configuration, and production build refusal. These local contract tests do not substitute for hosted Vercel response and setting checks.

The fresh guard-owned database passed all **67 migrations**, seed, canonical reconciliation reapply, and strict **16/16** catalog checks in **1.646 seconds**, with its generated database clone removed and absence verified. This is separate from the validated borrowed local Supabase service used by browser tests, which retains its 63-version baseline and has not been migrated or reset by this work. The focused reconciliation run passed **140/140 tests**, no skips or failures, in **5.49 seconds**. The earlier dirty-tree local runs (16/16 catalog in 1.45 seconds and 3/3 integration in 3.63 seconds) remain supporting evidence only.

TypeScript (`npx tsc --noEmit`) passed, exit `0`, in **10.655 seconds**. ESLint (`npx eslint .`) passed, exit `0`, in **27.226 seconds**, with **0 errors and 296 warnings**. The SQL SHA-256 is `8f9123e6b9b9c610d61b41e1b088a1de74383641033365c32ab60a9aa7f21bc9`.

The first full Vitest attempt on `da18a8ca2de576e2d45896a4f0d257bf4af011ec` failed: **3,446 passed, 8 failed, no skips**, exit `1`, **85.20 seconds**. Two assertions still expected 15 catalog checks; five RLS cases counted another concurrent suite's fixture employees; one export request timed out during cold compilation. The catalog assertions were updated, and RLS visibility is now checked against that test's own active and archived employee IDs. No permission predicate or timeout was weakened. The RLS/export focused retest passed **13/13** in **2.83 seconds** before the successful full rerun. Failed-attempt reports are retained in the supporting directory.

Exact full `npx playwright test` passed on the same implementation: **163 passed / 47 skipped / 0 failed / 0 errors**, 210 total, exit **0**, report duration **1333.475657 seconds** and wall duration **1344.6858555 seconds**. UTC interval: 2026-09-10T19:16:56.3670951Z to 2026-09-10T19:39:21.0504452Z. JUnit SHA-256: `cf4dd2eb7fcecc75970ea623693040f72676df1ef29bd40a780a86af92dcbda0`. All 47 skip identities match the reviewed prior inventory: nine notification/cron cases require separate capture authorization; 38 are superseded-flow or deterministic-fixture coverage debt. No skip is passing evidence; the [individually classified inventory](production-readiness-pr95-playwright-2026-09-09.md) remains applicable because every identity matches. Final exact-head PR review/checks and hosted staging pre-/post-apply evidence remain pending. No hosted apply is claimed here.

The next private hosted acceptance proposal is independently tested locally: **21/21 rollback checks**, **12/12 contract tests**, and **five negative mutations detected**, with fixture/staffing restoration and generated-clone cleanup verified (0.837 seconds). It adds employee UPDATE actor mapping and exact configuration timestamp behavior. SQL SHA-256: `79e0ce87d9ff970f173bcd138f22f320d758ad21cc9719407382fba4ba5f2595`. Hosted execution is still blocked pending separate exact approval for synthetic fixtures and the temporary existing Göteborg staffing-row update. This is preparation, not hosted acceptance evidence.

Standing authorization covers merging reviewed PRs into staging and required reviewed migration applies, including production applies after all production prerequisites pass. Fixture writes, history repair, main merges, deployments, hosted setting changes, and production reopening still require separate authorization. This record does not waive any remaining prerequisite or separate approval gate.
