---
baseline_commit: e0b38150413fd6b6613456c4de3cd1bb8c596db0
---

# Story 22.5: Create Blocker Remediation Tracker and One-Page Presentation Brief

## Status

done

- **Priority:** P0
- **Story Points:** 2
- **Dependencies:** `22.1`, `22.2`, `22.3`, `22.4`
- **Canonical planning artifact:** `docs/sprint-artifacts/story-22.5.md`

## Story

As a product owner, I want a clear blocker tracker and presentation brief, so that external conversations are honest, controlled, and do not overclaim readiness.

## Acceptance Criteria

- [x] AC1: A blocker remediation tracker exists with priority, owner, target date, status, acceptance criteria, latest note, and evidence link for each blocker.
- [x] AC2: The tracker includes at least the P0 blockers from the readiness analysis.
- [x] AC3: A one-page presentation brief states current state, presentation-ready scope, known risks, non-ready areas, and recommended positioning as a working pilot candidate.
- [x] AC4: The brief explicitly avoids claiming enterprise-ready production status.
- [x] AC5: The tracker and brief are stored in a durable docs location and linked from the sprint planner.

## Tasks / Subtasks

- [x] Create the blocker remediation tracker. (AC: 1, 2, 5)
  - [x] Add `docs/commercial-readiness/17_blocker_remediation_tracker.md`.
  - [x] Include columns for blocker ID, source story/risk, priority, owner, target date, status, acceptance criteria, latest note, and evidence link.
  - [x] Include at minimum the P0 readiness blockers represented by Stories 22.1-22.5: public diagnostic endpoint exposure, non-production environment isolation, dependency advisory remediation/residual risk, controlled production-data review scope, and the readiness tracker/brief itself.
  - [x] Use the current status artifacts as the source of truth for story status. Do not mark Story 22.1 done unless all synchronized story/status artifacts say it is done.
  - [x] Use existing target dates where documented; where a blocker has no target date, assign a concrete review/decision target date and state that owner confirmation is required.

- [x] Create the one-page presentation brief. (AC: 3, 4, 5)
  - [x] Add `docs/commercial-readiness/18_one_page_presentation_brief.md`.
  - [x] Cover current state, presentation-ready scope, known risks, non-ready areas, and recommended positioning.
  - [x] Position HR Masterdata as a controlled working pilot candidate for a serious external presentation or handover/sale discussion.
  - [x] Explicitly state that the system is not enterprise-ready production software and that Epic 23 work remains future contract/enterprise readiness.
  - [x] Keep the brief concise enough to function as a one-page pre-meeting handout; do not turn it into a full risk register.

- [x] Link the new artifacts from durable readiness and sprint surfaces. (AC: 5)
  - [x] Update `docs/commercial-readiness/00_index.md` to list both new documents.
  - [x] Update `docs/commercial-readiness/14_evidence_index.md` with traceability for the tracker and brief.
  - [x] Update `docs/sprint-artifacts/sprint-status.yaml` and `docs/sprint-artifacts/epic-22-sprint-status.yaml` so Story 22.5 notes or next actions link to the tracker and brief once created.
  - [x] If a BMAD implementation story artifact exists, keep it aligned with this canonical story file.

- [x] Keep readiness claims factual and non-disclosing. (AC: 2, 3, 4)
  - [x] Use factual status language from `docs/commercial-readiness/11_risk_register_and_open_questions.md`, `15_dependency_advisory_risk_register.md`, and `16_presentation_data_scope_and_access_preconditions.md`.
  - [x] Do not include raw employee records, SSNs, private employee examples, database URLs, access tokens, cookies, secrets, Supabase keys, screenshots of private records, or direct SQL/API output.
  - [x] Separate controlled-presentation readiness from enterprise/contract readiness; do not imply that P1/P2 security, privacy, restore, or operational governance work is complete.

