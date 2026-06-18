---
baseline_commit: e0b38150413fd6b6613456c4de3cd1bb8c596db0
---

# Story 22.4: Confirm Presentation Data Scope and Access Preconditions

## Status

done

- **Priority:** P0
- **Story Points:** 3
- **Dependencies:** `22.2`

## Story

As an external presenter, I want the presentation audience, data scope, and access path confirmed, so that real HR data is shown only to managers or stakeholders who are authorized to see it.

## Acceptance Criteria

- [x] AC1: Production-data presentation controls document allowed audience/purpose framing, permitted employee population principles, role context, fields, workflows, environment path, and export/screenshot/browser-history/recording restrictions.
- [x] AC2: The docs state that production data may be presented under standing Stena controls.
- [x] AC3: The presentation uses an authorized account or approved role context, not an over-privileged shortcut account, direct database access, service-role path, or diagnostic endpoint.
- [x] AC4: No out-of-scope employee records, fields, exports, screenshots, browser history, admin-only views, or debug/test views are shown.
- [x] AC5: If a non-production presentation path is deliberately chosen, it uses the Story 22.2-compliant local/isolated staging path and does not target production Supabase resources.

## Tasks / Subtasks

- [x] Create the presentation data-scope evidence surface. (AC: 1, 2, 5)
  - [x] Add or update a focused readiness document under `docs/commercial-readiness/`, recommended: `16_presentation_data_scope_and_access_preconditions.md`.
  - [x] Define standing production-data presentation controls.
  - [x] Describe employee population by business scope or selection rule; do not write raw SSNs, private employee details, access tokens, cookies, database URLs, or secret values into the document.

- [x] Record production-data presentation and access preconditions. (AC: 2, 3)
  - [x] State that production data may be shown under standing presentation controls.
  - [x] Specify the exact app role context/account type to use for the presentation.
  - [x] Explicitly prohibit service-role access, Supabase Studio/direct SQL, admin shortcut accounts, `/api/debug/auth-status`, `/api/test-db`, and any other diagnostic route as presentation paths.

- [x] Define the presentation-safe scope and restrictions. (AC: 1, 4)
  - [x] List the allowed workflows/screens and the fields/columns that may be visible.
  - [x] List restricted fields, employee populations, exports, screenshots, browser history, admin-only pages, and debug/test views.
  - [x] Add pre-presentation operator checks for logged-in account, role preview/account context, open browser tabs, downloads folder/export files, screenshots, and autocomplete/history exposure.

- [x] Update linked readiness artifacts. (AC: 1, 2, 5)
  - [x] Update `docs/commercial-readiness/00_index.md` to include the new or updated presentation-scope document.
  - [x] Update `docs/commercial-readiness/14_evidence_index.md` with traceability for presentation data-scope controls.
  - [x] Update `docs/commercial-readiness/05_user_roles_and_permissions.md`, `06_data_inventory_and_data_flows.md`, and `11_risk_register_and_open_questions.md` only where their current claims or open questions change.

- [x] Use Story 22.2 controls only when a non-production fallback is needed. (AC: 5)
  - [x] Confirm the planned non-production path uses the isolated environment controls completed in Story 22.2.
  - [x] Document that Story 22.2 is not a blocker for controlled production-data presentations through the production app.
  - [x] If a non-production presentation path is deliberately chosen, use the Story 22.2-compliant local/isolated staging path.

- [x] Verify quality gates for the actual implementation scope. (AC: 1-5)
  - [x] For docs-only implementation, run targeted searches to confirm the evidence document does not contain raw secrets, database URLs, auth tokens, cookies, SSNs, or private employee examples.
  - [x] If any code, route behavior, role behavior, export behavior, or UI copy changes are required, add/update Vitest and/or Playwright coverage, update Swedish copy in `messages/sv.json` where applicable, preserve Zod validation, and run the full required gates: `npx vitest run`, `npx playwright test`, plus lint/type-check if configured.

### Review Findings

