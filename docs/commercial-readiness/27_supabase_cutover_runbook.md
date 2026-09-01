# Epic 22 Supabase Cutover Runbook (Stories 22.10, 22.13, and 22.15)

Status: **Prepared, not executed for the Story 22.15 delta.** Story 22.10 staging reconciliation was executed and verified on 2026-06-14 at 57 history rows / 19 policies. Story 22.13 and Story 22.15 hosted changes remain owner-gated. Production remains untouched.

Repository target: **63 migration versions / 17 policies**. The immutable classification source is `supabase/migration-baseline-manifest.json`; the machine-enforced read-only proof entry point is `supabase/verify/verify-production-baseline-catalog.mjs`, backed by `supabase/verify/production-baseline-catalog.sql`.

> **Epic 23 stays on hold.** Leaked-password protection, CAPTCHA, MFA/session changes, and other Auth/dashboard settings are not part of this runbook.

> **No authorization by documentation.** Running catalog reads is safe only with the correct linked project. History repair, migration apply, workflow dispatch, backup, deployment, or any hosted write requires the environment-specific owner approval described below.

## Local pre-flight status — 2026-09-01

The local remediation gate is complete but is not hosted proof: clean reset through all 63 migrations plus seed; Story 22.15 live database 11/11; Story 22.14 PostgREST 1/1; live export 5/5; full Vitest 317/317 files and 3,342/3,342 tests with zero skips; full Playwright 163 passed / 47 classified skips / 0 failed; type-check, zero-error lint, Next `16.3.3` production build, dependency threshold, and diff checks passed. The 47 E2E skips are recorded in `evidence/production-readiness-local-gates-2026-09-01.md`; 9 require explicit notification-capture authorization and 38 are obsolete/superseded or deterministic-fixture coverage debt. No skip is treated as passing.

This result does not satisfy the immutable-SHA, remote-review, staging, production backup, history-repair, apply, isolation, deployment, smoke, or restoration gates below.

## Non-negotiable sequence

For each environment, do not reorder:

1. Check out one reviewed immutable commit and record its full SHA.
2. Fail closed unless the direct `SUPABASE_DB_URL` and the Supabase CLI link resolve to the same private project reference; capture a fresh read-only migration/advisor/catalog inventory.
3. Run the read-only catalog-verifier wrapper with the exact environment phase below. It exits nonzero unless every catalog result passes; compare the successful result with the manifest classification.
4. Stop on any mismatch. Add an approved forward reconciliation migration; never edit/replay represented historical SQL.
5. Obtain explicit owner authorization for the exact environment-specific **history-repair** list. This is a hosted write and is a separate decision from forward migration apply.
6. Re-run the target-binding check, repair only the explicit environment list below, and immediately reconcile `migration list`. Stop on the first repair failure; never continue to push from a partial baseline.
7. Re-run the target-binding check, run `db push --linked --dry-run --skip-vault` through the reviewed CLI wrapper, and compare the exact ordered output with the explicit apply list.
8. Obtain the separate environment-specific owner go-live signal for the forward migration apply.
9. For production only, obtain the separate traffic-isolation and deployment authorizations, prove the isolation gate below, and keep it active across every forward migration, post-apply verification, deployment, and smoke test.
10. Re-run the target-binding check, apply the exact list, verify migration history/policies/grants/direct-role behavior/advisors, and capture redacted evidence.
11. For production only, deploy the exact reviewed immutable candidate SHA while isolation remains active, run the bounded smoke suite, then restore and verify the exact previously recorded traffic/settings state.

Never run `supabase db push` before the approved history baseline. Never use a wildcard migration-repair loop. Never repair a net-new migration as applied.

## Shared pre-flight and catalog proof

