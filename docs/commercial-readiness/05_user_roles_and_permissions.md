# User Roles And Permissions

Prepared: 2026-06-03

## Identified Roles

Application roles are defined in `src/lib/types/user.ts`: `hr_admin`, `recruiter`, `admin_limited`, `crewing`, `sodexo`, `omc`, `payroll`, `toplux`.

System-level actors:

- Supabase service role client: server-only privileged client that bypasses RLS (`src/lib/supabase/server.ts`).
- Cron caller: Vercel/authorized scheduler using `CRON_SECRET` for notification/anonymization endpoints.
- GitHub Actions: CI and backup automation using repository/environment secrets.

## Permission Matrix

| Role | Can read | Can create | Can update | Can delete | Can administer | Restrictions | Code evidence | Comment |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `hr_admin` | All employees/columns/users/dates; staffing | Employees, users, columns, dates | All employee fields, permissions, dates, staffing | Users, columns, employees, dates | Yes | Cannot deactivate/delete self; cannot remove last active HR Admin | `requireHRAdminAPI`, `role-utils.ts`, admin routes | Most privileged app role |
| `recruiter` | Internal HR column visibility | Employees, dates/imports | Employee manager/editor fields, important dates | Employee archive/delete flows by helper | No user/column admin | No user management/column settings admin | `requireEmployeeManagerAPI`, `role-utils.ts`, RLS migration 20251210000002 | Internal operational role |
| `admin_limited` | Internal HR column visibility | No employee creation | Checklist fields only via `canEditField`; service-role write path for limited edits | No | No | Cannot edit non-checklist fields | `role-utils.ts`, `src/app/api/employees/[id]/route.ts` | Requires careful API field checks |
| `crewing` | Non-archived employees, staffing tracker | No employee creation | Staffing needs only | No | No | `crewing_done` edit removed; view only | `canEditStaffingNeeds`, staffing routes, migration 20260313000001 | External/partner-like plus staffing edit |
| `sodexo` | Non-archived employees and permitted columns | Custom columns for own role | Own permitted custom columns | Own custom columns if edit permission | No | No other party columns | `src/app/api/columns/*`, `column_config.role_permissions` | Column-level app filtering is critical |
| `omc` | Non-archived employees and permitted columns | Custom columns for own role | Own permitted custom columns | Own custom columns if edit permission | No | No other party columns | Same as above | ÖMC workflows include dates/health/training context |
| `payroll` | Non-archived employees and permitted columns | Custom columns for own role | Own permitted custom columns | Own custom columns if edit permission | No | No other party columns | Same as above | Payroll fields may be sensitive |
| `toplux` | Non-archived employees and permitted columns | Custom columns for own role | Own permitted custom columns | Own custom columns if edit permission | No | No other party columns | Same as above | Housing/partner workflow |
| Service role | All DB rows/tables reached by code | Yes | Yes | Yes | Supabase admin operations | Must be server-only and pre-authorized | `createServiceRoleClient` usages | Bypasses RLS by design |

## Frontend vs Backend vs Database Permissions

Frontend:

- Role preview and UI visibility are implemented in components and Zustand state (`src/app/dashboard/page.tsx`, `src/components/dashboard/role-selector.tsx`, `src/lib/store/ui-store.ts`).
- UI hides or shows actions using helpers from `src/lib/types/user.ts` and `src/lib/utils/role-utils.ts`.

Backend/API:

- Most protected API routes call `requireAuthAPI`, `requireRoleAPI`, `requireHRAdminAPI`, `requireEmployeeManagerAPI`, or `requireEmployeeEditorAPI`.
- Middleware protects page routes but skips `/api/*`, so API routes must enforce their own protection. Evidence: `middleware.ts`.
- Some route handlers use `requireAuthAPI()` without passing the request object despite `src/lib/server/auth.ts` documenting a Next.js 16 API cookie workaround. Examples observed in `src/app/api/columns/[id]/route.ts`, `src/app/api/employees/[id]/route.ts`, and `src/app/api/employees/[id]/custom-data/route.ts`.

Database/RLS:

- `users`, `employees`, `column_config`, important dates, user filters, staffing needs, and staffing changelog have RLS policies in migrations.
- `employees` RLS is row-level. Column-level permissions are mostly enforced in application code with `column_config.role_permissions`.
- `employee_column_changes` later RLS policy allows select for authenticated users (`supabase/migrations/20251210000000_fix_employee_column_changes_rls.sql`), which may be too broad for partner-specific audit visibility.

## Specific Access-Control Flags

- Access control is not only frontend: server helpers and RLS exist.
- Column-level access is primarily application-layer, not database column-level.
- Service role bypass is used in admin, export, cron, notifications, and selected employee update flows. This is acceptable only if every entry point is strongly authorized and tested.
- Pre-remediation diagnostic route code did not enforce authentication. Private runtime checks found unauthenticated diagnostic behavior, so Story 22.1 removed the risky route handlers and keeps production runtime closure as a post-deployment release gate.
- Presentations may show production data through a named application account with the demonstrated app role context documented in `16_presentation_data_scope_and_access_preconditions.md`; service-role paths, Supabase Studio/direct SQL, admin shortcut accounts, and diagnostic routes are prohibited presentation paths.
- HR Admin rights are broad; that may be appropriate but should be supported by admin access logging and regular review.
- User invitation/password reset is not formalized; user creation auto-confirms accounts and returns a temporary password in API response (`src/app/api/admin/users/route.ts`).
- Account termination exists through `is_active=false` and session revoke attempt, but formal offboarding workflow is not documented.

## Recommended Permission Improvements

1. Add an API-route auth audit test that verifies every non-public route enforces auth.
2. Keep diagnostic endpoints removed or protected and close the post-deployment release verification gate.
3. Ensure all API route helpers receive `request` where the cookie workaround is required.
4. Review service-role paths and add explicit comments/tests for authorization preconditions.
5. Restrict audit/change-history reads to roles that can view affected employees/columns.
6. Add admin action logging for user/permission changes.
7. Formalize account invitation, password reset, and offboarding.
