# Field Access Matrix

Prepared: 2026-06-07
Updated: 2026-07-10 for Story 22.13 review remediation
Story: 22.6; Story 22.7 and Story 22.13 evidence updates
Scope: Static evidence from role types, auth helpers, employee schemas, employee/update/export routes, column-config repository, export UI, and Supabase migrations. No private employee rows, SSNs, screenshots, cookies, tokens, Supabase keys, database URLs, or production SQL/API output are included.

## Reading This Matrix

Role cells use `view / edit / export`:

- `Y`: allowed by the cited static source.
- `N`: not allowed by the cited static source.
- `API-Y`: API route permits the edit even when UI/`column_config` may be narrower.
- `Cfg`: live `column_config.role_permissions` controls the value.
- `Checklist`: allowed only when the column is a boolean masterdata column with `is_checklist_item = true`.
- `Own`: current user's own record/filter only.
- `RLS?`: app code suggests access, but static RLS evidence is incomplete or inconsistent.
- `N/A`: not applicable to that field group.

Important limitation: `src/lib/server/repositories/employee-repository.ts` still reads employee rows with `select("*")`, and employee RLS remains row-level rather than column-level. Story 22.7 adds external-party response shaping in `src/app/api/employees/route.ts` through `src/lib/server/employee-field-access.ts`, so denied fields are no longer returned by the employee list API for Sodexo, OMC, Payroll, Toplux, or Crewing. This is still app-layer/API response shaping and export filtering, not DB column-level enforcement. Employee detail remains restricted to employee-manager roles and returns the full row after authorization.

## Sources Used

- Role model: `src/lib/types/user.ts`.
- Role utilities: `src/lib/utils/role-utils.ts`.
- Employee fields and validation: `src/lib/types/employee.ts`, `src/lib/validation/employee-schema.ts`.
- Employee list/update/export behavior: `src/app/api/employees/route.ts`, `src/app/api/employees/[id]/route.ts`, `src/app/api/employees/export/route.ts`, `src/app/api/employees/export-crew-ready/route.ts`, `src/lib/server/employee-field-access.ts`, `src/lib/validation/export-schema.ts`.
- Export UI filtering: `src/components/dashboard/export-field-selection-dialog.tsx`.
- Column permission model: `src/lib/types/column-config.ts`, `src/lib/server/repositories/column-config-repository.ts`.
- RLS and seed/update evidence: `supabase/migrations/20251027000000_initial_schema.sql`, `20251028104344_seed_column_config.sql`, `20251209000000_add_recruiter_crewing_roles.sql`, `20251210000002_update_rls_for_recruiter_crewing.sql`, `20251213000000_add_dietary_requirements.sql`, `20260313000001_add_staffing_needs.sql`, `20260130212612_create_user_filters.sql`, and Story 22.13 migrations `20260709194903` through `20260710150000`.

## Employee And Masterdata Fields