- [x] Verify quality gates for the actual implementation scope. (AC: 1-5)
  - [x] For docs-only implementation, run targeted searches against the new documents for raw secrets, Supabase/Postgres URLs, auth tokens, cookies, JWT-looking values, SSN/personnummer patterns, and private employee examples.
  - [x] Record the docs-only automated test waiver in the Dev Agent Record because estimated tests are `0`.
  - [x] If any code, route behavior, UI navigation, UI copy, validation schema, or access behavior changes are required, write/update tests for every code change and run the full gates: `npx vitest run`, `npx playwright test`, plus lint/type-check if configured.

### Review Findings

- [x] [Review][Patch] Qualify stale diagnostic endpoint evidence as pre-remediation and reconcile route count [docs/commercial-readiness/14_evidence_index.md:20]
- [x] [Review][Patch] Tighten external-review wording so disclosure alone does not bypass the open Story 22.1 P0 gate [docs/commercial-readiness/17_blocker_remediation_tracker.md:22]

## Dev Notes

### Scope Boundaries

- This is expected to be documentation/evidence work. Do not add application features unless the tracker or brief cannot be linked from existing docs and sprint artifacts.
- Do not read, dump, screenshot, export, or store real employee rows while implementing this story.
- Do not weaken Stories 22.1 or 22.2. Diagnostic endpoint protection remains a P0 prerequisite, and test/staging paths must keep refusing production Supabase resources.
- Do not use the brief as a marketing page. It should be a factual presentation readiness summary for controlled external discussion.
- Production data may be presented only under the standing controls from Story 22.4. The tracker/brief must not create a broader permission to show data.

### Minimum P0 Blockers To Represent

Use current status and evidence, not assumptions:

| Blocker | Source | Required tracker treatment |
| --- | --- | --- |
| Public diagnostic endpoint exposure | Story 22.1, risk `R-001`, `docs/commercial-readiness/11_risk_register_and_open_questions.md`, `08_security_overview.md` | P0/high security and readiness gate until the story and its Playwright gate are complete in synchronized artifacts. |
| Test/staging isolation from production Supabase | Story 22.2, risk `R-021` | Show as completed/mitigated if current status remains done; preserve monitoring note that tests must not target production. |
| Dependency advisories and residual risk | Story 22.3, risk `R-002`, `15_dependency_advisory_risk_register.md` | Show critical/high production advisories remediated; residual moderate/low risks accepted for controlled presentation with target dates. |
| Presentation data scope and access preconditions | Story 22.4, risk `R-022`, `16_presentation_data_scope_and_access_preconditions.md` | Show as completed if current status remains done; brief must reference these standing controls. |
| Blocker tracker and one-page brief | Story 22.5 | Show as open/in progress until both documents and sprint links exist. |

The brief should also list non-ready enterprise areas where relevant: API/field access evidence matrices, role/export/RLS evidence tests, Supabase security evidence and restore drill, privacy annex/subprocessor/incident process, formal support/SLA, SSO/MFA, production access governance, DB network/SSL/PITR hardening, and full contract-ready operations. These are known risks or future readiness work, not proof that the controlled presentation is blocked unless a P0 blocker is still open.

### Architecture And Security Guardrails

- RLS is the primary database-level authorization boundary, and API checks are a secondary boundary. Do not claim access-control proof that is not backed by Story 22.6/22.7 evidence. [Source: `docs/architecture.md` sections "Architectural Patterns" and "Security"]
- App roles include `hr_admin`, `recruiter`, `admin_limited`, `crewing`, `sodexo`, `omc`, `payroll`, and `toplux`; external-party field access is still largely app-layer controlled. [Source: `docs/commercial-readiness/05_user_roles_and_permissions.md`]
- Employee data includes sensitive personal data categories; readiness docs must describe categories and controls, not private values. [Source: `docs/commercial-readiness/06_data_inventory_and_data_flows.md`]
- Service-role access, Supabase Studio/direct SQL, diagnostic endpoints, raw API responses, logs, environment-variable screens, and developer tools are prohibited presentation paths. [Source: `docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md`]
- User-facing app copy is Swedish-only via `messages/sv.json`; if implementation unexpectedly changes UI copy, add Swedish translations and tests. [Source: `docs/architecture.md` "CRITICAL LOCALIZATION REQUIREMENT"]
- If validation or API behavior changes unexpectedly, preserve Zod validation and add/adjust tests. [Source: `docs/architecture.md` "Coding Standards"]

