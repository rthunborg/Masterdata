---
baseline_commit: e0b38150413fd6b6613456c4de3cd1bb8c596db0
---

# Story 22.6: Build API Auth and Field Access Evidence Matrices

## Status

done

- **Priority:** P1
- **Story Points:** 5
- **Dependencies:** `22.1`
- **BMAD implementation artifact:** `_bmad-output/implementation-artifacts/22-6-build-api-auth-and-field-access-evidence-matrices.md`

## Story

As a security or privacy reviewer, I want route-level and field-level access matrices, so that access-control claims can be checked without reverse-engineering the application.

## Acceptance Criteria

- [x] AC1: Every route under `src/app/api/**/route.ts` is listed with route path, exported HTTP method(s), purpose, access class, required role(s), auth helper or policy source, request-cookie handling status, service-role usage, enforcement layer, and evidence status.
- [x] AC2: Every relevant employee, masterdata, custom-column, export, important-date, staffing, and user/filter field is listed with visibility and editability for HR Admin, recruiter, Sodexo, ÖMC, Payroll, Toplux, and Crewing. Include `admin_limited` as an additional role because it exists in code and has field-specific edit behavior.
- [x] AC3: Each matrix row identifies whether enforcement is RLS-level, API-level, app-layer, service-role preauthorization, cron-secret, public-by-design, or documentation-only.
- [x] AC4: Any app-layer-only protection for sensitive fields, service-role bypass path, route without obvious auth helper, route helper call missing `request`, or route/field whose source cannot be verified is flagged as a risk or follow-up.
- [x] AC5: The evidence is stored durably under `docs/commercial-readiness/`, linked from `docs/commercial-readiness/14_evidence_index.md`, and linked from the blocker tracker or a clearly named evidence row.

## Tasks / Subtasks

- [x] Create the API route auth matrix. (AC: 1, 3, 4, 5)
  - [x] Add `docs/commercial-readiness/19_api_auth_matrix.md`.
  - [x] Regenerate the route inventory from `src/app/api/**/route.ts`; do not trust the seed inventory below without rechecking the repo.
  - [x] For each route/method, record purpose, access class, required role(s), auth helper/policy source, whether the helper receives `request`, service-role usage, and evidence status.
  - [x] Treat `middleware.ts` as page-route protection only; it explicitly skips most `/api/*` paths, so API routes must self-protect unless public-by-design.
  - [x] Mark public-by-design routes explicitly. Current obvious candidates are `/api/auth/login` and `/api/health`; classify `/api/auth/user` and `/api/auth/logout` by actual code behavior, not by path name.

- [x] Create the field access matrix. (AC: 2, 3, 4, 5)
  - [x] Add `docs/commercial-readiness/20_field_access_matrix.md`.
  - [x] Use `column_config.role_permissions`, employee physical fields, export field code, update-route field checks, and RLS migrations as sources.
  - [x] Include visible/editable/exportable status for HR Admin, recruiter, `admin_limited`, Sodexo, ÖMC, Payroll, Toplux, and Crewing.
  - [x] Distinguish read visibility from editability and exportability. Do not collapse them into one permission column.
  - [x] Flag sensitive fields such as SSN, gender, termination reason/date, comments, diet details, payroll fields, room/accommodation fields, audit/change-history fields, and user/account fields.

- [x] Link the evidence. (AC: 5)
  - [x] Update `docs/commercial-readiness/14_evidence_index.md` with the two new matrix documents.
  - [x] Update `docs/commercial-readiness/17_blocker_remediation_tracker.md` or another clearly named readiness evidence surface so Story 22.6 evidence is discoverable.
  - [x] If the implementation changes Story 22.6 status, synchronize `docs/sprint-artifacts/story-22.6.md`, `docs/sprint-artifacts/epic-22-sprint-status.yaml`, `docs/sprint-artifacts/sprint-status.yaml`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, and this BMAD implementation artifact in the same turn.

- [x] Add route inventory/access coverage automation. (AC: 1, 4, 5)
  - [x] Add a Vitest test under `tests/unit/epic-22/story-22.6/` that fails when any `src/app/api/**/route.ts` method is missing from `19_api_auth_matrix.md`.
  - [x] The test should assert route path + exported method coverage and require an explicit access class/evidence status. It does not need to prove every role behavior; Story 22.7 covers automated role/export/RLS proof.
  - [x] Include known public-by-design routes and cron-secret routes as explicit classifications rather than allowlisting omissions.

