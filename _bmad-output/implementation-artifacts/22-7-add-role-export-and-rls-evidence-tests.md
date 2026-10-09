---
baseline_commit: ea3e8ebe8bc9ca38f51d9d99ee9dc2952000bdd2
---

# Story 22.7: Add Role, Export, and RLS Evidence Tests

## Status

done

- **Priority:** P1
- **Story Points:** 5
- **Dependencies:** `22.6`
- **Canonical planning artifact:** `docs/sprint-artifacts/story-22.7.md`

## Story

As a product owner making controlled-access claims,
I want automated evidence tests for role visibility and exports,
so that reviewers see proof rather than only documentation.

## Acceptance Criteria

- [x] AC1: Automated tests verify visible and editable fields for all current roles match `docs/commercial-readiness/20_field_access_matrix.md`.
- [x] AC2: Automated tests verify unauthorized fields are not returned by APIs or exports for external roles.
- [x] AC3: Automated tests verify Supabase RLS policies deny disallowed reads/writes where DB-level enforcement exists.
- [x] AC4: Tests include Zod validation behavior for any API payloads changed during this story.
- [x] AC5: Test commands, exit codes, and evidence links are recorded in the commercial-readiness evidence package.

## Tasks / Subtasks

- [x] Establish the Story 22.7 evidence test inventory. (AC: 1-5)
  - [x] Create focused tests under `tests/unit/epic-22/story-22.7/` and/or `tests/integration/epic-22/story-22.7/`; add Playwright coverage only where UI/export behavior cannot be proven at route/service level.
  - [x] Cover every role in `src/lib/types/user.ts`: `hr_admin`, `recruiter`, `admin_limited`, `crewing`, `sodexo`, `omc`, `payroll`, and `toplux`.
  - [x] Reuse existing test helpers and patterns from `tests/utils/role-test-utils.ts`, `tests/integration/api/role-protection.test.ts`, `tests/unit/epic-22/story-22.6/api-auth-matrix-coverage.test.ts`, and existing export tests before creating new helpers.
  - [x] Add explicit expected-field fixtures derived from `20_field_access_matrix.md`; do not duplicate stale hard-coded role assumptions from older five-role docs.

- [x] Add role-visible column and editability evidence tests. (AC: 1)
  - [x] Prove `column_config.role_permissions` and `getColumnViewRole()` behavior for the eight-role set.
  - [x] Prove internal view behavior: `hr_admin`, `recruiter`, and `admin_limited` inherit HR Admin column visibility for viewing.
  - [x] Prove edit behavior from `canEditField()`: recruiter and `admin_limited` can edit checklist fields; `admin_limited` cannot edit non-checklist fields; external roles use `role_permissions[role].edit`.
  - [x] Include at least one sensitive field group from the matrix: SSN, gender, termination reason/date, comments, diet details, payroll fields, room/accommodation fields, audit/change-history fields, or user/account fields.

- [x] Add API response field isolation tests. (AC: 2)
  - [x] Test `/api/columns` returns only column configs visible to the authenticated role.
  - [x] Test `/api/employees` and `/api/employees/[id]` do not expose fields denied to the authenticated role, or implement response shaping if current raw-row behavior leaks denied fields.
  - [x] Treat the current `employeeRepository.findAll()` and `findById()` `select("*")` behavior as a known risk to test against, not as acceptable evidence.
  - [x] Do not mark the story done by asserting current leakage. If a denied field is returned, fix the route/repository response contract or record an explicit blocker across all status artifacts.

- [x] Add export evidence tests. (AC: 2, 4)
  - [x] Test `/api/employees/export` denies fields not visible to the caller role and excludes denied fields from CSV/XLSX content.
  - [x] Test HR Admin `impersonatedRole` export uses the impersonated role's view permissions.
  - [x] Test non-HR Admin callers cannot use `impersonatedRole`.
  - [x] Test `/api/employees/export-crew-ready` remains `hr_admin`/`recruiter` only because it exports high-sensitivity fields and writes `crewing_done`.
  - [x] If export payload validation is changed, move validation into/reuse a Zod schema under `src/lib/validation/` and cover it with focused tests.

