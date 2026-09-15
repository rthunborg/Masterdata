# Canonical Trigger ACL Prerequisite — 2026-09-15

Status: reviewed PR #102 merged and its one staging forward migration applied; staging is verified at 68/68. No production write, deployment, setting change, history repair, or production reopening occurred. The dated local results below remain historical verification evidence.

## Cause

The isolated, guard-owned clean Supabase image applied the first 66 migrations and then stopped at immutable `20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql`. The canonical timestamp, function bodies, owners, bindings, and audit foreign-key profile were present. Its ACL precondition rejected only the platform's exact explicit non-owner `EXECUTE` extension:

- `public.update_updated_at_column()` had `PUBLIC`, `anon`, `authenticated`, and `service_role`.
- `public.track_employee_column_changes()` had `service_role`.

The canonical v67 branch expects `PUBLIC` only for the timestamp helper and no non-owner grant for the audit trigger. The redacted local blocker receipt records this as a fixture/image behavior; it does not describe a hosted observation.

## Reviewed reconciliation design

Supabase CLI 2.115.0 first generated the uncommitted migration as `20260915164637_reconcile_canonical_trigger_acl_prerequisite.sql`. Before commit, it was assigned the unused prerequisite version `20260910184840_reconcile_canonical_trigger_acl_prerequisite.sql`, immediately before immutable `20260910184841`. No existing migration file, version, or represented history was renamed, edited, or repaired.

The new migration accepts only complete profiles:

1. The documented historical no-`column_config.updated_at` staging profile, which it leaves unchanged for immutable v67 to reconcile.
2. The strict canonical profile, which is a no-op.
3. The complete canonical profile with only the documented Supabase ACL extension above, which it normalizes to the strict canonical grants.

It rejects mixed or partial ACLs, grant options, unknown grantees, altered owners, attributes, bodies, bindings, audit foreign keys, conflict indexes, or audit write side effects. It does not alter global default privileges, function definitions, rows, timestamps, or migration history.

## Required sequence and completed staging verification

The repository target is 68 migrations. PR #102 reviewed head `841794efd9377f719a2262cfd1b2f633780c8a56` merged as `3e41b35c269d606545b766d1445d1e361e92f88c`; six fresh pre-proofs passed, the exact reviewed `--include-all` dry run listed only `20260910184840_reconcile_canonical_trigger_acl_prerequisite.sql`, and the authorized apply exited 0 without timeout. Immediate staging history is **68/68** with no pending or remote-only version. All five post-apply phases passed: strict catalog 16/16; advisors 0 security WARN-or-higher and three known performance WARN; and preserved repayment aggregates, four permission hashes, and audit baseline. No catalog phase broadens the contract. Production remains 56 repair candidates plus 12 applies, no-go on its remaining strict gates, and paused.

Production remains 56 repair candidates plus 12 forward applies. The new prerequisite is execute-only, ordered between `20260910115024` and immutable `20260910184841`, and must never be repaired as applied. Production repair, traffic isolation, hosted-setting, backup, deployment, main-merge, and reopening approvals remain separate. The production pause remains active.

## Production read-only v68 preflight — 2026-09-15

Against candidate `3e41b35c269d606545b766d1445d1e361e92f88c` and manifest SHA-256 `d61d5cca0754f60e55dfea9ccfc4a8d4b39d0861aa3df732035fb12f4169ed01`, production tooling preflight passed at `2026-09-15T19:05:15Z`: pinned Supabase CLI 2.115.0, psql 17.11, reviewed TLS material, and three-way target binding. Before execution, review corrected the external production loader to validate the exact clean checkout, source hashes/blobs and migration inventory before decrypting credentials. The corrected package passed independent review and 15/15 tests in 5052.4711 ms. This was separate from the staging package's omitted-reason correction recorded in its execution receipt. No repository SQL changed.

At `2026-09-15T19:05:35Z`, migration history contained 68 local versions and zero remote rows, with no duplicate or remote-only version. All 68 versions are absent from production history; that observation does not authorize replay. Strict `production_pre_apply` at `2026-09-15T19:05:57Z` passed 9 of 16 checks and failed 7: `dietary_columns_and_permissions`, `represented_column_contracts`, `represented_function_contracts`, `represented_policy_contracts`, `represented_trigger_contracts`, `user_filters_objects`, and `user_filters_trigger_function_contract`. These are the prior eight failed groups minus `staffing_constraints_and_rls`, consistent with the reviewed lower-bound-only staffing preprofile. This comparison does not prove the unchanged detailed state of the other groups; fresh bounded diagnosis and the cleanup fingerprint remain required. This production gate remains failed. No production write, cleanup, history repair, setting change, main merge, deployment, or reopening occurred. Production remains 56 repair candidates plus 12 applies, no-go, and paused.

