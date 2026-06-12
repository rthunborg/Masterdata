# Operations, Support, And SLA

Prepared: 2026-06-03

## Current Operational View

| Area | Current state | Evidence | Status |
| --- | --- | --- | --- |
| Local environment | `pnpm install`, `pnpm dev`, Supabase env vars | `README.md`, `.env.example` | Verified by docs |
| Production hosting | Checked Vercel production deployment was ready from the expected release branch; exact project/deployment identifiers are held privately | `README.md`, `vercel.json`, private Vercel metadata/logs | Partially verified |
| Database/Auth | Supabase intended; prod/staging REST schema metadata confirms expected core public tables/RPCs | `src/lib/supabase/*`, migrations, Supabase CLI/REST metadata | Schema metadata partially verified; hosted RLS policy inventory captured in Story 22.8 from the 2026-05-28 backup snapshot (drift `R-023`); Auth dashboard settings (session/MFA) not verified |
| CI | Type-check, lint, unit, integration on `main`/`staging`; latest checked `main` and `staging` workflow runs succeeded | `.github/workflows/test-check.yml`, GitHub run metadata | Verified in config and platform |
| E2E | Playwright config starts local Next server on port 3100 | `playwright.config.ts` | Verified in config |
| Cron | ÖMC and PE3 reminders | `vercel.json` | Verified in config |
| Backup | Nightly production dumps, 14-day retention, partial staging restore | `.github/workflows/supabase-nightly-backup.yml`, GitHub run metadata | 2026-06-03 scheduled run verified successful; the 2026-06-05 run failed at CLI setup and went unnoticed for six days — failure alerting tracked in Story 22.12 |
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

### Rollback

Not verified from repo. Recommended target:

- Use Vercel deployment rollback for app code.
- Keep DB migrations backward-compatible or have tested rollback scripts.
- For data corruption, restore from backup into staging first, verify, then plan production restore with downtime/approval.

### Backups And Restore

Current workflow:

- Runs daily at 02:00 UTC.
- Dumps roles/schema/data from production.
- Uploads to Supabase Storage bucket.
- Prunes older than 14 days.
- Downloads oldest backup and partially refreshes staging `employees` and `column_config`.

Evidence: `.github/workflows/supabase-nightly-backup.yml`, GitHub workflow run/job metadata.

Not verified:

- Bucket configuration.
- Backup encryption at rest beyond vendor storage controls.
- RTO for a full production recovery including auth-user re-provisioning (auth schema is outside logical backup scope).

Verified on 2026-06-03: latest scheduled backup job completed successfully, including production role/schema/data dumps, employees/column_config dump, Supabase Storage upload, backup pruning, download of oldest backup, and partial staging restore of `employees` and `column_config`.

Verified on 2026-06-11 (Story 22.8): full restore drill — the oldest nightly backup (2026-05-28) was downloaded read-only from storage and fully restored (roles, schema, data) into the local non-production Supabase stack; row counts matched the dump exactly for the 7 key tables checked (the two log tables `pe3_notifications_log` and `staffing_needs_changelog` were restored but not count-validated), 26 RLS policies and 11 functions restored, and a REST smoke check passed. Nominal RPO follows the nightly schedule (~24h); the unnoticed 2026-06-05 backup failure means the effective recovery point is not assured until failure alerting exists (Story 22.12). Follow-ups: one nightly backup (2026-06-05) is missing from the bucket (add failure alerting), and recovery planning must include auth-user provisioning. Details: `evidence/restore-drill-2026-06-11.md`.

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
