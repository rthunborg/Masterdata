# Supabase Security Evidence Package

Prepared: 2026-06-11

Updated: 2026-09-10 — fresh local gates and dependency remediation recorded; final documentation-head remote checks and owner gates remain open

Story: 22.8, with Story 22.10, Story 22.13, and Story 22.15 addenda

> **Current post-apply staging state (2026-09-10):** Owner-approved PR #97 commit `5ec0deb81d921923330ddecc93fcb3b1e57d8ec9` merged into staging at `4aa2143dc42b4bc82a8ca7fa6efd7a95e9bde3be`; the tree is identical. Separate authorized repair of `20250113000000` succeeded at 11:26:32.913Z and seven authorized applies (`20260615000000`, `20260709194903`, `20260710144000`, `20260710150000`, `20260831200026`, `20260909115242`, `20260910094517`) succeeded at 11:34:32.834Z; history was 65/65 with zero pending at 11:34:43.467Z. The post-apply catalog failed only `story_22_15_phase_contracts`: `get_user_role()` has extra `service_role` EXECUTE. All three checked function bodies/attributes and all eight outbox subchecks pass; aggregates/hashes are unchanged and no rows were exposed. Security advisors report 0 WARN-or-higher findings at pinned CLI coverage; performance advisors report 5 WARN (three prior `multiple_permissive_policies` and two `auth_rls_initplan` findings on `column_config` and `employee_column_changes`), INFO-severity findings and certain Management API checks are not covered. Proposed forward-only `20260910115024_reconcile_post_apply_acl_and_policy_initplans.sql` revokes that grant and changes caller identity predicates in two policies: `column_config` `USING` and `WITH CHECK`, plus `employee_column_changes` `USING` (three expressions total); it writes no application data. The new candidate is 66 repository versions: current staging repair `[]`, execute `[20260910115024]`; provisional production remains 57 repairs plus nine executes after fresh inventory. Exact implementation verification on `eceaee7fa423c87aa9e6e235a70e7bb4eceb746d` passes: Vitest 3,451/3,451 with zero skips across 322 files (exit 0; 571.55s report / 572.9867885s wall; 12:20:00.7652475Z–12:29:33.7495182Z) and `npx playwright test` 163 passed / 47 skipped / 0 failed / 0 errors (exit 0; 1326.864669s report / 1339.0507151s wall; 12:30:22.4517860Z–12:52:41.5005005Z; XML SHA-256 `484732953160ce5abef9b8819aae0ceee4b5c716b322f3588920607d581fe11d`). The skip identities exactly match PR #96: 9 notification/cron authorization cases and 38 fixture/superseded debt cases. The code-identical `e122197f1ff33b560a2429902c8ca46cc33b33c8` clean 66-migration-plus-seed chain passed 15/15 in 9.781s; TypeScript, final-fixture lint (0 errors; prior full lint 0 errors/297 warnings), staging preview build exit 0 in 16.3758345s, expected production refusal exit 1, and required ÖMC PostgREST 1/1 in 2.11s also pass. Earlier interrupted/failed attempts remain historical. The future documentation-only head still needs fresh CI, Vercel, and Reviewbot verification after push. Story 22.15 remains in-progress, Epic 23 remains on hold, production remains paused, and no further hosted write is authorized; read-only observation remains allowed.

Scope: reviewable evidence for Supabase RLS policies, Auth posture, advisors, migration history, platform hardening posture, and known security risks. This file records summaries, counts, and command results only. It does not include database URLs, pooler URIs, Supabase project refs, key values, passwords, JWTs, cookies, real employee rows, or raw SQL/API output containing personal data. Production was accessed read-only through an authenticated Supabase CLI session; no production data or settings were modified by this story.

## RLS Policies

### Canonical Source

The canonical, reviewable RLS policy source is `supabase/migrations/` (**61 versioned migration files** as of 2026-07-10). The older counts below remain dated evidence of the repository and hosted environments at the time they were inspected. Key policy-defining migrations:

