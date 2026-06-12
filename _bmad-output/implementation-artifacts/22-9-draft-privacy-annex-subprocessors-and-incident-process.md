---
baseline_commit: 751e1b9f5701d7af0b04d93ddf2a687e50b5d183
---

# Story 22.9: Draft Privacy Annex, Subprocessors, and Incident Process

## Status

ready-for-dev

- **Priority:** P1
- **Story Points:** 3
- **Dependencies:** `22.4`, `22.8`
- **Canonical planning artifact:** `docs/sprint-artifacts/story-22.9.md`

> **Sequencing:** Story 22.8 must be done (or its evidence-package path finalized) before this story is marked done, because AC5 requires links to the Supabase evidence package. Drafting may start in parallel, but the final link check happens against the real 22.8 artifacts.

## Story

As a privacy or legal reviewer,
I want a draft privacy pack,
so that controller/processor responsibilities and breach-response obligations are explicit before commercial diligence.

## Acceptance Criteria

- [ ] AC1: Privacy annex draft covers controller/processor assumptions, legal basis, data categories, retention, DSAR handling, DPIA screening, and open legal questions.
- [ ] AC2: Subprocessor register lists Supabase, Vercel, SMTP/email provider(s), and any other relevant service with purpose and data exposure.
- [ ] AC3: Incident/breach process defines triage, owner, notification timing, evidence capture, customer/stakeholder communication, and post-incident follow-up.
- [ ] AC4: The privacy pack clearly identifies what is draft diligence material and what needs legal review.
- [ ] AC5: The pack links back to the presentation data-scope decision and Supabase evidence package.

## Tasks / Subtasks

- [ ] Create the privacy annex draft. (AC: 1, 4)
  - [ ] Add `docs/commercial-readiness/23_privacy_annex_draft.md`. Verify numbering at implementation time: `22_` is reserved by Story 22.8's Supabase evidence package; do not duplicate prefixes (note the existing `15_` collision — two files share `15_`; do not repeat that mistake).
  - [ ] Do NOT start from scratch: `07_gdpr_and_privacy_overview.md` already contains the processing-activity table (section 2), data-subject-rights support table (section 4), retention/deletion state (section 6), and open legal questions (section 8). The annex restructures and extends this into diligence shape; it must not contradict or silently fork it — link back where content is shared.
  - [ ] Controller/processor assumptions: per `07` section 8, controller/processor roles depend on the deployment/commercial model. Document assumptions per plausible model (current pilot operation vs. managed service vs. customer-hosted handover — models named in `12_commercial_pack.md` / Epic 23.1) and mark each as a draft assumption pending the Epic 23.1 commercial-model decision. Do NOT decide the commercial model here.
  - [ ] Legal basis: per processing activity, record "must be assessed" status honestly with candidate bases; flag SSN, dietary notes, payroll-adjacent and health/training-adjacent fields as needing special-category/national-rule review (open question in `07` section 8).
  - [ ] Data categories: align with ACTUAL HR fields from `src/lib/types/employee.ts` and the field inventory in `20_field_access_matrix.md` / `06_data_inventory_and_data_flows.md` — list categories (identity, contact, SSN, employment status, scheduling/training, dietary, payroll-adjacent, comments, custom partner columns, audit metadata, backups) without inventing fields that don't exist.
  - [ ] Retention: capture the current technical state from `07` section 6 (archive + `archived_at`, 3-month anonymization threshold for archived employees, 14-day backup retention) and the known gaps (anonymization cron `/api/cron/gdpr-anonymize` NOT scheduled in `vercel.json`; custom columns/logs retention unverified; backup restore/deletion behavior). State these as facts + open questions, not as resolved policy.
  - [ ] DSAR handling: base on `07` section 4 table — what the product supports today (export routes, edit, archive/delete/anonymize) vs. missing process (no dedicated DSAR export workflow, objection/restriction handled outside app).
  - [ ] DPIA screening: provide a short screening summary (HR data at scale, SSN, external party access, email notifications) concluding whether a DPIA is recommended before formal operation — `07` section 9 already recommends it; do not soften that.
  - [ ] Open legal questions: carry forward `07` section 8 plus any new questions raised by this story.

