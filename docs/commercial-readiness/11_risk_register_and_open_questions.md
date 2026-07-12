# Risk Register And Open Questions

Prepared: 2026-06-03
Updated: 2026-07-10 — Story 22.13 review-remediation evidence

## Risk Register

| ID | Risk | Area | Description | Likelihood | Impact | Priority | Current control | Recommended action | Owner | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Public debug/test endpoint exposure | Security | Pre-Story 22.1 private checks found unauthenticated diagnostic behavior that exposed config/auth metadata | High | High | High | Story 22.1 is done with route-handler removal and local/non-production gates passing; production runtime verification remains pending until the final Epic 22 deployment exists | After final Epic 22 deployment, recheck unauthenticated production runtime behavior and require non-success responses before claiming P0 readiness | Technical owner | Implementation done; release verification pending | Story 22.1, route-removal tests, private endpoint checks |
| R-002 | Dependency advisories | Security | Story 22.3 reduced `pnpm audit --prod` from 33 production advisories to 3 residual moderate/low advisories; current audit has 0 critical and 0 high | Medium | Medium | Medium | `next` upgraded to `16.2.7`; compatible transitive production advisories patched with pnpm overrides | Validate Nodemailer 8 and ExcelJS/uuid remediation path before enterprise use | Technical owner | Residual risk accepted | `15_dependency_advisory_risk_register.md`, `evidence/dependency-audit-2026-06-05.md` |
| R-003 | Stale export data path | Architecture/Data | Export route previously queried `custom_data`, while migrations removed JSONB/custom-data architecture | Medium | High | High | Story 22.3 route now reads custom fields from real employee-table columns and updates export tests | Keep real-column export regression coverage | Technical owner | Resolved in Story 22.3 | export route, migrations, export tests |
| R-004 | GDPR anonymization unscheduled | GDPR/Operations | Endpoint exists but not in `vercel.json`; retention basis unknown | Medium | High | High | Manual endpoint with cron secret | Approve retention policy and schedule/process | Privacy + technical owner | Open | gdpr route, vercel.json |
| R-005 | Service role bypass risk | Security | Server-only service clients bypass RLS, so every field and action must be constrained before the call | Medium | High | High | Story 22.13 makes custom-column creation one collision-safe atomic service RPC after HR authorization; assigned-presentation and HR-admin status changes use caller-bound atomic RPCs; external lifecycle delete is rejected; raw DDL is denied even to `service_role`; focused local caller/direct-DB evidence and all full local gates passed | Complete the remaining service-role path inventory and hosted staging verification; keep privileged operations explicit, narrow, and audited | Security/technical owner | Improved and full-gate verified locally in Story 22.13; broader inventory and hosted closure pending (`E-012`) | `createServiceRoleClient` usages, migrations `20260709194903`–`20260710150000`, `19_api_auth_matrix.md`, Story 22.13 tests |
| R-006 | API auth helper inconsistency | Security | Some routes call `requireAuthAPI()` without request despite cookie workaround | Medium | Medium | High | Some routes pass request | Standardize route auth calls | Technical owner | Open | route files, auth helper |
| R-007 | Full restore drill and backup-job failure detection | Operations | Full restore drill of the 2026-05-28 production backup into local non-production succeeded on 2026-06-11. Story 22.12 closed the silent-failure and Auth-reprovisioning follow-ups. Story 22.13 makes the runtime partial archive required; only the managed-role dump remains explicitly best-effort | Low | High | Low | Full drill evidence; pinned one-shot CLI retry; GitHub-issue alerting fires for any non-best-effort failure; immutable per-run artifacts publish a checksum manifest last; selection verifies integrity before runtime config/schema/employee replay in one transaction | Repeat full and partial restore drills; verify the revised hosted workflow and keep best-effort scope explicit | Operations owner | Historical drill/follow-ups resolved; Story 22.13 revised hosted partial-run verification pending under `E-012`/`R-024` | `evidence/restore-drill-2026-06-11.md`, `evidence/backup-failure-alerting-2026-06-16.md`, backup workflow, `.github/backup/`, `scripts/notify-backup-failure.mjs` |
| R-008 | PII in logs | GDPR/Security | Console logs include user emails, employee ids, errors, potentially PII | Medium | Medium | Medium | Platform logs only | Redact and structure logs | Technical owner | Open | `rg console.* src` |
| R-009 | Rate limiting absent | Security | No rate limiting found for login/import/export/debug endpoints | Medium | Medium | Medium | Auth checks on many routes | Add rate limiting/request size limits | Technical owner | Open | code search |
| R-010 | Audit migration history gap | Data/Security | Confirmed on 2026-06-11: `supabase migration list --linked` shows the hosted production migration history is empty — all 56 migrations are local-only, so the production schema was built outside the tracked migration flow (includes the untracked `employee_column_changes` creation) | High | Medium | High | Repository migrations are the canonical reviewable schema source; the restore drill verified backup-based recovery only — R-023 shows a migrations-rebuilt environment would diverge from hosted policies | Story 22.10 prepared the remote-history baseline (`migration repair --status applied`) as an owner-run cutover runbook (`docs/commercial-readiness/27_supabase_cutover_runbook.md`); execute on staging then production at the Epic 22 cutover before relying on migration-based deployments | Technical owner | Reconciled and verified on **staging** (2026-06-14: remote history baselined — 57 migrations local↔remote in sync); closes in production at the Epic 22 cutover | `22_supabase_security_evidence_package.md`, `26_environment_reconciliation_inventory.md`, `docs/commercial-readiness/27_supabase_cutover_runbook.md` |
| R-011 | Column-level security app-layer | Security/GDPR | RLS is row-level; column visibility is enforced by application logic | Medium | High | High | `column_config` permissions and export checks | Add role-view/export tests and consider DB views/RPC | Security owner | Open | role utilities, migrations |
| R-012 | Remaining platform control gaps | Operations/Security | GitHub branch protection, CI, Vercel deployment metadata, and backup run were verified; Story 22.8 restored CLI access and inventoried hosted RLS policies, advisors, SSL/network posture, and migration history — remaining review items are Supabase Auth session/MFA settings (dashboard-only) and Vercel env scopes | Medium | High | High | CI/branch protection/backup execution verified; Story 22.8 CLI evidence | Review remaining Supabase Auth dashboard settings and Vercel production settings | IT owner | Open (scope narrowed by Story 22.8) | GitHub/Vercel metadata; `22_supabase_security_evidence_package.md` |
| R-016 | Repository security posture needs hardening review | Security | Private repository metadata review found security-control decisions that need owner review | Medium | Medium | Medium | Branch protection and CI checks | Enable available security features or document compensating controls | Technical owner | Open | Private GitHub metadata |
| R-017 | Vercel dynamic server usage build warnings | Operations/Architecture | Latest production build succeeded but logged `DYNAMIC_SERVER_USAGE` warnings for admin pages that use cookies during static generation | Medium | Low/medium | Medium | Build completed and deployment `READY` | Review whether pages should be explicitly dynamic or adjusted to avoid static-generation warnings | Technical owner | Open | Vercel build logs |
| R-018 | Supabase DB access posture | Security | Verified 2026-06-11: database SSL enforcement is disabled and network restrictions are allow-all (IPv4/IPv6); formally risk-accepted for the working-pilot scope with documented hardening steps | Medium | High | High | Credentials/RLS gate access; app traffic uses HTTPS Data APIs; backup clients are expected to negotiate TLS, but this is unconfirmed — confirming it is part of the documented hardening steps | Execute documented hardening (enable SSL enforcement, restrict network ranges) before enterprise use | Technical/IT owner — Rasmus Thunborg | Risk-accepted 2026-06-11 (owner named 2026-06-12); review 2026-09-30 | `22_supabase_security_evidence_package.md` |
| R-019 | Supabase physical backup/PITR posture | Operations | PITR is not enabled (paid feature; current plan kept per NFR1); GitHub logical backups are the verified mechanism and passed a full restore drill on 2026-06-11; nominal RPO follows the nightly schedule (~24h). Story 22.12 added failure alerting and a pinned one-shot CLI retry. Story 22.13 makes the runtime partial archive mandatory while retaining only the roles dump as best-effort | Medium | High | High | Verified historical logical pipeline/full drill; non-best-effort failures alert; immutable manifest-last runtime runs are integrity-checked and transactionally replayed | Revisit PITR/platform backups if a contract requires sub-24h RPO; run the revised hosted partial workflow and track its scope under `R-024` | Operations owner — Rasmus Thunborg | Risk-accepted 2026-06-11; review 2026-09-30; revised Story 22.13 hosted workflow verification pending | `22_supabase_security_evidence_package.md`, `09_operations_support_and_sla.md`, `evidence/restore-drill-2026-06-11.md`, `evidence/backup-failure-alerting-2026-06-16.md` |
| R-020 | Staging/prod schema drift | Data/Operations | Story 22.10 classified core hosted drift. Production-only `seably_*`-style employee fields are legitimate config-backed runtime columns and therefore operational data rather than fixed migration schema | Medium | Medium | Medium | Story 22.10 adopted/dropped fixed-schema drift. Story 22.13's required archive restores `column_config`, synchronizes validated config-backed columns with a fixed type map, then restores employees in one transaction; focused live local restore evidence passed | Apply/re-verify the Story 22.13 migration and revised refresh on hosted staging, then production; repair any legacy physical/config orphan through an approved migration/operator procedure | Technical owner | Core drift reconciled on staging 2026-06-14; runtime-column compatibility verified locally 2026-07-09; hosted revised path and production closure pending | `26_environment_reconciliation_inventory.md`, `27_supabase_cutover_runbook.md`, runtime restore tests |
| R-021 | Test environment isolation | Operations/Data | Mutating evidence tests must not silently target production, a remote project, or another repository's default local Supabase ports | Medium | High | High | Shared Epic 22 helper reads `supabase/config.toml`, requires `hr-masterdata` on `15421`/`15422`, rejects wrong/remote targets, and fingerprints migration `20260710150000`; focused high-port live run passed 94/94 | Keep all Epic 22 DB evidence suites on the shared helper and preserve explicit diagnostics | Technical owner | Mitigated locally; monitor CI/staging configuration | `tests/helpers/epic-22-supabase-test-environment.ts`, helper tests, `.env.test` key/host inspection |
| R-022 | Controlled production-data presentation | GDPR/Security | A presentation could expose out-of-scope employee records, fields, exports, screenshots, browser history, recordings, transcripts, AI notes, admin-only views, or debug/test views if the presenter leaves the intended role/account context or presentation scope | Medium | High | High | Story 22.4 defines standing production-data presentation controls | Use a named app account, stay within the demonstrated role and business population, close admin/debug paths, and handle exports/screenshots/recordings through the presentation owner's process | Business/data owner + presenter | Mitigated by process; verify per presentation | `16_presentation_data_scope_and_access_preconditions.md` |
| R-023 | Hosted RLS policy drift | Security/Data | Dated states differ: production's 2026-05-28 snapshot had 26 policies, the pre-reconciliation migration baseline had 22, hosted staging was observed at 19 after Story 22.10, and the Story 22.13 migration-built high-port stack now has 17 | High | High | High | Migrations remain canonical. Story 22.13 removes client `users` UPDATE policies, replaces broad audit policies with one scoped SELECT policy, makes column lifecycle active-HR-only, and adds caller-bound atomic presentation/status functions; focused local catalog/direct-role evidence passed 94/94 | Complete `E-012`; apply the four migrations from `20260615000000` through `20260710150000` to staging and re-inventory 17 policies/advisors; apply all pending migrations at production cutover | Technical owner | Story 22.10 hosted staging state verified (19); Story 22.13 intended/local state verified (17); hosted Story 22.13 and production closure pending | `22_supabase_security_evidence_package.md`, `26_environment_reconciliation_inventory.md`, `27_supabase_cutover_runbook.md` |
| R-013 | Email DPA/retention | GDPR/Legal | SMTP provider unknown and emails can include employee data | Medium | Medium | Medium | SMTP env vars | Identify provider and DPA/retention | Legal/privacy | Open | email service |
| R-014 | Dynamic schema changes | Architecture/Security | Runtime custom columns create physical employee fields; broad metadata or raw-DDL access could relabel/collide with privileged fields or leave metadata/schema out of sync | Medium | High | High | Story 22.13 restricts lifecycle RLS to active HR Admin, denies raw `add_custom_column_to_employees` to every API role, and uses a service-only atomic creation RPC with identifier/type validation, physical/config collision checks, quoted DDL, and one-transaction metadata+column+index creation. External roles may edit assigned values and limited presentation metadata only through a caller-bound, row-locked RPC that rechecks the current role assignment; they cannot perform lifecycle create/delete or direct config writes | Apply/re-verify on hosted staging/production; keep legacy orphan repair operator-controlled; consider a migration-backed physical-drop policy if product requirements later require it | Technical owner | Mitigated and full-gate verified locally; hosted apply/re-verification pending (`E-012`) | migrations `20260709194903`–`20260710144000`, column repository/routes, direct-DB and caller tests |
| R-015 | Hard delete availability | GDPR/Data | Employee delete route exists; legal retention rules unknown | Low/medium | High | Medium | Role checks | Define when hard delete is allowed | Product/legal | Open | employee route |
| R-024 | Partial staging refresh scope and snapshot consistency | Operations/Data | The nightly partial refresh deliberately replays only `column_config` and `employees`; successful `TRUNCATE employees ... CASCADE` clears dependent party/audit data that is not replayed. A legacy physical column without config can fail employee replay. The separate full schema/data/roles artifacts are not guaranteed to share one database snapshot | Medium | Medium/high | High | Story 22.13 requires one internally consistent custom-format runtime archive, writes immutable per-run artifacts and a checksum manifest last, rejects incomplete/corrupt candidates, validates/synchronizes config-backed columns, performs config→schema→employees in one transaction, and rolls back+alerts on any non-best-effort failure; identity scope and caveats are tracked in 09/26 | Run the revised hosted workflow; decide whether dependent staging data must be replayed; add a transaction-consistent full-backup method if recovery requirements demand it; repair legacy orphans through approved procedure | Operations + technical owner | Mitigated for atomic publication and partial replay; accepted scope/follow-ups open | `09_operations_support_and_sla.md`, `26_environment_reconciliation_inventory.md`, backup workflow, `.github/backup/` |