| Field(s) | Source / behavior | HR Admin | Recruiter | admin_limited | Sodexo | OMC | Payroll | Toplux | Crewing | Enforcement layer | Risk / follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `id`, `created_at`, `updated_at` | Employee physical/system fields returned by repository `select("*")`; Story 22.7 external list responses return `id` only unless a field is role-visible via `column_config` | Y / N / N | Y / N / N | RLS? / N / N | `id` only / N / N | `id` only / N / N | `id` only / N / N | `id` only / N / N | `id` only / N / N | RLS-level row access plus API route auth and external response shaping | Repository rows include system identifiers/timestamps; external API response shaping is app-layer |
| `first_name`, `surname`, `email`, `rank` | Seeded shared fields in `column_config`; export route checks view permission | Y / Y / Y | Y / API-Y / Y | Y / N / Y, RLS? | Y / N / Y | Y / N / Y | Y / N / Y | Y / N / Y | Y / N / Y | App-layer column permissions; employee RLS row access | Story 22.7 tests guard API/export response shaping for external roles |
| `mobile`, `town_district` | Seeded shared fields; payroll denied in initial seed; crewing allowed by migration | Y / Y / Y | Y / API-Y / Y | Y / N / Y, RLS? | Y / N / Y | Y / N / Y | N / N / N | Y / N / Y | Y / N / Y | App-layer column permissions; employee RLS row access | Story 22.7 tests guard Payroll API/export denial; DB column privileges remain future hardening |
| `ssn` | Sensitive seeded field; payroll allowed in seed; crewing allowed by later migration | Y / Y / Y | Y / API-Y / Y | Y / N / Y, RLS? | N / N / N | N / N / N | Y / N / Y | N / N / N | Y / N / Y | App-layer column permissions; employee RLS row access | Sensitive field; Story 22.7 tests guard API/export denial for roles without view permission, but DB column-level denial is not implemented |
| `gender` | Sensitive seeded field; crewing allowed by later migration | Y / Y / Y | Y / API-Y / Y | Y / N / Y, RLS? | N / N / N | N / N / N | N / N / N | N / N / N | Y / N / Y | App-layer column permissions; employee RLS row access | Sensitive field; Story 22.7 tests guard API response shaping, but DB column-level denial is not implemented |
| `hire_date` | Seeded shared field; crewing later allow-list does not include it | Y / Y / Y | Y / API-Y / Y | Y / N / Y, RLS? | Y / N / Y | Y / N / Y | Y / N / Y | Y / N / Y | N / N / N | App-layer column permissions; employee RLS row access | Story 22.7 tests guard external response shaping where the field is denied |
| `stena_date`, `omc_date` | Important-date employee reference fields; crewing allowed by later migration | Y / Y / Y | Y / API-Y / Y | Y / N / Y, RLS? | N / N / N | N / N / N | N / N / N | N / N / N | Y / N / Y | App-layer column permissions plus important-date APIs | Older insert used stale `hr_user`/`standard_user`; live `column_config` should be verified |
| `pe3_date` | Important-date employee reference field | Y / Y / Y | Y / API-Y / Y | Y / N / Y, RLS? | N / N / N | N / N / N | N / N / N | N / N / N | N / N / N | App-layer column permissions plus important-date APIs | Older insert used stale role keys; live `column_config` should be verified |
| `termination_date`, `termination_reason`, `comments` | Sensitive HR-only fields in initial seed | Y / Y / Y | Y / API-Y / Y | Y / N / Y, RLS? | N / N / N | N / N / N | N / N / N | N / N / N | N / N / N | App-layer column permissions; employee RLS row access | Sensitive field group; raw `select("*")` makes this app-layer-only for external row readers |
| `is_terminated`, `is_archived`, `archived_at`, `is_anonymized` | Lifecycle/system state fields; archive/terminate routes require employee-manager | Y / lifecycle / N | Y / lifecycle / N | RLS? / N / N | N / N / N | N / N / N | N / N / N | N / N / N | N / N / N | API-level lifecycle routes plus employee RLS and external response shaping | Repository rows include lifecycle state; external list responses omit it unless explicitly role-visible in `column_config` |
| `repayment_needed_omc`, `repayment_needed_pe3` | Repayment tracking fields; export route can export as-is when selected/permitted | Y / API-Y / Cfg | Y / API-Y / Cfg | Cfg, RLS? / N / Cfg | Cfg / N / Cfg | Cfg / N / Cfg | Cfg / N / Cfg | Cfg / N / Cfg | Cfg / N / Cfg | App-layer column permissions; employee RLS row access | Potentially sensitive repayment data; live `column_config` and role tests required |
| `special_diet`, `diet_details` | Dietary fields; migration grants view to HR Admin, recruiter, Sodexo, OMC, Crewing; edit true only for HR Admin in `column_config` | Y / Y / Y | Y / API-Y / Y | Y / N / Y, RLS? | Y / N / Y | Y / N / Y | N / N / N | N / N / N | Y / N / Y | App-layer column permissions plus employee PATCH route | Diet details are sensitive; recruiter API edit is broader than the dietary `column_config` edit flag |
| `one`, `talmundo`, `isps`, `photo`, `mail_lon`, `bankuppgifter`, `li`, `passport`, `kvitto_c17_18`, `c17` | HR checklist/masterdata fields; boolean hardening migration updates types | Y / Y / Y | Y / API-Y / Y | Y / Checklist / Y, RLS? | N / N / N | N / N / N | N / N / N | N / N / N | N / N / N | App-layer column permissions plus employee PATCH validation | Checklist editability depends on live `is_checklist_item`; raw employee API can still expose values to row readers |
| `origo`, `stena_id_origo_nummer` | Origo/Stena ID fields; crewing migration maps Stena ID need to `origo`; `stena_id_origo_nummer` exists in TypeScript/schema but no matching migration was found | Y / Y / Y | Y / API-Y / Y | Y / Checklist or N / Y, RLS? | N / N / N | N / N / N | N / N / N | N / N / N | Y for `origo` / N / Y | App-layer column permissions; employee RLS row access | Static source cannot prove DB/column-config coverage for `stena_id_origo_nummer` |
| `loneiva` | Salary level field; export and crew-ready export include salary level | Y / Y / Y | Y / API-Y / Y | Y / N / Y, RLS? | N / N / N | N / N / N | N / N / N | N / N / N | N / N / N | App-layer column permissions plus employee PATCH validation | Auth helper comment mentions `admin_limited` + Lönenivå, but `canEditField` has no non-checklist exception |
| `crewing_done` | Checklist/status field; crewing edit revoked in staffing migration; export-crew-ready updates it after employee-manager export | Y / guarded / Y | Y / guarded API-Y / Y | Y / Checklist+prereq / Y, RLS? | N / N / N | N / N / N | N / N / N | N / N / N | Y / N / Y | App-layer column permissions, prerequisite check, employee RLS | Edit is conditional on `canEditCrewingDone`; raw employee API can expose value to row readers |
| `hotel_required`, `room_number_shared` | Accommodation/room fields; room preview is HR-admin-only; employee update can calculate rooms | Y / API-Y / Cfg | Y / API-Y / Cfg | Cfg, RLS? / Checklist or N / Cfg | Cfg / N / Cfg | Cfg / N / Cfg | Cfg / N / Cfg | Cfg / N / Cfg | Cfg / N / Cfg | App-layer column permissions plus HR-only room preview | Room/accommodation is sensitive; static `column_config` evidence is incomplete |
| `one_marked_at`, `omc_masterdata_reminder_sent_at` | System-managed timestamps | Y / system / N | Y / system / N | RLS? / N / N | N / N / N | N / N / N | N / N / N | N / N / N | N / N / N | API/service logic plus employee RLS and external response shaping | Repository rows include operational timestamps; external list responses omit them unless explicitly role-visible in `column_config` |
| Dynamic custom columns where `is_masterdata = false` | HR Admin creates schema/config atomically; assigned roles edit values through custom-data permission checks | Y / Y / Y | Cfg / Cfg / Cfg | Cfg, RLS? / Cfg / Cfg | Cfg / Cfg / Cfg | Cfg / Cfg / Cfg | Cfg / Cfg / Cfg | Cfg / Cfg / Cfg | Cfg / Cfg / Cfg | HR-only column lifecycle RLS + collision-safe service RPC; app-layer value permissions + service-role PATCH preauthorization | External roles cannot write `column_config` directly or create/delete columns; the assigned-column presentation PATCH is limited to three safe fields after permission checks. GET custom-data remains auth-only and is separately risk-flagged |

