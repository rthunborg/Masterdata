# Post-Apply Staging Reconciliation Evidence — 2026-09-10

## Scope

This redacted record covers the owner-authorized staging repair/apply sequence and the local verification of its forward correction. It contains no database URLs, project refs, credentials, raw row data, or employee rows. Production remained paused and untouched; further hosted writes require separate approval. Read-only staging investigation remains authorized.

## Staging result

- Owner-approved PR #97 `5ec0deb81d921923330ddecc93fcb3b1e57d8ec9` merged into staging `4aa2143dc42b4bc82a8ca7fa6efd7a95e9bde3be`; the tree is identical.
- Repair `20250113000000` succeeded at `2026-09-10T11:26:32.913Z`; immediate history was 58 rows.
- Applies `20260615000000`, `20260709194903`, `20260710144000`, `20260710150000`, `20260831200026`, `20260909115242`, and `20260910094517` succeeded at `2026-09-10T11:34:32.834Z`.
- History was 65/65 with zero pending at `2026-09-10T11:34:43.467Z`.

## Post-apply catalog

Only `story_22_15_phase_contracts` failed: `get_user_role()` retains extra `service_role` EXECUTE. All three checked function bodies/attributes and all eight outbox subchecks pass. Aggregate/hash evidence is unchanged and no rows were exposed. Security advisors report 0 WARN-or-higher findings at pinned CLI coverage. Performance advisors report 5 WARN: three prior `multiple_permissive_policies` and two `auth_rls_initplan` findings on `column_config` and `employee_column_changes`. INFO-severity findings and certain Management API checks are not covered.

## Forward correction and gates

Proposed `20260910115024_reconcile_post_apply_acl_and_policy_initplans.sql` revokes the grant and changes caller identity predicates in two policies: `column_config` `USING` and `WITH CHECK`, plus `employee_column_changes` `USING` (three expressions total); it writes no application data. The candidate is 66 repository versions: staging repair `[]`, execute `[20260910115024]`; provisional production is 57 repairs plus nine executes after fresh inventory. The new `staging_reconciliation_pre_apply` phase accepts the exact 65-version staging state before this correction; strict post-apply expects the correction. Both phases reject missing/extra grants, either policy in the wrong phase, a mismatched `WITH CHECK`, weakened active-user predicates, and unexpected public policies. The policy change follows Supabase's [row-level security guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) for row-independent caller identity subqueries. CLI remains pinned to 2.115.0; the current changelog was checked without upgrading it.

Local verification below is complete on implementation `eceaee7fa423c87aa9e6e235a70e7bb4eceb746d`. The subsequent documentation-only head must receive its own CI, Vercel and final Reviewbot checks; attach their exact-head outcomes to the PR before requesting merge authorization. Story 22.15 remains in-progress, Epic 23 on hold, and production paused. After an explicitly approved staging merge, fresh reviewed read-only proofs and a separate single-migration apply approval are required. No further staging history repair is permitted. Hosted direct-role/RPC acceptance and production inventory/rollout remain open; local tests do not satisfy those gates.

Private source reports: `C:\DEV\hr-masterdata-pr97-gate-support-20260910`; review summary: PR #97 comment `5618074350`.

## Redacted integrity and preservation baseline

The 2026-09-10T11:54:43.854Z diagnostic proves the complete non-owner `get_user_role()` grant array is exactly `anon`, `authenticated`, `service_role`, with no unknown extras. Diagnostic SQL SHA-256: `e6429c6b21e21f411dc2f061f99b47378b8b0ccaa0c2de66ed22446cfdab6c96`. All three function body hashes and attributes match the reviewed 65-version contracts; every outbox predicate passes.

Post-apply aggregates captured at 2026-09-10T11:36:35.863Z match the pre-apply baseline: saved filters total/orphan/empty/overlength counts are all zero; ÖMC true/false/NULL counts are 0/1/32; PE3 counts are 1/0/32. Each of the four configuration rows exists exactly once. Permission MD5 values are:

| Configuration | Unchanged permission hash |
| --- | --- |
| `special_diet` | `608d8d6a5846555a137171568d7b82a5` |
| `diet_details` | `608d8d6a5846555a137171568d7b82a5` |
| `repayment_needed_omc` | `02b8319f6f054191fe4131b27e060f98` |
| `repayment_needed_pe3` | `3a274a1d25cd34f07f378195bb080f29` |

The new migration SHA-256 is `7b4f11898f43d88d36fbc1661fb45175629a950750350d43c3f639e959afc74d`; pre-review catalog SQL SHA-256 is `626421b57f09d1630113b149a1f73d6bd3bb5375e9a4477a277511144bb966d4`. Historical migration files are unchanged.

## Verified pre-review implementation — 2026-09-10

