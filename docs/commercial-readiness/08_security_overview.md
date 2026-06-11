# Security Overview

Prepared: 2026-06-03
Basis: code/config review, `pnpm audit --prod`, sanitized GitHub/Vercel platform metadata, private endpoint checks, sanitized Supabase metadata, and Supabase connector access results.

## Summary

The system has meaningful security foundations: Supabase Auth, active-user checks, API role helpers, RLS migrations, Zod validation, strict TypeScript, ignored local env files, verified CI/branch-protection evidence, current critical/high production dependency advisory remediation, and Story 22.1 route-handler removal. It is not ready for enterprise security review without completing the post-merge production diagnostic endpoint verification gate, tracking residual dependency advisories, directly confirming hosted RLS/Auth settings, formalizing logs/monitoring, and reviewing service-role bypasses.

## Security Areas

| Security area | Current implementation | Evidence | Assessment | Risk | Recommended improvement | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| Authentication | Supabase Auth login with app user active check | `src/app/api/auth/login/route.ts`, `src/lib/server/auth.ts` | Acceptable | No MFA/SSO verified | Confirm Supabase Auth policy; add SSO/MFA if required | Medium |
| Authorization | API role helpers and RLS migrations | `src/lib/server/auth.ts`, `supabase/migrations` | Acceptable/partial | API routes are skipped by middleware and must self-protect | Add automated auth coverage for every route | High |
| Diagnostic endpoints | Pre-Story 22.1 private checks found unauthenticated diagnostic behavior; Story 22.1 is done with route-handler removal and local/non-production gates passing; production runtime checks must be rerun after final Epic 22 deployment | Story 22.1, route-removal tests, private endpoint checks | Improved; release verification pending | Prior data/config/auth metadata exposure; production runtime closure not yet verified after deployment | After final Epic 22 deployment, require non-success unauthenticated responses before claiming P0 readiness | High |
| Database RLS | RLS enabled on major tables in migrations; core tables/RPCs exist in prod/staging REST metadata | migrations, Supabase REST metadata, Supabase MCP/CLI limitation | Acceptable/partial | Column-level permissions are app-layer; hosted RLS policy definitions not directly verified | Run RLS policy inspection and role tests with database-password access | High |
| Managed database transport controls | Checked through private platform metadata | Private platform-control evidence | Needs review | Detailed control state held privately | Harden or formally risk-accept database transport controls | High |
| Managed database network controls | Checked through private platform metadata | Private platform-control evidence | Needs review | Detailed control state held privately | Restrict database access where operationally feasible | High |
| Supabase SSO/MFA posture | Identity provider posture checked privately; Auth/MFA settings not directly verified | Private platform-control evidence | Partial | Detailed provider state held privately | Confirm Auth settings and enterprise SSO/MFA requirements | Medium |
| Service role | Server helper bypasses RLS for admin/cron/export flows | `createServiceRoleClient` usages | Acceptable only with review | Mistakes bypass DB controls | Review and test every service-role path | High |
| Input validation | Zod schemas for employee/user/columns/dates/staffing | `src/lib/validation` | Strong | Some messages remain English | Keep schemas shared and add route tests | Medium |
| Secrets management | `.env*` ignored except `.env.example`; examples only tracked | `.gitignore`, `git ls-files -- .env*` | Acceptable | Production secrets not inspected; local `.env` files exist | Rotate if ever exposed; manage via Vercel/Supabase/GitHub secrets | Medium |
| Test environment separation | `.env.test` points at local/non-production Supabase | local env file key/host inspection | Improved/partial | Tests remain unsafe if local env guard is bypassed or CI uses production credentials | Keep isolated test/staging env vars and test data controls | Medium |
| Dependency security | `pnpm audit --prod` now reports 3 residual advisories after Story 22.3 remediation | audit evidence and advisory register | Improved/partial | Residual moderate/low `nodemailer` and `exceljs>uuid` advisories | Validate Nodemailer 8 and ExcelJS/uuid remediation path | Medium |
| Logging | Many `console.*` calls; some log emails/user IDs/errors | `rg console.* src` | Partial | Personal data in platform logs | Redact PII and standardize structured logging | High |
| Cron security | `CRON_SECRET` checked and production fails closed | cron route files | Acceptable | Secret must be configured correctly | Verify Vercel env scopes and cron logs | Medium |
| Rate limiting | No rate limiter found | search result | Weak/unknown | Login/export/import abuse | Add rate limiting and size limits | High |
| Backups | Nightly dumps to Supabase Storage with 14-day retention and partial staging restore | GitHub workflow, latest run job metadata | Partial/verified execution | Full production restore drill not verified; backups contain personal data | Run full restore drills and restrict access | High |
| Supabase physical backups | Private platform backup metadata checked | Private platform backup metadata | Needs review | Detailed backup/PITR posture held privately | Decide whether GitHub logical backups are sufficient or enable platform backup/PITR controls | High |
| CI/CD | Type-check, lint, unit/integration in GitHub Actions; branch protection evidence verified | `.github/workflows/test-check.yml`, private GitHub metadata | Acceptable | E2E not in shown CI; repository security posture needs private hardening review | Add E2E release gate and harden repository security controls where available | Medium |
| Encryption in transit | Expected through Vercel/Supabase HTTPS | platform intent | Unknown/acceptable | Not verifiable from repo | Confirm platform config and custom domains | Medium |
| Encryption at rest | Supabase/Vercel platform assumption | not directly in code | Unknown | Not verifiable from repo | Confirm vendor controls/contracts | Medium |
| File uploads | CSV import uses `file.text()` and CSV extension check | import route | Partial | No explicit size limit/content scanning | Add max file size and validation hardening | Medium |
| CORS | No custom permissive CORS found | route review | Acceptable | Not fully audited | Keep same-origin APIs | Low |
| Production access | GitHub admin access available to current operator; Vercel project metadata readable; Supabase HR project connector access denied | platform metadata | Partial | Unclear full access roster for Vercel/Supabase/GitHub | Define access matrix and review cadence | High |
| GitHub repository security posture | Repository security feature state checked privately | Private GitHub metadata | Needs review | Secrets/vulnerable dependencies may be missed before merge if controls are not enabled | Enable available repository security features or document compensating controls | High |
| Staging/prod schema alignment | REST schema metadata compared | Supabase REST schema metadata | Partial | Staging `employees` schema differs from production | Reconcile intentional custom columns and apply missing migrations if needed | Medium |

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
7. Managed database transport/network controls require private hardening review.
8. Managed-platform backup/PITR posture requires private operations review.
9. `.env.test` points at local/non-production Supabase; staging automation secrets should be reviewed privately before CI/staging automation depends on them.

## Security Review Checklist Before External IT Review

- After final Epic 22 deployment, recheck unauthenticated diagnostic endpoint behavior on the production runtime and require non-success responses before claiming P0 readiness.
- Keep dependency advisory register current and close residual moderate/low advisories before enterprise use.
- Run full test suite after dependency updates.
- Verify all API routes require auth unless explicitly public.
- Confirm hosted RLS policies by role with staging/prod test users.
- Confirm scheduler, SMTP, Supabase, Vercel, and GitHub secret scopes without disclosing values or secret names.
- Harden or formally risk-accept managed database transport/network posture.
- Reconcile staging/prod schema drift before treating staging as production-equivalent.
- Ensure test/integration/e2e environments do not target production unless a specific read-only verification mode is used.
- Review service-role usage and ensure pre-authorization.
- Redact logs and avoid logging employee/user personal data.
- Document backup encryption/storage/access and perform restore test.
- Define incident response and admin access review process.