- [x] [Review][Decision] State that production data may be presented under standing controls — Resolved by product-owner decision on 2026-06-07: production data is allowed for controlled presentations.
- [x] [Review][Patch] Synchronize 22.5-22.9 status across story, epic, and BMAD sprint artifacts [`docs/sprint-artifacts/epic-22-sprint-status.yaml:83`]
- [x] [Review][Patch] Add standing operator checks for live scope, role, environment, and artifact changes [`docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md:64`]
- [x] [Review][Patch] Require demonstrated fields and custom columns to stay within the selected role and walkthrough scope [`docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md:45`]
- [x] [Review][Patch] Add meeting recording, transcription, and AI-notes restrictions to presentation controls [`docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md:60`]
- [x] [Review][Patch] Define export/screenshot/recording artifact storage, recipients, retention date, deletion owner, and deletion proof [`docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md:86`]
- [x] [Review][Patch] Clarify that Story 22.4 production-data controls do not waive remaining P0 presentation prerequisites such as Story 22.5 [`docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md:81`]

## Dev Notes

### Scope Boundaries

- This story is expected to be a documentation/evidence story. Do not add application features unless the presentation cannot satisfy the acceptance criteria with existing role/account behavior.
- Do not read, dump, screenshot, or store real employee records while preparing the story artifact. The deliverable is scope-control evidence, not employee data capture.
- Do not weaken Story 22.1 or Story 22.2 controls. Diagnostic endpoint exposure remains a P0 risk, and test/staging paths must not target production Supabase resources.
- Keep the external message honest: this system is a working pilot candidate, not enterprise-ready production software.

### Architecture And Security Guardrails

- RLS is the primary database-level security control; API checks and UI filtering are secondary controls. Presentation access must use a normal authorized app account/role context. [Source: `docs/architecture.md` sections "Architectural Patterns" and "Security"]
- App roles are `hr_admin`, `recruiter`, `admin_limited`, `crewing`, `sodexo`, `omc`, `payroll`, and `toplux`. External-party access is column-filtered mostly at the application layer, so presentation scope must define visible fields and exports precisely. [Source: `docs/commercial-readiness/05_user_roles_and_permissions.md`]
- The highest privacy-impact object is `employees`; examples include SSN, contact details, dates, comments, diet, payroll-related flags, and room fields. The story document should define permitted categories, not reproduce private values. [Source: `docs/commercial-readiness/06_data_inventory_and_data_flows.md`]
- Service-role clients bypass RLS by design and must not be used as a presentation path. [Source: `docs/commercial-readiness/05_user_roles_and_permissions.md`]
- `/api/debug/auth-status` and `/api/test-db` were identified as public diagnostic exposure risks. They must not be used for presentation evidence or access. [Source: `docs/commercial-readiness/11_risk_register_and_open_questions.md`]

### Project Structure Notes

- Readiness artifacts live in `docs/commercial-readiness/`. Prefer adding one focused document there and linking it from `00_index.md` and `14_evidence_index.md`.
- Story/status artifacts live in `docs/sprint-artifacts/` and `_bmad-output/implementation-artifacts/`; status changes must remain synchronized across both surfaces.
- If implementation unexpectedly requires code, keep application code under `src/`, API routes under `src/app/api/`, shared server logic under `src/lib/`, and tests under the existing `tests/` epic/story structure.

### Previous Story Intelligence

- Story 22.2 is done. It introduced non-production Supabase guardrails and passed the exact Playwright gate after local Supabase was running. This does not prohibit controlled production-data presentations; it governs test/staging/non-production presentation paths only.
- Story 22.3 completed dependency remediation and updated readiness evidence. Its final full gates passed, including `npx vitest run`, `npx eslint`, `npx tsc --noEmit`, and `npx playwright test`.
- Story 22.3 also aligned export behavior to current real employee-table custom columns; presentation restrictions should account for exports as a possible data exposure path.

### Testing Requirements

**Estimated tests:** 0

- No automated tests are expected for a docs-only implementation.
- If any code changes are made, tests are mandatory for every behavior change. Run the full project gates before moving the story to review or done.
- If app copy changes, Swedish i18n coverage is mandatory. If validation schemas change, Zod coverage is mandatory. If access behavior changes, RBAC/RLS-oriented tests are mandatory.

### References