| Migration | What it defines |
| --- | --- |
| `20251027000000_initial_schema.sql` | Initial tables, RLS enablement, and base policies for `employees`, `column_config`, `users`, `important_dates` |
| `20251029000000_add_user_rls_policies.sql` | User-table self-read/self-update policies |
| `20251210000000_fix_employee_column_changes_rls.sql` | `employee_column_changes` authenticated insert/select policies |
| `20251210000002_update_rls_for_recruiter_crewing.sql` | Recruiter/crewing role coverage in employee/important-date policies |
| `20260130212612_create_user_filters.sql` | `user_filters` owner-scoped select/insert/update/delete policies |
| `20260313000001_add_staffing_needs.sql` | `staffing_needs` and `staffing_needs_changelog` policies |
| `20260607193000_fix_employee_column_changes_conflict_target.sql` | `employee_column_changes` repair/conflict-target hardening |
| `20260614000000_reconcile_environments_security_and_policies.sql` | Story 22.10 environment/policy reconciliation and SECURITY DEFINER grant baseline |
| `20260709194903_remediate_pr_91_security_findings.sql` | Story 22.13 direct-database hardening: active-HR-only column lifecycle, controlled runtime-column creation, caller-bound activity, staffing actor binding, and scoped audit access |
| `20260710144000_atomic_external_column_presentation.sql` | Caller-bound, row-locked external presentation metadata updates with permission recheck inside the transaction |
| `20260710150000_atomic_user_status_transition.sql` | Caller-bound, advisory-locked user activation/deactivation with atomic last-active-HR-admin protection |
| `20250113000000_add_room_assignment_rpc.sql` | Restored original immutable room-assignment version; history repair is permitted only after environment-specific catalog proof of represented hosted state, never by unsafe replay |
| `20260831200026_enforce_active_authorization_and_atomic_user_deletion.sql` | Active-only role lookup and saved-filter policies; caller-bound atomic app-user deletion before explicit second-phase Auth cleanup |

### Historical Local Cross-Check Against `pg_policies` (2026-06-11)

The migration-defined policies were cross-checked against the local non-production Supabase stack (project id `hr-masterdata`, migrations applied via `supabase db reset`), reusing the Story 22.7 local-stack pattern. Production was not queried for this check.

| Table | Policies in `pg_policies` | RLS enabled |
| --- | --- | --- |
| `column_config` | 3 | yes |
| `employee_column_changes` | 2 | yes |
| `employees` | 2 | yes |
| `important_dates` | 2 | yes |
| `pe3_notifications_log` | 0 | yes (deny-by-default; service-role access only) |
| `staffing_needs` | 2 | yes |
| `staffing_needs_changelog` | 2 | yes |
| `user_filters` | 4 | yes |
| `users` | 5 | yes |
| **Total** | **22** | 9 tables |

`pe3_notifications_log` intentionally has RLS enabled with no policies, which denies all non-service-role access. This matches its use as a cron/service log table.

### Story 22.13 High-Port Local Cross-Check (2026-07-10)

The project-scoped local Supabase stack was rebuilt on the configured high ports (`15421` API / `15422` Postgres) through migration `20260710150000`. The shared Epic 22 environment helper verifies the `hr-masterdata` project identity and the latest Story 22.13 migration fingerprint before live tests run; it does not fall back to another repository's default ports.

The migration-built local catalog contains the intended **17 policies across 9 RLS-enabled tables**:

| Table | Policies in local `pg_policies` | Story 22.13 posture |
| --- | ---: | --- |
| `column_config` | 2 | Public/config read plus lifecycle management restricted to an active HR Admin |
| `employee_column_changes` | 1 | Trigger-owned writes; SELECT requires an active caller, employee-row visibility, and column visibility |
| `employees` | 2 | Existing canonical employee policies |
| `important_dates` | 2 | Existing canonical important-date policies |
| `pe3_notifications_log` | 0 | RLS deny-by-default; service-role log table |
| `staffing_needs` | 2 | Existing row policies plus internally authorized update RPC |
| `staffing_needs_changelog` | 2 | Existing canonical changelog policies |
| `user_filters` | 4 | Owner-scoped CRUD |
| `users` | 2 | INSERT/SELECT only; no client UPDATE policy |
| **Total** | **17** | 9 RLS-enabled tables |

Focused Story 22.13 verification passed **94/94** tests against this stack, including direct RPC/table denials and allowed paths, atomic presentation and user-status authorization, catalog/grant checks, caller/actor binding, audit visibility, environment fingerprinting, runtime-column restore ordering, and backup-manifest integrity. This is local non-production evidence. Hosted staging remains at the Story 22.10 observed 19-policy state until the Story 22.13 migrations are applied and re-inventoried; production remains the dated 26-policy snapshot until the approved production cutover.

### Hosted Production Policy Posture (Delta Finding)

The production schema was reviewed through the 2026-05-28 nightly logical backup (`schema.sql`, DDL only — restored during the Story 22.8 drill, see `evidence/restore-drill-2026-06-11.md`). As of that snapshot, the hosted production database contained **26 policies**, not the 22 defined by migrations, and several names/definitions differed:

- Production `employees` has 6 policies including `HR Admin can do anything with employees`, `External parties can view active employees`, `Admin Limited can view all employees`, and `Admin Limited can update employees` — the Admin Limited and legacy HR Admin policies are not present in tracked migrations.
- Production `important_dates` has 3 policies including `Admin Limited can view important dates` and `HR Admin can read important dates`, which are not in migrations.
- Production `user_filters` has only 3 policies (read/insert/delete own) and is missing the `update own filters` policy that migrations define.
- Production `column_config` policy names differ from migration names (for example `Anyone can read column config` vs `Everyone can read column configs`).
- Production staffing policy names carry different suffixes (`staffing_needs_select_authenticated`, `staffing_needs_update_hr_admin_crewing`) than the migration-defined names.

This confirms hosted RLS policies have drifted from version-controlled migrations (policies were created or edited outside the migration flow). All hosted-policy observations in this section reflect the 2026-05-28 backup snapshot, not a live read of the production database — the same dashboard-era drift could have changed hosted policies again since; a live re-inventory is part of the Story 22.10 reconciliation. See Known Security Risks below and risk `R-023` in `11_risk_register_and_open_questions.md`.

Note for Story 22.7 readers: the documented `admin_limited` direct-DB-RLS limitation was based on migration-defined policies and remains correct for any environment built from migrations; the hosted production database additionally carries dashboard-era `Admin Limited` policies that migrations do not reproduce.

**Story 22.10 update (2026-06-14):** the policy drift was classified and reconciled in migration `20260614000000` — dashboard-era policies removed, canonical policies re-asserted, and the missing `user_filters` update policy created. That migration was verified locally and applied to hosted staging (19 policies); production remains pending. Story 22.13 adds the later 17-policy hardening delta. The dated states and both remaining hosted sequences are in `26_environment_reconciliation_inventory.md` and `27_supabase_cutover_runbook.md`.

## Auth Settings