## Must Fix Before Enterprise Use

- After final Epic 22 deployment, complete production runtime verification for the removed diagnostic endpoint paths; unauthenticated requests must return non-success responses before P0 readiness is claimed.
- Keep the dependency advisory register current and close residual moderate/low advisories before enterprise use.
- Keep selected-export real-column regression coverage current.
- Advisors, SSL/network posture, and migration history were verified in Story 22.8; the hosted RLS policy inventory was captured from the 2026-05-28 backup snapshot (not a live 2026-06-11 read). Story 22.10 authored and locally verified the reconciliation (policy drift `R-023`, remote-history baseline `R-010`, schema drift `R-020`, `search_path`/SECURITY DEFINER advisor remediation; leaked-password protection moved to Epic 23 / Story 23.4) and prepared the owner-run cutover runbook (`docs/commercial-readiness/27_supabase_cutover_runbook.md`); execute it on staging then production to close `R-010`/`R-020`/`R-023`. Remaining beyond that: confirm Auth session/MFA settings and complete route auth coverage.
- Story 22.13 is review-ready: focused high-port evidence is green (94/94; 17 policies) and the final Vitest (3,125 passed/30 skipped), Playwright (162 passed/53 skipped/0 flaky), type-check, and lint gates passed. Apply/re-verify the four pending migrations through `20260710150000` on hosted staging in order; then include the full pending sequence in the production cutover. Do not treat local evidence as hosted proof (`E-012`).
- Managed database transport/network/backup posture is formally risk-accepted (2026-06-11, review 2026-09-30); execute the documented hardening steps before enterprise use.
- Keep mutating tests isolated from production before every run.
- Follow the standing production-data presentation controls for role/account context, population scope, visible fields, exports, screenshots, browser history, recordings, transcripts, AI notes, and prohibited admin/debug paths.
- Define retention/deletion/anonymization policy.
- Full backup restore test is done (2026-06-11); backup-failure alerting and a one-shot CLI-setup retry were added in Story 22.12. Story 22.13's revised partial path is locally verified but still needs a hosted run; keep periodic drills and the `R-024` scope explicit.

## Should Fix

- Add rate limiting and file size limits.
- Redact logs and reduce personal data in runtime logs.
- Standardize API auth helper usage with request objects.
- Add admin action audit logging.
- Add E2E/security tests for all roles and exports.
- Document incident response.
- Complete the hosted Story 22.13 schema/policy delta and revised partial-refresh verification.

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