- Use the reviewed Supabase CLI version **`2.115.0`** for rehearsal and cutover. Record its private absolute path and SHA-256 in the approved tooling record; supply them privately as `SUPABASE_CLI_EXECUTABLE` and `EXPECTED_SUPABASE_CLI_SHA256`. Every CLI read, repair, dry run, apply, advisor query, and immediate history reconciliation must go through `node supabase/verify/run-reviewed-supabase-cli.mjs`. The wrapper resolves and hashes that executable, checks the exact reviewed version immediately before spawning the same resolved path, and never falls back to a bare command from `PATH`. Abort on any path, hash, or version mismatch; a CLI upgrade is a separate reviewed change.
- Use one reviewed `psql` executable for catalog proof. Record its exact `psql --version` output and SHA-256 in the private tooling record; supply the absolute resolved path, exact version, and approved digest privately as `PSQL_EXECUTABLE`, `EXPECTED_PSQL_VERSION`, and `EXPECTED_PSQL_SHA256`. A bare command resolved from `PATH`, a relative path, hash mismatch, or version mismatch fails before the database password is passed to a process.
- Download the intended project's server root certificate from its Supabase Dashboard SSL Configuration/Connect panel as documented in [Postgres SSL Enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement), then have it reviewed into the cutover tooling record. Record its provenance and SHA-256 privately; supply its absolute path and approved digest as `SUPABASE_SSL_ROOT_CERT` and `EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256`. Do not commit the certificate, environment-specific path, or project details. The wrapper removes ambient libpq connection/TLS overrides and supplies only this validated root with `sslmode=verify-full`.
- Obtain the intended staging or production project reference from the approved environment record and supply it privately as `EXPECTED_SUPABASE_PROJECT_REF`; do not commit it or place its value in a recorded command. Run `node supabase/verify/verify-target-binding.mjs` before the first read and again immediately before every repair, dry run, or apply. It accepts only a direct `db.<project-ref>.supabase.co:5432/postgres?sslmode=verify-full` URL and requires the URL reference, `supabase/.temp/project-ref`, and the separately supplied intended reference to all match; it reports only verified/failure and never prints the URL, reference, or password. A missing expected reference, `sslmode=require`, and pooler/custom/ambiguous URLs fail closed.
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
test -n "${PSQL_EXECUTABLE:-}"
test -n "${EXPECTED_PSQL_VERSION:-}"
test -n "${EXPECTED_PSQL_SHA256:-}"
test -n "${SUPABASE_SSL_ROOT_CERT:-}"
test -n "${EXPECTED_SUPABASE_SSL_ROOT_CERT_SHA256:-}"
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs migration list --linked
node supabase/verify/run-reviewed-supabase-cli.mjs db advisors --linked --type security
node supabase/verify/run-reviewed-supabase-cli.mjs db advisors --linked --type performance
```

Run the catalog wrapper with the exact phase command in section A or B. Omission or an unknown phase fails closed. The catalog wrapper first repeats the three-way target-binding check; resolves and hashes the approved absolute `psql`; compares its exact version; hashes and validates the explicit CA PEM; and rejects every backslash byte in the verifier source before opening a database connection. The verifier uses POSIX bracket expressions and dot character classes, so it requires no legitimate backslashes and cannot hide a `psql` meta-command inside SQL lexical edge cases. The wrapper then invokes that exact executable with `verify-full` hostname/CA validation without putting the database URL or password in its command line. It exits nonzero with failed check names only unless every expected result passes. The SQL verifier itself starts `BEGIN TRANSACTION READ ONLY`, so PostgreSQL rejects a persistent SQL write even if one is accidentally introduced into the file. Do not invoke the SQL file directly as a release gate. The separate reviewed Supabase CLI wrapper performs its own absolute-path, hash, and exact-version verification immediately before every CLI subprocess; never replace it with a bare `supabase` command.

Every catalog-verifier row must return `passed = true`. The automated verifier is a necessary fail-fast check for the known unsafe-replay surfaces; it is **not sufficient by itself** to approve all 57 production history repairs. Before the first production repair, prepare a 57-row proof ledger copied from the manifest. For every version, record the migration-defined objects/data effects, the fresh read-only catalog query or inventory evidence proving them materially present, result, reviewer, and timestamp. The technical owner must sign the complete ledger before any repair command runs. An unproved row halts the whole repair batch.

The verifier correlates one complete phase profile at a time and rejects mixed states or extra policies. `production_pre_apply` expects the dated dashboard-era staffing aliases and three owner-filter policies (read/insert/delete; update missing). `staging_pre_apply` expects the post-`20260614000000` canonical four-policy filter state and pre-July function contracts. `post_apply` requires the active-role filter predicates, active-only role function, exact restricted cleanup outbox, and final function grants/contracts. The two pre-apply phases also require the unconditional Story 22.15 outbox and its functions to be absent, preventing an unsafe replay collision. Because the dated production evidence does not preserve every exact policy expression, the fresh production proof must also capture a redacted, hash-backed policy inventory reviewed against this profile before history repair.

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

The counts/hashes must be identical before and after repair/apply unless an approved forward migration explicitly changes them. History repair itself must never change them.

## A. Staging — one repair plus five applies

### Historical record (do not rewrite)

On 2026-06-14 Story 22.10 reconciled hosted staging and recorded 57 history rows through `20260614000000`; 19 policies were observed. Advisor deltas were `function_search_path_mutable` 12→0, security-definer executable anon 5→1 / authenticated 5→3, `auth_rls_initplan` 9→0, and `multiple_permissive_policies` 54→3.

### Fresh Story 22.15 plan

After the shared inventory, run the staging-specific read-only proof:

```bash
node supabase/verify/verify-production-baseline-catalog.mjs staging_pre_apply
```

Stop unless every row is `passed = true`. After the owner explicitly authorizes the exact staging **history repair** (record approver, UTC timestamp, environment, immutable commit, and version), the only permitted repair is:

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs migration repair --status applied 20250113000000 --linked
node supabase/verify/run-reviewed-supabase-cli.mjs migration list --linked
```