- Application sign-in uses Supabase Auth password authentication with an application-level active-user check (`src/app/api/auth/login/route.ts`, `src/lib/server/auth.ts`). Password hashing is handled by Supabase Auth per NFR8.
- No SSO or MFA is claimed or configured for the current working-pilot scope.
- Supabase security advisors (captured 2026-06-11, see below) report that **leaked-password protection is disabled** in the production project. This is a concrete, remediable Auth hardening item (enable HaveIBeenPwned checking). **Moved to Epic 23 (Story 23.4 AC6) on 2026-06-14:** leaked-password protection (and CAPTCHA/bot protection) is a dashboard/Management-API Auth setting, not a SQL migration, so it sits with Epic 23 enterprise security hardening rather than the Story 22.10 schema reconciliation. It still fires on staging/production until 23.4 enables it; record then as a dated "enabled on `<date>` by `<operator role>`" evidence-index entry.
- Session lifetime, MFA configuration, and remaining dashboard-only Auth settings were not verified in this story — no "verified privately" claim is made for them here. They are a documented gap owned by the technical owner, review by 2026-09-30; when a dashboard review happens, it should be recorded as a dated "verified privately on <date> by <operator role>" entry per the established evidence-index pattern.

## Supabase Advisors

Prior attempts were blocked (see evidence-index rows "Supabase MCP access verification" and "Supabase direct SQL attempt"). On 2026-06-11 the advisor access limitation was re-tested and is **resolved**: `npx supabase db advisors --linked` succeeded through an authenticated CLI session without requiring `SUPABASE_DB_PASSWORD`.

Redacted advisor summary for the production project (2026-06-11):

| Category | Level | Count | Rules |
| --- | --- | --- | --- |
| Security | WARN | 20 | `function_search_path_mutable` (11), `anon_security_definer_function_executable` (4), `authenticated_security_definer_function_executable` (4), `auth_leaked_password_protection` (1) |
| Performance | WARN | 63 | `multiple_permissive_policies` (54), `auth_rls_initplan` (9) |
| Any | ERROR | 0 | — |

Remediation status: **Story 22.10 reconciliation was applied and verified on hosted STAGING on 2026-06-14; production remains the Phase B cutover.** The observed staging deltas at that point were `function_search_path_mutable` 12→0; `anon_security_definer_function_executable` 5→1 (`get_user_role`, by design); `authenticated_security_definer_function_executable` 5→3; `auth_rls_initplan` 9→0; `multiple_permissive_policies` 54→3; and migration history empty→57 in sync. Those are historical hosted observations, not the Story 22.13 end state.

Story 22.15 retains six justified authenticated SECURITY DEFINER entry points: active-only `get_user_role()` for RLS evaluation; `update_staffing_need(...)`; `update_own_last_active_at()`; `update_assigned_column_presentation(...)`; `set_user_active_status(...)`; and caller-bound `delete_app_user(uuid)`. Atomic deletion shares the final-admin advisory lock and commits the app-row deletion with a durable cleanup handoff in one transaction. Service role performs the external Auth deletion and then calls only the narrow cleanup-completion RPC; a failure in either step remains explicit and retryable. Raw custom-column DDL remains unavailable; `create_employee_column_config(...)` remains service-role-only. Hosted advisor counts must be re-run after staging/production apply. `auth_leaked_password_protection` remains Epic 23 Story 23.4.

## Migration History

- Historical Story 22.15 snapshot: 63 files/57 repairs/six executes became historical 64 then 65-version plans. Current staging completed the one repair plus seven applies under separate owner authorization and reached 65/65 history. The sole post-apply mismatch is extra `service_role` EXECUTE on `get_user_role()`. Proposed `20260910115024` is the only current staging execute; repository target becomes 66 versions and provisional production becomes 57 repairs plus nine executes after fresh inventory.

## SSL, Network Restrictions, And PITR Posture

Verified read-only on 2026-06-11 through the authenticated CLI (`ssl-enforcement get`, `network-restrictions get`):

