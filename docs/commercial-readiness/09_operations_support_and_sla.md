# Operations, Support, And SLA

Prepared: 2026-06-03

Updated: 2026-08-29 (Story 22.14 production-safe ÖMC masterdata reminders)

## Current Operational View

| Area | Current state | Evidence | Status |
| --- | --- | --- | --- |
| Local environment | `pnpm install`, `pnpm dev`, Supabase env vars | `README.md`, `.env.example` | Verified by docs |
| Production hosting | Checked Vercel production deployment was ready from the expected release branch; exact project/deployment identifiers are held privately | `README.md`, `vercel.json`, private Vercel metadata/logs | Partially verified |
| Database/Auth | Supabase intended; prod/staging REST schema metadata confirms expected core public tables/RPCs | `src/lib/supabase/*`, migrations, Supabase CLI/REST metadata | Schema metadata partially verified; hosted RLS policy inventory captured in Story 22.8 from the 2026-05-28 backup snapshot (drift `R-023`); Auth dashboard settings (session/MFA) not verified |
| CI | Type-check, lint, unit, integration on `main`/`staging`; latest checked `main` and `staging` workflow runs succeeded | `.github/workflows/test-check.yml`, GitHub run metadata | Verified in config and platform |
| E2E | Playwright config starts local Next server on port 3100 | `playwright.config.ts` | Verified in config |
| Cron | ÖMC and PE3 reminders | `vercel.json` | Verified in config |
| Backup | Nightly production dumps, 14-day retention, partial staging restore | `.github/workflows/supabase-nightly-backup.yml`, GitHub run metadata | 2026-06-03 scheduled run verified successful; Story 22.12 added a pinned one-shot CLI retry and GitHub-issue alerting for failures not explicitly marked best-effort. Story 22.13 makes the employees/column-config archive required and restore-atomic; only the roles dump remains best-effort. |
| Managed-platform physical backup/PITR | PITR not enabled (paid feature); risk-accepted 2026-06-11 with operations owner, review 2026-09-30; GitHub logical backups are the verified mechanism | `22_supabase_security_evidence_package.md` | Risk-accepted with owner/date |
| Monitoring | Console/Vercel logs and performance helper | `src/lib/utils/performance-monitor.ts` | Partial |
| Restore | Nightly workflow partially restores staging; full restore drill of a production backup into the local non-production stack succeeded 2026-06-11 with 7 of 8 validation checks passed (one not applicable) | `evidence/restore-drill-2026-06-11.md`, workflow, GitHub run metadata | Full restore verified on non-production target; platform PITR risk-accepted (not enabled) |
| Supabase project controls | SSL/network/PITR posture verified in Story 22.8 and formally risk-accepted (review 2026-09-30); schema-alignment questions and remaining hardening steps tracked (`R-018`/`R-019`, Story 22.10) | `22_supabase_security_evidence_package.md`, private Supabase CLI/REST metadata | Risk-accepted with owner/date; hardening steps documented |
| Environment separation | Local runtime env points at production resources, while test env points at local/non-production Supabase; production env file is empty | local env file key/host inspection | Keep tests isolated before every run |
| Vercel CLI | Installed as `54.7.1`; project listing timed out, connector used for metadata/logs | session context, Vercel metadata | Available with caveat |

## Light Runbook

### Deploy

Current evidence points to Vercel deployment through Git integration. The latest checked production deployment was sourced from the expected release branch and reached `READY`; exact commit and deployment identifiers are held privately.

Recommended deployment steps:

1. Confirm branch and PR checks pass: `pnpm type-check`, `pnpm lint`, `pnpm test`, relevant integration/e2e tests.
2. Verify migrations needed for the release.
3. Apply Supabase migrations to target environment through approved process.
4. Deploy via Vercel Git integration or Vercel CLI.
5. Verify `/api/health`, login, dashboard load, role-specific access, and key workflows.