If the repair command fails or the immediate list does not show the expected 58 recorded versions, stop. Do not run `db push`, guess a compensating history change, or silently retry against a different link.

The dry run must list exactly these five applies, in this order:

1. `20260615000000_add_is_checklist_item_to_column_config.sql`
2. `20260709194903_remediate_pr_91_security_findings.sql`
3. `20260710144000_atomic_external_column_presentation.sql`
4. `20260710150000_atomic_user_status_transition.sql`
5. `20260831200026_enforce_active_authorization_and_atomic_user_deletion.sql`

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs db push --linked --dry-run --skip-vault
```

Stop unless the dry run is exactly the list above. Obtain and record a separate owner go-live signal for the five-version staging forward apply. Then re-bind the target immediately before the write:

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs db push --linked --skip-vault
node supabase/verify/run-reviewed-supabase-cli.mjs migration list --linked
```

Expected end state: 63 local↔remote versions in sync and 17 policies.

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

## B. Production — 57 repairs plus six applies

Do not begin until all of Epic 22 is merged to staging, the owner verifies staging, the immutable candidate is reviewed and promotion-ready, a maintenance window is approved, and a fresh production backup completes successfully immediately before the first hosted mutation. A backup taken before production day does not satisfy this gate.

### Mandatory production traffic-isolation and deployment gate

Migration `20260614000000` temporarily grants legacy execution privileges to `authenticated`/`service_role`; migration `20260709194903` later revokes or narrows those privileges. Because each file commits independently and the six-file push can stop between them, the production system must not accept non-operator traffic anywhere in that interval. The fact that seasonal users have paused activity is useful scheduling context, but it is not technical isolation.

The accountable owner must separately authorize (a) temporary hosted traffic/setting changes and their rollback and (b) the production deployment. Before making either change, record privately the current Supabase **Enable Data API** state, **Enable Realtime service** state, Realtime public-channel setting and configured limits, database network restrictions, production application traffic control, schedules/workers, responsible operator, rollback owner, and UTC window. Do not commit project references, IP/CIDR values, credentials, tokens, channel topics, or client identifiers.

The six forward migrations create or change columns, policies, grants, functions, or rows associated with these affected tables: `public.column_config`, `public.employee_column_changes`, `public.employees`, `public.important_dates`, `public.staffing_needs`, `public.staffing_needs_changelog`, `public.user_filters`, `public.users`, and the new `public.app_user_auth_cleanup_outbox`. Before isolation, capture and hash the complete read-only publication result below. Also record privately, with a UTC timestamp, the Realtime **Connected Clients**, **Rate of Channel Joins**, and **Postgres Changes Events** report values; the current service-enabled state; and every known application or external consumer. Repository clients currently subscribe to Postgres Changes on `employees` and `important_dates`, but repository inspection is not proof that no other hosted client exists.

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

