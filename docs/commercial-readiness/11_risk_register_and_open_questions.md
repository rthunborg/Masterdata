# Risk Register And Open Questions

Prepared: 2026-06-03

## Risk Register

| ID | Risk | Area | Description | Likelihood | Impact | Priority | Current control | Recommended action | Owner | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Public debug/test endpoint exposure | Security | Pre-Story 22.1 private checks found unauthenticated diagnostic behavior that exposed config/auth metadata | High | High | High | Story 22.1 is done with route-handler removal and local/non-production gates passing; production runtime verification remains pending until the final Epic 22 deployment exists | After final Epic 22 deployment, recheck unauthenticated production runtime behavior and require non-success responses before claiming P0 readiness | Technical owner | Implementation done; release verification pending | Story 22.1, route-removal tests, private endpoint checks |
| R-002 | Dependency advisories | Security | Story 22.3 reduced `pnpm audit --prod` from 33 production advisories to 3 residual moderate/low advisories; current audit has 0 critical and 0 high | Medium | Medium | Medium | `next` upgraded to `16.2.7`; compatible transitive production advisories patched with pnpm overrides | Validate Nodemailer 8 and ExcelJS/uuid remediation path before enterprise use | Technical owner | Residual risk accepted | `15_dependency_advisory_risk_register.md`, `evidence/dependency-audit-2026-06-05.md` |
| R-003 | Stale export data path | Architecture/Data | Export route previously queried `custom_data`, while migrations removed JSONB/custom-data architecture | Medium | High | High | Story 22.3 route now reads custom fields from real employee-table columns and updates export tests | Keep real-column export regression coverage | Technical owner | Resolved in Story 22.3 | export route, migrations, export tests |
| R-004 | GDPR anonymization unscheduled | GDPR/Operations | Endpoint exists but not in `vercel.json`; retention basis unknown | Medium | High | High | Manual endpoint with cron secret | Approve retention policy and schedule/process | Privacy + technical owner | Open | gdpr route, vercel.json |
| R-005 | Service role bypass risk | Security | Several flows bypass RLS after app checks | Medium | High | High | Role checks in code | Review every path, add tests/logging | Security/technical owner | Open | `createServiceRoleClient` usages |
| R-006 | API auth helper inconsistency | Security | Some routes call `requireAuthAPI()` without request despite cookie workaround | Medium | Medium | High | Some routes pass request | Standardize route auth calls | Technical owner | Open | route files, auth helper |
| R-007 | Full restore not verified | Operations | Latest 2026-06-03 backup workflow succeeded through partial staging restore, but full production restore drill is not proven | Medium | High | High | Nightly backup config; latest scheduled partial staging restore succeeded | Run full restore test and document RPO/RTO | Operations owner | Open | backup workflow, GitHub run metadata |
| R-008 | PII in logs | GDPR/Security | Console logs include user emails, employee ids, errors, potentially PII | Medium | Medium | Medium | Platform logs only | Redact and structure logs | Technical owner | Open | `rg console.* src` |
| R-009 | Rate limiting absent | Security | No rate limiting found for login/import/export/debug endpoints | Medium | Medium | Medium | Auth checks on many routes | Add rate limiting/request size limits | Technical owner | Open | code search |
| R-010 | Audit migration history gap | Data/Security | Production/staging REST metadata confirms `employee_column_changes` exists, but its creation migration is not visible in tracked `supabase/migrations` | Low/medium | Medium | Medium | Later fix migrations; table existence verified by REST metadata | Verify Supabase migration history and add baseline/repair migration documentation | Technical owner | Open | migration search, Supabase REST metadata |
| R-011 | Column-level security app-layer | Security/GDPR | RLS is row-level; column visibility is enforced by application logic | Medium | High | High | `column_config` permissions and export checks | Add role-view/export tests and consider DB views/RPC | Security owner | Open | role utilities, migrations |
| R-012 | Remaining platform control gaps | Operations/Security | GitHub branch protection, CI, Vercel deployment metadata, and backup run were verified; Supabase RLS/Auth settings and Vercel env scopes still need review | Medium | High | High | CI/branch protection/backup execution verified | Review remaining Supabase/Vercel production settings | IT owner | Open | GitHub/Vercel metadata; Supabase access limitation |
| R-016 | Repository security posture needs hardening review | Security | Private repository metadata review found security-control decisions that need owner review | Medium | Medium | Medium | Branch protection and CI checks | Enable available security features or document compensating controls | Technical owner | Open | Private GitHub metadata |
| R-017 | Vercel dynamic server usage build warnings | Operations/Architecture | Latest production build succeeded but logged `DYNAMIC_SERVER_USAGE` warnings for admin pages that use cookies during static generation | Medium | Low/medium | Medium | Build completed and deployment `READY` | Review whether pages should be explicitly dynamic or adjusted to avoid static-generation warnings | Technical owner | Open | Vercel build logs |
| R-018 | Supabase DB access posture | Security | Private platform-control review found database access hardening items | Medium | High | High | Supabase managed platform; application uses HTTPS/Data API | Harden database transport/network controls where feasible, or formally risk-accept | Technical/IT owner | Open | Private Supabase metadata |
| R-019 | Supabase physical backup/PITR posture | Operations | Private platform backup metadata requires operations review | Medium | High | High | GitHub logical backup and partial staging restore verified | Decide whether logical backups satisfy RPO/RTO or enable platform backup/PITR controls | Operations owner | Open | Private Supabase backup metadata |
| R-020 | Staging/prod schema drift | Data/Operations | Staging and production both have core tables/RPCs, but `employees` columns differ (`asdas`/`testerere` only in staging; `seably_*` only in production) | Medium | Medium | Medium | GitHub partial staging restore covers data for selected tables, not full schema reconciliation | Reconcile custom columns and confirm staging can be used as a release-verification environment | Technical owner | Open | Supabase REST schema metadata |
| R-021 | Test env isolation | Operations/Data | `.env.test` now points at local/non-production Supabase; automated tests must keep refusing production Supabase targets | Medium | High | High | Local env guard and ignored env files | Keep tests on isolated local/staging projects and document safe test modes | Technical owner | Mitigated locally; monitor | local env key/host inspection |
| R-022 | Controlled production-data presentation | GDPR/Security | A presentation could expose out-of-scope employee records, fields, exports, screenshots, browser history, recordings, transcripts, AI notes, admin-only views, or debug/test views if the presenter leaves the intended role/account context or presentation scope | Medium | High | High | Story 22.4 defines standing production-data presentation controls | Use a named app account, stay within the demonstrated role and business population, close admin/debug paths, and handle exports/screenshots/recordings through the presentation owner's process | Business/data owner + presenter | Mitigated by process; verify per presentation | `16_presentation_data_scope_and_access_preconditions.md` |
| R-013 | Email DPA/retention | GDPR/Legal | SMTP provider unknown and emails can include employee data | Medium | Medium | Medium | SMTP env vars | Identify provider and DPA/retention | Legal/privacy | Open | email service |
| R-014 | Dynamic schema changes | Architecture/Security | Custom columns can create real DB columns via RPC | Medium | Medium | Medium | Column name/type validation | Restrict to admin/approved migration workflow if required | Technical owner | Open | custom column RPC/repository |
| R-015 | Hard delete availability | GDPR/Data | Employee delete route exists; legal retention rules unknown | Low/medium | High | Medium | Role checks | Define when hard delete is allowed | Product/legal | Open | employee route |