Note: Vercel CLI was available locally, but project listing timed out in this session. Vercel project, deployment, and build logs were verified through the Vercel connector; concrete identifiers are held privately.

### Verify Deployment

- Health and diagnostic endpoint behavior depends on runtime protection. Private pre-remediation checks found inconsistent unauthenticated behavior across hostnames. Story 22.1 removed the risky route handlers; post-deployment production verification remains required.
- On an approved unprotected runtime, public health endpoint should return `{ status: "ok" }`: `src/app/api/health/route.ts`.
- Login works for a non-admin and HR Admin test account.
- External role sees only permitted columns.
- HR Admin can access user and column admin screens.
- Important dates and employee dashboard load.
- Cron secret rejects unauthorized cron calls.
- Realtime update test succeeds in two browser sessions.

### Troubleshoot Common Errors

| Symptom | Likely area | Check |
| --- | --- | --- |
| Login fails | Supabase Auth/env/user active status | `/api/auth/login`, Supabase credentials, `users.is_active` |
| Dashboard empty | RLS/role/employee filters | role in `users`, RLS policies, includeArchived/includeTerminated |
| Export fails | Column permissions, missing real custom column, or date resolution failure | `src/app/api/employees/export/route.ts` |
| Email not sent | SMTP env or disabled delivery | `SMTP_*`, `DISABLE_EMAIL_DELIVERY`, Vercel logs |
| Cron unauthorized | Missing/wrong `CRON_SECRET` | Vercel env and Authorization header |
| Capacity errors | Important date capacity/RPC | `update_date_spots`, `important_dates.remaining_spots` |

### ÖMC Masterdata Reminder

Story 22.14 supersedes Story 14.1's unlimited `date >= D + 3` catch-up policy for this reminder. Let `D` be the employee's resolved ÖMC date in the `Europe/Stockholm` calendar. The base notification date is `D + 3` calendar days; if that date is Saturday or Sunday, first eligibility moves to the following Monday. An active, non-archived employee with incomplete mandatory masterdata is eligible from that notification date through `D + 21` inclusive. From `D + 22`, the assignment is expired and is not released by a null marker. No public-holiday or exact clock-alignment rule is added.

`kvitto_c17_18` is optional for this reminder: both `false` and `null` count as complete. The remaining established reminder fields are unchanged and independently mandatory, including `loneiva`. Crewing and general employee validation are outside this policy.

Each execution claims all currently eligible assignments and creates one Swedish digest containing every successfully claimed candidate exactly once. The subject uses candidate-count wording. Each row shows the employee, resolved ÖMC date, missing mandatory fields, and that candidate's truthful Stockholm-calendar elapsed-day count; the message does not make a fixed three-day claim. The same digest is fanned out once per configured HR Admin/recruiter recipient, so `N` candidates and `R` recipients cause `R` sends, not `N × R`. A clean run with no claimed candidates sends nothing. Story 22.11's fail-safe non-production email suppression remains in force.

`omc_masterdata_reminder_sent_at` remains both the assignment-scoped claim and audit marker. A marker on or after `D` suppresses the current assignment; a genuinely later assigned ÖMC date re-arms it. Claims use two separately guarded atomic updates for the current employee ID and current `omc_date`: first `marker IS NULL`, then — only after an error-free zero-row result — `marker < D`. Mutation `.or()` is not used. Zero rows mean another execution won or the assignment was already sent; a database error is an operational failure.

If every configured recipient delivery fails, the job attempts to clear only the exact current-invocation timestamp on each exact claimed assignment so a later run can retry. A valid recipient lookup that returns no configured addresses and a recipient-lookup failure follow the same exact-claim release path: the run fails operationally, releases only that invocation's exact claims, and can retry after recipient configuration or lookup recovers while the assignment remains inside the bounded window. If at least one recipient delivery succeeds, every claim is retained to prevent a duplicate digest blast. Without a durable outbox/schema state there remains an accepted crash window after claims are committed but before delivery completes; a hard process termination in that window can retain claims without a delivered digest. Removing that limitation requires separately approved schema work.