- [x] Add RLS evidence tests against non-production Supabase. (AC: 3)
  - [x] Use Story 22.2-compliant local/non-production Supabase only; call `validateNonProductionSupabaseEnvironment()` before live Supabase integration tests.
  - [x] Use service-role only for setup/cleanup and clearly separate service-role setup from authenticated-role assertions.
  - [x] Prove external roles can read only the employee rows permitted by current RLS and cannot write employee rows directly.
  - [x] Prove `hr_admin` and `recruiter` can perform employee manager actions where RLS allows them.
  - [x] Prove `crewing` can update staffing needs and other external roles cannot.
  - [x] Prove user/filter ownership rules for `users` or `user_filters` where practical; Story 22.7 records user/filter ownership as follow-up evidence because the live local transaction focused on employee/staffing access-control claims.
  - [x] If `admin_limited` has app-layer permission without matching DB RLS, make the test expectation explicit and record the limitation in evidence rather than overstating RLS coverage.

- [x] Update durable evidence documents. (AC: 5)
  - [x] Add `docs/commercial-readiness/21_role_export_rls_test_evidence.md` or an equivalent clearly named evidence file.
  - [x] Link Story 22.7 results from `docs/commercial-readiness/14_evidence_index.md`.
  - [x] Update `docs/commercial-readiness/17_blocker_remediation_tracker.md` if tests reveal any access-control blocker.
  - [x] Evidence must include command names, exact exit codes, date, environment scope, and which roles/paths were covered.
  - [x] Evidence must not include real employee rows, SSNs, screenshots of private records, cookies, JWTs, database URLs, Supabase keys, service keys, or production SQL/API output.

- [x] Run required gates before moving beyond `ready-for-dev`. (AC: 1-5)
  - [x] You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0.
  - [x] Lead-agent verification commands are mandatory before acceptance:
    - `npx vitest run 2>&1; echo "EXIT:$?"`
    - `npx playwright test 2>&1; echo "EXIT:$?"`
  - [x] Also run `npx eslint` and `npx tsc --noEmit` if implementation changes code or tests.
  - [x] Run a targeted evidence hygiene search for private data/secrets in any new or changed evidence docs.

### Review Findings

- [x] [Review][Patch] Redact or move detailed operational/security evidence out of public repository docs.
- [x] [Review][Patch] Preserve recruiter/admin_limited custom-column values in `/api/employees` list responses.
- [x] [Review][Patch] Replace the duplicated external-role response-shaping list with the canonical role helper.
- [x] [Review][Patch] Return a 400 export validation response for malformed JSON before generic error handling.
- [x] [Review][Patch] Broaden AC1 field/editability tests so all eight roles are verified against the field matrix.
- [x] [Review][Patch] Broaden AC2 API/export isolation tests to cover OMC, Toplux, Crewing, and custom export fields.
- [x] [Review][Patch] Align RLS evidence with claimed external-role coverage by adding OMC, Payroll, Toplux, and all non-Crewing staffing denial cases.
- [x] [Review][Patch] Make the RLS evidence setup claim match the implementation by using service-role-backed setup.
- [x] [Review][Patch] Seed or upsert the staffing_needs row inside the Story 22.7 RLS transaction so the test is hermetic.
- [x] [Review][Defer] Pre-existing arbitrary user-activity update risk remains documented in the API matrix and deferred-work artifact.

## Dev Notes

### Scope Boundaries

- This story is test/evidence work plus the minimum code fixes required to make AC1-AC4 true.
- Do not broaden into Epic 23 enterprise hardening. Epic 23 remains future contract-dependent.
- Do not weaken RLS, role checks, export filtering, or field permissions to make tests pass.
- Do not claim DB column-level enforcement unless the exact DB privilege, policy, view, RPC, or function is implemented and tested.
- If tests expose a current access-control gap that is too large for this story, stop and synchronize a blocker instead of marking the story complete.

### Canonical Sources

