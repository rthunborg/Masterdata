# Epic 22 Supabase Cutover Runbook (Stories 22.10, 22.13, and 22.15)

> **Current staging v67 execution — 2026-09-12.** PR #100 reviewed head 0150d55b4aa359b19149fd6c288242809e14901b merged to staging ad9650ccfc8be412447a03847cc7ddfb372f8666 at 2026-09-12T11:40:09Z with an identical tree, no unexpected intervening staging/main commits, and main unchanged at 822350986f4c023948a7bbf490ddffc371185c4a. Under standing migration authorization, 20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql applied once at 2026-09-12T11:50:57.715Z after target binding, 67/66 pre-history, the exact one-file dry run, and 16/16 pre-apply catalog proof; no history repair occurred. Immediate history at 2026-09-12T11:51:04.657Z is 67/67 with no pending or remote-only versions, and post-apply catalog is 16/16. Audit preservation is 353 rows, 90 nonnull actors, 0 unmapped and unchanged canonical-history hash 084def93b0dfd29df9076e2d007116ff; repayment aggregates and all four permission hashes are unchanged. Scoped advisors report 0 security WARN-or-higher and three classified multiple_permissive_policies WARN. Hosted fixture/RPC acceptance passed 21/21 on 2026-09-12 in 23.4699465s, exit 0, with zero failures or skips. Independent new connections proved fixtures absent, staffing and aggregates restored, and final catalog 16/16. Owner staging verification remains open. Production remains paused; Story 22.15 remains in-progress and Epic 23 remains on hold. See [staging execution receipt](evidence/trigger-reconciliation-preparation-2026-09-10.md#staging-v67-execution-receipt--2026-09-12).

> **Historical pre-trigger execution record — 2026-09-10 15:14 UTC (superseded below).** PR #98 approved head ac38f8e874b61948809c5dfdb09ca2df054da254 merged to staging 62a52e32aae8302d6c6be4b35ec39da298c5061c with an identical tree. Authorized correction 20260910115024 applied at 2026-09-10T15:12:39.328Z; immediate history was 66/66 with no pending or remote-only versions. Strict post_apply catalog passes 15/15, security advisors report 0 WARN+ within pinned CLI coverage, performance retains only 3 classified multiple_permissive_policies WARN, and repayment aggregates/all four permission hashes are unchanged. Hosted direct-role/RPC acceptance and owner staging verification remain open. Production requires fresh inventory, signed history-proof ledger, backup and separately authorized history repair/isolation/settings/deployment; the owner has supplied standing authorization for required future migration applies, subject to reviewed prerequisites. Production remains paused; reopening and staging/main merges require separate authorization. Story 22.15 remains in-progress; Epic 23 on hold. [Completed reconciliation evidence](evidence/staging-reconciliation-completed-2026-09-10.md). This record supersedes earlier statements that PR #98 review, its merge, the correction apply or migration-apply authorization are pending; earlier dated entries remain historical.


Status: **Staging v67 was applied once under the reviewed plan: history is 67/67, strict post_apply is 16/16, and no history repair occurred.** The exact one-file staging list and its stop delimiter below remain the reviewed record and must not be replayed. New forward-only `20260910184840_reconcile_canonical_trigger_acl_prerequisite.sql` is pending as the 68th repository version; it must be applied through the separate reviewed staging `--include-all` procedure below. The bounded hosted fixture/RPC acceptance passed 21/21 with rollback/restoration proved; owner staging verification remains open. Production remains paused and untouched by this database work.

Repository target: **68 migration versions / 17 policies**. The immutable classification source is `supabase/migration-baseline-manifest.json`; the machine-enforced read-only proof entry point is `supabase/verify/verify-production-baseline-catalog.mjs`, backed by `supabase/verify/production-baseline-catalog.sql`.

> **Epic 23 stays on hold.** Leaked-password protection, CAPTCHA, MFA/session changes, and other Auth/dashboard settings are not part of this runbook.

> **Authorization record.** Running catalog reads is safe only with the correct linked project. On 2026-09-10 the owner explicitly authorized all required future migration applies; this includes reviewed staging and production forward migrations once their prerequisites pass. Record that standing authorization against each exact environment, candidate, ordered file set and SQL hashes; do not request it again merely because an apply targets production. The owner also authorized merging reviewed PRs into staging after the exact-head checks and review pass. History repair, fixture/data-cleanup writes outside reviewed migrations, workflow dispatch, backup, hosted settings, deployment, main merges and reopening retain their separate gates below. Documentation itself grants no authorization.

## Historical pre-correction reconciliation decision — 2026-09-10

PR #97 was reviewed and owner-authorized, then merged into staging at `4aa2143dc42b4bc82a8ca7fa6efd7a95e9bde3be`; its tree exactly matched reviewed head `5ec0deb81d921923330ddecc93fcb3b1e57d8ec9`. Main remains `822350986f4c023948a7bbf490ddffc371185c4a`. The separately authorized repair of `20250113000000` succeeded, followed by the separately authorized seven-version apply. Immediate history at 2026-09-10T11:34:43.467Z showed **65/65 with zero pending or remote-only versions**. Those completed operations must not be repeated.

Post-apply validation stopped on one catalog group and two new performance warnings. Read-only diagnosis proved that only the extra explicit `service_role` EXECUTE grant on `get_user_role()` differs in the function/outbox group; all three function bodies and attributes and all eight outbox predicates match. The two `auth_rls_initplan` warnings identify `column_config` and `employee_column_changes`. Repayment aggregates and all four permission hashes remain unchanged. Hosted direct-role/RPC acceptance has not yet run.

The proposed forward correction `20260910115024` revokes that extra function grant and changes only the two policies' caller identity expressions to `(SELECT auth.uid())`. The new candidate has **66 versions**, with **no staging repair and one staging apply**. Production remains provisionally **57 proven repairs plus nine applies**, subject to a fresh production-specific inventory. Full local verification on `eceaee7fa423c87aa9e6e235a70e7bb4eceb746d` passes: Vitest 3,451 with zero skips; exact Playwright 163 passed / 47 individually classified skips / zero failures or errors, both exit 0. The complete 66-migration fixture passes 15/15 checks. See [exact timings, hashes, scope and retained failed attempts](evidence/post-apply-staging-reconciliation-2026-09-10.md). Those results cover the pre-review implementation. PR #98 fixes in 2c8f0066bb4eda847f2ed6ae294a56dd87125652 now require table RLS enabled and reject EXECUTE grant options. The strengthened verifier passes the clean 66-migration chain (15/15), focused regressions (83/83), full Vitest (3,451, zero skips), required PostgREST check, TypeScript, and zero-error lint; repeat Reviewbot is clean. Exact full Playwright also passes on 2c8f006: 163 passed / 47 individually classified skips / zero failures or errors, exit 0; all skip identities match PR #96. Both Vercel checks and GitHub CI passed on 2c8f006. A later test-only saved-filter selector/initial-focus correction passed full Vitest again on 269e3d5634c68e1bc502839678247833e1cccc54: 3,451 tests, zero skips/failures, exit 0; TypeScript and full lint also pass (zero errors / 296 warnings). The exact full Playwright and clean migration-chain results retain their 2c8f006 scope: application, migration, verifier and Playwright sources are unchanged. The final documentation head still requires its own CI/Vercel/Reviewbot evidence before merge approval; after the reviewed merge, fresh read-only proof and separate approval are required before this correction can run hosted. Story 22.15 stays in-progress and Epic 23 stays on hold.