Employee-query, evaluation, claim, total-delivery, partial-delivery, and cleanup failures are not successful cron runs: the endpoint returns `success: false` with a non-2xx status while continuing safely where possible. Operational output exposes aggregate counts only (employees, evaluations, eligibility, claims, digest candidates, recipient successes/failures, and processing failures). Logs and API error details must not contain candidate or recipient names, addresses, subjects, employee IDs, or other personal data. Cron-secret authentication is unchanged, and authorized execution against real recipients remains an approved production operation only.

### Rollback

Not verified from repo. Recommended target:

- Use Vercel deployment rollback for app code.
- Keep DB migrations backward-compatible or have tested rollback scripts.
- For data corruption, restore from backup into staging first, verify, then plan production restore with downtime/approval.

### Backups And Restore

Current workflow:

- Runs daily at 02:00 UTC.
- Dumps roles/schema/data from production.
- Creates one required custom-format snapshot archive containing `public.column_config` and `public.employees` for the staging refresh.
- Uploads to Supabase Storage bucket.
- Prunes older than 14 days.
- Downloads the oldest compatible backup containing the required custom archive and partially refreshes staging `column_config` then `employees`.
- Recreates any missing safe, config-backed employee columns between those two data replays. Truncate, config replay, runtime-column synchronization, and employee replay run in one database transaction, so a failure rolls back the staging refresh.
- The existing `TRUNCATE ... CASCADE` scope clears employee-dependent party-data and audit tables on a successful partial refresh; they are not replayed. Identity/configuration tables such as `users`, Auth, `user_filters`, and `important_dates` remain untouched. This limitation must be considered when using staging for party-data or audit validation.
- Alerts on every prior failure not explicitly marked `continue-on-error`: an `if: failure()` step opens — or comments on an existing open — `backup-failure` GitHub issue via the built-in `GITHUB_TOKEN` (no new secrets). The roles dump remains intentionally best-effort; the runtime restore archive is required. The "Setup Supabase CLI" step is retried once with a pinned CLI version.

Staging-refresh scope (owner decision 2026-06-16, Story 22.12; canonical tracked record): the partial refresh deliberately keeps `public.users` and Supabase Auth identities out of the staging replay. `public.users` is present in the full logical `public`-schema backup, but managed `auth.users` is not. Replaying production `public.users` into staging would therefore replace staging `auth_user_id` links with production Auth identifiers that do not exist in staging, breaking login-to-role resolution. The nightly partial refresh remains limited to `column_config` and `employees`; Story 22.13 makes config-backed runtime employee columns restore-compatible without changing that identity boundary.

For a full disaster recovery, Auth users must be re-provisioned in the target Supabase Auth project and the restored `public.users.auth_user_id` values must be remapped through an approved, audited operator procedure. That manual re-provision/remap step is the accepted recovery approach until a separately approved Auth export/import capability exists. This section is the tracked, sanitized source of truth for Story 22.12 AC3; local operator notes are supplementary only.

Evidence: `.github/workflows/supabase-nightly-backup.yml`, `scripts/notify-backup-failure.mjs`, GitHub workflow run/job metadata, `evidence/backup-failure-alerting-2026-06-16.md`.

Not verified:

- Bucket configuration.
- Backup encryption at rest beyond vendor storage controls.
- RTO for a full production recovery is not yet measured; Auth-user re-provisioning and `public.users.auth_user_id` remapping are the accepted manual recovery steps because the managed Auth schema is outside logical-backup scope (scope decision recorded above, 2026-06-16, Story 22.12).

Verified on 2026-06-03: the then-current scheduled backup job completed successfully, including production role/schema/data dumps, employees/column_config dump, Supabase Storage upload, backup pruning, download of oldest backup, and partial staging restore. Story 22.13 changes the partial artifact and restore transaction after that hosted verification; its checked-in workflow contract is unit-tested, but a new hosted workflow run remains required before claiming the revised path operationally verified. A legacy physical employee column without matching config now causes a rollback + alert and requires source repair rather than a silent/stale success.