- Story source: `docs/epics.md` section "Story 22.7: Add Role, Export, and RLS Evidence Tests".
- Planning mirror: `_bmad-output/planning-artifacts/epics.md` section "Story 22.7: Add Role, Export, and RLS Evidence Tests".
- API route evidence: `docs/commercial-readiness/19_api_auth_matrix.md`.
- Field evidence: `docs/commercial-readiness/20_field_access_matrix.md`.
- Evidence index: `docs/commercial-readiness/14_evidence_index.md`.
- Blocker tracker: `docs/commercial-readiness/17_blocker_remediation_tracker.md`.
- Role model: `src/lib/types/user.ts`.
- Role utilities: `src/lib/utils/role-utils.ts`.
- Auth helpers: `src/lib/server/auth.ts`.
- API Supabase cookie workaround: `src/lib/supabase/server-api.ts`.
- Employee list/detail/update: `src/app/api/employees/route.ts`, `src/app/api/employees/[id]/route.ts`, `src/lib/server/repositories/employee-repository.ts`.
- Export behavior: `src/app/api/employees/export/route.ts`, `src/app/api/employees/export-crew-ready/route.ts`, `src/components/dashboard/export-field-selection-dialog.tsx`, `src/lib/hooks/use-employee-export.ts`, `src/lib/constants/export-fields.ts`.
- Column permissions: `src/lib/types/column-config.ts`, `src/lib/server/repositories/column-config-repository.ts`, `supabase/migrations/*column_config*.sql`.
- RLS policies: `supabase/migrations/20251027000000_initial_schema.sql`, `20251210000002_update_rls_for_recruiter_crewing.sql`, `20251210000000_fix_employee_column_changes_rls.sql`, `20260130212612_create_user_filters.sql`, `20260313000001_add_staffing_needs.sql`, `20260607193000_fix_employee_column_changes_conflict_target.sql`.

### Architecture And Technical Guardrails

- Project stack from `package.json`: Next `^16.2.7`, React `19.2.0`, TypeScript `^5.9.3`, `@supabase/supabase-js` `^2.86.0`, `@supabase/ssr` `^0.8.0`, Vitest `^4.0.15`, Playwright `^1.57.0`, pnpm `10.19.0`.
- Architecture requires RLS as the primary enforcement layer and API checks as defense in depth.
- Architecture requires Zod schemas for input validation; add or update schemas under `src/lib/validation/` if payload behavior changes.
- API routes live under `src/app/api/`; shared logic belongs under `src/lib/`; no standalone backend service.
- Next.js App Router route handlers support `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`; unsupported methods return `405`. `NextRequest` is appropriate when route code needs cookies/search params. Current route helper patterns should pass `request` where `src/lib/server/auth.ts` documents the API cookie workaround.
- Supabase RLS is row-level. Supabase docs note service keys can bypass RLS and must never be exposed to browsers/customers. Supabase column-level privileges exist, but this project currently relies mainly on app-layer `column_config.role_permissions` for employee field access.

### Known Risk Areas From Story 22.6

- `/api/employees` and `employeeRepository.findAll()` use `select("*")`; external field hiding may be UI/export-only unless routes shape responses.
- `/api/employees/[id]` returns full employee detail to employee-manager roles and uses some auth helper calls without `request`.
- `/api/employees/export` filters fields in app code and uses service role for active `important_dates` after auth.
- `/api/employees/export-crew-ready` is high sensitivity: SSN, email, mobile, rank, hire date, checklist fields, salary level, and `crewing_done` write behavior.
- `/api/employees/[id]/custom-data` has app-layer permission checks and service-role update behavior; GET is auth-only in the API matrix.
- `admin_limited` exists in app code, but Story 22.6 noted incomplete static RLS evidence for employee row access.
- `employee_column_changes`, staffing changelog, and saved filter payloads can expose operational/user metadata; role-specific visibility should be tested or recorded as follow-up.

### Previous Story Intelligence

