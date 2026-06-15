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
| R-007 | Full restore drill (verified 2026-06-11; follow-ups open) | Operations | Full restore drill of the 2026-05-28 production backup into the local non-production stack succeeded on 2026-06-11 with 7 of 8 validation checks passed (one not applicable: no serial/identity columns to restore); residual follow-ups: backup-failure alerting (2026-06-05 nightly run missing from bucket) and auth-user provisioning in recovery planning (auth schema outside logical backup scope) | Low | High | Medium | Verified nightly backup pipeline plus documented full restore drill | Add backup-failure alerting; include auth-user provisioning in recovery runbook; repeat drills periodically (follow-ups filed as Story 22.12) | Operations owner | Resolved in Story 22.8; follow-ups tracked in Story 22.12 | `evidence/restore-drill-2026-06-11.md`, backup workflow |
| R-008 | PII in logs | GDPR/Security | Console logs include user emails, employee ids, errors, potentially PII | Medium | Medium | Medium | Platform logs only | Redact and structure logs | Technical owner | Open | `rg console.* src` |
| R-009 | Rate limiting absent | Security | No rate limiting found for login/import/export/debug endpoints | Medium | Medium | Medium | Auth checks on many routes | Add rate limiting/request size limits | Technical owner | Open | code search |
| R-010 | Audit migration history gap | Data/Security | Confirmed on 2026-06-11: `supabase migration list --linked` shows the hosted production migration history is empty — all 56 migrations are local-only, so the production schema was built outside the tracked migration flow (includes the untracked `employee_column_changes` creation) | High | Medium | High | Repository migrations are the canonical reviewable schema source; the restore drill verified backup-based recovery only — R-023 shows a migrations-rebuilt environment would diverge from hosted policies | Story 22.10 prepared the remote-history baseline (`migration repair --status applied`) as an owner-run cutover runbook (`docs/commercial-readiness/27_supabase_cutover_runbook.md`); execute on staging then production at the Epic 22 cutover before relying on migration-based deployments | Technical owner | Reconciled and verified on **staging** (2026-06-14: remote history baselined — 57 migrations local↔remote in sync); closes in production at the Epic 22 cutover | `22_supabase_security_evidence_package.md`, `26_environment_reconciliation_inventory.md`, `docs/commercial-readiness/27_supabase_cutover_runbook.md` |
| R-011 | Column-level security app-layer | Security/GDPR | RLS is row-level; column visibility is enforced by application logic | Medium | High | High | `column_config` permissions and export checks | Add role-view/export tests and consider DB views/RPC | Security owner | Open | role utilities, migrations |
| R-012 | Remaining platform control gaps | Operations/Security | GitHub branch protection, CI, Vercel deployment metadata, and backup run were verified; Story 22.8 restored CLI access and inventoried hosted RLS policies, advisors, SSL/network posture, and migration history — remaining review items are Supabase Auth session/MFA settings (dashboard-only) and Vercel env scopes | Medium | High | High | CI/branch protection/backup execution verified; Story 22.8 CLI evidence | Review remaining Supabase Auth dashboard settings and Vercel production settings | IT owner | Open (scope narrowed by Story 22.8) | GitHub/Vercel metadata; `22_supabase_security_evidence_package.md` |
| R-016 | Repository security posture needs hardening review | Security | Private repository metadata review found security-control decisions that need owner review | Medium | Medium | Medium | Branch protection and CI checks | Enable available security features or document compensating controls | Technical owner | Open | Private GitHub metadata |
| R-017 | Vercel dynamic server usage build warnings | Operations/Architecture | Latest production build succeeded but logged `DYNAMIC_SERVER_USAGE` warnings for admin pages that use cookies during static generation | Medium | Low/medium | Medium | Build completed and deployment `READY` | Review whether pages should be explicitly dynamic or adjusted to avoid static-generation warnings | Technical owner | Open | Vercel build logs |
| R-018 | Supabase DB access posture | Security | Verified 2026-06-11: database SSL enforcement is disabled and network restrictions are allow-all (IPv4/IPv6); formally risk-accepted for the working-pilot scope with documented hardening steps | Medium | High | High | Credentials/RLS gate access; app traffic uses HTTPS Data APIs; backup clients are expected to negotiate TLS, but this is unconfirmed — confirming it is part of the documented hardening steps | Execute documented hardening (enable SSL enforcement, restrict network ranges) before enterprise use | Technical/IT owner — Rasmus Thunborg | Risk-accepted 2026-06-11 (owner named 2026-06-12); review 2026-09-30 | `22_supabase_security_evidence_package.md` |
| R-019 | Supabase physical backup/PITR posture | Operations | PITR is not enabled (paid feature; current plan kept per NFR1); GitHub logical backups are the verified mechanism and passed a full restore drill on 2026-06-11; nominal RPO follows the nightly schedule (~24h), but the 2026-06-05 run failed undetected for six days, so the effective recovery point is not assured until backup-failure alerting exists (Story 22.12) | Medium | High | High | Verified nightly logical backup pipeline plus full restore drill | Revisit PITR/platform backups if a contract requires sub-24h RPO | Operations owner — Rasmus Thunborg | Risk-accepted 2026-06-11 (owner named 2026-06-12); review 2026-09-30 | `22_supabase_security_evidence_package.md`, `evidence/restore-drill-2026-06-11.md` |
| R-020 | Staging/prod schema drift | Data/Operations | Staging and production both have core tables/RPCs, but schema differs from migrations: `employees` columns (`asdas`/`testerere` only in staging; `seably_*` only in production) and — newly found in Story 22.10 — `important_dates.deadline_submit`/`deadline_cancel` exist only on the hosted (dashboard-built) DBs and were missing from migrations, breaking date-capacity on any migration-built rebuild | Medium | Medium | Medium | GitHub partial staging restore covers data for selected tables, not full schema reconciliation | Story 22.10 classified the drift: `asdas`/`testerere` are staging-only junk → dropped by the reconciliation migration (`DROP COLUMN IF EXISTS`); `seably_*` are operator-created **runtime custom columns** (managed via the custom-column feature + `column_config`), correctly not migration schema; `important_dates.deadline_*` are intended core schema → **adopted into migrations** (`ADD COLUMN IF NOT EXISTS … text`, no-op on hosted). Execute on staging/production via the cutover runbook | Technical owner | Reconciled and verified on **staging** (2026-06-14: junk `asdas`/`testerere` dropped; `important_dates.deadline_*` adopted); closes in production at the Epic 22 cutover | `26_environment_reconciliation_inventory.md`, `docs/commercial-readiness/27_supabase_cutover_runbook.md`, Supabase REST schema metadata |
| R-021 | Test env isolation | Operations/Data | `.env.test` now points at local/non-production Supabase; automated tests must keep refusing production Supabase targets | Medium | High | High | Local env guard and ignored env files | Keep tests on isolated local/staging projects and document safe test modes | Technical owner | Mitigated locally; monitor | local env key/host inspection |
| R-022 | Controlled production-data presentation | GDPR/Security | A presentation could expose out-of-scope employee records, fields, exports, screenshots, browser history, recordings, transcripts, AI notes, admin-only views, or debug/test views if the presenter leaves the intended role/account context or presentation scope | Medium | High | High | Story 22.4 defines standing production-data presentation controls | Use a named app account, stay within the demonstrated role and business population, close admin/debug paths, and handle exports/screenshots/recordings through the presentation owner's process | Business/data owner + presenter | Mitigated by process; verify per presentation | `16_presentation_data_scope_and_access_preconditions.md` |
| R-023 | Hosted RLS policy drift | Security/Data | The hosted production database has 26 RLS policies vs 22 defined by migrations, with differing names/definitions (extra dashboard-era `Admin Limited`/legacy HR Admin policies; `user_filters` missing its update policy in production), discovered from the 2026-05-28 backup schema during the Story 22.8 restore drill | High | High | High | Migrations remain the canonical reviewable source; drift is now inventoried and classified | Story 22.10 authored the reconciliation migration (`20260614000000`): drop dashboard-era policies, re-assert canonical policies (scoped `TO authenticated`, `(select …)`-wrapped), pin `search_path`, tighten SECURITY DEFINER grants, and reconcile a pre-existing `column_config` gap (HR Admin now manages all `column_config`, matching the app's column-admin feature — was RLS-denied on migration-built stacks). Verified on the local rebuild (RLS + reconciliation evidence suites green; full Vitest/Playwright); execute on staging + production via the cutover runbook | Technical owner | Reconciled and verified on **staging** (2026-06-14: 26→19 canonical policies; advisors `function_search_path_mutable` 12→0, security-definer-executable anon 5→1 / authenticated 5→3, `auth_rls_initplan` 9→0, `multiple_permissive_policies` 54→3); closes in production at the Epic 22 cutover | `22_supabase_security_evidence_package.md`, `26_environment_reconciliation_inventory.md`, `docs/commercial-readiness/27_supabase_cutover_runbook.md` |
| R-013 | Email DPA/retention | GDPR/Legal | SMTP provider unknown and emails can include employee data | Medium | Medium | Medium | SMTP env vars | Identify provider and DPA/retention | Legal/privacy | Open | email service |
| R-014 | Dynamic schema changes | Architecture/Security | Custom columns can create real DB columns via RPC | Medium | Medium | Medium | Column name/type validation | Restrict to admin/approved migration workflow if required | Technical owner | Open | custom column RPC/repository |
| R-015 | Hard delete availability | GDPR/Data | Employee delete route exists; legal retention rules unknown | Low/medium | High | Medium | Role checks | Define when hard delete is allowed | Product/legal | Open | employee route |

## Must Fix Before Enterprise Use

- After final Epic 22 deployment, complete production runtime verification for the removed diagnostic endpoint paths; unauthenticated requests must return non-success responses before P0 readiness is claimed.
- Keep the dependency advisory register current and close residual moderate/low advisories before enterprise use.
- Keep selected-export real-column regression coverage current.
- Advisors, SSL/network posture, and migration history were verified in Story 22.8; the hosted RLS policy inventory was captured from the 2026-05-28 backup snapshot (not a live 2026-06-11 read). Story 22.10 authored and locally verified the reconciliation (policy drift `R-023`, remote-history baseline `R-010`, schema drift `R-020`, `search_path`/SECURITY DEFINER advisor remediation; leaked-password protection moved to Epic 23 / Story 23.4) and prepared the owner-run cutover runbook (`docs/commercial-readiness/27_supabase_cutover_runbook.md`); execute it on staging then production to close `R-010`/`R-020`/`R-023`. Remaining beyond that: confirm Auth session/MFA settings and complete route auth coverage.
- Managed database transport/network/backup posture is formally risk-accepted (2026-06-11, review 2026-09-30); execute the documented hardening steps before enterprise use.
- Keep mutating tests isolated from production before every run.
- Follow the standing production-data presentation controls for role/account context, population scope, visible fields, exports, screenshots, browser history, recordings, transcripts, AI notes, and prohibited admin/debug paths.
- Define retention/deletion/anonymization policy.
- Full backup restore test is done (2026-06-11, `evidence/restore-drill-2026-06-11.md`); keep periodic drills and add backup-failure alerting.

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