**Production pause is independent of database readiness.** The committed `src/maintenance/production-pause-lock.json` is paused. Root `vercel.json` contains no cron schedules and skips production Git builds; the active Next configuration independently refuses production application builds. Preview/staging application builds remain usable. The separate portable static artifact serves page routes and returns 503 for APIs and mutation methods, with no functions or crons. Do not restore application traffic or jobs at database close-out. See [pause safeguards](29_production_pause_release_safeguards.md). A future staging-to-main merge must preserve this lock; production deployment, promotion, rollback, prebuilt upload, settings changes, and reopening each retain explicit owner gates. Production-targeted uploads can affect default aliases and cron definitions even with automatic custom-domain assignment disabled.

## Historical PR #95 Playwright gate — 2026-09-09

Exact full npx playwright test passed on 3b75d5e78829426edfddce3207d4c16fb767aff1 on 2026-09-09: 163 passed / 47 skipped / 0 failed / 0 errors, exit 0, report duration 1,049.606579 seconds (17.5 minutes). Guard CloseActor and List verified cleanup with zero unresolved owned resources. No hosted Supabase action occurred. Story 22.15 remains in-progress; Epic 23 remains on hold. [Dated result and all 47 skipped cases](evidence/production-readiness-pr95-playwright-2026-09-09.md); report duration 1,049.606579 seconds (17.5 minutes). The user-owned local stack was left running; guard cleanup covers the agent-owned Playwright process tree. PR #95 subsequently passed its exact-head checks and final review and was owner-authorized and merged at the SHA recorded above. These tests are historical; this reconciliation change requires fresh verification and review. No staging-to-main merge or hosted write is authorized.

## Local pre-flight status — 2026-09-01 (historical)

The local remediation gate is complete but is not hosted proof: clean reset through all 63 migrations plus seed; Story 22.15 live database 11/11; Story 22.14 PostgREST 1/1; live export 5/5; full Vitest 317/317 files and 3,342/3,342 tests with zero skips; full Playwright 163 passed / 47 classified skips / 0 failed; type-check, zero-error lint, Next `16.3.3` production build, dependency threshold, and the candidate-wide diff check passed under one path-scoped immutable-migration whitespace exception. The restored `20250113000000` migration retains seven historical trailing-space lines and one blank EOF and is SHA-256 pinned; all other paths retain normal whitespace enforcement. The 47 E2E skips are recorded in `evidence/production-readiness-local-gates-2026-09-01.md`; 9 require explicit notification-capture authorization and 38 are obsolete/superseded or deterministic-fixture coverage debt. No skip is treated as passing.

This result does not satisfy the immutable-SHA, remote-review, staging, production backup, history-repair, apply, isolation, deployment, smoke, or restoration gates below.

## Non-negotiable sequence

For each environment, do not reorder:

1. Check out one reviewed immutable commit and record its full SHA.
2. Select one reviewed database connection mode, fail closed unless `SUPABASE_DB_URL`, the Supabase CLI link, and the separately approved private binding inputs all resolve to the same project, then capture a fresh read-only migration/advisor/catalog inventory.
3. Run the read-only catalog-verifier wrapper with the exact environment phase below. It exits nonzero unless every catalog result passes; compare the successful result with the manifest classification.
4. Stop on any mismatch. Add an approved forward reconciliation migration; never edit/replay represented historical SQL.
5. For production only, complete the separately authorized fresh backup and restore verification, then obtain the separate traffic-isolation and hosted-setting authorizations and prove the isolation gate below before any history-repair write. Keep isolation active across every repair, forward migration and database post-apply verification. Retain the production pause and run application smoke against staging. Any later production application deployment requires its own reviewed isolation design and explicit deployment authorization.
6. If the manifest has a nonempty environment repair list, obtain explicit owner authorization for that exact **history-repair** list. Current staging has an empty list: skip repair steps 6–7 entirely. This is a hosted write and is a separate decision from forward migration apply.
7. Re-run the target-binding check, repair only the explicit environment list below, and immediately reconcile `migration list`. Stop on the first repair failure; never continue to push from a partial baseline.
8. Re-run the target-binding check, run `db push --reviewed-target --dry-run --skip-vault` through the reviewed CLI wrapper, and compare the exact ordered output with the explicit apply list. `--reviewed-target` is consumed by the wrapper and is never passed to the Supabase CLI.
9. Record the standing 2026-09-10 owner migration-apply authorization against the exact environment, reviewed immutable SHA, ordered pending versions and SQL hashes. Verify every preceding prerequisite; the authorization does not permit history repair, other hosted writes or application reopening. Ask again only if the owner revokes or narrows that authorization, or the action falls outside migration apply.
10. Re-run the target-binding check, apply the exact list, verify migration history/policies/grants/direct-role behavior/advisors, and capture redacted evidence.
11. For production only, preserve the existing static pause while validating the database candidate. Application smoke runs against staging; any production operator-only application deployment needs a separately reviewed isolation design and explicit deployment approval. The committed lock currently refuses production application builds. Database completion never authorizes replacement of the pause.

Never run `supabase db push` before the approved history baseline. Never use a wildcard migration-repair loop. Never repair a net-new migration as applied.

## Shared pre-flight and catalog proof

