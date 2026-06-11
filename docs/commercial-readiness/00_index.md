# Commercial Readiness Documentation Index

Prepared: 2026-06-03
Updated: 2026-06-10
Scope: repository review plus GitHub, Vercel, and limited Supabase-related runtime verification of the HR Masterdata Management System. No employee rows, secrets, private environment variable values, concrete production domain names, project refs, deployment IDs, or secret-name inventories are disclosed in this public package. Detailed operational evidence is held privately. Pre-remediation production diagnostic endpoint checks returned configuration metadata; Story 22.1 is done with route-handler removal and passing local/non-production gates. A post-merge Epic 22 release/readiness gate remains: after final deployment, the production runtime must stop returning success responses for the removed diagnostic paths.

## System Summary

HR Masterdata is a private Swedish-language Next.js application for Stena Line seasonal recruitment operations. It centralizes employee masterdata, role-based partner access, important dates, staffing targets, exports, reminders, and operational follow-up. The current implementation is a single-stack Next.js App Router app with Supabase PostgreSQL/Auth/RLS and Vercel-oriented deployment.

Primary evidence: `README.md`, `package.json`, `src/app`, `src/components`, `src/lib`, `supabase/migrations`, `.github/workflows`, `vercel.json`, `.env.example`, existing docs under `docs/`, GitHub workflow/protection metadata, Vercel deployment metadata/logs, endpoint checks, Supabase CLI metadata, Supabase REST schema metadata, and Supabase MCP access results.

## Documents

| Document | Audience | Purpose |
| --- | --- | --- |
| `01_executive_summary.md` | Business/management, procurement | Non-technical decision summary and readiness view |
| `02_system_overview.md` | Business, IT, developers | Product workflows, modules, domain model, boundaries |
| `03_architecture.md` | IT, security, developers | C4-inspired architecture, runtime flows, deployment and technical risks |
| `04_feature_capability_matrix.md` | Business, product, IT | Implemented/partial/missing capability map with evidence |
| `05_user_roles_and_permissions.md` | Security, IT, product | Role model, permission matrix, frontend/API/RLS separation |
| `06_data_inventory_and_data_flows.md` | Legal/privacy, security, IT | Data objects, personal data, storage, sharing, retention |
| `07_gdpr_and_privacy_overview.md` | Legal/privacy, management | GDPR support overview and questions for controller/legal review |
| `08_security_overview.md` | Security, IT | Authentication, authorization, secrets, vulnerabilities, risks |
| `09_operations_support_and_sla.md` | IT, operations, procurement | Runbook, support model, backup/restore, SLA assumptions |
| `10_dependencies_subprocessors_and_licenses.md` | Procurement, legal/privacy, security | SaaS, npm dependencies, licenses, subprocessors |
| `11_risk_register_and_open_questions.md` | Management, IT, security, legal | Practical risk register and stakeholder questions |
| `12_commercial_pack.md` | Business/management, procurement | Commercial framing, meeting agenda, packaging options |
| `13_exit_and_handover_plan.md` | IT, legal/privacy, procurement | Decommissioning and customer handover scenarios |
| `14_evidence_index.md` | All reviewers | Traceability from claims to files/modules/config |
| `15_pricing_and_business_case.md` | Founder, HR sponsor, management, procurement | Pricing strategy, packages, negotiation plan, stakeholder framing, and formalization business case |
| `15_dependency_advisory_risk_register.md` | Security, IT, procurement | Current dependency audit remediation and residual advisory risk register |
| `16_presentation_data_scope_and_access_preconditions.md` | Management, presenter, security/privacy | Standing controls for presenting production data safely: role/account context, data scope, export, screenshot, browser-history, recording, and non-production path rules |
| `17_blocker_remediation_tracker.md` | Product owner, management, IT/security | P0 blocker remediation tracker with owner, target date, status, acceptance criteria, latest note, and evidence link |
| `18_one_page_presentation_brief.md` | Management, external-review prep | Concise readiness brief for working-pilot positioning, review-ready scope, known risks, and non-ready enterprise areas |
| `19_api_auth_matrix.md` | Security, IT, developers | Current API route/method auth matrix with service-role and request-cookie evidence |
| `20_field_access_matrix.md` | Security, IT, product | Role-level field visibility, editability, exportability, enforcement layer, and known limits |
| `21_role_export_rls_test_evidence.md` | Security, IT, reviewers | Story 22.7 command results and automated evidence for role, API/export, Zod, and local RLS checks |

## Verified