## Custom-Column Configuration Fields

| Field(s) | HR Admin | Recruiter | admin_limited | Sodexo | OMC | Payroll | Toplux | Crewing | Enforcement layer | Risk / follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `column_config.id`, `column_name`, `db_column_name`, `column_type`, `is_masterdata`, `role_permissions`, `display_order`, `is_visible`, `category`, `category_color`, `is_checklist_item`, `created_at`, `updated_at` | Y / Y / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Public authenticated SELECT plus Story 22.13 HR-admin-only lifecycle RLS; `/api/columns` POST and `/api/admin/columns` are HR-only; atomic creation RPC is service-role-only | `role_permissions` remains readable configuration metadata, but direct external INSERT/UPDATE/DELETE is denied. External PATCH is limited to assigned-column presentation fields through a caller-bound, row-locked RPC that rechecks the current role assignment; DELETE is rejected and lifecycle controls are hidden. |

## Export-Specific Fields And Controls

| Field / payload | HR Admin | Recruiter | admin_limited | Sodexo | OMC | Payroll | Toplux | Crewing | Enforcement layer | Risk / follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `employeeIds` in `/api/employees/export` | Y | Y | Y, RLS? | Y | Y | Y | Y | Y | API-level auth plus employee RLS and selected row filtering | Row access is RLS-level; field output is app-layer filtered |
| `fields` in `/api/employees/export` | Y; can select fields for own role or impersonated role | Y; own role only | Y; own role only, RLS? | Y; own role only | Y; own role only | Y; own role only | Y; own role only | Y; own role only | App-layer `column_config.role_permissions[roleForView].view` | Denied fields return 403, but the control is app-layer |
| `impersonatedRole` in `/api/employees/export` | Y | N | N | N | N | N | N | N | API-level HR-admin check | Keep tests proving non-HR Admin impersonation is forbidden |
| `format` in `/api/employees/export` | `csv`/`xlsx` | `csv`/`xlsx` | `csv`/`xlsx`, RLS? | `csv`/`xlsx` | `csv`/`xlsx` | `csv`/`xlsx` | `csv`/`xlsx` | `csv`/`xlsx` | API validation | No field-level risk beyond export content |
| Crew-ready export fixed fields: employee id, first/surname, SSN, email, mobile, rank, hire date, checklist fields, salary level | Y | Y | N | N | N | N | N | N | `requireEmployeeManagerAPI(request)` plus service-role active-date read | High-sensitivity export; route is correctly employee-manager only by static evidence |