- Use the reviewed Supabase CLI version **`2.115.0`** for rehearsal and cutover. Record its private absolute path and SHA-256 in the approved tooling record; supply them privately as `SUPABASE_CLI_EXECUTABLE` and `EXPECTED_SUPABASE_CLI_SHA256`. Every CLI read, repair, dry run, apply, advisor query, and immediate history reconciliation must go through `node supabase/verify/run-reviewed-supabase-cli.mjs`. Remote database commands require the wrapper-only `--reviewed-target` marker. History repair additionally requires the exact wrapper-only `--reviewed-environment staging|production` assertion printed below. The wrapper resolves and hashes the executable, checks the exact reviewed version, rejects every leading root option before command classification, accepts only the exact database argument shapes printed in this runbook, and permits a repair version only when it belongs to that environment's `repair-after-catalog-proof` set in `supabase/migration-baseline-manifest.json`. It then repeats target and CA verification, rejects native `--linked`/`--db-url`/`--local`/`--proxy`/`--password`/`-p` selectors (including attached short-password values), removes ambient PostgreSQL connection/TLS variables, and spawns the same resolved executable with a generic passwordless `--db-url` plus only the validated host, port, database, user, password, `verify-full`, and reviewed CA in its minimal child environment. Only the standalone `--version` probe and exact `db push --help` discovery command are approved option-bearing exceptions outside a reviewed database call. Both wrapper-only markers are removed before spawn. This disables CLI 2.115.0's independent linked-target selection and pooler fallback without putting the private URL, reference, hostname, or password in process arguments. Abort on any path, hash, version, target, CA, command-shape, manifest, or environment mismatch; a CLI upgrade is a separate reviewed change.
- Use one reviewed `psql` executable for catalog proof. Record its exact `psql --version` output and SHA-256 in the private tooling record; supply the absolute resolved path, exact version, and approved digest privately as `PSQL_EXECUTABLE`, `EXPECTED_PSQL_VERSION`, and `EXPECTED_PSQL_SHA256`. A bare command resolved from `PATH`, a relative path, hash mismatch, or version mismatch fails before the database password is passed to a process.
- Download the intended project's server root certificate from its Supabase Dashboard SSL Configuration/Connect panel as documented in [Postgres SSL Enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement), then have it reviewed into the cutover tooling record. Record its provenance and SHA-256 privately; supply its absolute path and approved digest as `SUPABASE_SSL_ROOT_CERT` and `EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256`. Do not commit the certificate, environment-specific path, or project details. The wrapper removes ambient libpq connection/TLS overrides and supplies only this validated root with `sslmode=verify-full`.
- Obtain the intended staging or production project reference from the approved environment record and supply it privately as `EXPECTED_SUPABASE_PROJECT_REF`; do not commit it or place its value in a recorded command. The same approved private target record must supply its non-secret classification as `EXPECTED_SUPABASE_ENVIRONMENT=staging|production`; the wrapper requires the history-repair command's `--reviewed-environment` value to match it before consulting the manifest. Select exactly one explicit `SUPABASE_DB_CONNECTION_MODE`: `direct` or `session-pooler`. Omission, any other value, or a URL from the other mode fails closed.
- `direct` mode remains preferred when the operator network can reach IPv6 or the project has the separately approved IPv4 add-on. Use only `db.<project-ref>.supabase.co:5432/postgres?sslmode=verify-full`, username `postgres`, and no `EXPECTED_SUPABASE_POOLER_HOST`. Link through the reviewed CLI wrapper with `--skip-pooler`.
- `session-pooler` mode is the approved IPv4-only fallback. Copy the project's **Session pooler** hostname from its private Dashboard **Connect -> Session pooler** record, review and record it privately, and supply it as `EXPECTED_SUPABASE_POOLER_HOST`. Use only the Shared Supavisor hostname form `aws-<region>.pooler.supabase.com`, port `5432`, database `postgres`, username `postgres.<project-ref>`, and exactly `sslmode=verify-full`. Link through the reviewed CLI wrapper without `--skip-pooler`, which is the pinned CLI `2.115.0` pooler path. Port `6543` is transaction pooling and is never permitted for catalog proof, migration reads, repair, dry run, or apply. Do not infer or hand-type the hostname from a remembered region.
- Run `node supabase/verify/verify-target-binding.mjs` before the first read and again immediately before every repair, dry run, or apply. In either mode it requires `supabase/.temp/project-ref` and the separately supplied intended reference to match. Direct mode additionally binds the project reference embedded in the hostname. Session-pooler mode additionally binds the project reference embedded in the username and requires the URL hostname to equal the separately approved exact pooler hostname. It reports only verified/failure and never prints the URL, reference, hostname, or password. A missing expected input, `sslmode=require`, port `6543`, and custom/mixed/ambiguous URLs fail closed.
- Supabase's current connection guidance identifies direct connections as IPv6 by default and Shared Supavisor session mode on port `5432` as the persistent-client alternative for IPv4-only networks. The pinned CLI's reviewed `link --help` exposes `--skip-pooler` as the direct-connection override. Any future CLI version, hostname family, username convention, or pooler-mode change requires a separate reviewed runbook/tooling amendment; do not relax the patterns at runtime.
- Do not overlap the 02:00 UTC nightly backup/refresh workflow.
- Require Story 22.14 focused reminder/PostgREST evidence, full Vitest/Playwright, type-check, zero-error lint, build, dependency audit, and Story 22.15 manifest/static tests from the immutable commit. No real recipient delivery is permitted in local/staging verification.
- Every skipped test must identify the missing environment or authorization; a generic skip is not accepted.
- Run:

```bash
set -euo pipefail
test -n "${SUPABASE_CLI_EXECUTABLE:-}"
test -n "${EXPECTED_SUPABASE_CLI_SHA256:-}"
test "$(node supabase/verify/run-reviewed-supabase-cli.mjs --version | head -n 1)" = "2.115.0"
node supabase/verify/run-reviewed-supabase-cli.mjs db push --help | grep -- '--skip-vault'
test -n "${EXPECTED_SUPABASE_PROJECT_REF:-}"
case "${EXPECTED_SUPABASE_ENVIRONMENT:-}" in
  staging|production) ;;
  *) exit 1 ;;
esac
case "${SUPABASE_DB_CONNECTION_MODE:-}" in
  direct)
    test -z "${EXPECTED_SUPABASE_POOLER_HOST:-}"
    ;;
  session-pooler)
    test -n "${EXPECTED_SUPABASE_POOLER_HOST:-}"
    ;;
  *)
    exit 1
    ;;
esac
test -n "${PSQL_EXECUTABLE:-}"
test -n "${EXPECTED_PSQL_VERSION:-}"
test -n "${EXPECTED_PSQL_SHA256:-}"
test -n "${SUPABASE_SSL_ROOT_CERT:-}"
test -n "${EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256:-}"
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs migration list --reviewed-target
node supabase/verify/run-reviewed-supabase-cli.mjs db advisors --reviewed-target --type security
node supabase/verify/run-reviewed-supabase-cli.mjs db advisors --reviewed-target --type performance
```

Run the catalog wrapper with the exact phase command in section A or B. Omission or an unknown phase fails closed. The catalog wrapper first repeats the mode-aware target-binding check; resolves and hashes the approved absolute `psql`; compares its exact version; hashes and validates the explicit CA PEM; and rejects every backslash byte in the verifier source before opening a database connection. The verifier uses POSIX bracket expressions and dot character classes, so it requires no legitimate backslashes and cannot hide a `psql` meta-command inside SQL lexical edge cases. The wrapper then invokes that exact executable with `verify-full` hostname/CA validation without putting the database URL, project reference, approved pooler hostname, or password in its command line. It exits nonzero with failed check names only unless every expected result passes. The SQL verifier itself starts `BEGIN TRANSACTION READ ONLY`, so PostgreSQL rejects a persistent SQL write even if one is accidentally introduced into the file. Do not invoke the SQL file directly as a release gate. The separate reviewed Supabase CLI wrapper repeats the same target and CA checks and binds the CLI's actual database connection through `--reviewed-target`; never replace it with a bare `supabase` command or native target selector. Do not prepend persistent/root flags such as `--debug`, `--profile`, or `--workdir`, and do not append them to a reviewed database command: the wrapper deliberately rejects both forms rather than emulating Cobra's global-option parser.