- [x] Verify quality gates and evidence hygiene. (AC: 1-5)
  - [x] Run the full required gates for this code/test change: `npx vitest run` EXIT:0 (`3005` passed, `30` skipped); `npx playwright test` EXIT:0 (`160` passed, `56` skipped); `npx eslint` EXIT:0 with warnings only (`322` warnings, `0` errors); `npx tsc --noEmit` EXIT:0.
  - [x] Run a targeted private/secret-bearing content search against the new docs. The matrices must not include raw employee rows, SSNs, private employee examples, database URLs, auth tokens, cookies, Supabase keys, screenshots of private records, or direct production SQL/API output.

### Review Findings

- [x] [Review][Patch] Track or unignore Story 22.6 evidence/test artifacts so the route inventory test and evidence docs survive a clean checkout [`.gitignore`:76]
- [x] [Review][Patch] Track or unignore the `employee_column_changes` repair migration listed in the story file [`docs/sprint-artifacts/story-22.6.md`:240]
- [x] [Review][Patch] Correct PE3 cron service-role usage in the API auth matrix [`docs/commercial-readiness/19_api_auth_matrix.md`:60]
- [x] [Review][Patch] Parse API matrix table columns exactly instead of using substring checks for access class/evidence status [`tests/unit/epic-22/story-22.6/api-auth-matrix-coverage.test.ts`:144]
- [x] [Review][Patch] Apply the non-production Supabase guard to middleware before it creates a Supabase client [`middleware.ts`:31]
- [x] [Review][Patch] Add the Story 22.6 evidence docs, coverage test, migration, and synchronized status artifacts to version control [`docs/sprint-artifacts/story-22.6.md`:238]
- [x] [Review][Patch] Track or unignore readiness documents linked by the tracked evidence index and blocker tracker [`docs/commercial-readiness/14_evidence_index.md`:12]
- [x] [Review][Patch] Add `column_config` metadata and permission fields to the field access matrix [`docs/commercial-readiness/20_field_access_matrix.md`:54]
- [x] [Review][Patch] Harden the API matrix coverage test to reject stale rows and recognize typed or re-exported route handlers [`tests/unit/epic-22/story-22.6/api-auth-matrix-coverage.test.ts`:85]
- [x] [Review][Patch] Make the `employee_column_changes` repair migration safe for existing duplicates and harden the `SECURITY DEFINER` search path [`supabase/migrations/20260607193000_fix_employee_column_changes_conflict_target.sql`:12]
- [x] [Review][Patch] Correct the evidence index test-status note for the Story 22.6 gate results [`docs/commercial-readiness/14_evidence_index.md`:59]

## Dev Notes

### Scope Boundaries

- This story creates evidence and a route-inventory test. Do not perform broad auth, role, RLS, export, or field-permission remediation unless an immediate P0 exposure is found and explicitly recorded.
- If a route or field appears weak, classify it honestly as a risk/follow-up. Do not silently "fix" it and claim the matrix proves a stronger control than the code implements.
- Do not read, dump, screenshot, export, or store real employee rows while preparing evidence.
- Do not copy `.env.local`, service keys, cookies, JWTs, database URLs, Supabase keys, Vercel env values, or production SQL output into docs.
- Story 22.1 is `done`; do not present diagnostic endpoint production runtime closure as verified until the post-merge production custom-domain checks pass.

### Canonical Sources

- Route inventory: `src/app/api/**/route.ts`.
- API/page boundary: `middleware.ts`; public API prefixes are limited and `/api/*` is otherwise skipped.
- API auth helpers and response helpers: `src/lib/server/auth.ts`.
- API Supabase cookie workaround: `src/lib/supabase/server-api.ts`; helpers should receive `request` where this workaround is required.
- Service-role client: `src/lib/supabase/server.ts`.
- Role model: `src/lib/types/user.ts`.
- Role utility behavior: `src/lib/utils/role-utils.ts`.
- Column permission model: `src/lib/types/column-config.ts`, `src/lib/server/repositories/column-config-repository.ts`, and `supabase/migrations/*column_config*.sql`.
- Employee field model: `src/lib/types/employee.ts`, `src/lib/validation/employee-schema.ts`, `src/app/api/employees/[id]/route.ts`.
- Export behavior: `src/app/api/employees/export/route.ts`, `src/app/api/employees/export-crew-ready/route.ts`, `src/components/dashboard/export-field-selection-dialog.tsx`, `src/lib/hooks/use-employee-export.ts`, `src/lib/constants/export-fields.ts`.
- Existing readiness evidence: `docs/commercial-readiness/05_user_roles_and_permissions.md`, `06_data_inventory_and_data_flows.md`, `08_security_overview.md`, `14_evidence_index.md`, `17_blocker_remediation_tracker.md`.