| Control | Verified posture | Decision | Owner | Review date |
| --- | --- | --- | --- | --- |
| Database SSL enforcement | **Not enforced** | Risk-accepted for the working-pilot scope. Application access goes through HTTPS Data APIs; direct DB clients (backup workflow) negotiate TLS by default. Recommended hardening: enable SSL enforcement after confirming the nightly backup workflow's pooler connections use TLS. Not changed by this story (no production setting changes without explicit approval). | Technical/IT owner — Rasmus Thunborg (named 2026-06-12; formal customer-side confirmation pending) | 2026-09-30 |
| Database network restrictions | **Allow-all (IPv4 `0.0.0.0/0`, IPv6 `::/0`)** | Risk-accepted for the working-pilot scope. GitHub Actions runners (backup workflow) use dynamic IPs, so a static allowlist would break the nightly backup without a maintained IP strategy. Recommended hardening: restrict to required ranges or move backups to an environment with stable egress before enterprise use. | Technical/IT owner — Rasmus Thunborg (named 2026-06-12; formal customer-side confirmation pending) | 2026-09-30 |
| PITR / platform physical backups | **Not enabled** (paid Supabase feature; project remains on the current plan per NFR1) | Risk-accepted: GitHub nightly logical backups (14-day retention) are the verified backup mechanism, and the full restore drill is now verified (see `evidence/restore-drill-2026-06-11.md`). PITR is not enabled without explicit owner approval because it is a paid platform feature. Revisit if RPO under 24 hours becomes a contractual requirement. | Operations owner — Rasmus Thunborg (named 2026-06-12; formal customer-side confirmation pending) | 2026-09-30 |

These decisions update open items #7 and #8 in `08_security_overview.md` and risks `R-018`/`R-019` in `11_risk_register_and_open_questions.md`.

## Known Security Risks

Standing risks are tracked in `11_risk_register_and_open_questions.md` and `08_security_overview.md`; they are not duplicated here. Delta risks discovered during Story 22.8 (historical items 1–6) and the Story 22.13 disposition are:

1. **Hosted RLS policy drift** — production has 26 policies vs 22 from migrations, with name and definition differences (new risk `R-023`; remediation filed as Story 22.10).
2. **Empty remote migration history** — hosted production records zero applied migrations; schema changes happened outside the tracked flow (hardens `R-010` from "gap" to "confirmed"; baseline filed as Story 22.10).
3. **Nightly backup gap (closed follow-up)** — the 2026-06-05 run failed at the transient CLI-setup step and went undetected. Story 22.12 added a pinned retry and GitHub-issue alerting; Story 22.13 makes the runtime archive required so only the roles dump remains best-effort.
4. **Auth/storage schemas are outside logical backup scope** — the nightly dump covers `public` schema only; login users (`auth.users`) are not restorable from it. A disaster recovery would need auth users re-provisioned (documented in the restore drill; affects RTO; scope decision filed as Story 22.12).
5. **Hosted advisor warnings (dated state)** — production had 20 security warnings on 2026-06-11. Story 22.10 materially reduced the hosted staging counts; Story 22.13's grant/policy delta still needs hosted staging and production advisor re-runs.
6. **roles.sql backup is minimal** — the role-only dump contains only `statement_timeout` settings for `anon`/`authenticated`/`authenticator` (managed-role permissions limit the dump); role recreation in a disaster relies on Supabase platform defaults plus migrations.
7. **Direct-database authorization bypasses** — migrations through `20260831200026` make privileged paths caller-bound and active-only. Inactive JWTs receive no database role and cannot CRUD saved filters; middleware/login reject inactive or missing app users. Atomic deletion prevents partial deactivation and returns a truthful durable-cleanup error if Auth deletion or completion attestation fails. Hosted apply/re-verification remains owner-gated.
8. **Historical replay and evidence risk** — represented repayment, dietary, staffing, filter, and original room-RPC SQL is never replayed. The explicit manifest, three-way target binding, and machine fail-closed catalog wrapper replace wildcard history repair. The dated staffing-column contradiction and incomplete exact policy-expression evidence require fresh read-only production capture; any mismatch halts before mutation.
9. **Partial staging-refresh scope** — the required runtime-column archive and single transaction prevent partial config/schema/employee refreshes, but a successful `TRUNCATE ... CASCADE` still clears employee-dependent party/audit tables that the partial job does not replay. A legacy physical column without matching `column_config` can still fail the replay; the job now rolls back and alerts. See `09_operations_support_and_sla.md`, `26_environment_reconciliation_inventory.md`, and `R-024`.