Verified on 2026-06-11 (Story 22.8): full restore drill — the oldest nightly backup (2026-05-28) was downloaded read-only from storage and fully restored (roles, schema, data) into the local non-production Supabase stack; row counts matched the dump exactly for the 7 key tables checked (the two log tables `pe3_notifications_log` and `staffing_needs_changelog` were restored but not count-validated), 26 RLS policies and 11 functions restored, and a REST smoke check passed. Nominal RPO follows the nightly schedule (~24h); the unnoticed 2026-06-05 backup failure had meant the effective recovery point was not assured. Story 22.12 closed both restore-drill follow-ups (2026-06-16): the workflow alerts on failures not explicitly tolerated as best-effort and retries CLI setup once; the tracked decision above keeps the staging-refresh `users` exclusion for auth-link integrity and accepts manual Auth re-provision/remap for disaster recovery. Details: `evidence/restore-drill-2026-06-11.md`, `evidence/backup-failure-alerting-2026-06-16.md`.

Superseded 2026-06-11 (originally verified 2026-06-03): the managed-platform physical backup/PITR posture has since been reviewed in Story 22.8 and formally risk-accepted (PITR not enabled; operations owner, review 2026-09-30). The GitHub logical backup workflow remains the verified backup mechanism unless platform backups/PITR are approved separately.

Verified after Story 22.2/22.3: local developer runtime env still points to production Supabase resources, while test env points to local/non-production Supabase. No database URL/password values are disclosed in this public package, and runtime secret-name inventories are held privately.

### Onboard/Offboard Admin Users

Current implementation:

- HR Admin can create users and choose role/active state.
- HR Admin can deactivate users and attempts to revoke sessions.
- Self-deactivation/deletion and last active HR Admin removal are blocked.

Evidence: `src/app/api/admin/users/*`.

Recommended process:

- Use named accounts only.
- Require approval for HR Admin role.
- Review active admins monthly during operation.
- Prefer deactivation over deletion unless legally/operationally approved.

### Incident Handling

No formal incident process was found. Minimum target:

- Define incident lead, technical owner, business owner, privacy contact.
- Preserve logs and deployment identifiers in the private incident record.
- Disable compromised accounts/secrets.
- Rotate Supabase/Vercel/GitHub/SMTP secrets if needed.
- Assess personal data breach notification obligations.
- Run post-incident review.

## Support Proposal

Do not promise 24/7 enterprise SLA unless staffing, monitoring, escalation, and contractual terms exist.

Possible support tiers:

| Tier | Included | Not promised unless separately agreed |
| --- | --- | --- |
| Basic business-hours support | Bug triage, minor fixes, dependency updates, access/config help | 24/7, guaranteed RTO, custom development |
| Managed operations | Deployment, backup monitoring, restore drills, incident coordination, monthly security review | Legal compliance guarantees |
| Development retainer | New features, integrations, UX changes, reports | Fixed response times unless contracted |

Suggested response-time language:

- Critical production outage: response target to be agreed, only during covered hours unless on-call exists.
- High business-impact bug: next business day target.
- Normal support: 2-5 business days depending on agreement.
- New development: separate estimate and approval.

## Responsibility Split To Confirm

- System owner: Needs confirmation.
- Technical owner: Needs confirmation.
- Data owner/controller: Needs confirmation.
- Production access owners: Needs confirmation.
- Backup/restore owner: Rasmus Thunborg holds the operations-owner role for the Story 22.8 backup/PITR risk acceptance and restore-drill follow-ups (named 2026-06-12); formal customer-side confirmation of long-term ownership is pending.
- Security/privacy contact: Needs confirmation.
- Support contact and escalation path: Needs confirmation.
