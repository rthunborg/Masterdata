# Role, Export, and RLS Test Evidence

Prepared: 2026-06-10

Updated: 2026-07-09 — Story 22.13 direct-database authorization addendum

Story: 22.7

Scope: local/non-production test evidence for controlled-access claims. This file records test coverage and command results only. It does not include real employee rows, private screenshots, cookies, auth tokens, database connection strings, Supabase key values, service-key values, or production SQL/API output.

## Coverage

- Roles covered: `hr_admin`, `recruiter`, `admin_limited`, `crewing`, `sodexo`, `omc`, `payroll`, and `toplux`.
- Field permission evidence: `tests/unit/epic-22/story-22.7/role-field-permissions.test.ts` verifies matrix-derived visible/editable fields for all current roles, `column_config.role_permissions`, `getColumnViewRole()`, `canEditField()`, and sensitive-field examples from `20_field_access_matrix.md`.
- API isolation evidence: `tests/unit/epic-22/story-22.7/api-field-isolation.test.ts` verifies `/api/columns`, `/api/employees`, and `/api/employees/[id]` behavior for internal roles and all current external roles.
- Export evidence: `tests/unit/epic-22/story-22.7/export-evidence.test.ts` verifies denied export fields are rejected, denied/custom field values are excluded or included according to the caller role, HR Admin `impersonatedRole` uses the impersonated role, non-HR Admin callers cannot impersonate roles, `/api/employees/export-crew-ready` remains employee-manager-only, and the export payload Zod schema is enforced.
- RLS evidence: `tests/integration/epic-22/story-22.7/supabase-rls-evidence.test.ts` uses Story 22.2 non-production guards, local transaction rollback, service-role-backed setup through `SET LOCAL ROLE service_role`, authenticated-role assertions, and hermetic staffing seed data to verify employee/staffing RLS allow/deny behavior.

## Command Results

PowerShell was used on Windows, so exit-code capture used `$LASTEXITCODE` as the shell equivalent of the documented `echo "EXIT:$?"` gate notation.

| Command | Result |
| --- | --- |
| `npx vitest run tests/unit/epic-22/story-22.7 tests/integration/epic-22/story-22.7 2>&1; "EXIT:$LASTEXITCODE"` | `EXIT:0`; 4 files passed; 40 tests passed |
| `npx vitest run tests/integration/epic-13/story-13.7/api/export-error-handling.test.ts 2>&1; "EXIT:$LASTEXITCODE"` | `EXIT:0`; 14 tests passed |
| `npx playwright test tests/e2e/epic-12/story-12.7/mobile-accessibility.spec.ts tests/e2e/epic-16/story-16.6/external-user-direct-highlighting.spec.ts tests/e2e/epic-20/story-20.7/export-with-filters.spec.ts --reporter=line 2>&1; "EXIT:$LASTEXITCODE"` | `EXIT:0`; 20 passed, 1 skipped; duration 5.3m |
| `npx vitest run tests/unit/epic-20/story-20.2/filter-panel.test.tsx 2>&1; "EXIT:$LASTEXITCODE"` | `EXIT:0`; 17 tests passed |
| `npx vitest run` | `EXIT:0`; 288 files passed, 2 skipped; 3046 tests passed, 30 skipped; duration 151.95s |
| `npx playwright test` | `EXIT:0`; 160 passed, 56 skipped; duration 25.9m |
| `npx eslint` | `EXIT:0`; 321 warnings, 0 errors |
| `npx tsc --noEmit` | `EXIT:0` |
| Targeted evidence hygiene search across commercial-readiness, sprint, and BMAD artifacts | `EXIT:1`; no private-data or secret-bearing patterns matched |

## Implementation Evidence

- `src/lib/server/employee-field-access.ts` centralizes role-visible employee field filtering and custom-data attachment.
- `src/app/api/employees/route.ts` uses the canonical external-role helper, shapes external `/api/employees` responses to role-visible fields, and preserves visible custom-column values under `customData` for internal non-HR roles.
- `src/lib/validation/export-schema.ts` centralizes `/api/employees/export` payload validation with Zod, including selected employees, selected fields, format, and optional impersonated role.
- `src/app/api/employees/export/route.ts` returns a deterministic `400` response for malformed or schema-invalid export payloads, applies export field authorization before service-role data access, and exports custom fields from the selected employee row or nested `customData`.
- `src/app/api/employees/[id]/route.ts` restricts employee detail and delete routes to employee-manager roles.
- `playwright.config.ts` keeps the HTML report from blocking failed local runs, so full-gate exit codes are written deterministically.

## Findings And Limits

- Story 22.7 proves app-layer external response shaping for `/api/employees`, but the underlying employee repository still reads raw rows with broad selection. This is not DB column-level enforcement.
- `/api/employees/[id]` remains a full-detail employee-manager route. External roles are denied rather than receiving a shaped detail payload.
- The local Supabase RLS test proves row-level employee and staffing allow/deny behavior where policies exist. It does not claim column-level RLS because Supabase RLS is row-level and no database column-privilege layer was added in this story.
- `admin_limited` has application-layer checklist edit permission, but direct employee-table DB RLS does not grant the same update path. The test records that limitation instead of overstating DB enforcement.
- User/filter ownership RLS was not expanded in Story 22.7 because the live local transaction focused on employee and staffing policies tied to the access-control claims being hardened. Keep user/filter ownership as follow-up evidence if those claims become externally material.
- During full-gate verification, older E2E/unit specs were hardened so the required suite is deterministic: mobile quick actions now seeds a card when the dashboard is empty, mobile accessibility uses the prepared admin storage state, external highlighting has enough time for UI seeding, filtered export waits for confirmation/download completion, and the FilterPanel debounce test waits for the initial focus timer before typing.

## Story 22.13 Direct-Database Addendum

Story 22.13 adds `tests/integration/epic-22/story-22.13/direct-database-authorization.test.ts` and `runtime-column-restore.test.ts`. The authorization suite exercises the real database roles/functions, not only route mocks:

- HR Admin/Crewing staffing success; Sodexo, inactive actor, and spoofed `p_user_id` denial with SQLSTATE `42501`.
- Authenticated denial for both the legacy raw DDL helper and the service-only atomic column-creation RPC; service-role creation, physical/config collision rejection, and savepoint rollback.
- HR-admin-only `column_config` lifecycle RLS, including external INSERT rejection and UPDATE/DELETE row hiding.
- Individual denial of `users.role`, `is_active`, `email`, and `auth_user_id` updates; caller-bound activity success.
- Forged audit INSERT denial, archived employee filtering, hidden `ssn` versus visible `comments`, and trigger-owned audit writes.

The shared `tests/helpers/epic-22-supabase-test-environment.ts` reads project id and ports from `supabase/config.toml`, requires the `hr-masterdata` high-port stack (`15421`/`15422`), rejects wrong/remote targets, and fingerprints migration `20260710150000`. It skips only when that expected stack is unreachable and emits an explicit diagnostic.

Current evidence status (2026-07-10): the project-scoped WSL/Docker Supabase stack was rebuilt on `15421`/`15422` through migration `20260710150000`. The focused twelve-file Story 22.13 batch passed **94/94**, including live direct-role RLS/RPC, atomic presentation/status transitions, runtime restore, and backup integrity evidence. Final gates passed: Vitest **3,125 passed / 30 skipped**, Playwright **162 passed / 53 skipped / 0 flaky**, `npx tsc --noEmit` exit `0`, and lint exit `0` with no errors. This is local non-production evidence; hosted staging apply/re-verification remains an owner-controlled release gate and is not claimed here.