### Current Route Inventory Seed

Captured 2026-06-07 from `src/app/api/**/route.ts`. Regenerate before implementation.

| Route file | Methods | Auth/service signal found by static scan |
| --- | --- | --- |
| `src/app/api/admin/categories/[categoryName]/route.ts` | PATCH | `requireHRAdminAPI(request)` |
| `src/app/api/admin/columns/[id]/route.ts` | DELETE, PATCH | `requireHRAdminAPI(request)` |
| `src/app/api/admin/columns/[id]/toggle-visibility/route.ts` | PATCH | `requireHRAdminAPI(request)` |
| `src/app/api/admin/columns/reorder/route.ts` | PATCH | `requireHRAdminAPI(request)` |
| `src/app/api/admin/columns/route.ts` | GET | `requireHRAdminAPI(request)` |
| `src/app/api/admin/users/[id]/route.ts` | DELETE, PATCH | `requireHRAdminAPI(request)`, `createServiceRoleClient()` |
| `src/app/api/admin/users/[id]/update-activity/route.ts` | PATCH | `getUserFromSession()` in route body; classify request-cookie behavior |
| `src/app/api/admin/users/route.ts` | GET, POST | `requireHRAdminAPI(request)`, `createServiceRoleClient()` |
| `src/app/api/auth/login/route.ts` | POST | Public login route |
| `src/app/api/auth/logout/route.ts` | POST | `createClient().auth.signOut()`; classify unauthenticated behavior |
| `src/app/api/auth/user/route.ts` | GET | `createAPIClient(request).auth.getUser()` |
| `src/app/api/columns/[id]/route.ts` | DELETE, PATCH | `requireAuthAPI()` without `request`; classify as request-cookie follow-up |
| `src/app/api/columns/route.ts` | GET, POST | `requireAuthAPI(request)` |
| `src/app/api/cron/gdpr-anonymize/route.ts` | GET | `CRON_SECRET` |
| `src/app/api/cron/omc-masterdata-reminder/route.ts` | GET | `CRON_SECRET`, `createServiceRoleClient()` |
| `src/app/api/cron/pe3-deadline-notifications/route.ts` | GET | `CRON_SECRET` |
| `src/app/api/employees/[id]/archive/route.ts` | POST | `requireEmployeeManagerAPI()` without `request` |
| `src/app/api/employees/[id]/custom-data/route.ts` | GET, PATCH | `requireAuthAPI()` without `request`, `createServiceRoleClient()` |
| `src/app/api/employees/[id]/reactivate/route.ts` | POST | `requireEmployeeManagerAPI()` without `request` |
| `src/app/api/employees/[id]/room-preview/route.ts` | GET | `requireRoleAPI(["hr_admin" as UserRole])` without `request` |
| `src/app/api/employees/[id]/route.ts` | DELETE, GET, PATCH | `requireEmployeeEditorAPI(request)`, `requireEmployeeManagerAPI()` without `request`, `createServiceRoleClient()` |
| `src/app/api/employees/[id]/terminate/route.ts` | POST | `requireEmployeeManagerAPI()` without `request` |
| `src/app/api/employees/[id]/unarchive/route.ts` | POST | `requireEmployeeManagerAPI()` without `request` |
| `src/app/api/employees/bulk-status/route.ts` | POST | `requireEmployeeManagerAPI(request)` |
| `src/app/api/employees/changes-since-last-active/route.ts` | GET | `requireAuthAPI(request)` |
| `src/app/api/employees/export-crew-ready/route.ts` | POST | `requireEmployeeManagerAPI(request)`, `createServiceRoleClient()` |
| `src/app/api/employees/export/route.ts` | POST | `requireAuthAPI(request)`, `createServiceRoleClient()` |
| `src/app/api/employees/import/route.ts` | POST | `requireEmployeeManagerAPI(request)` |
| `src/app/api/employees/route.ts` | GET, POST | `requireAuthAPI(request)`, `requireEmployeeManagerAPI(request)` |
| `src/app/api/employees/stats/route.ts` | GET | `requireAuthAPI(request)` |
| `src/app/api/health/route.ts` | GET | Public health route |
| `src/app/api/important-dates/[id]/archive/route.ts` | POST | `requireRoleAPI([UserRole.HR_ADMIN, UserRole.RECRUITER])` without `request` |
| `src/app/api/important-dates/[id]/restore/route.ts` | POST | `requireRoleAPI([UserRole.HR_ADMIN, UserRole.RECRUITER])` without `request` |
| `src/app/api/important-dates/[id]/route.ts` | DELETE, PATCH | `requireRoleAPI([UserRole.HR_ADMIN, UserRole.RECRUITER], request)` |
| `src/app/api/important-dates/available-omc/route.ts` | GET | `requireAuthAPI(request)` |
| `src/app/api/important-dates/available-pe3/route.ts` | GET | `requireAuthAPI(request)` |
| `src/app/api/important-dates/import/route.ts` | POST | `requireRoleAPI([UserRole.HR_ADMIN, UserRole.RECRUITER])` without `request` |
| `src/app/api/important-dates/route.ts` | GET, POST | `requireAuthAPI(request)`, `requireRoleAPI([UserRole.HR_ADMIN, UserRole.RECRUITER], request)`, `createServiceRoleClient()` |
| `src/app/api/profile/route.ts` | GET | `requireAuthAPI(request)` |
| `src/app/api/staffing-needs/history/route.ts` | GET | `requireAuthAPI(request)` |
| `src/app/api/staffing-needs/route.ts` | GET, PUT | `requireAuthAPI(request)`, `requireRoleAPI(['hr_admin', 'crewing'], request)` |
| `src/app/api/users/filters/[id]/route.ts` | DELETE | `requireAuthAPI(request)` |
| `src/app/api/users/filters/route.ts` | GET, POST | `requireAuthAPI(request)` |