Every catalog-verifier row must return `passed = true`. The automated verifier is a necessary fail-fast check for the known unsafe-replay surfaces; it is **not sufficient by itself** to approve all 56 production history repairs. Before the first production repair, prepare a 56-row proof ledger copied from the manifest. For every version, record the migration-defined objects/data effects, the fresh read-only catalog query or inventory evidence proving them materially present, result, reviewer, and timestamp. The technical owner must sign the complete ledger before any repair command runs. An unproved row halts the whole repair batch.

The verifier correlates one complete phase profile at a time and rejects mixed states or extra policies. `production_pre_apply` expects the dated dashboard-era staffing aliases and three owner-filter policies (read/insert/delete; update missing). `staging_pre_apply` expects the post-`20260614000000` canonical four-policy filter state and pre-July function contracts. `post_apply` requires the active-role filter predicates, active-only role function, exact restricted cleanup outbox, and final function grants/contracts. The two historical pre-apply phases also require the unconditional Story 22.15 outbox and its functions to be absent, preventing an unsafe replay collision. `staging_reconciliation_pre_apply` instead requires the full 65-version final object state, all 17 exact public policies with the two documented direct caller identity expressions, and exactly anon/authenticated/service_role function grants. It accepts neither a partially corrected profile nor unknown extras. `post_apply` requires the two initplan expressions and exactly anon/authenticated grants. Because the dated production evidence does not preserve every exact policy expression, the fresh production proof must also capture a redacted, hash-backed policy inventory reviewed against this profile before history repair.

Preserve redacted before/after evidence for repayment Boolean values and permission JSON without exposing employee data:

```sql
SELECT
  count(*) FILTER (WHERE repayment_needed_omc IS TRUE) AS omc_true,
  count(*) FILTER (WHERE repayment_needed_omc IS FALSE) AS omc_false,
  count(*) FILTER (WHERE repayment_needed_omc IS NULL) AS omc_null,
  count(*) FILTER (WHERE repayment_needed_pe3 IS TRUE) AS pe3_true,
  count(*) FILTER (WHERE repayment_needed_pe3 IS FALSE) AS pe3_false,
  count(*) FILTER (WHERE repayment_needed_pe3 IS NULL) AS pe3_null
FROM public.employees;

SELECT db_column_name, md5(role_permissions::text) AS permission_hash
FROM public.column_config
WHERE db_column_name IN (
  'repayment_needed_omc', 'repayment_needed_pe3',
  'special_diet', 'diet_details'
)
ORDER BY db_column_name;
```

The counts/hashes must be identical before and after staging repair/apply. The forward reconciliation adds only admin_limited view=true/edit=false to dietary permissions on clean databases that lack it; fresh production inventory must explicitly review that expected hash delta before executing production apply under the standing migration authorization. No other permission delta or repayment change is allowed. History repair itself must never change them.

## Staging v67 execution receipt — 2026-09-12

This current staging procedure was executed once from reviewed PR #100 head `0150d55b4aa359b19149fd6c288242809e14901b`, merged as `ad9650ccfc8be412447a03847cc7ddfb372f8666` with an identical tree and no unexpected intervening staging/main commits. After the reviewed pre-flight proved 67 repository / 66 hosted versions, repair `[]`, the exact one-file dry run, 16/16 catalog, unchanged repayment and permission-hash baselines, and scoped advisors (security 0 WARN-or-higher; performance three classified `multiple_permissive_policies` WARN), the standing authorization applied `20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql` at `2026-09-12T11:50:57.715Z`. No history repair occurred. Immediate history was 67/67 at `2026-09-12T11:51:04.657Z`; the strict post-apply catalog passed 16/16, audit preservation was verified (353 rows, 90 nonnull actors, zero unmapped, unchanged canonical-history hash `084def93b0dfd29df9076e2d007116ff`), and repayment/all-four-permission-hash baselines were unchanged. This receipt records a completed staging action; it is not authorization or instruction to replay the list. The owner subsequently approved the bounded hosted fixture/RPC acceptance, which passed 21/21 in 23.4699465s, exit 0. Independent new connections proved fixtures absent, staffing and aggregates restored, and final catalog 16/16. Owner staging verification remains a separate gate. See [the completed acceptance receipt](evidence/trigger-reconciliation-preparation-2026-09-10.md#hosted-staging-acceptance--2026-09-12). Production remains paused.
## A. Staging — completed correction procedure (do not repeat)

### Completed history (do not repeat)

On 2026-06-14 Story 22.10 recorded 57 history rows through `20260614000000` and 19 policies. On 2026-09-10 the owner separately authorized the single `20250113000000` history repair and then the seven pending forward versions through `20260910094517`. Both operations succeeded; history reached 65/65. See the dated evidence records for their exact approvals, commands, hashes, and timestamps. The historical `staging_pre_apply` profile is retained only for prior-state fixture evidence. It is not the current release gate.

### Completed trigger-reconciliation procedure — do not repeat

The completed 66/66 correction is historical. The forward-only `20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql` was applied once on staging at `2026-09-12T11:50:57.715Z` without row cleanup or history repair. The historical approval record retained staging repair `[]` and its one-file execute plan as the represented-baseline record; the current manifest separately contains the pending v68 staging plan below. The retained dry-run list below documents exactly what was executed and must never be replayed. Its completed historical dry run listed this one apply:

1. `20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql`

```text
Historical completed pre-apply commands — do not execute on reconciled staging:
node supabase/verify/verify-production-baseline-catalog.mjs staging_trigger_reconciliation_pre_apply
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs db push --reviewed-target --dry-run --skip-vault
```

That historical result is retained as evidence only; do not execute or replay it.

The local gates on `12e526ff36922a1ff41277bc7cb1ef2f81a2321d` covered the representative fixture, clean chain/canonical reapply, full Vitest and exact Playwright. Reviewed PR #100 then merged to staging `ad9650ccfc8be412447a03847cc7ddfb372f8666`. Its fresh pre-flight established 67 repository / 66 hosted versions, all 16 pre-apply checks, the exact one-file dry run, unchanged audit/repayment/permission baselines and scoped advisor counts. The single authorized v67 apply and immediate 67/67 history verification completed successfully; no history repair or cleanup occurred. Exact times, SQL/manifest hashes, results and authorization are retained in the [completed execution receipt](evidence/trigger-reconciliation-preparation-2026-09-10.md#staging-v67-execution-receipt--2026-09-12).