1. Prevent all non-operator HTTP traffic from reaching the production application using an approved hosting/provider control, and prove an operator-only bypass that can later reach the deployed application for smoke testing. Suspend production cron jobs, workflow dispatches, background workers, backup/refresh jobs, and other application or Realtime consumers for the window; do not overlap the 02:00 UTC workflow.
2. Using the separately owner-approved rollback plan, disable **Enable Realtime service** in the project's [Realtime Settings](https://supabase.com/docs/guides/realtime/settings). This temporary setting change disconnects existing clients, rejects new or reconnecting clients with HTTP `403` / `RealtimeDisabledForTenant`, and releases Realtime's database connections and replication slot. If the recorded prior state was already disabled, preserve it and prove the rejection without toggling it. Do not change public-channel or capacity settings as a substitute. Vercel/application ingress blocking and Data API disablement do not close existing Realtime WebSockets or stop direct reconnects to the Realtime endpoint.
3. Disable the Supabase Data API using the project setting documented in [Securing your API](https://supabase.com/docs/guides/api/securing-your-api). This blocks the database REST/GraphQL endpoints; it must not be represented as blocking Auth, Storage, or Realtime.
4. Restrict direct PostgreSQL and pooler ingress to the operator's approved egress addresses using [Network Restrictions](https://supabase.com/docs/guides/platform/network-restrictions). Supabase network restrictions do not cover HTTPS APIs, which is why the Data API, Realtime, and application/client controls are separate mandatory gates.
5. From a non-operator probe, demonstrate that the production application is unavailable, database REST/GraphQL calls fail, and direct PostgreSQL/pooler access is blocked. When Realtime was previously enabled, prove that the representative Realtime connection established before isolation is disconnected; in either prior state, prove that a fresh WebSocket/subscription reconnect is rejected with the disabled-tenant outcome and confirm the Connected Clients report reaches zero within the approved bounded drain interval. From the operator path, repeat three-way target binding and demonstrate that the intended direct database connection still works. Record only redacted outcomes, counts, timestamps, and hashes.

If isolation cannot be proven, the production cutover is NO-GO. Use this exact production-day order: **fresh production backup -> publication/connection inventory -> technical traffic and Realtime isolation -> history repair and immediate reconciliation -> exact dry run -> six-file database apply -> post-apply catalog/grant/direct-role/advisor/data verification -> deploy the exact reviewed immutable candidate SHA with public ingress and Realtime still blocked -> restore only the previously recorded Data API state -> operator-only smoke with Realtime intentionally disabled -> restore the exact prior Realtime and remaining settings/traffic/jobs -> verify restored publication, connection, access, and monitoring state**. Keep both the Data API and Realtime service disabled through every migration and all database post-apply verification. Do not merge/deploy early merely because the database step has begun. If the push or any database verification fails, remain fully isolated and follow the failure procedure; restoration or continuation is an explicit owner decision based on the observed state.

After final grants, RLS, direct-role behavior, and the complete database end state are verified, repeat the affected-table publication inventory and review every delta before enabling any client path. Deploy the exact candidate while public application ingress, Realtime, jobs/consumers, and direct-database restrictions remain isolated. The rollback owner may then restore **only** the recorded prior Data API state so the operator-only application bypass can run the smoke suite; Realtime stays disabled during this smoke. If the prior Data API state was disabled, do not enable it merely for smoke; run only the approved paths compatible with that state. Once the Data API is restored to an enabled prior state, direct API clients can reach only the now-verified final RLS/grant state; this narrower final-state exposure is explicit and must be monitored while public application ingress and Realtime remain blocked.

After smoke passes, restore the exact prior **Enable Realtime service** state, public-channel setting, limits, network restrictions, application traffic control, schedules, workers, and consumers under the approved rollback plan. Re-run and hash the complete publication queries above: membership for every pre-existing affected table must equal its recorded prior state, the new cleanup outbox state must match the reviewed post-apply decision, and every other delta stops restoration. If Realtime was previously enabled, prove a fresh operator connection and the expected authorized subscription behavior for each repository-used affected table that was previously published, then run one representative non-operator reconnect/authorization probe against the final RLS state. If Realtime was previously disabled, prove it remains disabled. Record the post-restore Connected Clients, channel-join, Postgres Changes, and response-error report values and compare them with the private pre-state; exact client counts need not match, but the reason for the delta must be understood. Verify intended operator and real-user access, notification behavior, monitoring, and scheduled-job state. Any mismatch keeps the cutover open and requires escalation.

### Explicit repair-after-catalog-proof list

First bind the read-only database connection to the linked production project and run the production-specific pre-apply proof:

```bash
node supabase/verify/verify-production-baseline-catalog.mjs production_pre_apply
```

Only after every verifier row passes, the fresh production inventory proves every listed version is materially represented, the complete 57-row ledger is signed, and the owner explicitly authorizes this exact **history-repair** batch may the operator run:

The 2026-06-11 restore-drill record names `staffing_needs.target_headcount`, while the repository contract is `staffing_needs.headcount_need`. Treat that as an unresolved evidence contradiction, not as proof of either shape. Before signing the staffing rows in the ledger, query the production catalog read-only. If `headcount_need` with the exact `0..9999` check is present, append a dated correction to the historical evidence. If `target_headcount` is present, stop and prepare an approved forward reconciliation migration; do not repair the staffing versions as represented.

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
  20260314000002
  20260520000000
  20260605151000
  20260607193000
)