- `docs/epics.md` section "Story 22.4: Confirm Presentation Data Scope and Access Preconditions"
- `_bmad-output/planning-artifacts/epics.md` section "Story 22.4: Confirm Presentation Data Scope and Access Preconditions"
- `docs/commercial-readiness/05_user_roles_and_permissions.md`
- `docs/commercial-readiness/06_data_inventory_and_data_flows.md`
- `docs/commercial-readiness/11_risk_register_and_open_questions.md`
- `docs/commercial-readiness/14_evidence_index.md`
- `docs/sprint-artifacts/story-22.2.md`
- `docs/sprint-artifacts/story-22.3.md`

## Definition of Done

- Presentation data scope and access preconditions are documented.
- Production data use is permitted under standing presentation controls.
- Out-of-scope data exposure paths are documented and avoided.
- Linked readiness artifacts and status artifacts are updated consistently.
- Any test-gate waiver or Story 22.2 non-production dependency blocker is recorded instead of silently treating the gate as passed.

## Dev Agent Record

### Debug Log

- 2026-06-07: Product owner clarified that production data may be used for controlled presentations; replaced the old presentation-gating language with standing production-data presentation controls.
- 2026-06-07: Resolved code-review status synchronization finding; Story 22.4 moved to done and Stories 22.5-22.9 now consistently show ready-for-dev across story, epic, and BMAD status artifacts.
- 2026-06-07: Added docs-only presentation scope evidence and linked readiness artifacts; no application code changed.
- 2026-06-07: Ran targeted evidence search for raw Supabase URLs, Postgres URLs, secret key names/values, JWT-looking tokens, access/refresh tokens, cookie/session/password assignments, and raw SSN/personnummer patterns; no matches found in `docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md`.
- 2026-06-07: Dev Agent started implementation; captured baseline commit `e0b38150413fd6b6613456c4de3cd1bb8c596db0`.
- 2026-06-06: Scrum Master prepared comprehensive story context and moved Story 22.4 to ready-for-dev.

### Implementation Plan

- Docs-only implementation: create the presentation data-scope evidence page, link it from readiness indexes, add narrow role/data/risk cross-references, and verify the evidence page contains no raw secrets or private employee examples.

### Completion Notes

- Added `docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md` with standing production-data presentation controls, role/account context, prohibited presentation paths, allowed/restricted scope, operator checks, non-production path rules, and evidence handling.
- Updated readiness index, evidence index, role/permission notes, data inventory notes, and risk register traceability.
- Production data may be presented under standing controls; Story 22.2 applies only when a non-production presentation path is deliberately chosen.
- Code-review findings are resolved; Story 22.4 is done. Stories 22.5-22.9 are explicitly ready-for-dev in synchronized planning/status artifacts.
- Automated Vitest/Playwright gates waived because Story 22.4 is docs-only with estimated tests `0`; targeted evidence quality search passed.

### File List

- `docs/sprint-artifacts/story-22.4.md`
- `docs/sprint-artifacts/story-22.5.md`
- `docs/sprint-artifacts/story-22.6.md`
- `docs/sprint-artifacts/story-22.7.md`
- `docs/sprint-artifacts/story-22.8.md`
- `docs/sprint-artifacts/story-22.9.md`
- `_bmad-output/implementation-artifacts/22-4-confirm-presentation-data-scope-and-access-preconditions.md`
- `docs/commercial-readiness/00_index.md`
- `docs/commercial-readiness/05_user_roles_and_permissions.md`
- `docs/commercial-readiness/06_data_inventory_and_data_flows.md`
- `docs/commercial-readiness/11_risk_register_and_open_questions.md`
- `docs/commercial-readiness/14_evidence_index.md`
- `docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md`
- `docs/sprint-artifacts/epic-22-sprint-status.yaml`
- `docs/sprint-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-06-07: Implemented docs-only presentation data-scope/access-preconditions evidence, linked readiness artifacts, recorded test-gate waiver, and moved Story 22.4 to review.
- 2026-06-07: Replaced presentation-gating language with standing production-data presentation controls per product-owner decision.
- 2026-06-07: Resolved review findings, synchronized 22.5-22.9 readiness statuses, and moved Story 22.4 to done.
- 2026-06-06: Prepared Story 22.4 as ready-for-dev with implementation tasks, architecture/security guardrails, previous-story intelligence, testing requirements, and synchronized status guidance.
