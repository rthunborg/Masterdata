# Commercial Readiness Documentation Index

Prepared: 2026-06-03
Updated: 2026-09-12 — staging v67 and bounded hosted acceptance complete; owner staging verification and production prerequisites remain open

Story 22.15 staging v67 is applied and verified: PR #100 head 0150d55b4aa359b19149fd6c288242809e14901b merged as ad9650ccfc8be412447a03847cc7ddfb372f8666, and the one forward migration applied with no repair. Staging history is 67/67 with a strict 16/16 post-apply catalog; audit preservation, repayment aggregates and all four permission hashes are unchanged, while advisors retain only three classified performance WARN. The separately approved hosted staging fixture/RPC acceptance executed once on 2026-09-12: all 21 checks passed (0 failed, 0 skipped); all five exact trigger contracts matched; fixtures were absent, staffing and aggregate restoration held, and the final catalog remained 16/16. Owner staging verification remains open. Production remains paused; Story 22.15 is in-progress and Epic 23 is on hold.

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
| `21_role_export_rls_test_evidence.md` | Security, IT, reviewers | Historical Story 22.7/22.13 role, API/export, Zod, and local RLS evidence plus fresh Story 22.15 active-authorization/deletion/live-gate coverage |
| `22_supabase_security_evidence_package.md` | Security, IT, reviewers | Dated Story 22.8/22.10/22.13 Supabase evidence plus Story 22.15 migration, authorization, dependency, and owner-gated cutover addenda |
| `23_privacy_annex_draft.md` | Legal/privacy, management | Draft privacy annex: controller/processor assumptions per commercial model, legal basis status, data categories, retention, DSAR handling, DPIA screening, open legal questions |
| `24_subprocessor_register.md` | Legal/privacy, procurement, security | Draft subprocessor register with purpose, data exposure, environment, DPA/transfer status, and review owner per service |
| `25_incident_breach_process.md` | IT, security, legal/privacy, operations | Draft incident/breach process: roles, severity, triage, evidence capture, notification timing, communication templates, post-incident review |
| `26_environment_reconciliation_inventory.md` | Security, IT, reviewers | Current staging is 67/67 with no pending version, strict 16/16 post-apply proof, verified preservation, and completed bounded 21-check hosted acceptance. Owner staging verification remains open. Production is provisional at 56 repair candidates plus 11 applies after fresh read-only classification; strict remaining failures keep it no-go and paused. |
| `27_supabase_cutover_runbook.md` | Security, IT, operations | Completed staging correction must not be repeated. Current validation uses post_apply; standing future migration authorization preserves separate history-repair/isolation/settings/deployment/merge/reopening gates. |
| `28_migrations_only_change_policy.md` | Security, IT, developers | Binding migrations-only policy for hosted schema, RLS, function, and grant changes |
| [`29_production_pause_release_safeguards.md`](29_production_pause_release_safeguards.md) | Operations, security, reviewers | Committed pause lock, empty schedules, static API/mutation shutdown, production-build guards and separate reopening approval |
| [Historical reconciliation/pause preparation](evidence/staging-reconciliation-and-pause-2026-09-09.md) | All reviewers | Redacted preflight, exact revisions, local verification attempts and remaining gates |

## Verified