| Gate | Result and scope |
| --- | --- |
| Full Vitest | Exact `npx vitest run` on `eceaee7fa423c87aa9e6e235a70e7bb4eceb746d`: **3,451 passed, zero skipped, 322 files**, exit 0; 571.55 seconds report / 572.9867885 seconds wall; 12:20:00.7652475Z–12:29:33.7495182Z. Required local database and live-export evidence enabled. One worker prevents the established cross-suite fixture collision; in-suite concurrency assertions remain enabled. |
| Full Playwright | Exact `npx playwright test` on the same commit: **163 passed / 47 skipped / 0 failed / 0 errors**, exit 0; 1326.864669 seconds report / 1339.0507151 seconds wall; 12:30:22.4517860Z–12:52:41.5005005Z. XML SHA-256 `484732953160ce5abef9b8819aae0ceee4b5c716b322f3588920607d581fe11d`. |
| Playwright skips | Every class/name pair matches the reviewed PR #96 list. The same **9 notification/cron cases requiring explicit capture authorization and 38 obsolete/superseded or deterministic-fixture debt cases** remain skipped. No skipped behavior is counted as passing. See the [individual 47-case inventory](production-readiness-local-gates-2026-09-01.md). |
| Complete migration chain | Fresh guard-owned `template0` fixture: all **66 migrations plus seed**, **15/15** catalog checks, scoped fixture removal verified, 9.781 seconds at `e122197f1ff33b560a2429902c8ca46cc33b33c8`. Migration/verifier bytes are identical in `eceaee7`; the later change only completes a legacy test fixture. |
| Focused regressions | 157/157 across 10 changed-area files before the final legacy-fixture update (3.77 seconds); corrected legacy authorization fixture 11/11 (3.02 seconds). All are also included in the final full suite. |
| Required PostgREST check | `REQUIRE_OMC_POSTGREST_EVIDENCE=true npx vitest run tests/integration/epic-22/story-22.14/postgrest-claim-contention.test.ts`: 1/1, exit 0, 2.11 seconds on `eceaee7`, after Playwright teardown. |
| TypeScript/lint | TypeScript exit 0 at `eceaee7`. Full lint at `e122197`: exit 0, zero errors / 297 existing warnings; the only subsequent changed test fixture also passes targeted lint without errors or warnings. |
| Build/pause | Named staging preview build: exit 0, 16.3758345 seconds at `8625158fd748612e4395a52ab9154796f15e7d8b`. Application/build/verifier/migration source is identical at `eceaee7`; later commits change tests and documentation only. Production Next configuration import is refused as expected with exit 1. The full suite includes pause page/API/mutation, output-tree and cron/deployment guard tests. |
| Dependency audit | Production scope: 0 critical / 0 high / 1 UUID moderate accepted through 2026-09-30, audit exit 1. Broader development-tooling scope: **1 critical / 16 high / 10 moderate**, exit 1; still open, with no new waiver or dependency changes. No Vitest UI server was started. |

The user-owned local Supabase service remains at its validated 63-version baseline and was used for scoped application/PostgREST tests; it was not adopted, reset or stopped. The independent guard-owned fixture supplies the 65-to-66 and clean-66 migration proofs. Neither is hosted staging acceptance.

### Retained unsuccessful attempts

- `8625158` full Vitest was deliberately interrupted before completion to add independent negative cases for the second changed policy. It is not a passing gate.
- `e122197` full Vitest exited 1: **3,449 passed / 2 failed**, 321 passing files / 1 failing file; 631.16 seconds report / 632.812088 seconds wall. Both failures came from the older atomic-authorization fixture omitting the new forward correction before asserting strict post-apply policies. The fixture now applies the full forward sequence; its 11 focused tests and the complete `eceaee7` rerun pass. No skip classification or verifier contract was weakened.

## PR #98 review follow-up

Codex reviewed `56b4fb2c66ad85befbd31a3be43deb96b5f46f9e` and identified two valid verifier gaps: complete policy definitions could pass with table RLS disabled, and EXECUTE grantee comparisons omitted grant-option rights. The follow-up requires RLS enabled on every table in a complete policy profile and rejects non-owner function execution grants with delegation rights. Negative fixtures must prove rejection before and after reconciliation. The forward migration is unchanged. The preceding full local results remain evidence for `eceaee7`; the review fixes require fresh full verification and another exact-head remote review before merge approval.

## Production pause and remaining gates

Read-only Vercel inspection at 2026-09-10T12:04:21.493Z confirmed that the production domain still resolves to the recorded READY production pause deployment. The connector does not expose automatic production-domain assignment or active cron settings; their last independent dashboard proof is the historical 2026-09-09 disabled/zero result. Those settings must be freshly verified before any production-targeted action. No deployment, promotion, hosted setting change or reopening occurred during this preparation.

The committed pause lock remains `paused`. Production-targeted uploads can affect aliases and cron definitions even without ordinary promotion; retain the separate approval and inspection gates in the [runbook](../27_supabase_cutover_runbook.md). GitHub/Vercel/Reviewbot evidence must identify the final documentation head, and a passing PR does not authorize its staging merge or hosted migration apply.