**Historical staging v67 verification record.** At the completed v67 release point, read-only verification captured 67/67 history with no pending or remote-only version, scoped advisors, strict `post_apply` catalog (16/16), repayment/permission comparisons, and canonical audit drift checks. The old pre-apply/dry-run/apply sequence is complete and must not be repeated. The separately approved fixture/RPC acceptance also passed once, 21/21, with independent fixture absence and staffing/aggregate restoration; do not re-execute it. The current staging state remains 67/67 but has pending v68 in the 68-version repository target, so use the next procedure. Owner staging verification and the separate production prerequisites remain open. Keep the production pause intact.

### Pending canonical trigger ACL prerequisite — 2026-09-15

The clean isolated Supabase baseline reached canonical trigger bodies, owners, bindings, and audit state, but carried the documented platform-default explicit ACL extension: `update_updated_at_column()` had `PUBLIC`, `anon`, `authenticated`, and `service_role`; `track_employee_column_changes()` had `service_role`. Immutable `20260910184841` rejects that clean baseline while current staging v67 already has the strict canonical ACL. New forward-only `20260910184840_reconcile_canonical_trigger_acl_prerequisite.sql` is deliberately ordered immediately before immutable v67. It recognizes only the full documented platform profile, preserves the historical no-timestamp representation for v67, and is a no-op on current strict staging. See [redacted cause and provenance](evidence/canonical-trigger-acl-prerequisite-2026-09-15.md).

Current staging remains **67/67**. Do not infer 68/68 or replay v67. After the exact final PR head is reviewed and merged to staging, first capture the existing strict `post_apply` 16/16 proof and migration history. The dry run must list exactly this one apply:

1. `20260910184840_reconcile_canonical_trigger_acl_prerequisite.sql`

Obtain that dry run with:

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/verify-production-baseline-catalog.mjs post_apply
node supabase/verify/run-reviewed-supabase-cli.mjs db push --reviewed-target --reviewed-environment staging --dry-run --include-all --skip-vault
```

Stop unless the dry run is exactly the single migration listed above.

The ordered output must be exact. `--include-all` is required because the new prerequisite sorts before staging's already-recorded v67. The reviewed wrapper must accept only this staging command shape. Record the standing migration-apply authorization against the exact merged SHA, this single ordered file, and its SQL hash; no history repair, cleanup, deployment, setting change, or reopening is included.

Immediately before apply, re-bind the target and run:

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs db push --reviewed-target --reviewed-environment staging --include-all --skip-vault
node supabase/verify/run-reviewed-supabase-cli.mjs migration list --reviewed-target
node supabase/verify/verify-production-baseline-catalog.mjs post_apply
```

Expected result: 68/68 history, no pending or remote-only version, the unchanged strict 16/16 catalog, and no data or pause-state change. Capture fresh advisor and preservation evidence before requesting the already-required owner staging verification. Any mismatch stops; do not use history repair or an unversioned ACL command.

### Historical correction plan and reusable proof procedure

The following procedure was completed on 2026-09-10; its one-version manifest plan describes that reconciliation baseline, not a currently pending migration. That completed 66-version correction used post_apply validation. Do not rerun its pre-apply phase or apply; use only the current read-only staging verification above. Historical procedure: after the correction PR is reviewed and separately authorized for merge, fetch staging/main, inspect intervening commits, and create a clean isolated checkout at the resulting staging SHA. Reverify reviewed tooling, CLI 2.115.0, certificate integrity, and three-way target binding. Capture fresh migration history: exactly 65 recorded repository versions, no remote-only versions, no repair candidates, and only `20260910115024` pending against the 66-version manifest. The CLI wrapper must reject every staging repair request because that allowlist is empty.

Historical pre-apply proof used before the completed correction:

```bash
node supabase/verify/verify-production-baseline-catalog.mjs staging_reconciliation_pre_apply
```

Require every row to pass. This phase retains the strict canonical saved-filter, room ACL, repayment default, dietary permission, outbox and function body contracts. Its only exceptions are the exact three-grantee role-function ACL and the two exact unreconciled policy expressions. No mixed profile, unknown grant, unexpected policy, or incomplete object proof is accepted. Capture repayment aggregates, saved-filter prerequisite counts, and all four permission hashes before apply; no cleanup is proposed or authorized.

Pre-apply advisors must freshly reproduce security 0 WARN-or-higher and performance 5 WARN: three `multiple_permissive_policies` plus the two `auth_rls_initplan` findings on the documented tables. Stop on any other delta. The pinned CLI excludes INFO severity and certain Management API checks; record those coverage limits rather than asserting broad zero counts. Post-apply must remove both initplan warnings and retain the three classified permissive-policy warnings.

Historical dry run requirement (already completed; do not execute): it listed exactly this one apply:

1. `20260910115024_reconcile_post_apply_acl_and_policy_initplans.sql`

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs db push --reviewed-target --dry-run --skip-vault
```

Stop unless the dry run is exactly the list above. Obtain a separate explicit owner approval naming the reviewed merged SHA, this single version and its SQL hash, environment, and intended grant/policy changes. Earlier repair/apply approvals do not authorize this correction. Then re-bind immediately before the write:

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs db push --reviewed-target --skip-vault
node supabase/verify/run-reviewed-supabase-cli.mjs migration list --reviewed-target
```

Expected end state: 66 local↔remote versions in sync, zero pending/remote-only versions, and 17 exact policies. Any apply failure or mismatch stops further actions; do not retry or manipulate history.

### Staging verification

- Re-run both advisor types, then run `node supabase/verify/verify-production-baseline-catalog.mjs post_apply`; it must exit `0`.
- Verify `get_user_role()` returns `NULL` for an inactive JWT and the active caller's role for an active JWT.
- Verify inactive HR/external JWTs cannot read role-gated employee/staffing/audit data, call role-gated RPCs, or CRUD `user_filters`.
- Verify the documented exceptions only: own `users` metadata and intentional public reads of `column_config` / `important_dates`.
- Verify `delete_app_user(uuid)` is executable only by `authenticated`, is caller-bound, preserves the final active HR Admin, and rolls back fully on a foreign-key failure.
- Verify `set_user_active_status`, assigned-presentation, staffing, activity, column lifecycle, and scoped audit behavior from Story 22.13 remain green.
- Repeat the repayment aggregates and permission hashes; compare with pre-flight.
- Record redacted counts/names only. The checked-in live suites reject hosted targets, so use a separately reviewed transaction-scoped operator probe that rolls back.

Owner must explicitly verify staging before production can proceed.

## B. Production — 56 repair candidates plus twelve applies

