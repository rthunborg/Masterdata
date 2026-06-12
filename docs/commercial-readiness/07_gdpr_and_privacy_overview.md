# GDPR And Privacy Overview

Prepared: 2026-06-03
This is not legal advice. It is a technical privacy overview based on repository evidence. The responsible organization must assess controller/processor roles, legal basis, retention, DPIA need, and data subject rights.

## 1. Summary

The system includes functionality that supports GDPR/privacy work, including authentication, role-based access, RLS, column permissions, archiving, anonymization support, and backups. It should not be described as "GDPR compliant" without legal/privacy review and production control verification.

Primary privacy impact: employee/candidate masterdata, SSN, contact details, employment status, scheduling/training dates, comments, dietary details, payroll-adjacent fields, partner-specific columns, emails, and backups.

## 2. Personal Data Processing Activities

| Processing activity | Data subjects | Personal data categories | Purpose | Legal basis | Technical evidence | Needs legal review |
| --- | --- | --- | --- | --- | --- | --- |
| Employee masterdata management | Employees/candidates | Name, SSN, email, mobile, rank, gender, town/district, hiring/termination dates | Seasonal recruitment operations | Must be assessed | `employees` schema/types/routes | Yes |
| Partner role-specific access | Employees/candidates, external users | Permitted employee fields and custom columns | Operational coordination with Sodexo/ÖMC/Payroll/Toplux/Crewing | Must be assessed | `column_config.role_permissions`, RLS migrations | Yes |
| Scheduling and capacity | Employees/candidates | Training/date assignments, assigned employee JSON | Operational scheduling | Must be assessed | `important_dates`, `date-capacity.ts` | Yes |
| Notifications | Employees/candidates, HR users | Employee names, missing fields, deadlines, user emails | Operational reminders | Must be assessed | notification services, SMTP env vars | Yes |
| Audit/change tracking | Employees/candidates, users | Changed fields, timestamps, user identifiers | Traceability/security | Must be assessed | `employee_column_changes`, staffing changelog | Yes |
| Backups | All DB subjects | Full DB dumps | Disaster recovery | Must be assessed | backup workflow | Yes |
| Anonymization | Archived employees | Masked selected employee fields | Data minimization/retention | Must be assessed | `anonymizeOldArchivedEmployees` | Yes |

## 3. Technical And Organizational Measures

Current technical support:

- Supabase Auth-backed login and session checks.
- Active/inactive app user status.
- Server-side role checks in most API routes.
- Supabase RLS policies in migrations.
- Column-level application permission model.
- Zod input validation.
- Secrets documented in `.env.example` and ignored by `.gitignore`.
- Cron endpoints fail closed in production if `CRON_SECRET` is missing.
- Backup workflow has 14-day retention variable.

Needs organizational/process confirmation:

- Data processing agreement and subprocessor list.
- Access review cadence.
- Retention/deletion schedule.
- Incident response process and breach notification workflow.
- Support staff access control and logging.
- Full restore test evidence: a full restore drill into a non-production target was verified on 2026-06-11 (`evidence/restore-drill-2026-06-11.md`). Open: auth users are outside logical backup scope (recovery-planning decision, Story 22.12) and backup-failure alerting is missing.
- Production environment separation and secret rotation.

## 4. Support For Data Subject Rights

| Right/area | Current technical support | Evidence | Gap |
| --- | --- | --- | --- |
| Access | Data can be queried/exported by authorized users | export routes and repositories | No dedicated DSAR export workflow |
| Rectification | HR/recruiter can update employee records | employee PATCH routes | Need process approval and audit review |
| Erasure | Archive, hard delete, anonymization endpoint | employee lifecycle routes/repository | Legal retention and backup deletion policy unknown |
| Restriction | Archive hides from main views/external RLS | `is_archived`, RLS policies | No formal restriction state beyond archive |
| Portability | CSV/XLSX exports | export route | Need scoped DSAR export format |
| Objection | Not implemented as product feature | Not found | Needs process outside app |
| Auditability | Staffing changelog and employee column changes | migrations/services | Employee audit RLS and retention need review |