## Important-Date Fields

| Field(s) | HR Admin | Recruiter | admin_limited | Sodexo | OMC | Payroll | Toplux | Crewing | Enforcement layer | Risk / follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `id`, `week_number`, `year`, `category`, `date_description`, `date_value`, `time_value`, `deadline_submit`, `deadline_cancel`, `notes`, `is_active`, `max_spots`, `remaining_spots`, `created_at`, `updated_at` | Y / Y / N/A | Y / Y / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | RLS SELECT for everyone; API create/update/delete restricted to HR Admin/Recruiter | `GET /api/important-dates` also uses service role after auth to read active dates |
| `assigned_employees` on important dates | Y / system / N/A | Y / system / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | RLS SELECT for everyone plus app route behavior | Contains employee name/email/room references; role-specific exposure needs Story 22.7 proof |

## Staffing Fields

| Field(s) | HR Admin | Recruiter | admin_limited | Sodexo | OMC | Payroll | Toplux | Crewing | Enforcement layer | Risk / follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `staffing_needs.id`, `location`, `headcount_need`, `updated_at`, `updated_by`, derived `crewReadyCount`, `crewReadyPercentage` | Y / Y / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / Y / N/A | RLS SELECT; API HR/Crewing check; Story 22.13 definer RPC independently resolves an active caller, checks role, and binds `updated_by` to the caller | Direct RPC spoof/role tests passed on the configured high-port stack in the 94/94 focused batch |
| `staffing_needs_changelog.id`, `location`, `old_value`, `new_value`, `changed_by`, `changed_by_email`, `changed_at` | Y / system / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / N / N/A | Y / system / N/A | RLS SELECT for authenticated users; INSERT for HR Admin/Crewing via RPC/service path | Changelog exposes updater email; confirm acceptable for external roles |

## User And Filter Fields

