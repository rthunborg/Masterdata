# Exit And Handover Plan

Prepared: 2026-06-03

## Scenario 1: Controlled Decommissioning

### Before

- Confirm data owner and legal retention requirements.
- Freeze new feature development.
- Notify users and external parties.
- Export required records using approved fields and formats.
- Take final backup if legally appropriate.
- Define deletion/anonymization scope, including backups and logs.
- Revoke external access after agreed date.

### During

- Disable user creation and non-essential cron jobs.
- Export employee data, important dates, column configuration, staffing needs, changelog, and saved filters if needed.
- Deactivate users in app and Supabase Auth.
- Run approved anonymization/deletion process.
- Remove or rotate secrets.
- Disable Vercel deployments/domains if applicable.
- Disable Supabase project only after data retention/export signoff.

### After

- Verify no users can log in.
- Verify scheduled jobs no longer run.
- Verify backups are retained/deleted according to policy.
- Document final data disposition.
- Remove supplier/customer access as appropriate.
- Archive source/documentation if contractually required.

## Scenario 2: Handover To Customer IT

### Scope

Handover may include source code, deployment configuration, Supabase project/migrations, Vercel project/domain, environment variable inventory, documentation, runbooks, and training. IP transfer or source ownership must be handled separately from operational handover.

### Before

- Agree commercial/legal terms for source/license/IP.
- Decide target hosting model: customer Vercel/Supabase, customer cloud, or managed service.
- Inventory secrets without exposing values: Supabase URL/anon key/service role, SMTP, cron secret, DB URLs, GitHub secrets.
- Freeze a release tag.
- Run tests and security checks.
- Create backup and verify restore into a non-production target.

### During

- Transfer repository access or deliver source archive as contracted.
- Transfer or recreate Vercel project and environment variables.
- Transfer or recreate Supabase project and apply migrations.
- Transfer DNS/domains if applicable.
- Transfer GitHub Actions secrets and backup bucket ownership.
- Create customer admin users and remove supplier access.
- Verify login, dashboard, exports, cron, and backup workflow.

### After

- Confirm customer owns admin credentials and secrets.
- Revoke old supplier access if no managed support contract exists.
- Rotate all transferred secrets.
- Schedule first restore test under customer control.
- Agree maintenance patch cadence.

## Data Export

Current export support:

- Employee selected-field export as CSV/XLSX (`src/app/api/employees/export/route.ts`).
- Crew-ready export (`src/app/api/employees/export-crew-ready/route.ts`).
- Important date/category export services (`src/lib/services/export-service.ts`, important dates page).

Recommended additional handover exports:

- `users` role list without password/session data.
- `column_config`.
- `important_dates`.
- `staffing_needs` and `staffing_needs_changelog`.
- `user_filters` if customer wants saved views.
- Audit/change tables if legally appropriate.

## Access Closure

- Set `users.is_active=false` for all decommissioned users.
- Revoke Supabase Auth sessions.
- Remove Vercel/GitHub/Supabase/SMTP admin access.
- Rotate service role and cron secrets.
- Remove local `.env` files from machines according to policy.

## Data Deletion And Backups

- Active DB deletion/anonymization must follow legal retention decision.
- Backup deletion may depend on 14-day workflow pruning or vendor retention.
- Logs may contain personal data; platform log retention must be confirmed.
- Deletion from backups should be documented as "expires through backup retention" unless a special purge process exists.

## Verification Checklist

Before:

- Data owner approval.
- Legal/privacy approval.
- Backup/export plan.
- User notification plan.
- Handover/decommissioning date.

During:

- Export created and validated.
- Access disabled/transferred.
- Secrets rotated.
- Cron jobs disabled/transferred.
- Deployment/domain transferred or disabled.

After:

- Login blocked or works only for customer-owned users.
- Backup/restore responsibility accepted.
- Supplier access removed or documented under support contract.
- Final evidence retained.