### Project Structure Notes

- Readiness artifacts live under `docs/commercial-readiness/`.
- Sprint/story artifacts live under `docs/sprint-artifacts/`.
- BMAD implementation tracking lives under `_bmad-output/implementation-artifacts/`.
- Status changes must be synchronized across all required sprint artifacts, but this story creation starts from `ready-for-dev`; do not change status unless actual implementation work begins or completes.
- `docs/` and `_bmad-output/` may be ignored by Git in some contexts. Verify status synchronization by re-reading/searching files, not by relying on `git status`.

### Previous Story Intelligence

- Story 22.1 is `done` in synchronized status artifacts. Production custom-domain verification is a post-merge Epic 22 release/readiness gate, not a story-completion blocker.
- Story 22.2 is done. It introduced non-production Supabase guardrails and reset `.env.test` to local/non-production placeholders. The exact Playwright gate passed after local Supabase was available.
- Story 22.3 is done. Current production audit evidence reports 0 critical/high production advisories and 3 residual moderate/low advisories documented with owner, target dates, compensating controls, and controlled-presentation acceptance.
- Story 22.4 is done. Production data may be shown under standing presentation controls; Story 22.2 applies only when a non-production presentation path is deliberately chosen.
- Story 22.4's docs-only implementation used a targeted secret/SSN/DB URL/token search instead of full Vitest/Playwright gates because estimated tests were `0`; follow the same waiver pattern only if Story 22.5 remains docs-only.

### Testing Requirements

**Estimated tests:** 0

- No automated tests are expected for docs-only implementation.
- Run a targeted evidence-quality search for disallowed private or secret-bearing content in the new tracker and brief.
- If any code changes are made, tests are mandatory for every behavior change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0.
- If app copy changes, Swedish i18n coverage is mandatory. If validation schemas change, Zod coverage is mandatory. If access behavior changes, RBAC/RLS-oriented tests are mandatory.

### References

- `docs/epics.md` section "Story 22.5: Create Blocker Remediation Tracker and One-Page Presentation Brief"
- `_bmad-output/planning-artifacts/epics.md` section "Story 22.5: Create Blocker Remediation Tracker and One-Page Presentation Brief"
- `docs/sprint-artifacts/sprint-status.yaml`
- `docs/sprint-artifacts/epic-22-sprint-status.yaml`
- `docs/sprint-artifacts/story-22.1.md`
- `docs/sprint-artifacts/story-22.2.md`
- `docs/sprint-artifacts/story-22.3.md`
- `docs/sprint-artifacts/story-22.4.md`
- `docs/commercial-readiness/00_index.md`
- `docs/commercial-readiness/01_executive_summary.md`
- `docs/commercial-readiness/08_security_overview.md`
- `docs/commercial-readiness/11_risk_register_and_open_questions.md`
- `docs/commercial-readiness/14_evidence_index.md`
- `docs/commercial-readiness/15_dependency_advisory_risk_register.md`
- `docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md`

## Definition of Done

- Blocker remediation tracker is created in `docs/commercial-readiness/`.
- One-page presentation brief is created in `docs/commercial-readiness/`.
- All P0 readiness blockers are represented with priority, owner, target date, status, acceptance criteria, latest note, and evidence link.
- The brief states presentation-ready scope, known risks, non-ready areas, and working-pilot positioning without claiming enterprise-ready production status.
- Readiness index, evidence index, and sprint planner links are updated.
- Docs-only test waiver or any code-change test results are recorded.
- Story/status artifacts are synchronized if implementation changes status.

## Dev Agent Record

### Debug Log