## Command Evidence

Historical PR #95 exact-commit result (2026-09-09): Exact full npx playwright test passed on 3b75d5e78829426edfddce3207d4c16fb767aff1 on 2026-09-09: 163 passed / 47 skipped / 0 failed / 0 errors, exit 0, report duration 1,049.606579 seconds (17.5 minutes). Guard CloseActor and List verified cleanup with zero unresolved owned resources. No hosted Supabase action occurred. Story 22.15 remains in-progress; Epic 23 remains on hold. [Dated result and skip inventory](evidence/production-readiness-pr95-playwright-2026-09-09.md); report duration 1,049.606579 seconds (17.5 minutes). Earlier dated rows below retain their historical open-gate statements. PR #95 subsequently passed review and was explicitly authorized and merged into staging at 8c82bd8f4cc3c5076b2b6a37f4ced209bd8cba1c. This is historical evidence. PR #96 preparation and its later authorized PR #97 staging repair/seven-apply sequence are historical evidence. The only current candidate is `20260910115024`, which requires its own tests/review; no staging-to-main merge or further hosted write is authorized.

| Command (sanitized) | Date | Result |
| --- | --- | --- |
| Local `pg_policies` policy/RLS inventory via `psql` in the local stack DB container | 2026-06-11 | 22 policies, 9 RLS-enabled tables (table above) |
| `npx supabase db advisors --linked` | 2026-06-11 | Exit 0; 83 WARN (20 security, 63 performance), 0 ERROR |
| `npx supabase migration list --linked` | 2026-06-11 | Exit 0; 56 local migrations, remote history empty |
| `npx supabase ssl-enforcement get --project-ref <ref> --experimental` | 2026-06-11 | Exit 0; SSL not enforced |
| `npx supabase network-restrictions get --project-ref <ref> --experimental` | 2026-06-11 | Exit 0; allow-all IPv4/IPv6 |
| `npx supabase storage ls ss:///db-backups/backup/ --linked --experimental` | 2026-06-11 | Exit 0; 14 daily backups, 2026-06-05 missing |
| Full restore drill (download oldest backup, restore into local stack, validate, clean up) | 2026-06-11 | Success; see `evidence/restore-drill-2026-06-11.md` |
| Story 22.13 focused local verification against project-scoped high-port Supabase | 2026-07-10 | Exit 0; **94/94 passed**. Verified latest migration fingerprint, 17-policy catalog, grants, direct authorization, atomic presentation/status transitions, caller/actor binding, audit visibility, runtime-column restore, and backup-manifest integrity. |
| Story 22.13 mandatory full local gates | 2026-07-10 | Exit 0: Vitest **3,125 passed / 30 skipped**; Playwright **162 passed / 53 skipped / 0 flaky**; `npx tsc --noEmit`; lint with no errors. Hosted staging execution is not claimed. |
| Story 22.15 production dependency audit | Revalidated 2026-09-10 | Before narrow patch: `0` critical / `3` high / `3` moderate. After patch: `0` critical / `0` high / `1` moderate across 282 production dependencies; `pnpm audit` exits 1 solely for the existing ExcelJS→UUID residual, controlled and review-dated 2026-09-30. |
| Story 22.15 local database/live evidence | 2026-09-01 | Clean reset exit `0` through all 63 migrations plus seed; Story 22.15 live database **11/11**, Story 22.14 PostgREST **1/1**, and live Next-plus-Supabase export **5/5**. Verified post-reset 17-policy target, active/inactive authorization, saved-filter denial, documented exceptions, atomic rollback/final-admin behavior, two-client race, restricted cleanup outbox, and real workbook generation/parsing. |
| Story 22.15 full local quality gates | 2026-09-01 | Final fresh Vitest exit `0` in 525.97s: **317/317 files and 3,342/3,342 tests passed with zero skips**. Exact full Playwright exit `0`: **163 passed / 47 classified skips / 0 failed**. Type-check, zero-error lint, Next `16.3.3` production build, dependency threshold, and the candidate-wide diff check passed under the single path-scoped exception for the SHA-256-pinned byte-preserved `20250113000000` migration; all other paths retain normal whitespace enforcement. No skip is passing evidence; remote review and hosted evidence remain open. |
| Story 22.15 IPv4 session-pooler binding amendment | 2026-09-04 | Focused target-binding/catalog/migration-readiness suites **65/65**; fresh full Vitest **3,309 passed / 51 managed local-service skips**; full lint 0 errors / 297 pre-existing warnings; type-check exit `0`. PR #95 is open from implementation commit `de4f7f1d4f7fb289cbb2c8c6becdb7fd813640a1`; its repository workflow and both Vercel checks passed. Direct mode remains supported; IPv4 Shared Supavisor session mode is constrained to exact mode/host/project/port/TLS inputs and secret-isolated catalog execution. Exact amendment-branch Playwright, review/merge, and the new immutable staging SHA remain open; no hosted read/write or setting change occurred. |
| Story 22.15 PR #95 P1 actual-connection remediation | 2026-09-07 | Focused target-binding/catalog/CLI-runner/migration-readiness suites **79/79**; fresh full Vitest **3,319 passed / 51 managed local-service skips**; full lint 0 errors / 297 pre-existing warnings; type-check exit `0`. Regression coverage proves direct/session actual CLI binding, private-argument and ambient-environment isolation, `verify-full`/reviewed-CA enforcement, native-selector and marker rejection, help isolation, and no spawn after target/CA proof failure. Exact amendment-branch Playwright, refreshed PR checks/review/merge, the new immutable staging SHA, and every hosted gate remain open; no hosted read/write or setting change occurred. |
| Story 22.15 PR #95 Reviewbot command-grammar remediation | 2026-09-07 | Sixteen new runner regressions cover leading and embedded persistent options, `-p` and attached short-password values, non-echoed secret errors, the exact standalone version probe, and every exact advisor/list/repair/push shape. Runner **30/30**; combined focused **95/95**; fresh full Vitest **3,335 passed / 51 managed local-service skips**; full lint 0 errors / 297 pre-existing warnings; type-check exit `0`. Exact amendment-branch Playwright, refreshed PR checks/review/merge, the new immutable staging SHA, and every hosted gate remain open; no hosted read/write or setting change occurred. |
| Story 22.15 PR #95 Reviewbot repair-allowlist remediation | 2026-09-07 | Seven new runner regressions cover positive staging/production manifest plans and rejection of forward-only, arbitrary, cross-environment, missing-environment, and mismatched private-record repairs before target proof or spawn. Runner **37/37**; combined focused **102/102**; fresh full Vitest **3,342 passed / 51 managed local-service skips**; full lint 0 errors / 297 pre-existing warnings; type-check exit `0`. Exact amendment-branch Playwright, refreshed PR checks/review/merge, the new immutable staging SHA, and every hosted gate remain open; no hosted read/write or setting change occurred. |