## 5. Subprocessors And External Services

Likely subprocessors or processors needing review:

- Supabase: database, auth, realtime, storage/backups.
- Vercel: hosting, functions, logs, cron.
- GitHub: repository, CI logs, secrets, backup workflow execution.
- SMTP provider: outbound email content and recipient metadata.
- npm/open-source packages: technical dependencies, generally not subprocessors unless services are contacted.

## 6. Retention And Deletion

Current implementation:

- Archived employees receive `archived_at`.
- Anonymization masks selected fields for archived employees older than 3 months.
- Backup workflow prunes backup objects older than 14 days.

Not verified:

- Whether anonymization endpoint is scheduled in production. `vercel.json` does not list `/api/cron/gdpr-anonymize`.
- Legal basis for 3-month anonymization threshold.
- Whether all personal/sensitive fields are anonymized.
- Whether custom columns and logs are included in retention/deletion.
- Restore/deletion behavior for backups.

## 7. Incident Handling

No formal incident handling process was found in code/config. Technical logs exist through console/Vercel/GitHub. Recommended target state includes incident severity levels, contacts, breach assessment process, evidence preservation, notification templates, and post-incident review.

## 8. Open Questions For Legal/Privacy

- Who is the controller and who is processor for each deployment/commercial model?
- What legal basis applies to each category of processing?
- Are SSN, dietary notes, payroll/bank-related fields, and health/training-related fields processed under special rules?
- What retention periods apply to active, terminated, archived, anonymized, and backup data?
- Should a DPIA be performed before formal use?
- Which subprocessors must be listed in the DPA?
- Are emails allowed to include employee names and missing fields?
- What is the process for DSARs, correction, deletion, and restriction?
- Are international transfers involved through Vercel/Supabase/GitHub/SMTP?

## 9. Recommended Actions Before Formal Operation

1. Complete DPIA/privacy assessment.
2. Define retention and deletion schedule, including backups/logs/custom columns.
3. Keep diagnostic endpoints removed/protected and close post-deployment release verification.
4. Verify hosted Supabase RLS/Auth settings and role permissions with staging/prod test accounts.
5. Review email content and recipient lists.
6. Confirm DPA/subprocessor list.
7. Schedule anonymization only after legal approval, or document manual run process.
8. Add admin/audit logging for access and permission changes.

## GDPR/Privacy Control Table

| GDPR/privacy area | Current technical support | Evidence | Risk | Recommended action | Requires legal review? |
| --- | --- | --- | --- | --- | --- |
| Data minimization | Column permissions and role-specific exports | `column_config`, export route | Column filtering app-layer only | Test all role views/exports | Yes |
| Access control | Supabase Auth, API role checks, RLS | auth helpers, migrations, private endpoint checks | Pre-remediation private checks found unauthenticated diagnostic behavior; Story 22.1 removed the risky handlers | Close post-deployment diagnostic verification gate | Yes |
| Retention | Archive/anonymize/backups | lifecycle repo, backup workflow | Retention policy not confirmed | Approve retention schedule | Yes |
| Audit | Staffing changelog, employee changes | migrations/services | Broad audit reads and migration-history gap | Verify hosted migration history/RLS | Yes |
| Security | Secrets ignored, Zod, RLS | `.gitignore`, validation, migrations | Residual moderate/low dependency advisories | Track advisory register and validate remaining major upgrades | No/Some |
| Subprocessors | Supabase/Vercel/GitHub/SMTP identifiable | config/workflows | Contracts unknown | Create subprocessor register | Yes |
| Data subject rights | Export/edit/delete/anonymize components | routes/repositories | No DSAR process | Define operational process | Yes |
| Incident response | Logs only | console usage | No formal process | Write incident runbook | Yes |