- 2026-06-07: Scrum Master prepared comprehensive story context and confirmed Story 22.5 remains ready-for-dev.
- 2026-06-07: `bmad-sm` skill activation file referenced missing `_bmad/bmm/agents/sm.md`; used project-local `bmad-create-story` workflow as fallback.
- 2026-06-07: Dev Agent started docs-only implementation and captured baseline commit `e0b38150413fd6b6613456c4de3cd1bb8c596db0`.
- 2026-06-07: Created `17_blocker_remediation_tracker.md` and `18_one_page_presentation_brief.md`; no application code changed.
- 2026-06-07: Updated readiness index, evidence index, active epic status, high-level sprint planner, BMAD implementation sprint status, and BMAD story artifact links/status.
- 2026-06-07: Ran targeted evidence-quality search for raw URLs, Postgres/Supabase URLs, JWT-looking values, secret/cookie/token assignments, Supabase key assignments, and SSN/personnummer patterns against the two new docs; no matches found.
- 2026-06-07: Docs-only automated Vitest/Playwright gate waived because estimated tests are `0` and no code, UI copy, API behavior, validation schema, RBAC, or RLS behavior changed.
- 2026-06-07: Code-review patches applied: stale diagnostic endpoint evidence is qualified as pre-remediation/currently removed pending runtime proof, route inventory is reconciled to 43 API route files, and tracker/brief wording now requires Story 22.1 closure or formal accountable-owner risk acceptance before treating the readiness package as P0-complete.
- 2026-06-07: Re-ran targeted docs-quality checks after review patches: stale current-route evidence phrases no longer match, current API route inventory is 43, and targeted private/secret-bearing content search against the tracker/brief returned only the expected policy sentence.

### Implementation Plan

- Docs-only implementation: create the blocker tracker and one-page brief, link both from readiness and sprint artifacts, then run targeted evidence-quality searches for private/secret-bearing content.

### Completion Notes

- Created `docs/commercial-readiness/17_blocker_remediation_tracker.md` with P0 blockers B-001 through B-005, including owner, target date, status, acceptance criteria, latest note, and evidence link.
- Created `docs/commercial-readiness/18_one_page_presentation_brief.md` with current state, controlled presentation-ready scope, known risks, non-ready areas, and working-pilot positioning.
- The brief explicitly states HR Masterdata must not be described as enterprise-ready, production-approved, security-certified, privacy-approved, SLA-backed, or contract-ready.
- Linked the tracker and brief from `00_index.md`, `14_evidence_index.md`, sprint planner surfaces, and BMAD implementation artifacts.
- Story 22.1 implementation is done; post-deployment diagnostic endpoint verification remains visible as a P0 release/readiness gate. Story 22.5 is done.
- Revised tracker/brief wording so Story 22.1 is framed as a security/readiness gate.
- No code changed; RBAC/RLS, Swedish i18n, and Zod validation were not modified.
- Docs-only automated test waiver recorded; targeted private/secret-bearing content search passed.
- Code-review findings resolved. Stale diagnostic endpoint evidence was updated in `00_index.md`, `08_security_overview.md`, `11_risk_register_and_open_questions.md`, and `14_evidence_index.md`; `17_blocker_remediation_tracker.md` and `18_one_page_presentation_brief.md` now avoid treating disclosure alone as closure for the open Story 22.1 P0 gate.

### File List

- `docs/sprint-artifacts/story-22.5.md`
- `docs/commercial-readiness/00_index.md`
- `docs/commercial-readiness/08_security_overview.md`
- `docs/commercial-readiness/11_risk_register_and_open_questions.md`
- `docs/commercial-readiness/14_evidence_index.md`
- `docs/commercial-readiness/17_blocker_remediation_tracker.md`
- `docs/commercial-readiness/18_one_page_presentation_brief.md`
- `docs/sprint-artifacts/epic-22-sprint-status.yaml`
- `docs/sprint-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/22-5-create-blocker-remediation-tracker-and-one-page-presentation-brief.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log

- 2026-06-07: Created comprehensive ready-for-dev story context for Story 22.5 with tasks, guardrails, previous-story intelligence, testing requirements, and references.
- 2026-06-07: Implemented docs-only blocker tracker and one-page presentation brief, linked readiness/sprint/BMAD artifacts, recorded waiver/search results, and moved Story 22.5 to review.
- 2026-06-07: Revised tracker and linked notes so Story 22.1 is a security/readiness gate within the readiness package.
- 2026-06-07: Resolved code-review findings, re-ran targeted docs-quality checks, synchronized status artifacts, and moved Story 22.5 to done.