repair_failed=0
for version in "${PRODUCTION_REPAIR_VERSIONS[@]}"; do
  node supabase/verify/verify-target-binding.mjs
  if ! node supabase/verify/run-reviewed-supabase-cli.mjs migration repair --status applied "$version" --linked; then
    repair_failed=1
    break
  fi
done
node supabase/verify/run-reviewed-supabase-cli.mjs migration list --linked

if (( repair_failed != 0 )); then
  echo "History repair stopped; reconcile the partial remote history before any further action." >&2
  exit 1
fi
```

If even one version lacks its signed ledger proof, stop before the first repair and prepare an approved forward reconciliation plan. In particular, do not replay the historical repayment conversion, dietary permission replacement, staffing seed, or `user_filters` creation against represented state. If a repair fails mid-batch, the successful earlier history writes are not automatically rolled back: stop, preserve the exact output, reconcile the fresh migration list against the signed ledger, and obtain owner approval for an explicit continuation plan. Do not run `db push`, mark forward migrations applied, or guess at reverted history.

### Explicit production apply list

After the 57 repairs, the dry run must list exactly these six versions:

1. `20260614000000_reconcile_environments_security_and_policies.sql`
2. `20260615000000_add_is_checklist_item_to_column_config.sql`
3. `20260709194903_remediate_pr_91_security_findings.sql`
4. `20260710144000_atomic_external_column_presentation.sql`
5. `20260710150000_atomic_user_status_transition.sql`
6. `20260831200026_enforce_active_authorization_and_atomic_user_deletion.sql`

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs db push --linked --dry-run --skip-vault
```

Stop unless the dry run is exact. Record the full immutable commit SHA, successful backup identifier, owner, maintenance window, the separate explicit production go-live signal for the six-version forward apply, proven traffic isolation, and the separate deployment authorization. Then, and only then, re-bind the target immediately before the write:

```bash
set -euo pipefail
node supabase/verify/verify-target-binding.mjs
node supabase/verify/run-reviewed-supabase-cli.mjs db push --linked --skip-vault
node supabase/verify/run-reviewed-supabase-cli.mjs migration list --linked
```

Expected database end state before deployment: 63 versions in sync / 17 policies. While full database isolation remains active, repeat all staging database verification, advisors, repayment aggregates, permission hashes, affected-table publication inventory, and redacted evidence capture. Run `node supabase/verify/verify-production-baseline-catalog.mjs post_apply`; it must exit `0`. Only then deploy the exact reviewed immutable candidate SHA with public ingress and Realtime blocked, restore only the prior Data API state, run the production application smoke paths through the proven operator bypass with Realtime intentionally unavailable, and restore and verify Realtime plus the remaining traffic/settings using the gate above.

## Rollback and failure behavior