### Field Access Guardrails

- `UserRole` currently includes `hr_admin`, `recruiter`, `admin_limited`, `crewing`, `sodexo`, `omc`, `payroll`, and `toplux`.
- Internal view behavior uses `getColumnViewRole()`: HR Admin, recruiter, and admin_limited inherit HR Admin column visibility for viewing.
- Edit behavior uses `canEditField()`: recruiter and admin_limited can edit checklist fields; admin_limited cannot edit non-checklist fields; other roles use `column_config.role_permissions[role].edit`.
- Staffing needs are separate: `canEditStaffingNeeds()` allows HR Admin and Crewing to edit staffing targets.
- Export field selection uses `column_config.role_permissions[roleForView].view`; HR Admin impersonation export is allowed only for HR Admin in `src/app/api/employees/export/route.ts`.
- `export-crew-ready` is HR Admin/recruiter-only and exports sensitive fields including SSN, email, mobile, checklist fields, and then writes `crewing_done=true`. Treat it as a high-sensitivity route.
- Column-level permissions are primarily app-layer controls. RLS is row-level for employees; do not claim database column-level enforcement unless the exact DB privilege or policy source is cited.

### Architecture And Current Technical Notes

- Package versions from `package.json`: Next `^16.2.7`, React `19.2.0`, TypeScript `^5.9.3`, `@supabase/supabase-js` `^2.86.0`, `@supabase/ssr` `^0.8.0`, Vitest `^4.0.15`, Playwright `^1.57.0`, pnpm `10.19.0`.
- Official Next.js App Router route-handler docs for v16.x list `GET`, `HEAD`, `POST`, `PUT`, `DELETE`, `PATCH`, and `OPTIONS`; unsupported methods return `405`. Next.js can auto-implement `OPTIONS` with `Allow` headers. Use this to define route-method coverage.
- Next.js route handlers can receive `NextRequest`; this codebase has a documented `createAPIClient(request)` workaround because API cookies can be unavailable through `cookies()` in production. Missing `request` on auth-helper calls must be visible in the matrix.
- Official Supabase RLS docs treat RLS as table/row enforcement. Supabase service-role keys bypass RLS and must remain server-only; every service-role route must therefore cite its API preauthorization.
- Supabase/Postgres column-level privileges exist, but current project evidence says column access is mainly app-layer via `column_config.role_permissions`. The field matrix must make this limitation clear.

### Previous Story Intelligence