| Field(s) | HR Admin | Recruiter | admin_limited | Sodexo | OMC | Payroll | Toplux | Crewing | Enforcement layer | Risk / follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `users.id`, `auth_user_id`, `email`, `role`, `is_active`, `created_at`, `last_active_at` | Y / Y through caller-bound HR-admin RPC / N/A | Own / N / N/A | Own / N / N/A | Own / N / N/A | Own / N / N/A | Own / N / N/A | Own / N / N/A | Own / N / N/A | Authenticated/anon table UPDATE revoked; `set_user_active_status()` serializes HR-admin transitions and enforces the last-active-admin invariant; `update_own_last_active_at()` derives the active caller from `auth.uid()` | Story 22.13 removes all users UPDATE policies, binds activity to the current app user, and verifies atomic deactivation permission/invariants on the configured high-port stack |
| `user_filters.id`, `user_id`, `name`, `filters`, `created_at`, `updated_at` | Own / Own create-delete / N/A | Own / Own create-delete / N/A | Own / Own create-delete / N/A | Own / Own create-delete / N/A | Own / Own create-delete / N/A | Own / Own create-delete / N/A | Own / Own create-delete / N/A | Own / Own create-delete / N/A | API-level `requireAuthAPI(request)`, explicit `user_id`, and user_filters RLS | `filters` JSON may reference sensitive columns; later employee-field filtering must still apply |
| Filter payload fields: `columnId`, `type`, `operator`, `value`, `textValue`, `boolValue`, `dateRange`, `selectedDateIds`, `selectedValues` | Own / Own / N/A | Own / Own / N/A | Own / Own / N/A | Own / Own / N/A | Own / Own / N/A | Own / Own / N/A | Own / Own / N/A | Own / Own / N/A | Saved-filter ownership RLS and route checks | No static validation that a saved filter only references columns visible to that role |

## Audit / Change-History Fields

| Field(s) | HR Admin | Recruiter | admin_limited | Sodexo | OMC | Payroll | Toplux | Crewing | Enforcement layer | Risk / follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `employee_column_changes.employee_id`, `column_name`, `changed_at`, `changed_by` and related change-history response fields | Visible employee + all tracked columns / trigger-only / N/A | Visible employee + all tracked columns / trigger-only / N/A | N under current direct employee RLS limitation / trigger-only / N/A | Visible active employee + role-visible masterdata columns / trigger-only / N/A | Same scoped rule / trigger-only / N/A | Same scoped rule / trigger-only / N/A | Same scoped rule / trigger-only / N/A | Same scoped rule / trigger-only / N/A | Client INSERT privilege revoked; trigger-owned writes; one SELECT policy requires active caller, employee RLS visibility, and masterdata role view permission | Story 22.13 high-port live tests passed for forged INSERT, archived/unrelated rows, and hidden `ssn` versus visible `comments` |

## Evidence Gaps And Follow-Ups

| Gap | Evidence | Impact | Recommended next proof |
| --- | --- | --- | --- |
| Employee repository reads raw rows with `select("*")`; Story 22.7 shapes external `/api/employees` responses | `src/app/api/employees/route.ts`, `src/lib/server/employee-field-access.ts`, `src/lib/server/repositories/employee-repository.ts` | Column privacy is app-layer/API-response/export filtering, not DB column-level enforcement | Keep Story 22.7 role/API/export tests current; consider DB column privileges, views, or RPCs in Epic 23-style hardening |
| `admin_limited` exists in app code but employee RLS evidence does not include matching direct employee access | `src/lib/types/user.ts`, `src/lib/server/auth.ts`, `supabase/migrations/20251210000002_update_rls_for_recruiter_crewing.sql`, `20260224000000_add_admin_limited_to_role_constraint.sql`, `tests/integration/epic-22/story-22.7/supabase-rls-evidence.test.ts` | App-layer checklist edits use service-role after app checks; direct DB employee RLS does not authorize the role in current evidence | Keep explicit limitation in evidence; add direct RLS policy or formalize app-layer/service-role design if this role needs DB-level employee access |
| Known employee-field edits for recruiter are API-broader than some `column_config` edit flags | `src/app/api/employees/[id]/route.ts`, `src/lib/utils/role-utils.ts`, dietary migration | UI and API editability can differ | Add tests and align route edit checks with `column_config` if needed |
| Older `column_config` migrations use stale role keys | Important-date column migration includes `hr_user` and `standard_user`; newer roles are in code | Static migration evidence does not prove current live role permissions | Inspect live non-production `column_config` and add regression seed/migration |
| Service-role writes depend on app-layer preauthorization | Custom-data PATCH, admin user routes, export date reads, admin_limited employee PATCH | Service role bypasses RLS by design | Add route tests around every service-role path |
