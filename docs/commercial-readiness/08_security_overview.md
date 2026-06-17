# Security Overview

Prepared: 2026-06-03
Basis: code/config review, `pnpm audit --prod`, sanitized GitHub/Vercel platform metadata, private endpoint checks, sanitized Supabase metadata, and Supabase connector access results.

## Summary

The system has meaningful security foundations: Supabase Auth, active-user checks, API role helpers, RLS migrations, Zod validation, strict TypeScript, ignored local env files, verified CI/branch-protection evidence, current critical/high production dependency advisory remediation, and Story 22.1 route-handler removal. It is not ready for enterprise security review without completing the post-merge production diagnostic endpoint verification gate, tracking residual dependency advisories, reconciling the hosted RLS policy drift inventoried in Story 22.8 (`R-023`), confirming hosted Auth session/MFA settings (dashboard-only), formalizing logs/monitoring, and reviewing service-role bypasses.

## Security Areas

| Security area | Current implementation | Evidence | Assessment | Risk | Recommended improvement | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| Authentication | Supabase Auth login with app user active check | `src/app/api/auth/login/route.ts`, `src/lib/server/auth.ts` | Acceptable | No MFA/SSO verified | Confirm Supabase Auth policy; add SSO/MFA if required | Medium |
| Authorization | API role helpers and RLS migrations | `src/lib/server/auth.ts`, `supabase/migrations` | Acceptable/partial | API routes are skipped by middleware and must self-protect | Add automated auth coverage for every route | High |
| Diagnostic endpoints | Pre-Story 22.1 private checks found unauthenticated diagnostic behavior; Story 22.1 is done with route-handler removal and local/non-production gates passing; production runtime checks must be rerun after final Epic 22 deployment | Story 22.1, route-removal tests, private endpoint checks | Improved; release verification pending | Prior data/config/auth metadata exposure; production runtime closure not yet verified after deployment | After final Epic 22 deployment, require non-success unauthenticated responses before claiming P0 readiness | High |
| Database RLS | RLS enabled on major tables in migrations; local `pg_policies` cross-check done; hosted production policy inventory reviewed via 2026-05-28 backup schema: 26 policies vs 22 migration-defined, with drifted names/definitions and empty remote migration history. Story 22.10 authored + locally verified the reconciliation migration and remote-history baseline | migrations, `22_supabase_security_evidence_package.md`, `26_environment_reconciliation_inventory.md`, `21_role_export_rls_test_evidence.md` | Reconciliation prepared; hosted apply pending cutover | Hosted policies were changed outside migrations; column-level permissions are app-layer | Execute the cutover runbook (`docs/commercial-readiness/27_supabase_cutover_runbook.md`) on staging then production to close `R-023`/`R-010`; enforce the migrations-only change policy | High |
| Managed database transport controls | Database SSL enforcement verified disabled via CLI on 2026-06-11; risk-accepted for working-pilot scope with technical/IT owner, review 2026-09-30 | `22_supabase_security_evidence_package.md` | Risk-accepted with owner/date | Direct DB clients could connect without TLS; app traffic uses HTTPS Data APIs | Enable SSL enforcement after confirming backup workflow pooler connections use TLS | High |
| Managed database network controls | Database network restrictions verified allow-all (IPv4/IPv6) via CLI on 2026-06-11; risk-accepted for working-pilot scope with technical/IT owner, review 2026-09-30 | `22_supabase_security_evidence_package.md` | Risk-accepted with owner/date | Open network posture relies on credentials/RLS; GitHub Actions backup needs dynamic egress | Restrict to required ranges or move backups to stable egress before enterprise use | High |
| Supabase SSO/MFA posture | Password auth via Supabase Auth; advisors confirm leaked-password protection is disabled; session/MFA settings not directly verified (owner review by 2026-09-30). Auth attack protection (leaked-password + CAPTCHA) moved to Epic 23 (Story 23.4) on 2026-06-14 | `22_supabase_security_evidence_package.md`, `docs/sprint-artifacts/story-23.4.md`, private platform-control evidence | Partial; deferred to Epic 23 | Leaked-password protection still off until Epic 23 (Story 23.4) enables it; detailed provider state held privately | Epic 23 (Story 23.4): enable leaked-password protection + decide CAPTCHA on staging and production Auth; confirm session/MFA + enterprise SSO requirements | Medium |
| Service role | Server helper bypasses RLS for admin/cron/export flows | `createServiceRoleClient` usages | Acceptable only with review | Mistakes bypass DB controls | Review and test every service-role path | High |
| Input validation | Zod schemas for employee/user/columns/dates/staffing | `src/lib/validation` | Strong | Some messages remain English | Keep schemas shared and add route tests | Medium |
| Secrets management | `.env*` ignored except `.env.example`; examples only tracked | `.gitignore`, `git ls-files -- .env*` | Acceptable | Production secrets not inspected; local `.env` files exist | Rotate if ever exposed; manage via Vercel/Supabase/GitHub secrets | Medium |
| Test environment separation | `.env.test` points at local/non-production Supabase | local env file key/host inspection | Improved/partial | Tests remain unsafe if local env guard is bypassed or CI uses production credentials | Keep isolated test/staging env vars and test data controls | Medium |
| Dependency security | `pnpm audit --prod` now reports 3 residual advisories after Story 22.3 remediation | audit evidence and advisory register | Improved/partial | Residual moderate/low `nodemailer` and `exceljs>uuid` advisories | Validate Nodemailer 8 and ExcelJS/uuid remediation path | Medium |
| Logging | Many `console.*` calls; some log emails/user IDs/errors | `rg console.* src` | Partial | Personal data in platform logs | Redact PII and standardize structured logging | High |
| Cron security | `CRON_SECRET` checked and production fails closed | cron route files | Acceptable | Secret must be configured correctly | Verify Vercel env scopes and cron logs | Medium |
| Rate limiting | No rate limiter found | search result | Weak/unknown | Login/export/import abuse | Add rate limiting and size limits | High |
| Backups | Nightly dumps to Supabase Storage with 14-day retention and partial staging restore; full restore drill of a production backup into a non-production target verified on 2026-06-11; backup-failure alerting + one-shot CLI-setup retry added in Story 22.12 (2026-06-16) | GitHub workflow, `evidence/restore-drill-2026-06-11.md`, `evidence/backup-failure-alerting-2026-06-16.md` | Verified execution and restorability; failure alerting added and verified | Backups contain personal data; auth users are outside logical backup scope; the 2026-06-05 silent-gap class is now closed by failure alerting | Keep periodic restore drills; restrict bucket access | High |
| Supabase physical backups | PITR not enabled (paid feature, current plan kept per NFR1); risk-accepted with operations owner, review 2026-09-30; GitHub logical backups are the verified mechanism | `22_supabase_security_evidence_package.md`, `evidence/restore-drill-2026-06-11.md` | Risk-accepted with owner/date | RPO limited to nightly logical backups (~24h nominal); the 2026-06-05 unnoticed failure is now mitigated by Story 22.12 backup-failure alerting, so a silent gap can no longer go undetected | Revisit PITR if a contract requires sub-24h RPO | High |
| CI/CD | Type-check, lint, unit/integration in GitHub Actions; branch protection evidence verified | `.github/workflows/test-check.yml`, private GitHub metadata | Acceptable | E2E not in shown CI; repository security posture needs private hardening review | Add E2E release gate and harden repository security controls where available | Medium |
| Encryption in transit | Expected through Vercel/Supabase HTTPS | platform intent | Unknown/acceptable | Not verifiable from repo | Confirm platform config and custom domains | Medium |
| Encryption at rest | Supabase/Vercel platform assumption | not directly in code | Unknown | Not verifiable from repo | Confirm vendor controls/contracts | Medium |
| File uploads | CSV import uses `file.text()` and CSV extension check | import route | Partial | No explicit size limit/content scanning | Add max file size and validation hardening | Medium |
| CORS | No custom permissive CORS found | route review | Acceptable | Not fully audited | Keep same-origin APIs | Low |
| Production access | GitHub admin access available to current operator; Vercel project metadata readable; Supabase HR project connector access denied | platform metadata | Partial | Unclear full access roster for Vercel/Supabase/GitHub | Define access matrix and review cadence | High |
| GitHub repository security posture | Repository security feature state checked privately | Private GitHub metadata | Needs review | Secrets/vulnerable dependencies may be missed before merge if controls are not enabled | Enable available repository security features or document compensating controls | High |
| Staging/prod schema alignment | REST schema metadata compared; Story 22.10 classified the `employees` drift (staging junk `asdas`/`testerere` to drop; production `seably_*` are runtime custom columns, not migration schema) | Supabase REST schema metadata, `26_environment_reconciliation_inventory.md` | Reconciliation prepared; hosted apply pending cutover | Staging `employees` schema differs from production until the cutover drops the junk columns | Execute the cutover runbook to drop staging junk columns on staging then production (`R-020`) | Medium |