- Story 22.6 completed the API auth matrix, field access matrix, and route inventory coverage test. Build on those artifacts; do not regenerate separate unlinked evidence.
- Story 22.6 review fixes made evidence docs durable, hardened matrix parsing, moved middleware non-production guard earlier, represented `column_config` metadata, and repaired `employee_column_changes` trigger/index behavior.
- Story 22.2 non-production guard is done. Any live Supabase test must use local/non-production resources and must fail fast if pointed at production.
- Story 22.4 presentation controls remain binding: do not use or store real production employee data in tests, docs, screenshots, or exports.
- Story 22.1 is `done`; do not overclaim external-presentation readiness until post-merge deployed-app diagnostic status checks pass.

### Testing Requirements

**Estimated tests:** 5

- Role/column visibility and editability tests.
- API response field isolation tests.
- Export permission and content tests.
- Supabase RLS denial/allowance tests using non-production role contexts.
- Zod validation tests for any changed API payloads.

Full required gates before status movement:

- `npx vitest run`
- `npx playwright test`
- `npx eslint` if code/tests changed
- `npx tsc --noEmit` if code/tests changed

## Definition of Done

- Role, API, export, and RLS evidence tests exist and cover all eight current roles.
- Tests fail if external roles receive fields denied by `20_field_access_matrix.md` through APIs or exports.
- Service-role paths have explicit preauthorization tests or documented evidence coverage.
- Any changed API payload validation has Zod coverage.
- Evidence results are stored durably and linked from the evidence index.
- No private data or secrets are copied into evidence.
- Required gates pass with exit code `0` before the story moves beyond `ready-for-dev`.
- If implementation changes status, synchronize `docs/sprint-artifacts/story-22.7.md`, `docs/sprint-artifacts/epic-22-sprint-status.yaml`, `docs/sprint-artifacts/sprint-status.yaml`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, and `_bmad-output/implementation-artifacts/22-7-add-role-export-and-rls-evidence-tests.md` in the same turn.

## Dev Agent Record

### Debug Log

- 2026-06-08: Scrum Master prepared comprehensive story context for Story 22.7 and intentionally did not auto-start Epic 23 because Epic 23 is future contract-dependent.
- 2026-06-08: Story preparation selected the earliest active Epic 22 ready story with missing BMAD implementation artifact.
- 2026-06-08: Dev agent started implementation and moved Story 22.7 to in-progress across status artifacts.
- 2026-06-08: Added external employee-list response shaping, export Zod payload validation, and employee detail/delete employee-manager enforcement.
- 2026-06-08: Added focused Story 22.7 unit/integration evidence tests for role field permissions, API isolation, export behavior, Zod validation, and local Supabase RLS checks.
- 2026-06-08: Hardened two older E2E specs discovered by the full Playwright gate: mobile accessibility empty-card state and external direct-navigation dashboard assertion.
- 2026-06-08: Full gates passed: focused Story 22.7 Vitest, full Vitest, full Playwright, ESLint, type-check, and targeted evidence hygiene search.
- 2026-06-10: Code review identified nine patch findings and one pre-existing deferred risk; user selected option 1 to apply all patches.
- 2026-06-10: Redacted detailed operational/security evidence out of public commercial-readiness and sprint docs, while keeping durable non-sensitive evidence links.
- 2026-06-10: Review patches preserved recruiter/admin_limited visible custom-column values, switched external response shaping to the canonical role helper, added malformed export payload `400` handling, broadened AC1/AC2/RLS coverage to current roles, and made RLS setup hermetic/service-role-backed.
- 2026-06-10: Full gate after review patches passed: focused Story 22.7 Vitest `EXIT:0` with 40 tests, Story 13.7 export error handling `EXIT:0` with 14 tests, targeted E2E hardening `EXIT:0` with 20 passed/1 skipped, full Vitest `EXIT:0` with 3046 passed/30 skipped, full Playwright `EXIT:0` with 160 passed/56 skipped, ESLint `EXIT:0` with 321 warnings/0 errors, and type-check `EXIT:0`.

### Implementation Plan

- Build focused Story 22.7 tests from the Story 22.6 matrices.
- Use local/non-production Supabase for RLS evidence and service-role setup/cleanup.
- Update commercial-readiness evidence only after commands and exit codes are available.

### Completion Notes