## Local verification — 2026-09-15

Implementation commit `5ec0228ea8605b411d25f2d00911dcf7b62b5b10` is pushed. The root-agent exact `npx vitest run` completed with exit `0`: **3,480/3,480 tests** across **322 files**, zero skips and zero failures, with a 69.28-second reported duration and 72.617-second runner wall time. Focused migration/runner/post-apply coverage passed **89/89** (29 manifest, 53 runner, 7 post-apply) in 5.59 seconds. Native saved-filter tests passed 20/20, active-authorization tests 11/11, live export 5/5, and required PostgREST 1/1. TypeScript exited `0`; lint had zero errors and 296 warnings.

The clean 68-migration-plus-seed fixture and preserved 66-to-68 fixture each passed strict post-apply **16/16** on the working tree that was then committed. The new migration SQL hash is `fd4b331e61e830421516b99cac9eedb0ac55184ce4ae4216e58137012737723a`; this records the tested source identity and does not claim either fixture started after the commit was created.

`pnpm audit --prod --json` remains exit `1` solely for the accepted UUID moderate: 0 critical, 0 high, 1 accepted moderate. The broader development-inclusive `pnpm audit --json` is separately exit `1` with 1 critical, 16 high, and 10 moderate findings, including dev-only Vitest UI `GHSA-5xrq-8626-4rwp`. That development follow-up is recorded separately and does not alter the production audit acceptance or create a waiver.

The named staging build passed with exit `0` in 14.633 seconds, and the forced production build correctly refused while the pause remained active. Pause-focused regression passed 26/26. Exact full `npx playwright test` attempt 3 exited `1` after 1,091.088 seconds: 162 passed, 47 classified skips, and 1 failed. The failure is not waived. It is a historical fixture result: that external local fixture lacked Realtime and returned WebSocket 404.

A fresh guard-owned, synthetic Compose fixture then completed the Realtime prerequisite with no hosted access. Its exact candidate verification at `5ec0228ea8605b411d25f2d00911dcf7b62b5b10` started from zero public relations, auth users, and migration-history rows; it applied all 68 migrations and the seed, then passed strict `post_apply` **16/16**. The fixture used the reviewed Realtime image digest `48ee05253213f014006a20bb34d0639f936b36a78e1972ec16b1985ac951d917`; a first launch that lacked the `_realtime` schema was replaced by a fresh preserved fixture revision. The recorded platform proof establishes a WebSocket upgrade, channel subscription, and seeded-tenant verification. Its fixture-only publication explicitly contains `employees`, `important_dates`, and `column_config`.

Test-only commit `413b6f809b708145df0e6518f49f5afbc04ebeca` adds per-test employee lifecycle isolation to the four affected Story 13.8 E2E cases. The only E2E source change is that fixture lifecycle; its assertions are unchanged and it adds no skips. Its targeted run passed with zero skips (45.1-second reported duration; 46.519-second runner wall time).

The first renewed parallel full Vitest attempt is retained as failed evidence, not a passing gate: 3,471 passed, 8 skipped, and 1 failed across 320 passing and two failing files, exit `1` (67.43-second report; 68.595-second runner wall). The skipped cases were not counted as passing. The primary failure was a PostgreSQL deadlock that masked an RLS `beforeAll`; the other was a live-export request abort timeout. The supported exact one-worker rerun (`VITEST_MAX_WORKERS=1 npx vitest run`) then passed **3,480/3,480** across **322 files**, zero skips/failures, exit `0` (436.71-second report; 437.842-second runner wall time).

Exact `npx playwright test` on that commit passed **163**, skipped **47**, failed **0**, and errored **0** (210 total; exit `0`; 1,085.146172-second report; 1,086.635-second runner wall). The JUnit XML SHA-256 is `5611b7d03a8da22f6eae1f749209455e4d99b34ccad185c2ea8d27e8f9e0e2b7`. `verify-final-playwright.ps1` confirmed all 47 exact skip identities and their existing classifications: nine notification/cron cases still require separate authorization, and 38 are removed, superseded, or deterministic-fixture debt. No skip is treated as passing.

After the browser run, strict local `post_apply` remained **16/16** and the dashboard-fixture cleanup aggregate was zero at `2026-09-15T18:36:20.102Z`. Test-resource Stop requests were accepted through Windows PowerShell 5.1; saved synthetic state is retained, and no CloseActor completion is claimed while the actor remains open. The fresh pre-merge fetch remains at staging `a85f65ef882b85a035ae16183dcb95f39bbab810` and main `822350986f4c023948a7bbf490ddffc371185c4a`, with no intervening commits.

The preceding pre-merge details are historical. Current staging execution is complete at 68/68. Owner staging verification and production gates remain next steps; no production result is claimed.