## Dependency Audit Findings

Initial Story 22.3 `pnpm audit --prod` returned 33 advisories:

- 15 high, 14 moderate, 4 low.
- High examples include Next.js 16 denial-of-service/middleware/proxy/cache-related advisories and `minimatch` ReDoS through `exceljs` dependencies.
- Moderate examples include `ws` through Supabase realtime and `uuid` through `exceljs`.
- Low examples include Nodemailer and Next.js advisories.

Story 22.3 remediation updated `next` to `16.2.7` and added pnpm overrides for compatible transitive production fixes. Current `pnpm audit --prod` returns 3 residual advisories: 0 critical, 0 high, 2 moderate, and 1 low. Residual `nodemailer` and `exceljs>uuid` advisories are risk-accepted in `15_dependency_advisory_risk_register.md` with owners, target dates, and compensating controls.

## Specific High-Priority Findings

1. Pre-Story 22.1, a debug diagnostic route exposed environment/auth metadata during private runtime checks. Story 22.1 is done with route-handler removal and local/non-production gates passing; recheck the production runtime after final Epic 22 deployment.
2. Pre-Story 22.1, a database diagnostic route exposed column configuration metadata during private runtime checks. Story 22.1 is done with route-handler removal and local/non-production gates passing; recheck the production runtime after final Epic 22 deployment.
3. Selected export route custom-field handling was corrected to use real employee-table columns; keep regression coverage for role-filtered exports.
4. `employee_column_changes` exists in production and staging REST schema metadata, but its creation migration is not present in tracked `supabase/migrations`; later migrations assume it exists.
5. GDPR anonymization endpoint exists but is not scheduled in `vercel.json`.
6. Multiple API route handlers omit `request` when calling auth helpers, despite a documented Next.js 16 production cookie workaround.
7. Managed database transport/network controls were verified on 2026-06-11: SSL enforcement is disabled and network restrictions are allow-all. Both are formally risk-accepted for the working-pilot scope (technical/IT owner, review 2026-09-30) with hardening steps documented in `22_supabase_security_evidence_package.md`.
8. Managed-platform backup/PITR posture is resolved for the working-pilot scope: PITR remains disabled (paid feature, risk-accepted by operations owner, review 2026-09-30) and the GitHub logical backup mechanism passed a full restore drill on 2026-06-11 (`evidence/restore-drill-2026-06-11.md`). The two Story 22.8 follow-ups are closed in Story 22.12 (2026-06-16): backup-failure alerting was added (the 2026-06-05 missing run) and auth-user provisioning is documented in the recovery runbook.
9. `.env.test` points at local/non-production Supabase; staging automation secrets should be reviewed privately before CI/staging automation depends on them.

## Security Review Checklist Before External IT Review

- After final Epic 22 deployment, recheck unauthenticated diagnostic endpoint behavior on the production runtime and require non-success responses before claiming P0 readiness.
- Keep dependency advisory register current and close residual moderate/low advisories before enterprise use.
- Run full test suite after dependency updates.
- Verify all API routes require auth unless explicitly public.
- Confirm hosted RLS policies by role with staging/prod test users.
- Confirm scheduler, SMTP, Supabase, Vercel, and GitHub secret scopes without disclosing values or secret names.
- Managed database transport/network posture is formally risk-accepted (2026-06-11, review 2026-09-30); execute the documented hardening steps before enterprise use.
- Reconcile staging/prod schema drift before treating staging as production-equivalent.
- Ensure test/integration/e2e environments do not target production unless a specific read-only verification mode is used.
- Review service-role usage and ensure pre-authorization.
- Redact logs and avoid logging employee/user personal data.
- Backup restore test is done (full restore drill 2026-06-11, `evidence/restore-drill-2026-06-11.md`); backup-failure alerting was added in Story 22.12 (2026-06-16). Remaining: document backup encryption/storage/access controls.
- Define incident response and admin access review process.