- [ ] Create the subprocessor register. (AC: 2, 4)
  - [ ] Add `docs/commercial-readiness/24_subprocessor_register.md`.
  - [ ] Source material exists: `10_dependencies_subprocessors_and_licenses.md` "SaaS And Service Dependencies" and "Potential Subprocessor Data Map" tables. The register formalizes these into one table: service, role (processor/subprocessor/unknown), purpose, personal data exposed, environment (prod/staging/CI), contract/DPA status, transfer/region status, and review owner+date.
  - [ ] Minimum entries: Supabase (DB/auth/realtime/storage/backups), Vercel (hosting/functions/cron/logs), GitHub (repo/CI/secrets/backup workflow execution — note the backup workflow handles production DB dumps in CI), SMTP provider (note: provider is NOT identified from the repo — record as open item to confirm, do not guess a vendor name), and npm/open-source as "generally not subprocessors" per existing analysis.
  - [ ] Region/transfer: concrete regions are held privately (existing evidence convention). Record "verified privately / needs DPA confirmation" rather than publishing project regions.
  - [ ] Contract/DPA status: realistically "vendor standard terms, DPA not yet executed for a commercial deployment" — mark as Epic 23.2 follow-up; this story is draft diligence only.

- [ ] Create the incident/breach process draft. (AC: 3, 4)
  - [ ] Add `docs/commercial-readiness/25_incident_breach_process.md`.
  - [ ] Current state is "logs only, no formal process" (`07` section 7, `09_operations_support_and_sla.md` line ~113 minimum-target list). Build the draft runbook from the `09` minimum target: incident lead/technical owner/business owner/privacy contact roles, severity levels, triage steps, evidence preservation (logs + deployment identifiers in a PRIVATE incident record — not in the public repo), breach-assessment step with notification-timing guidance (e.g. supervisory-authority 72-hour assessment checkpoint as a draft obligation to confirm with legal), customer/stakeholder communication templates (placeholders), and post-incident review.
  - [ ] Owners: use role labels (technical owner, business/data owner, privacy contact) consistent with `17_blocker_remediation_tracker.md` conventions — no personal names/emails in committed docs.
  - [ ] Keep it operational and honest: it's a draft process for a working pilot, not a certified ISO/enterprise IR program. Cross-link rather than duplicate `09` operations content.

- [ ] Mark draft status and legal-review boundaries throughout. (AC: 4)
  - [ ] Every new document starts with the established disclaimer pattern (see `07` line 4): "This is not legal advice... must be assessed by the responsible organization."
  - [ ] Use an explicit per-section marker where needed: `Draft — needs legal review` vs. `Technical fact from repository evidence`. A reviewer must never have to guess which claims are verified.

- [ ] Wire up links and readiness surfaces. (AC: 5)
  - [ ] Link from the privacy pack to: `16_presentation_data_scope_and_access_preconditions.md` (Story 22.4 data-scope decision) and the Story 22.8 Supabase evidence package + restore-drill evidence (verify actual filenames once 22.8 lands; planned: `22_supabase_security_evidence_package.md`, `evidence/restore-drill-<date>.md`).
  - [ ] Update `14_evidence_index.md` with rows for the three new documents.
  - [ ] Update `17_blocker_remediation_tracker.md` with an `E-009` row following the `E-006`/`E-007` column format.
  - [ ] Update `00_index.md` so the new documents are listed.
  - [ ] Update `07_gdpr_and_privacy_overview.md` and `10_dependencies_subprocessors_and_licenses.md` with forward links to the new pack where they say "create subprocessor register" / "write incident runbook", so recommendations and deliverables stay connected.