- Story 22.1 is `done` because local/non-production gates pass and the diagnostic route handlers are removed. Production custom-domain verification remains a post-merge Epic 22 release/readiness gate.
- Story 22.2 is `done`; non-production Supabase guardrails and `.env.test` cleanup are in place. If any test path needs data, use Story 22.2-compliant local/non-production resources.
- Story 22.3 is `done`; critical/high production dependency advisories are remediated and residual moderate/low risks are documented.
- Story 22.4 is `done`; production data may be presented only under standing controls through a normal authorized app account. Matrices must not include private production examples.
- Story 22.5 is `done`; the blocker tracker and one-page brief exist. Keep Story 22.6 links factual and do not overclaim P0 completion while the post-deployment diagnostic endpoint verification gate is pending.

### Testing Requirements

**Estimated tests:** 1

- Add or update a Vitest route inventory/access classification test for `19_api_auth_matrix.md`.
- You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0.
- If implementation changes app copy, Swedish i18n coverage in `messages/sv.json` is mandatory.
- If implementation changes validation or API payload behavior, Zod schema coverage is mandatory.
- If implementation changes RBAC/RLS behavior, add role/RLS-oriented tests and keep the evidence matrix aligned.

### References

- `docs/epics.md` section "Story 22.6: Build API Auth and Field Access Evidence Matrices"
- `_bmad-output/planning-artifacts/epics.md` section "Story 22.6: Build API Auth and Field Access Evidence Matrices"
- `docs/sprint-artifacts/sprint-status.yaml`
- `docs/sprint-artifacts/epic-22-sprint-status.yaml`
- `docs/commercial-readiness/05_user_roles_and_permissions.md`
- `docs/commercial-readiness/06_data_inventory_and_data_flows.md`
- `docs/commercial-readiness/08_security_overview.md`
- `docs/commercial-readiness/14_evidence_index.md`
- `docs/commercial-readiness/17_blocker_remediation_tracker.md`
- `middleware.ts`
- `src/app/api/**/route.ts`
- `src/lib/server/auth.ts`
- `src/lib/supabase/server-api.ts`
- `src/lib/types/user.ts`
- `src/lib/types/employee.ts`
- `src/lib/utils/role-utils.ts`
- `src/lib/server/repositories/column-config-repository.ts`
- `supabase/migrations`
- Next.js route handler docs queried through Context7 on 2026-06-07: `https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/03-api-reference/03-file-conventions/route.mdx`
- Supabase RLS docs queried through Context7 on 2026-06-07: `https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/database/postgres/row-level-security.mdx`

## Definition of Done

- API auth matrix complete and linked.
- Field access matrix complete and linked.
- Route inventory test covers every current API route method in the matrix.
- App-layer-only, service-role, missing-request-helper, public-by-design, cron-secret, and unverified controls are clearly flagged.
- No private employee data or secrets are copied into evidence docs.
- Full required test gates are recorded before moving the story beyond `ready-for-dev`.
- Story/status artifacts are synchronized if implementation changes status.

## Dev Agent Record

### Debug Log

- 2026-06-07: Scrum Master prepared comprehensive story context and confirmed Story 22.6 remains `ready-for-dev`.
- 2026-06-07: Story preparation intentionally selected active Epic 22 Story 22.6 instead of first BMAD backlog item 23.1 because Epic 23 is future contract-dependent and gated.
- 2026-06-07: Seed API route inventory captured 43 route files from `src/app/api/**/route.ts`.

### Implementation Plan

- Build route and field evidence as docs-only commercial-readiness artifacts without copying private data or secrets.
- Add a Vitest route inventory test that statically enumerates `src/app/api/**/route.ts` methods and verifies each route/method has explicit access-class and evidence-status coverage in `19_api_auth_matrix.md`.
- Link the new evidence from the evidence index and blocker tracker, then run full unit/e2e/lint/type and targeted evidence hygiene checks before moving to review.

### Completion Notes