## Must Fix Before Enterprise Use

- After final Epic 22 deployment, complete production runtime verification for the removed diagnostic endpoint paths; unauthenticated requests must return non-success responses before P0 readiness is claimed.
- Keep the dependency advisory register current and close residual moderate/low advisories before enterprise use.
- Keep selected-export real-column regression coverage current.
- Verify Supabase hosted RLS/Auth settings, staging schema, migration history, and route auth coverage.
- Harden or formally accept managed database transport/network/backup posture.
- Keep mutating tests isolated from production before every run.
- Follow the standing production-data presentation controls for role/account context, population scope, visible fields, exports, screenshots, browser history, recordings, transcripts, AI notes, and prohibited admin/debug paths.
- Define retention/deletion/anonymization policy.
- Run and document full backup restore test.

## Should Fix

- Add rate limiting and file size limits.
- Redact logs and reduce personal data in runtime logs.
- Standardize API auth helper usage with request objects.
- Add admin action audit logging.
- Add E2E/security tests for all roles and exports.
- Document incident response.
- Reconcile staging/prod schema drift.

## Nice To Have

- Formal DSAR export workflow.
- SSO/MFA integration if customer requires.
- Structured observability with alerting.
- Automated license report generation.
- Database views/RPC for column-filtered access if app-layer control is insufficient.

## Open Questions For Customer

- Which teams and external parties will use the system?
- Which fields should each external party see and edit?
- What are acceptable retention periods?
- What support hours and response times are needed?
- Should the system be customer-hosted or vendor-managed?
- What security review artifacts are required before approval?

## Open Questions For Legal/Privacy

- Controller/processor roles?
- Legal basis for each processing purpose?
- DPIA needed?
- DPA/subprocessor list?
- Email content acceptable?
- Deletion/anonymization/backups retention requirements?

## Open Questions For IT/Security

- Required SSO/MFA?
- Required hosting region?
- Required logging/monitoring/SIEM?
- Branch protection and release approval requirements?
- Backup encryption and restore testing requirements?
- Pen test or vulnerability scan requirements?

## Open Questions For Procurement

- Preferred commercial model?
- Required insurance/liability/SLA terms?
- Vendor onboarding requirements?
- License vs managed service vs source transfer preference?
- Required subprocessors and data transfer clauses?

## Open Questions For Product Owner

- Which workflows are critical for first formal operation?
- Which known issues can be deferred?
- Who owns user provisioning/offboarding?
- What is the definition of "crew-ready" in business terms?
- Should GDPR anonymization be automatic or manually approved?