- [ ] Evidence hygiene gate. (AC: 1-5)
  - [ ] No committed file may contain: personal names/emails of operators, real employee data or SSNs, database URLs, Supabase project refs/regions, keys, tokens, or private incident details.
  - [ ] Run the targeted hygiene search over all new/changed docs (same pattern as Stories 22.5/22.7/22.8), e.g. `rg -i "postgres(ql)?://|supabase\.co|service_role|eyJ[A-Za-z0-9_-]{20,}|[0-9]{6}[-+]?[0-9]{4}|@gmail|@stena" docs/commercial-readiness/` — expect no matches in new content.

- [ ] Run required gates before moving beyond `ready-for-dev`. (AC: 1-5)
  - [ ] You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0.
  - [ ] **Estimated tests: 0** — this is a docs-only story; NO code changes are expected. The automated Vitest/Playwright gate may be waived per the established `estimated_tests: 0` pattern (Stories 22.4/22.5), with the targeted hygiene search recorded as the gate.
  - [ ] If ANY code is touched (it should not be), the waiver is void and full gates are mandatory:
    - `npx vitest run 2>&1; echo "EXIT:$?"`
    - `npx playwright test 2>&1; echo "EXIT:$?"`
    - `npx eslint` and `npx tsc --noEmit`

## Dev Notes

### Scope Boundaries

- This story produces DRAFT diligence material. It does not finalize the DPA, select the commercial model, execute contracts, or implement product features (DSAR export workflow, audit logging, anonymization scheduling are all out of scope — record them as gaps/follow-ups).
- Epic 23 boundaries: final legal/privacy contract pack is Story 23.2; commercial model selection is 23.1. Do not pull that work forward; reference it as the follow-up path.
- Do not claim GDPR compliance anywhere. `07` explicitly forbids describing the system as "GDPR compliant" without legal review — the pack inherits that rule.
- Do not schedule or enable the GDPR anonymization cron, change `vercel.json`, or alter retention behavior — documenting the gap is the deliverable.
- No code changes expected. If a factual check requires reading code (e.g. employee field list), read-only inspection is fine.

### Canonical Sources

- Story source: `_bmad-output/planning-artifacts/epics.md` section "Story 22.9: Draft Privacy Annex, Subprocessors, and Incident Process"; planning stub `docs/sprint-artifacts/story-22.9.md`.
- Privacy baseline: `docs/commercial-readiness/07_gdpr_and_privacy_overview.md` (processing activities, DSAR table, retention state, incident gap, open questions).
- Subprocessor baseline: `docs/commercial-readiness/10_dependencies_subprocessors_and_licenses.md` (SaaS dependency table, data map, procurement actions).
- Data inventory: `docs/commercial-readiness/06_data_inventory_and_data_flows.md`; field-level truth: `src/lib/types/employee.ts`, `20_field_access_matrix.md`.
- Data-scope decision (AC5 link target): `docs/commercial-readiness/16_presentation_data_scope_and_access_preconditions.md` (Story 22.4).
- Supabase evidence package (AC5 link target): Story 22.8 outputs — planned `22_supabase_security_evidence_package.md` and `evidence/restore-drill-<date>.md`.
- Operations/incident minimum target: `docs/commercial-readiness/09_operations_support_and_sla.md` (incident section, ownership gaps).
- Tracker/index conventions: `17_blocker_remediation_tracker.md`, `14_evidence_index.md`, `00_index.md`.
- Retention/anonymization facts: `employee-repository` anonymization (`anonymizeOldArchivedEmployees`), backup retention in `scripts/supabase-backup-storage.mjs` (14 days), `vercel.json` cron list (GDPR route absent).

### Architecture And Technical Guardrails

- Docs-only story in a Next.js 16 / Supabase project; no `src/` changes, no migrations, no env changes.
- Follow existing commercial-readiness document style: numbered prefix, `Prepared:`/`Updated:` dates, tables for register-style content, relative links between docs.
- Swedish i18n (NFR17) applies to user-facing app copy only — these reviewer-facing readiness documents follow the existing English convention of `docs/commercial-readiness/`.
- UX-DR5 applies: documents must be scannable by external reviewers while carrying owner, date, status, risk, and acceptance criteria.