- `migration repair` records history only and requires its own explicit owner authorization. A pre-repair catalog mismatch causes a stop with no repair write. A mid-batch production repair failure can leave partial history; inventory it, stop, and obtain approval for an explicit continuation plan—never guess at rollback or proceed to push.
- Each forward migration file is transactional, but a five/six-file `db push` is **not** an all-or-nothing batch: earlier files may remain committed and recorded if a later file fails. On any apply failure, stop, preserve the exact output, re-establish three-way target binding, and capture fresh migration/catalog state. Do not rerun blindly, do not repair a failed forward version as applied, and do not continue to deployment. Obtain owner approval for an explicit reviewed forward-fix or continuation plan based on the observed partial state.
- Application authorization regressions are corrected by a new least-privilege migration, never by dashboard edits or broad re-grants.
- `delete_app_user` commits the app-row deletion and durable opaque cleanup handoff in one database transaction before external Auth cleanup. If Auth deletion or handoff completion fails, database authorization is already removed; use the exact owner retry procedure below without recreating the app role.
- A fresh production backup is mandatory even if an older local backup exists.

### Owner retry procedure for pending Auth cleanup

Preserve the original app-user ID, HTTP status, state, and every returned field from the first response. A known pending handoff includes `cleanup_id`, `cleanup_state`, and `auth_user_deleted`; a lost/timed-out/malformed initial RPC response uses `AUTH_CLEANUP_STATE_UNKNOWN`, `cleanup_id: null`, and `retry_same_user_id: true` because the atomic database transaction may or may not already have committed. After the failing dependency recovers, an active HR Admin retries the same DELETE endpoint or the same UI delete action with the **same app-user ID**. The owner/operator must never call `complete_app_user_auth_cleanup` directly and must never recreate the app-user row or role to make the retry work.

The retry must return HTTP `200` and `cleanup_state: completed`. If the first response supplied a non-null `cleanup_id`, require the same value; if the first outcome was unknown/null, the successful retry establishes the cleanup ID that must be preserved for any later evidence. Record whether the first response reported `auth_user_deleted: true`; this distinguishes a handoff-completion retry from a retry that still needed Auth deletion. Verify read-only that the app role remains absent and the Auth identity is absent. If a known cleanup ID changes, the result is not completed, either identity unexpectedly remains, or any identifier/result is inconsistent, stop and escalate for a reviewed recovery plan rather than recreating data or repeatedly retrying.

## Close-out checklist

- [ ] Immutable commit SHA recorded; local quality/audit/Story 22.14 gates green with no real-recipient delivery.
- [ ] Staging fresh inventory/catalog proof passed.
- [ ] Owner separately authorized staging history repair; staging repaired only `20250113000000`; immediate history reconciliation passed.
- [ ] Staging five-version dry run exact; owner separately signalled go-live for the forward apply.
- [ ] Staging shows 63 migrations / 17 policies; direct-role/advisor/data-preservation evidence recorded.
- [ ] Owner verified staging.
- [ ] Production fresh inventory/catalog proof passed for all 57 repair versions.
- [ ] Complete 57-row production proof ledger signed before the first history repair.
- [ ] Owner separately authorized the exact 57-version production history-repair batch; immediate history reconciliation passed without an unresolved partial baseline.
- [ ] Production-day backup succeeded; maintenance window and explicit history-repair, forward-apply, traffic/Realtime-isolation rollback, and deployment decisions recorded separately; prior Realtime settings, affected-table publication state, and connected-client reports captured privately.
- [ ] Production six-version dry run exact; target binding rechecked immediately before apply.
- [ ] Full technical isolation proven from operator and non-operator paths, including existing-client disconnect and fresh Realtime reconnect rejection, and held through repair/apply/database post-verification; public ingress/Realtime/jobs/direct DB remain isolated through deployment and operator-only smoke.
- [ ] Production shows 63 migrations / 17 policies; direct-role/advisor/data-preservation evidence recorded before deployment.
- [ ] Exact reviewed immutable candidate SHA deployed with public ingress and Realtime blocked; only the prior Data API state restored for operator-only smoke; smoke passed; exact prior Realtime/publication/connection state and remaining settings/traffic/schedules then restored and verified.
- [ ] `R-010` / `R-020` / `R-023` closed and `story-22.10-phase-b` set to done.
- [ ] Epic 23 remains on hold; temporary Data API/Realtime/network cutover controls were restored and are not treated as Epic 23 Auth-hardening implementation.