- Added API auth matrix covering 43 route files and 56 exported API route methods with access class, role/auth source, request-cookie status, service-role usage, enforcement layer, evidence status, and follow-up risks.
- Added field access matrix covering employee/masterdata/custom-column/export/important-date/staffing/user/filter/audit field groups with role view/edit/export evidence and explicit app-layer-only/RLS/service-role risks.
- Added Vitest route inventory coverage test that first failed while `19_api_auth_matrix.md` was absent, then passed after matrix creation.
- Linked Story 22.6 evidence from `14_evidence_index.md` and `17_blocker_remediation_tracker.md`.
- Docker/local Supabase became available; Playwright now loads `.env.test`, local Supabase setup/auth state creation passes, and full Playwright was originally validated.
- Fixed supporting E2E blockers discovered during the gate: future-year ÖMC availability, `employee_column_changes` trigger/index mismatch, and stale E2E assumptions about seeded employees/visible boolean columns.
- Resolved all four code-review findings: tracked/unignored Story 22.6 evidence/test docs and the migration, corrected PE3 cron service-role evidence, and hardened matrix coverage parsing to exact table columns.
- Stabilized full-suite gates discovered during review patch: Vitest timeout budget for long-running tests, Playwright auth setup waits/logging, Story 13.4 export self-seeding/download waits, and termination/reactivation mutation waits/filter reset.
- Resolved seven second-review patch findings: middleware now applies the non-production Supabase guard before client creation, linked readiness artifacts are unignored for durable tracking, `column_config` permission metadata is represented in the field matrix, the route coverage test rejects stale rows and supports typed/re-exported handlers, the `employee_column_changes` repair migration handles existing duplicates and pins `SECURITY DEFINER` search path, and the evidence index gate note reflects actual test results.
- Final gates after the second review patch: focused Story 22.6 matrix coverage Vitest PASS; focused Story 22.2 non-production guard Vitest PASS; `npx vitest run` EXIT:0; `npx playwright test` EXIT:0 (`216` total, `160` passed, `56` skipped); `npx eslint` EXIT:0 with warnings only (`322` warnings, `0` errors); `npx tsc --noEmit` EXIT:0; refined secret/private-data hygiene search PASS.

### File List

- `docs/commercial-readiness/14_evidence_index.md`
- `docs/commercial-readiness/17_blocker_remediation_tracker.md`
- `docs/commercial-readiness/19_api_auth_matrix.md`
- `docs/commercial-readiness/20_field_access_matrix.md`
- `.gitignore`
- `middleware.ts`
- `docs/sprint-artifacts/story-22.6.md`
- `_bmad-output/implementation-artifacts/22-6-build-api-auth-and-field-access-evidence-matrices.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/sprint-artifacts/epic-22-sprint-status.yaml`
- `docs/sprint-artifacts/sprint-status.yaml`
- `tests/unit/epic-22/story-22.2/non-production-supabase-guard.test.ts`
- `tests/unit/epic-22/story-22.6/api-auth-matrix-coverage.test.ts`
- `vitest.config.ts`
- `tests/unit/api/export-date-resolution.test.ts`
- `tests/unit/components/employee-card-performance.test.tsx`
- `playwright.config.ts`
- `src/app/api/important-dates/available-omc/route.ts`
- `tests/unit/api/available-omc.test.ts`
- `supabase/migrations/20260607193000_fix_employee_column_changes_conflict_target.sql`
- `tests/e2e/global-setup.ts`
- `tests/e2e/epic-16/story-16.6/external-user-direct-highlighting.spec.ts`
- `tests/e2e/epic-16/story-16.6/real-database-highlighting.spec.ts`
- `tests/e2e/epic-13/story-13.4/export-selected-employees.spec.ts`
- `tests/e2e/epic-20/story-20.6/saved-filters.spec.ts`
- `tests/e2e/epic-20/story-20.7/export-with-filters.spec.ts`
- `tests/e2e/inline-edit.spec.ts`
- `tests/e2e/termination-reactivation.spec.ts`

## Change Log

- 2026-06-07: Created comprehensive ready-for-dev story context for Story 22.6 with route inventory seed, field access guardrails, source references, testing requirements, and evidence-linking instructions.
- 2026-06-07: Added API auth matrix, field access matrix, evidence links, and route inventory coverage test.
- 2026-06-07: Resumed Docker/local Supabase Playwright gate, fixed environment/date/audit-trigger/E2E fixture blockers, verified full Vitest/Playwright/lint/type gates green, and moved Story 22.6 to review.
- 2026-06-08: Code review findings were left as action items by user request; moved Story 22.6 back to in-progress.
- 2026-06-08: Resolved all four code-review patch findings, hardened E2E/Vitest gate reliability discovered during verification, reran full Vitest/Playwright/lint/type gates to EXIT:0, and returned Story 22.6 to review.
- 2026-06-08: Resolved seven second-review patch findings, reran focused and full gates to EXIT:0, synchronized review artifacts, and moved Story 22.6 to done.