- Current package/dependency stack from `package.json`, `pnpm-lock.yaml`, and `pnpm licenses list --prod`.
- Next.js, React, Supabase, Vercel cron, GitHub Actions, TypeScript, Vitest, Playwright configuration.
- API route inventory under `src/app/api`: 43 `route.ts` files were identified after Story 22.1 removed the public diagnostic route handlers.
- Auth helpers, middleware, role utilities, Supabase clients, service-role usage.
- Database migrations under `supabase/migrations`, including RLS policies, tables, RPC functions, staffing needs, user filters, notification logs, archived/anonymized fields.
- Backup and CI workflows under `.github/workflows`.
- The checked `main` revision had a successful GitHub `Test Check` workflow run after merge; exact commit evidence is recorded privately.
- The checked `staging` revision had successful GitHub `Test Check` and `Main Promotion Source` workflow runs; exact commit evidence is recorded privately.
- GitHub branch protection was verified for `staging` and `main`; both require strict status checks, and `main` requires `Run Tests` plus `Validate main promotion source`.
- GitHub repository metadata was verified; detailed security-feature posture is recorded privately. Public summary: repository-platform hardening remains required before enterprise readiness is claimed.
- Vercel project metadata was verified; the latest checked production deployment was `READY`. Project names, deployment IDs, concrete commit refs, and region details are recorded privately.
- Pre-Story 22.1 unauthenticated checks showed different behavior between protected platform aliases and the production runtime. Story 22.1 later removed the diagnostic route handlers and local/non-production gates now pass. The 2026-06-10 unauthenticated production runtime checks still returned success responses for removed diagnostic paths because the final Epic 22 PR had not yet been deployed; rechecking those paths is a post-merge release/readiness gate.
- Latest scheduled Supabase backup workflow run on 2026-06-03 completed successfully, including backup upload, pruning, and partial staging restore for `employees` and `column_config`.
- Supabase CLI project access confirmed production and staging project visibility. Project names, refs, and regions are recorded privately.
- Production and staging Supabase REST schema metadata confirmed the expected public tables and eight RPC paths exist, including `employees`, `users`, `column_config`, `important_dates`, `employee_column_changes`, `staffing_needs`, `user_filters`, and notification log objects. No application rows were read.
- Supabase schema drift was identified: staging `employees` has custom-looking columns `asdas` and `testerere`, while production has newer `seably_*` columns not present in staging.
- Supabase project controls were checked. Public summary: hosted database/security controls require hardening or formal risk acceptance; detailed posture is recorded privately. This is separate from the verified GitHub logical backup workflow.
- Local env file investigation: `.env.local` still points to production Supabase for developer runtime, while `.env.test` has been reset to local/non-production Supabase placeholders by Story 22.2; `.env.production` is empty; no local env file contains a Postgres DB URL/password key.
- Supabase project secret-name inventory was checked privately. Public summary: production has expected application secret configuration to review; staging secret posture requires review. Secret values and secret names are not disclosed in this public package.
- The Supabase connector still listed only the unrelated `SunnySeat` project and returned a permission error for the HR project refs. Newer CLI `db query`/`db advisors` were blocked by a temporary login-role permission error and require `SUPABASE_DB_PASSWORD`.
- Environment variable documentation from `.env.example` and local `.env*` file names/key names without reading secret values.
- Non-disclosing secret scan: tracked env file is `.env.example`; local `.env*` files are ignored by `.gitignore`.
- Security audit command `pnpm audit --prod` now returns 3 production dependency advisories after Story 22.3 remediation: 0 critical, 0 high, 2 moderate, and 1 low. Current output is captured in `evidence/dependency-audit-2026-06-05.md`.
- Story 22.7 role/export/RLS evidence passed in local/non-production scope: focused Story 22.7 Vitest, full Vitest, full Playwright, ESLint, type-check, and targeted evidence hygiene search all exited `0`. External employee-list API responses are shaped for external roles; DB column-level enforcement is not claimed.

## Needs Manual Review

- Supabase Auth settings, session lifetime, MFA, direct hosted RLS policy definitions, and migration history. These still require `SUPABASE_DB_PASSWORD` or equivalent direct database access.
- Vercel environment variable scopes, production rollback process, and production runtime settings beyond deployment metadata/build logs.
- Full production restore drill and actual recovery point/recovery time objectives. The nightly partial staging refresh was verified, but not a full restore.
- Code-owner review requirements, release approvals, and incident process.
- SMTP provider contract, DPA/subprocessor status, and email retention.
- Legal basis, data retention periods, DPIA need, controller/processor roles, and customer-specific privacy obligations.
- Diagnostic endpoint production runtime verification remains open as a post-merge release/readiness gate: pre-Story 22.1 checks showed removed diagnostic paths exposed on the checked production runtime, route handlers have since been removed in the repository, Story 22.1 is done, and the paths must be rechecked after the final Epic 22 deployment.

## Recommended Reading Order

1. `01_executive_summary.md`
2. `11_risk_register_and_open_questions.md`
3. `08_security_overview.md`
4. `07_gdpr_and_privacy_overview.md`
5. `06_data_inventory_and_data_flows.md`
6. `03_architecture.md`
7. `09_operations_support_and_sla.md`
8. `12_commercial_pack.md`
9. `14_evidence_index.md`
10. `15_dependency_advisory_risk_register.md`
11. `16_presentation_data_scope_and_access_preconditions.md`
12. `17_blocker_remediation_tracker.md`
13. `18_one_page_presentation_brief.md`
