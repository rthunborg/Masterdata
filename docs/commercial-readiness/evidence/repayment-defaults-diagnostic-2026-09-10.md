# Repayment defaults diagnostic — 2026-09-10

Status: preparation in progress. Story 22.15 remains **in-progress** and Epic 23 remains **on hold**. This record captures the authorized read-only diagnosis only; it is not a hosted repair, apply, cleanup, deployment, settings change, or reopening approval.

## Post-merge finding

PR #96 commit `80bbcf16833cfb1454e5fd4ab9571d11f1fe0944` was merged to staging at `3724809065f9e4559802fdcd80e7e526172cc8fd`; main remains `822350986f4c023948a7bbf490ddffc371185c4a`. A fresh fetch found no intervening commit, and the current tree equals that reviewed staging head before the new uncommitted candidate work. The earlier PR #96 local/CI/Vercel/review gates are historical evidence for their reviewed commits. The new forward-default reconciliation and its tests are pending and require their own local and final-head verification.

At 2026-09-10T09:19:52.669Z, the post-merge catalog failed only `represented_column_contracts`. A bounded read-only diagnostic at 2026-09-10T09:44:14.972Z established that all 22 represented columns exist with the expected type and nullability, and 20 defaults match. The only mismatches are the absent defaults on `public.employees.repayment_needed_omc` and `public.employees.repayment_needed_pe3`; each expected default is `false`. The diagnostic SQL SHA-256 is `df6305e887879511b98805c9af844d315cc0599a9fa7b18dd9ec478c035c5a60`. No employee or other application rows were inspected or written.

The planned forward migration is `20260910094517_reconcile_repayment_defaults.sql`, SHA-256 `8c66f17e1bff91f81e8423fff9acdfb407d4d7aeb6550a1427cd7598568a2ea3`. It sets `DEFAULT false` on those two columns only. It does not issue `UPDATE`, backfill, cleanup, or alter existing values, including intentional `NULL`s.

## Read-only aggregate evidence

At 2026-09-10T09:50:36.947Z, the limited aggregate evidence exactly matched the September 9 snapshot. The staging aggregate SQL SHA-256 is `2ad23bcbcbb26fe263c06cb01dc740d25bb5b4bd8c61288aeeb512b2a557390a`.

| Saved-filter prerequisite | Count |
| --- | ---: |
| Total saved filters | 0 |
| Orphan auth.users references | 0 |
| Empty names | 0 |
| Names longer than 50 characters | 0 |

| Repayment flag | True | False | NULL |
| --- | ---: | ---: | ---: |
| ÖMC | 0 | 1 | 32 |
| PE3 | 1 | 0 | 32 |

| Fixed column | Config rows | MD5 of permission JSON |
| --- | ---: | --- |
| diet_details | 1 | 608d8d6a5846555a137171568d7b82a5 |
| special_diet | 1 | 608d8d6a5846555a137171568d7b82a5 |
| repayment_needed_omc | 1 | 02b8319f6f054191fe4131b27e060f98 |
| repayment_needed_pe3 | 1 | 3a274a1d25cd34f07f378195bb080f29 |

## Current manifest and gates

The proposed manifest has 65 repository versions: staging has one history repair (`20250113000000`) followed by seven ordered forward applies, ending with `20260910094517`; production is provisional at 57 catalog-proven repairs followed by eight ordered forward applies, also ending with `20260910094517`. The version is execute-only and is never repairable as applied.

The next gate is local verification of the migration, manifest, catalog verifier, and regression coverage. Fresh final-head CI, Vercel, and review evidence is also required after the resulting documentation/code candidate is pushed. Fresh read-only catalog proof and separate owner authorization remain prerequisites for every hosted repair or apply. Production stays paused.

## Separate development-tooling follow-up

The production-scoped `pnpm audit --prod --json` gate remains 0 critical / 0 high / 1 accepted UUID moderate and exits 1 solely for that acceptance. A separate broader `pnpm audit --json`, which includes development tooling, exits 1 with 1 critical / 16 high / 10 moderate. Its critical advisory is Vitest UI exposure `GHSA-5xrq-8626-4rwp`; this work uses bounded CLI commands and does not run Vitest UI. This development-tooling finding remains open for separate assessment: no waiver or dependency change is made here. The production threshold result above has its narrower stated scope.

## Preliminary local verification before the implementation commit

These checks used the uncommitted correction on base `3724809065f9e4559802fdcd80e7e526172cc8fd`; exact-commit full-suite evidence remains pending. Root focused verification passed **232/232 tests in 16 files**, zero skips, exit 0, **4.19 seconds**, covering Stories 22.14/22.15 and pause safeguards. The representative staging fixture applies all seven forward versions, passes all 15 strict post-apply checks, and proves preservation of pre-existing true/false/NULL values, false defaults on omitted inserts, explicit NULL inserts, and negative default variants. A fresh local database created from `template0`, using a schema-only Supabase Auth fixture, replayed all **65 migration files plus seed** and passed all 15 post-apply checks in **6.904 seconds**; the disposable database was dropped and absence verified. This is local SQL proof, not hosted transport or history proof.

TypeScript exited 0. ESLint exited 0 with zero errors / 297 existing warnings. The named staging preview build exited 0 in **22.0538343 seconds**. The production-targeted build was refused by the committed pause lock with expected exit 1 in **1.3269119 seconds**. No deployment was attempted.

Retained failed attempts: the first local preview build exited 1 in **8.3252481 seconds** because Turbopack rejected the dependency junction outside its root. A frozen-lockfile installation with lifecycle scripts disabled into this isolated checkout resolved that fixture issue without changing dependency files. Intermediate static runs were 24/25 and 25/26 with the runbook synchronization still pending. Root’s first focused run was **189 passed / 2 failed / 0 skipped**, 12 files, exit 1, **3.83 seconds**: both failures were stale test expectations for the old six/seven-version runbook wording. The exact list and partial-apply warning assertions were updated to seven/eight and the expanded 232-test run passed.

## Current production-pause observation

Read-only Vercel connector inspection on 2026-09-10 re-bound the private project/team records by SHA-256 and resolved the production domain to the recorded pause deployment, READY, target production. The deployment identity hash remained `8893b239490e082f61f98f9c018bc20e4f8ec26ad6a8ccc212b401f9254bff13`. The connector does not expose current automatic-domain-assignment or active-cron settings; their last independent observation remains 2026-09-09 and must be refreshed before any production action. No production deployment or setting was changed.