Project refs were passed via shell variables resolved at runtime and are not recorded in this package. The CLI link state created during evidence capture was removed afterwards (`supabase unlink`); `supabase/.temp/` contents are git-ignored except the already-tracked `supabase/.temp/cli-latest`, which was restored to its committed state.

Historical local verification record (c27a9ee): Earlier candidate full results are historical because they predate the guard corrections. The fresh trusted hook resolves ACTOR_CLOSING. Fresh full local gates passed on c27a9ee7543b681fb9424484ee3caf7b402a33c7: Vitest 3,442 passed with zero skips; Playwright 163 passed / 47 individually classified skips / zero failures or errors; both exact commands exited 0. Named staging preview build, TypeScript and zero-error lint passed. Exact timings and report integrity are recorded in the dated preparation evidence. Story 22.15 remains in-progress and Epic 23 remains on hold. This result-only documentation commit must receive fresh CI, Vercel, and Reviewbot verification after push; those future checks are open. Hosted repair/apply, staging/main merges, production deployment/settings, and reopening remain separately owner-gated. Focused evidence is 197/197 across 14 files in 37.85 seconds with zero skips; TypeScript and lint pass, and the required observed-state fixture and live-export cases are enabled. The narrow patch returns audit to 0 critical/0 high/1 accepted UUID moderate (exit 1 solely for the existing acceptance through 2026-09-30). The 7826a339414fccf6694798ef039a2e1e4403a8b6 GitHub/Vercel/Reviewbot evidence is historical parent evidence. c27a9ee review 5164559421 found only P1 inline 3976995821 for stale parent-SHA exact-head evidence; this documentation patch corrects it. Fresh CI/Vercel/Reviewbot checks for the result-only documentation head remain open. Story 22.15 stays in-progress; Epic 23 stays on hold. Hosted repair/apply, staging/main merges, production deployment/settings and reopening remain separately owner-gated. See [dated evidence](evidence/staging-reconciliation-and-pause-2026-09-09.md).