- Historical PR #95 exact-commit Playwright evidence (2026-09-09): 163 passed / 47 classified skips / 0 failed, exit 0, on `3b75d5e78829426edfddce3207d4c16fb767aff1`. [Result and all skipped cases](evidence/production-readiness-pr95-playwright-2026-09-09.md). PR #95 was subsequently owner-authorized and merged to staging at `8c82bd8f4cc3c5076b2b6a37f4ced209bd8cba1c`; its merge gate is closed. PR #96 has separate final tests/review and merge approval gates; no hosted write or reopening is authorized.

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
- The 2026-06-03 scheduled Supabase backup workflow run completed successfully, including backup upload, pruning, and partial staging restore for `employees` and `column_config`. The 2026-06-05 run failed at the "Setup Supabase CLI" step and went unnoticed for six days; Story 22.12 (2026-06-16) closed this gap by adding backup-failure alerting (an `if: failure()` step that opens/comments a `backup-failure` GitHub issue) plus a one-shot CLI-setup retry with a pinned CLI version, so a silent backup gap cannot recur.
- Supabase CLI project access confirmed production and staging project visibility. Project names, refs, and regions are recorded privately.
- Production and staging Supabase REST schema metadata confirmed the expected public tables and eight RPC paths exist, including `employees`, `users`, `column_config`, `important_dates`, `employee_column_changes`, `staffing_needs`, `user_filters`, and notification log objects. No application rows were read.
- Supabase schema drift was identified: staging `employees` has custom-looking columns `asdas` and `testerere`, while production has newer `seably_*` columns not present in staging.
- Supabase project controls were checked. Public summary: hosted database/security controls require hardening or formal risk acceptance; detailed posture is recorded privately. This is separate from the verified GitHub logical backup workflow.
- Local env file investigation: `.env.local` still points to production Supabase for developer runtime, while `.env.test` has been reset to local/non-production Supabase placeholders by Story 22.2; `.env.production` is empty; no local env file contains a Postgres DB URL/password key.
- Supabase project secret-name inventory was checked privately. Public summary: production has expected application secret configuration to review; staging secret posture requires review. Secret values and secret names are not disclosed in this public package.
- The Supabase connector still listed only the unrelated `SunnySeat` project and returned a permission error for the HR project refs. (Historical/superseded for the CLI part: the earlier `db query`/`db advisors` block from a temporary login-role permission error no longer applies — Story 22.8 re-verified on 2026-06-11 that authenticated CLI access works without `SUPABASE_DB_PASSWORD`; see the Story 22.8 bullet below.)
- Environment variable documentation from `.env.example` and local `.env*` file names/key names without reading secret values.
- Non-disclosing secret scan: tracked env file is `.env.example`; local `.env*` files are ignored by `.gitignore`.
- Historical dependency-patch verification snapshot (superseded gate statements; PR #98 checks, merge and staging apply subsequently completed): the 2026-09-09 Story 22.15 audit failure is historical. The 2026-09-10 narrow patch returns the audit to 0 critical / 0 high / 1 moderate, with exit 1 solely for the existing ExcelJS→UUID acceptance through 2026-09-30. No new waiver was added. Fresh full local gates passed on c27a9ee7543b681fb9424484ee3caf7b402a33c7: Vitest 3,442 passed with zero skips; Playwright 163 passed / 47 individually classified skips / zero failures or errors; both exact commands exited 0. Named staging preview build, TypeScript and zero-error lint passed. Exact timings and report integrity are recorded in the dated preparation evidence. Story 22.15 remains in-progress and Epic 23 remains on hold. This result-only documentation commit must receive fresh CI, Vercel, and Reviewbot verification after push; those future checks are open. Hosted repair/apply, staging/main merges, production deployment/settings, and reopening remain separately owner-gated.
- Story 22.7 role/export/RLS evidence passed in local/non-production scope: focused Story 22.7 Vitest, full Vitest, full Playwright, ESLint, type-check, and targeted evidence hygiene search all exited `0`. External employee-list API responses are shaped for external roles; DB column-level enforcement is not claimed.
- Story 22.8 (2026-06-11): Supabase advisors and migration list are now accessible through authenticated CLI (83 advisor warnings summarized: 20 security, 63 performance, 0 errors; remote migration history verified empty). SSL enforcement is disabled and network restrictions are allow-all — both formally risk-accepted with owner and review date 2026-09-30. A full restore drill of the 2026-05-28 production backup into the local non-production stack succeeded with 7 of 8 validation checks passed and one not applicable (`docs/commercial-readiness/evidence/restore-drill-2026-06-11.md`). Hosted RLS policy drift vs migrations was discovered in the 2026-05-28 backup snapshot and registered as `R-023`.
- Story 22.13 local evidence (2026-07-10): the project-scoped Supabase stack was rebuilt on `15421`/`15422` through migration `20260710150000`; the migration-built catalog has 17 policies and the focused authorization/restore/backup-integrity batch passed 94/94. Verified behaviors include active-HR-only column lifecycle, atomic assigned-presentation and user-status authorization, service-only atomic custom-column creation with raw DDL revoked, explicit activity failure signaling, scoped trigger-owned audit history, staffing role/actor binding, immutable manifest-last backups, wrong-project test rejection, and config-before-schema-before-employees restore. Final gates passed: Vitest 3,125/30 skipped, Playwright 162/53 skipped/0 flaky, type-check exit 0, and lint exit 0. This remains historical local non-production evidence; Story 22.15 `E-013` now owns hosted staging re-verification and the current release gate.
- Historical Story 22.15 repository state (2026-09-01; superseded rollout plan): 63 migration versions are explicitly partitioned by `supabase/migration-baseline-manifest.json` into 57 versions repairable only after environment-specific catalog proof and six forward applies. The original `20250113000000` room-assignment migration is restored byte-for-byte, inactive JWTs no longer receive an application role, saved filters require an active app user, and app-user deletion is atomic before separate Auth cleanup. A clean local reset applied all 63 migrations; live database 11/11, Story 22.14 PostgREST 1/1, live export 5/5, full Vitest 3,342/3,342 with zero skips, exact full Playwright 163 passed / 47 classified skips / 0 failed, type-check, zero-error lint, production build, and dependency threshold passed. The 47 E2E skips are not passing evidence: 9 require explicitly authorized non-production notification capture and 38 are obsolete/superseded or deterministic-fixture coverage debt. Historical Story 22.10 staging changes occurred on 2026-06-14, but no Story 22.15 hosted delta has been applied. The authoritative branch observations were `origin/staging` `bcb1a0e5bed3d06b9b7582320f491964ffc5a0b9` and `origin/main` `822350986f4c023948a7bbf490ddffc371185c4a`; neither is the still-required final reviewed remediation SHA.

## Needs Manual Review

- Supabase Auth session lifetime and MFA settings (dashboard-only). Preserve the dated 2026-06-14 57-migration/19-policy snapshot as historical. Current staging is 67/67 with no pending version or repair and strict 16/16 post-apply proof; bounded hosted acceptance passed 21/21, while owner staging verification and production inventory remain open. Production stays paused. Leaked-password protection and CAPTCHA remain held under Epic 23 Story 23.4.
- Vercel environment variable scopes, production rollback process, and production runtime settings beyond deployment metadata/build logs.
- Recovery time objective for a full production recovery, including auth-user re-provisioning (auth schema is outside logical backup scope). The full restore drill itself was verified on 2026-06-11; nominal RPO follows the nightly backup schedule (~24h). The 2026-06-05 backup failure that went unnoticed for six days had shown the effective recovery point was not assured; Story 22.12 (2026-06-16) added backup-failure alerting plus a CLI-setup retry so silent gaps are now detected, and auth-user re-provisioning is documented as the accepted manual recovery step (with the staging-refresh `users` exclusion deliberately kept). The RTO itself remains unmeasured.
- Code-owner review requirements, release approvals, and incident process.
- SMTP provider contract, DPA/subprocessor status, and email retention.
- Legal basis, data retention periods, DPIA need, controller/processor roles, and customer-specific privacy obligations.
- Diagnostic endpoint production runtime verification remains open as a post-merge release/readiness gate: pre-Story 22.1 checks showed removed diagnostic paths exposed on the checked production runtime, route handlers have since been removed in the repository, Story 22.1 is done, and the paths must be rechecked after the final Epic 22 deployment.
- Story 22.15 staging v67 was applied once with no repair; current history is 67/67 and strict post_apply passes 16/16. Hosted fixture/RPC acceptance completed 21/21; complete owner staging verification before production remains governed by the runbook prerequisites and separate non-migration gates. See `17_blocker_remediation_tracker.md#tracker`.

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
14. `22_supabase_security_evidence_package.md`
15. `26_environment_reconciliation_inventory.md`
16. `27_supabase_cutover_runbook.md`
17. `28_migrations_only_change_policy.md`

18. `29_production_pause_release_safeguards.md`
19. `evidence/staging-reconciliation-and-pause-2026-09-09.md`