- Done. Story 22.7 review patch findings are resolved with automated evidence for all eight roles, external API/export field isolation, export payload validation, and local/non-production Supabase RLS allow/deny checks.
- External `/api/employees` responses are shaped for external roles using current column configuration. Internal non-HR list responses preserve visible custom-column values under `customData`. The repository still reads raw employee rows internally, so DB column-level enforcement is not claimed.
- `/api/employees/[id]` remains full-detail for employee-manager roles only; external roles are denied.
- `admin_limited` direct employee-table DB RLS limitations are explicitly tested/documented rather than overstated.
- Required test/lint/type gates pass with exit code `0`: focused Story 22.7 Vitest, Story 13.7 export error handling, targeted E2E hardening, targeted FilterPanel Vitest, `npx vitest run`, `npx playwright test`, `npx eslint`, and `npx tsc --noEmit`. Targeted evidence hygiene search passes with no matches (`rg` `EXIT:1`).

### File List

- `src/lib/server/employee-field-access.ts`
- `src/lib/validation/export-schema.ts`
- `src/app/api/employees/route.ts`
- `src/app/api/employees/[id]/route.ts`
- `src/app/api/employees/export/route.ts`
- `tests/utils/role-test-utils.ts`
- `tests/unit/epic-22/story-22.7/role-field-permissions.test.ts`
- `tests/unit/epic-22/story-22.7/api-field-isolation.test.ts`
- `tests/unit/epic-22/story-22.7/export-evidence.test.ts`
- `tests/integration/epic-22/story-22.7/supabase-rls-evidence.test.ts`
- `tests/integration/epic-13/story-13.7/api/export-error-handling.test.ts`
- `tests/unit/epic-20/story-20.2/filter-panel.test.tsx`
- `tests/e2e/helpers/e2e-helpers.ts`
- `tests/e2e/epic-12/story-12.6/mobile-quick-actions.spec.ts`
- `tests/e2e/epic-12/story-12.7/mobile-accessibility.spec.ts`
- `tests/e2e/epic-16/story-16.6/external-user-direct-highlighting.spec.ts`
- `tests/e2e/epic-20/story-20.7/export-with-filters.spec.ts`
- `tests/e2e/epic-17/story-17.6/navigation-hiding.spec.ts`
- `playwright.config.ts`
- `docs/commercial-readiness/00_index.md`
- `docs/commercial-readiness/01_executive_summary.md`
- `docs/commercial-readiness/03_architecture.md`
- `docs/commercial-readiness/04_feature_capability_matrix.md`
- `docs/commercial-readiness/05_user_roles_and_permissions.md`
- `docs/commercial-readiness/06_data_inventory_and_data_flows.md`
- `docs/commercial-readiness/07_gdpr_and_privacy_overview.md`
- `docs/commercial-readiness/08_security_overview.md`
- `docs/commercial-readiness/09_operations_support_and_sla.md`
- `docs/commercial-readiness/10_dependencies_subprocessors_and_licenses.md`
- `docs/commercial-readiness/11_risk_register_and_open_questions.md`
- `docs/commercial-readiness/14_evidence_index.md`
- `docs/commercial-readiness/17_blocker_remediation_tracker.md`
- `docs/commercial-readiness/18_one_page_presentation_brief.md`
- `docs/commercial-readiness/19_api_auth_matrix.md`
- `docs/commercial-readiness/20_field_access_matrix.md`
- `docs/commercial-readiness/21_role_export_rls_test_evidence.md`
- `docs/sprint-artifacts/story-22.1.md`
- `_bmad-output/implementation-artifacts/deferred-work.md`

## Change Log

- 2026-06-08: Created ready-for-dev BMAD implementation story context for Story 22.7 with role/export/RLS evidence tasks, guardrails, known risks, sources, and mandatory test gates.
- 2026-06-08: Started Story 22.7 implementation.
- 2026-06-08: Implemented role/export/RLS evidence tests and minimum API/export hardening needed for AC1-AC4.
- 2026-06-08: Added durable Story 22.7 evidence documentation and moved story to review after all gates passed.
- 2026-06-10: Applied all Story 22.7 review patch findings, recorded the deferred pre-existing risk, refreshed evidence/status artifacts, and verified focused/full gates successfully.