## Post-apply staging evidence — 2026-09-10

PR #97 `5ec0deb81d921923330ddecc93fcb3b1e57d8ec9` was owner-approved and merged to staging `4aa2143dc42b4bc82a8ca7fa6efd7a95e9bde3be`; the tree is identical. The separately authorized repair succeeded at 11:26:32.913Z; seven approved applies succeeded at 11:34:32.834Z; history was 65/65 with zero pending at 11:34:43.467Z. Strict post-apply catalog failed only `story_22_15_phase_contracts` due to extra `service_role` EXECUTE on `get_user_role()`. All three checked function bodies/attributes are exact and all eight outbox subchecks pass. Security advisors report 0 WARN-or-higher findings at pinned CLI coverage; performance advisors report 5 WARN (three prior `multiple_permissive_policies`, plus `auth_rls_initplan` on `column_config` and `employee_column_changes`). Aggregate/hash evidence is unchanged and no rows were exposed. Proposed forward-only `20260910115024` revokes the grant and changes caller identity predicates in two policies: `column_config` `USING` and `WITH CHECK`, plus `employee_column_changes` `USING` (three expressions total); it writes no application data. Exact implementation verification on `eceaee7fa423c87aa9e6e235a70e7bb4eceb746d` passes: Vitest 3,451/3,451 with zero skips across 322 files (exit 0; 571.55s report / 572.9867885s wall; 12:20:00.7652475Z–12:29:33.7495182Z) and `npx playwright test` 163 passed / 47 skipped / 0 failed / 0 errors (exit 0; 1326.864669s report / 1339.0507151s wall; 12:30:22.4517860Z–12:52:41.5005005Z; XML SHA-256 `484732953160ce5abef9b8819aae0ceee4b5c716b322f3588920607d581fe11d`). The skip identities exactly match PR #96: 9 notification/cron authorization cases and 38 fixture/superseded debt cases. The code-identical `e122197f1ff33b560a2429902c8ca46cc33b33c8` clean 66-migration-plus-seed chain passed 15/15 in 9.781s; TypeScript, final-fixture lint (0 errors; prior full lint 0 errors/297 warnings), staging preview build exit 0 in 16.3758345s, expected production refusal exit 1, and required ÖMC PostgREST 1/1 in 2.11s also pass. Earlier interrupted/failed attempts remain historical. The future documentation-only head still needs fresh CI, Vercel, and Reviewbot verification after push. No further hosted write is authorized; read-only observation remains allowed. See `evidence/post-apply-staging-reconciliation-2026-09-10.md`.