### Known Constraints And Risks

- SMTP provider is not identifiable from the repository — the register must carry it as an open confirmation item, not a guessed vendor.
- Concrete Supabase/Vercel regions, project refs, and platform settings are held privately by established convention; the register records transfer posture as "needs private confirmation / DPA follow-up".
- Controller/processor allocation genuinely depends on the unresolved commercial model — present per-model assumptions instead of one definitive answer.
- The existing `15_` filename collision (`15_dependency_advisory_risk_register.md` + `15_pricing_and_business_case.md`) shows numbering drift is a real risk — check the directory before assigning `23_`/`24_`/`25_`.
- Story 22.8 may still be in flight: if its artifact names differ from the planned ones, fix the AC5 links to the real names before marking this story done.

### Previous Story Intelligence

- Story 22.8 (created immediately before this one): establishes the Supabase evidence package and restore-drill evidence this pack must link to; also carries the SSL/network/PITR risk-acceptance entries the privacy annex can reference for backup/security posture.
- Story 22.7: redaction discipline is review-enforced — write redacted from the start. No personal data, secrets, refs, or raw output in committed docs.
- Stories 22.4/22.5: the docs-only waiver pattern (`estimated_tests: 0` + targeted hygiene search recorded) is accepted; reuse it. Story 22.5 review also showed that gate wording matters — do not phrase disclosure alone as closure.
- Story 22.6/22.7 reviews repeatedly flagged status-artifact drift — synchronize ALL status artifacts in the same turn (list in DoD).

### Testing Requirements

**Estimated tests:** 0

- No code changes expected; automated test gate waived per established docs-only pattern IF no code is touched.
- Mandatory regardless: targeted hygiene search over new/changed docs with recorded outcome.
- If any code changes occur: full `npx vitest run`, `npx playwright test`, `npx eslint`, `npx tsc --noEmit` gates with exit code 0.

## Definition of Done

- Draft privacy annex exists covering controller/processor assumptions (per commercial model), legal basis status, actual data categories, retention state + gaps, DSAR handling, DPIA screening, and open legal questions.
- Subprocessor register exists listing at minimum Supabase, Vercel, GitHub, and the (to-be-confirmed) SMTP provider with purpose, data exposure, and DPA/transfer status.
- Incident/breach process draft exists with triage, owners (role labels), notification-timing guidance, evidence capture, communication, and post-incident review.
- Every document carries the not-legal-advice disclaimer and explicit draft-vs-fact markers.
- Pack links to `16_presentation_data_scope_and_access_preconditions.md` and the real Story 22.8 evidence artifacts; `14_evidence_index.md`, `17_blocker_remediation_tracker.md` (E-009), `00_index.md`, and forward links in `07`/`10` are updated.
- Hygiene search recorded with no private data/secret matches in new content.
- Docs-only waiver recorded (or full gates passed if code changed) before the story moves beyond `ready-for-dev`.
- If implementation changes status, synchronize `docs/sprint-artifacts/story-22.9.md`, `docs/sprint-artifacts/epic-22-sprint-status.yaml`, `docs/sprint-artifacts/sprint-status.yaml`, `_bmad-output/implementation-artifacts/sprint-status.yaml`, and `_bmad-output/implementation-artifacts/22-9-draft-privacy-annex-subprocessors-and-incident-process.md` in the same turn.

## Dev Agent Record

### Debug Log

- 2026-06-11: Scrum Master created comprehensive story context for Story 22.9. Sequencing note added: AC5 link verification requires Story 22.8 artifacts to exist. Epic 23 intentionally not auto-started (future contract-dependent).

### Implementation Plan

### Completion Notes

### File List

## Change Log

- 2026-06-11: Created ready-for-dev BMAD implementation story context for Story 22.9 with privacy-annex/subprocessor-register/incident-process scope, draft-vs-fact marking rules, existing-document reuse map, redaction rules, docs-only gate waiver conditions, and status-sync requirements.