> **Current classification, 2026-09-15.** Production has exactly `headcount_need >= 0`, with no upper-bound conjunct supplied by immutable `20260314000002_add_headcount_upper_bound.sql`; the recorded aggregate has zero out-of-range values. That historical migration must execute first and must not be repaired as applied. This is the sole documented production pre-profile amendment: every other strict catalog requirement remains in force, and the current production catalog is still a no-go for its other failures. No production history repair or apply may start until the reviewed manifest, runner, regression tests, and 56-row effect ledger agree on this order. See [the redacted classification evidence](evidence/production-history-classification-2026-09-15.md).

Do not begin until all of Epic 22 is merged to staging, the owner verifies staging, the immutable candidate is reviewed and promotion-ready, a maintenance window is approved, and a fresh production backup completes successfully immediately before the first hosted mutation. A backup taken before production day does not satisfy this gate.

### Mandatory production database-window traffic-isolation and hosted-setting gate

Migration `20260614000000` temporarily grants legacy execution privileges to `authenticated`/`service_role`; migration `20260709194903` later revokes or narrows those privileges. Because each file commits independently and the twelve-file push can stop between them, the production system must not accept non-operator traffic anywhere in that interval. The fact that seasonal users have paused activity is useful scheduling context, but it is not technical isolation.

The accountable owner must separately authorize temporary hosted traffic/setting changes and their rollback. This database window retains the existing production pause and does not include an application deployment; any later proposed deployment requires its own reviewed isolation design and explicit authorization. Before making the approved traffic/setting changes, record privately the current Supabase **Enable Data API** state, **Enable Realtime service** state, Realtime public-channel setting and configured limits, database network restrictions, production application traffic control, schedules/workers, responsible operator, rollback owner, and UTC window. Do not commit project references, IP/CIDR values, credentials, tokens, channel topics, or client identifiers.

The twelve forward migrations create or change columns, policies, grants, functions, or rows associated with these affected tables: `public.column_config`, `public.employee_column_changes`, `public.employees`, `public.important_dates`, `public.staffing_needs`, `public.staffing_needs_changelog`, `public.user_filters`, `public.users`, and the new `public.app_user_auth_cleanup_outbox`. Before isolation, capture and hash the complete read-only publication result below. Also record privately, with a UTC timestamp, the Realtime **Connected Clients**, **Rate of Channel Joins**, and **Postgres Changes Events** report values; the current service-enabled state; and every known application or external consumer. Repository clients currently subscribe to Postgres Changes on `employees` and `important_dates`, but repository inspection is not proof that no other hosted client exists.

```sql
WITH affected(schema_name, table_name) AS (
  VALUES
    ('public'::text, 'app_user_auth_cleanup_outbox'::text),
    ('public'::text, 'column_config'::text),
    ('public'::text, 'employee_column_changes'::text),
    ('public'::text, 'employees'::text),
    ('public'::text, 'important_dates'::text),
    ('public'::text, 'staffing_needs'::text),
    ('public'::text, 'staffing_needs_changelog'::text),
    ('public'::text, 'user_filters'::text),
    ('public'::text, 'users'::text)
), membership AS (
  SELECT schemaname AS schema_name, tablename AS table_name
  FROM pg_catalog.pg_publication_tables
  WHERE pubname = 'supabase_realtime'
)
SELECT
  affected.schema_name,
  affected.table_name,
  (membership.table_name IS NOT NULL) AS published_to_supabase_realtime
FROM affected
LEFT JOIN membership USING (schema_name, table_name)
ORDER BY affected.schema_name, affected.table_name;

SELECT pubname, puballtables, pubinsert, pubupdate, pubdelete, pubtruncate
FROM pg_catalog.pg_publication
WHERE pubname = 'supabase_realtime';
```

Record the current Realtime client count even when it is zero. If the prior Realtime service state is enabled, establish one bounded representative non-operator Postgres Changes probe before isolation so the operator can prove that an existing connection is disconnected. Use only an approved test identity and a currently published affected table; never log its JWT, project URL/reference, row payloads, or personal data. If no affected table is published, record that exact catalog result and use a metadata-only channel probe. If the prior service state is disabled, do not enable it for the test; instead record a bounded disabled-tenant rejection before any other isolation change. The catalog result does not replace the service isolation below because Broadcast, Presence, unknown clients, and reconnecting WebSockets are separate Realtime paths.

Under the approved window, perform and prove all of the following before the first production history-repair write:

1. Prevent all non-operator HTTP traffic from reaching the production application using an approved hosting/provider control while retaining the existing static production pause. Run application smoke only against the exact staging candidate; this database sequence does not authorize a production bypass or application deployment. Suspend production cron jobs, workflow dispatches, background workers, backup/refresh jobs, and other application or Realtime consumers for the window; do not overlap the 02:00 UTC workflow.
2. Using the separately owner-approved rollback plan, disable **Enable Realtime service** in the project's [Realtime Settings](https://supabase.com/docs/guides/realtime/settings). This temporary setting change disconnects existing clients, rejects new or reconnecting clients with HTTP `403` / `RealtimeDisabledForTenant`, and releases Realtime's database connections and replication slot. If the recorded prior state was already disabled, preserve it and prove the rejection without toggling it. Do not change public-channel or capacity settings as a substitute. Vercel/application ingress blocking and Data API disablement do not close existing Realtime WebSockets or stop direct reconnects to the Realtime endpoint.
3. Disable the Supabase Data API using the project setting documented in [Securing your API](https://supabase.com/docs/guides/api/securing-your-api). This blocks the database REST/GraphQL endpoints; it must not be represented as blocking Auth, Storage, or Realtime.
4. Restrict direct PostgreSQL and pooler ingress to the operator's approved egress addresses using [Network Restrictions](https://supabase.com/docs/guides/platform/network-restrictions). Supabase network restrictions do not cover HTTPS APIs, which is why the Data API, Realtime, and application/client controls are separate mandatory gates.
5. From a non-operator probe, demonstrate that the production application is unavailable, database REST/GraphQL calls fail, and direct PostgreSQL/pooler access is blocked. When Realtime was previously enabled, prove that the representative Realtime connection established before isolation is disconnected; in either prior state, prove that a fresh WebSocket/subscription reconnect is rejected with the disabled-tenant outcome and confirm the Connected Clients report reaches zero within the approved bounded drain interval. From the operator path, repeat the mode-aware target binding and demonstrate that the selected approved database connection still works. Record only redacted outcomes, counts, timestamps, and hashes.

If isolation cannot be proven, the production cutover is NO-GO. Use this exact production-day order: **fresh production backup -> publication/connection inventory -> technical traffic and Realtime isolation -> history repair and immediate reconciliation -> exact twelve-version include-all dry run -> twelve-file database apply -> post-apply catalog/grant/direct-role/advisor/data verification -> retain the existing production pause -> restore only separately authorized prior Data API state -> bounded direct-role/database verification and staging application smoke -> restore only separately authorized database/Realtime controls while retaining the production pause and job shutdown -> verify restored publication, connection, access, and monitoring state**. Keep both the Data API and Realtime service disabled through every migration and all database post-apply verification. Do not merge/deploy early merely because the database step has begun. If the push or any database verification fails, remain fully isolated and follow the failure procedure; restoration or continuation is an explicit owner decision based on the observed state.

After final grants, RLS, direct-role behavior, and the complete database end state are verified, repeat the affected-table publication inventory and review every delta before enabling any client path. Retain the existing static pause. Application smoke runs against the exact staging candidate. Restoring Data API or Realtime can expose direct clients despite the page pause, so restore only the specifically approved prior state after final authorization tests; keep disabled settings disabled unless separately authorized. A later production operator-only application deployment requires its own reviewed isolation design and explicit approval; it is not part of this database completion sequence.

After smoke passes, restore only the separately approved prior **Enable Realtime service** state, public-channel setting, limits, and network restrictions under the rollback plan. Retain the production static pause, empty application cron definitions, and suspended application workers/consumers; a successful database rollout never authorizes reopening. If the paused artifact is deployed, application smoke is staged separately and does not require replacing the public pause. Re-run and hash the complete publication queries above: membership for every pre-existing affected table must equal its recorded prior state, the new cleanup outbox state must match the reviewed post-apply decision, and every other delta stops restoration. If Realtime was previously enabled, prove a fresh operator connection and the expected authorized subscription behavior for each repository-used affected table that was previously published, then run one representative non-operator reconnect/authorization probe against the final RLS state. If Realtime was previously disabled, prove it remains disabled. Record the post-restore Connected Clients, channel-join, Postgres Changes, and response-error report values and compare them with the private pre-state; exact client counts need not match, but the reason for the delta must be understood. Verify intended operator access, public page pause, API/mutation 503 behavior, monitoring, and zero active application schedules. Real-user access and notification delivery remain closed pending reopening authorization. Any mismatch keeps the cutover open and requires escalation.

### Explicit repair-after-catalog-proof list

First bind the read-only database connection to the linked production project and run the production-specific pre-apply proof:

```bash
node supabase/verify/verify-production-baseline-catalog.mjs production_pre_apply
```

Only after every verifier row passes, the fresh production inventory proves every listed version is materially represented, the complete 56-row ledger is signed, and the owner explicitly authorizes this exact **history-repair** batch may the operator run:

The 2026-06-11 restore-drill record names `staffing_needs.target_headcount`, while the repository contract is `staffing_needs.headcount_need`. Treat that as a historical evidence contradiction, not as proof of either shape. Fresh read-only observation of `headcount_need >= 0` identifies the column only; its missing upper bound is assigned to the first forward apply `20260314000002_add_headcount_upper_bound.sql` after zero out-of-range values are proved. It does not prove the remaining staffing tables, policies, grants, function contracts, seed/history effects, or any other staffing repair candidate. A `target_headcount` observation remains a stop condition requiring an approved forward reconciliation plan; do not repair staffing versions as represented without their individual signed proofs.

```bash
set -euo pipefail

readonly -a PRODUCTION_REPAIR_VERSIONS=(
  20250113000000
  20251027000000
  20251028000001
  20251028104344
  20251028144051
  20251029000000
  20251029000001
  20251029000002
  20251030000000
  20251031000000
  20251102000000
  20251102000001
  20251102000002
  20251102000003
  20251106000000
  20251106000001
  20251106000002
  20251106000003
  20251106000004
  20251106000005
  20251106000006
  20251107000000
  20251107000001
  20251107000002
  20251107000003
  20251107000004
  20251109102741
  20251109120000
  20251109130000
  20251109140000
  20251109150000
  20251109160000
  20251109200237
  20251109200300
  20251110000000
  20251122130617
  20251122150000
  20251122150001
  20251123000000
  20251209000000
  20251209110000
  20251209120000
  20251209130000
  20251210000000
  20251210000001
  20251210000002
  20251213000000
  20251216000000
  20260130212612
  20260223000000
  20260224000000
  20260313000001
  20260314000001
  20260520000000
  20260605151000
  20260607193000
)

repair_failed=0
for version in "${PRODUCTION_REPAIR_VERSIONS[@]}"; do
  node supabase/verify/verify-target-binding.mjs
  if ! node supabase/verify/run-reviewed-supabase-cli.mjs migration repair --status applied "$version" --reviewed-target --reviewed-environment production; then
    repair_failed=1
    break
  fi
done
node supabase/verify/run-reviewed-supabase-cli.mjs migration list --reviewed-target

if (( repair_failed != 0 )); then
  echo "History repair stopped; reconcile the partial remote history before any further action." >&2
  exit 1
fi
```

If even one version lacks its signed ledger proof, stop before the first repair and prepare an approved forward reconciliation plan. In particular, do not replay the historical repayment conversion, dietary permission replacement, staffing seed, or `user_filters` creation against represented state. If a repair fails mid-batch, the successful earlier history writes are not automatically rolled back: stop, preserve the exact output, reconcile the fresh migration list against the signed ledger, and obtain owner approval for an explicit continuation plan. Do not run `db push`, mark forward migrations applied, or guess at reverted history.

### Explicit production apply list

After the 56 repairs, the dry run must list exactly these twelve versions:

1. `20260314000002_add_headcount_upper_bound.sql`
2. `20260614000000_reconcile_environments_security_and_policies.sql`
3. `20260615000000_add_is_checklist_item_to_column_config.sql`
4. `20260709194903_remediate_pr_91_security_findings.sql`
5. `20260710144000_atomic_external_column_presentation.sql`
6. `20260710150000_atomic_user_status_transition.sql`
7. `20260831200026_enforce_active_authorization_and_atomic_user_deletion.sql`
8. `20260909115242_reconcile_saved_filters_and_room_acl.sql`
9. `20260910094517_reconcile_repayment_defaults.sql`
10. `20260910115024_reconcile_post_apply_acl_and_policy_initplans.sql`
11. `20260910184840_reconcile_canonical_trigger_acl_prerequisite.sql`
12. `20260910184841_reconcile_column_config_timestamp_and_audit_trigger.sql`

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs db push --reviewed-target --reviewed-environment production --dry-run --include-all --skip-vault
```

Stop unless the dry-run output is exact. `--include-all` is required because the first pending version is older than the repaired history candidates; the reviewed runner accepts only this production-specific command shape, while the operator records and verifies the exact ordered twelve-version output. If its implementation or test evidence is absent, stop—do not bypass the reviewed wrapper or mark the older version applied. Record the full immutable commit SHA, ordered twelve-version file set and SQL hashes, owner-confirmed fresh database/schema dumps, owner, maintenance window, the standing 2026-09-10 owner authorization covering this production migration apply, proven separately authorized traffic isolation and hosted-setting rollback, and the unchanged production pause. The dumps are confirmed as containing the real data; no location, content, or independent restore-test claim belongs in this record. A deployment authorization is required only if a later production deployment is separately proposed; no deployment is part of this database apply. The standing apply authorization satisfies only the migration-write gate; no repeat migration-apply approval is required, and none of the other prerequisites or authorizations is waived. Then, and only then, re-bind the target immediately before the write:

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs db push --reviewed-target --reviewed-environment production --include-all --skip-vault
node supabase/verify/run-reviewed-supabase-cli.mjs migration list --reviewed-target
```

Expected database end state before any later deployment: 68 versions in sync / 17 policies, with all 16 strict post-apply catalog checks passing. While full database isolation remains active, repeat all staging database verification, advisors, repayment aggregates, permission hashes, affected-table publication inventory, and redacted evidence capture. Run `node supabase/verify/verify-production-baseline-catalog.mjs post_apply`; it must exit `0`. Retain the existing production pause. Restore database settings only under separate explicit approval, then verify direct-role/database behavior and run application smoke against the exact staging candidate. A production application deployment is blocked by the committed pause lock and requires a later separately reviewed operator-isolation design plus explicit authorization. No deployment or reopening follows automatically from a passing database gate.

## Rollback and failure behavior

- `migration repair` records history only and requires its own explicit owner authorization. A pre-repair catalog mismatch causes a stop with no repair write. A mid-batch production repair failure can leave partial history; inventory it, stop, and obtain approval for an explicit continuation plan—never guess at rollback or proceed to push.
- Each forward migration file is transactional, but a multi-file `db push` is **not** an all-or-nothing batch: earlier files may remain committed and recorded if a later file fails. On any apply failure, stop, preserve the exact output, re-establish three-way target binding, and capture fresh migration/catalog state. Do not rerun blindly, do not repair a failed forward version as applied, and do not continue to deployment. Prepare and review an explicit forward-fix or continuation plan based on the observed partial state and repeat its prerequisites. The standing authorization covers required reviewed forward migration applies; obtain separate approval for any history repair, non-migration cleanup, setting change or other action outside that scope.
- Application authorization regressions are corrected by a new least-privilege migration, never by dashboard edits or broad re-grants.
- `delete_app_user` commits the app-row deletion and durable opaque cleanup handoff in one database transaction before external Auth cleanup. If Auth deletion or handoff completion fails, database authorization is already removed; use the exact owner retry procedure below without recreating the app role.
- A fresh production backup is mandatory even if an older local backup exists.

### Owner retry procedure for pending Auth cleanup

Preserve the original app-user ID, HTTP status, state, and every returned field from the first response. A known pending handoff includes `cleanup_id`, `cleanup_state`, and `auth_user_deleted`; a lost/timed-out/malformed initial RPC response uses `AUTH_CLEANUP_STATE_UNKNOWN`, `cleanup_id: null`, and `retry_same_user_id: true` because the atomic database transaction may or may not already have committed. After the failing dependency recovers, an active HR Admin retries the same DELETE endpoint or the same UI delete action with the **same app-user ID**. The owner/operator must never call `complete_app_user_auth_cleanup` directly and must never recreate the app-user row or role to make the retry work.

The retry must return HTTP `200` and `cleanup_state: completed`. If the first response supplied a non-null `cleanup_id`, require the same value; if the first outcome was unknown/null, the successful retry establishes the cleanup ID that must be preserved for any later evidence. Record whether the first response reported `auth_user_deleted: true`; this distinguishes a handoff-completion retry from a retry that still needed Auth deletion. Verify read-only that the app role remains absent and the Auth identity is absent. If a known cleanup ID changes, the result is not completed, either identity unexpectedly remains, or any identifier/result is inconsistent, stop and escalate for a reviewed recovery plan rather than recreating data or repeatedly retrying.

## Close-out checklist

- [ ] Immutable commit SHA recorded; local quality/audit/Story 22.14 gates green with no real-recipient delivery.
- [x] Historical staging inventory/catalog proof passed at reviewed PR #98 merge; its 15/15 post_apply result excludes the newly diagnosed trigger drift.
- [x] Owner separately authorized staging history repair; staging repaired only `20250113000000`; immediate history reconciliation passed on 2026-09-10. No further staging repair is permitted.
- [x] Historical staging seven-version dry run exact; owner separately authorized that apply and immediate history reached 65/65.
- [x] PR #98 reviewed/merged with approval; fresh pre-apply proof and exact one-version dry run passed; owner authorized required future migration applies and `20260910115024` completed successfully.
- [x] Current v67 trigger reconciliation reviewed, merged and applied under the standing authorizations at ad9650ccfc8be412447a03847cc7ddfb372f8666; staging shows 67 migrations / 17 policies and 16/16 catalog checks; scoped advisor and audit/repayment/permission-preservation evidence recorded.
- [x] Separately approved hosted staging fixture/RPC acceptance executed once on 2026-09-12 at ad9650ccfc8be412447a03847cc7ddfb372f8666: 21/21 checks passed, fixtures absent, staffing/aggregates restored and final catalog 16/16. Do not repeat the completed fixture operation.
- [ ] Owner verified staging.
- [ ] Production fresh inventory/catalog proof passed for all 56 repair candidates; the remaining strict production groups are resolved without broadening the catalog contract.
- [ ] Complete 56-row production proof ledger signed before the first history repair.
- [ ] Owner separately authorized the exact 56-version production history-repair batch; immediate history reconciliation passed without an unresolved partial baseline.
- [ ] Production-day backup succeeded; maintenance window, separate history-repair/traffic-isolation/hosted-setting/rollback approvals, and the standing migration-apply authorization bound to the exact production candidate/file hashes are recorded; prior Realtime settings, affected-table publication state, and connected-client reports captured privately.
- [ ] Production twelve-version `--include-all` dry run exact through the reviewed production-only runner; target binding rechecked immediately before apply.
- [ ] Full technical isolation proven from operator and non-operator paths, including existing-client disconnect and fresh Realtime reconnect rejection, and held through repair/apply/database post-verification; production static pause and job shutdown remain intact through separately approved database/Realtime restoration; application smoke uses staging.
- [ ] Production shows 68 migrations / 17 policies and 16/16 catalog checks; direct-role/advisor/data-preservation evidence recorded before any later separately proposed deployment.
- [ ] Existing static pause retained; exact staging candidate application smoke and production direct-role/database probes recorded. Database/Realtime restoration separately authorized and verified. Public page pause, API/mutation 503, and zero schedules reverified. Any later production deployment or reopening remains a separate owner decision.
- [ ] `R-010` / `R-020` / `R-023` closed and `story-22.10-phase-b` set to done.
- [ ] Epic 23 remains on hold; temporary Data API/Realtime/network cutover controls were restored and are not treated as Epic 23 Auth-hardening implementation.
