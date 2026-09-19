---
baseline_commit: 751e1b9f5701d7af0b04d93ddf2a687e50b5d183
---

# Story 22.9: Draft Privacy Annex, Subprocessors, and Incident Process

## Status

done

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

- [x] AC1: Privacy annex draft covers controller/processor assumptions, legal basis, data categories, retention, DSAR handling, DPIA screening, and open legal questions.
- [x] AC2: Subprocessor register lists Supabase, Vercel, SMTP/email provider(s), and any other relevant service with purpose and data exposure.
- [x] AC3: Incident/breach process defines triage, owner, notification timing, evidence capture, customer/stakeholder communication, and post-incident follow-up.
- [x] AC4: The privacy pack clearly identifies what is draft diligence material and what needs legal review.
- [x] AC5: The pack links back to the presentation data-scope decision and Supabase evidence package.

## Tasks / Subtasks

- [x] Create the privacy annex draft. (AC: 1, 4)
  - [x] Add `docs/commercial-readiness/23_privacy_annex_draft.md`. Verify numbering at implementation time: `22_` is reserved by Story 22.8's Supabase evidence package; do not duplicate prefixes (note the existing `15_` collision — two files share `15_`; do not repeat that mistake).
  - [x] Do NOT start from scratch: `07_gdpr_and_privacy_overview.md` already contains the processing-activity table (section 2), data-subject-rights support table (section 4), retention/deletion state (section 6), and open legal questions (section 8). The annex restructures and extends this into diligence shape; it must not contradict or silently fork it — link back where content is shared.
  - [x] Controller/processor assumptions: per `07` section 8, controller/processor roles depend on the deployment/commercial model. Document assumptions per plausible model (current pilot operation vs. managed service vs. customer-hosted handover — models named in `12_commercial_pack.md` / Epic 23.1) and mark each as a draft assumption pending the Epic 23.1 commercial-model decision. Do NOT decide the commercial model here.
  - [x] Legal basis: per processing activity, record "must be assessed" status honestly with candidate bases; flag SSN, dietary notes, payroll-adjacent and health/training-adjacent fields as needing special-category/national-rule review (open question in `07` section 8).
  - [x] Data categories: align with ACTUAL HR fields from `src/lib/types/employee.ts` and the field inventory in `20_field_access_matrix.md` / `06_data_inventory_and_data_flows.md` — list categories (identity, contact, SSN, employment status, scheduling/training, dietary, payroll-adjacent, comments, custom partner columns, audit metadata, backups) without inventing fields that don't exist.
  - [x] Retention: capture the current technical state from `07` section 6 (archive + `archived_at`, 3-month anonymization threshold for archived employees, 14-day backup retention) and the known gaps (anonymization cron `/api/cron/gdpr-anonymize` NOT scheduled in `vercel.json`; custom columns/logs retention unverified; backup restore/deletion behavior). State these as facts + open questions, not as resolved policy.
  - [x] DSAR handling: base on `07` section 4 table — what the product supports today (export routes, edit, archive/delete/anonymize) vs. missing process (no dedicated DSAR export workflow, objection/restriction handled outside app).
  - [x] DPIA screening: provide a short screening summary (HR data at scale, SSN, external party access, email notifications) concluding whether a DPIA is recommended before formal operation — `07` section 9 already recommends it; do not soften that.
  - [x] Open legal questions: carry forward `07` section 8 plus any new questions raised by this story.

- [x] Create the subprocessor register. (AC: 2, 4)
  - [x] Add `docs/commercial-readiness/24_subprocessor_register.md`.
  - [x] Source material exists: `10_dependencies_subprocessors_and_licenses.md` "SaaS And Service Dependencies" and "Potential Subprocessor Data Map" tables. The register formalizes these into one table: service, role (processor/subprocessor/unknown), purpose, personal data exposed, environment (prod/staging/CI), contract/DPA status, transfer/region status, and review owner+date.
  - [x] Minimum entries: Supabase (DB/auth/realtime/storage/backups), Vercel (hosting/functions/cron/logs), GitHub (repo/CI/secrets/backup workflow execution — note the backup workflow handles production DB dumps in CI), SMTP provider (note: provider is NOT identified from the repo — record as open item to confirm, do not guess a vendor name), and npm/open-source as "generally not subprocessors" per existing analysis.
  - [x] Region/transfer: concrete regions are held privately (existing evidence convention). Record "verified privately / needs DPA confirmation" rather than publishing project regions.
  - [x] Contract/DPA status: realistically "vendor standard terms, DPA not yet executed for a commercial deployment" — mark as Epic 23.2 follow-up; this story is draft diligence only.

- [x] Create the incident/breach process draft. (AC: 3, 4)
  - [x] Add `docs/commercial-readiness/25_incident_breach_process.md`.
  - [x] Current state is "logs only, no formal process" (`07` section 7, `09_operations_support_and_sla.md` line ~113 minimum-target list). Build the draft runbook from the `09` minimum target: incident lead/technical owner/business owner/privacy contact roles, severity levels, triage steps, evidence preservation (logs + deployment identifiers in a PRIVATE incident record — not in the public repo), breach-assessment step with notification-timing guidance (e.g. supervisory-authority 72-hour assessment checkpoint as a draft obligation to confirm with legal), customer/stakeholder communication templates (placeholders), and post-incident review.
  - [x] Owners: use role labels (technical owner, business/data owner, privacy contact) consistent with `17_blocker_remediation_tracker.md` conventions — no personal names/emails in committed docs.
  - [x] Keep it operational and honest: it's a draft process for a working pilot, not a certified ISO/enterprise IR program. Cross-link rather than duplicate `09` operations content.

- [x] Mark draft status and legal-review boundaries throughout. (AC: 4)
  - [x] Every new document starts with the established disclaimer pattern (see `07` line 4): "This is not legal advice... must be assessed by the responsible organization."
  - [x] Use an explicit per-section marker where needed: `Draft — needs legal review` vs. `Technical fact from repository evidence`. A reviewer must never have to guess which claims are verified.

- [x] Wire up links and readiness surfaces. (AC: 5)
  - [x] Link from the privacy pack to: `16_presentation_data_scope_and_access_preconditions.md` (Story 22.4 data-scope decision) and the Story 22.8 Supabase evidence package + restore-drill evidence (verify actual filenames once 22.8 lands; planned: `22_supabase_security_evidence_package.md`, `evidence/restore-drill-<date>.md`).
  - [x] Update `14_evidence_index.md` with rows for the three new documents.
  - [x] Update `17_blocker_remediation_tracker.md` with an `E-009` row following the `E-006`/`E-007` column format.
  - [x] Update `00_index.md` so the new documents are listed.
  - [x] Update `07_gdpr_and_privacy_overview.md` and `10_dependencies_subprocessors_and_licenses.md` with forward links to the new pack where they say "create subprocessor register" / "write incident runbook", so recommendations and deliverables stay connected.

- [x] Evidence hygiene gate. (AC: 1-5)
  - [x] No committed file may contain: personal names/emails of operators, real employee data or SSNs, database URLs, Supabase project refs/regions, keys, tokens, or private incident details.
  - [x] Run the targeted hygiene search over all new/changed docs (same pattern as Stories 22.5/22.7/22.8), e.g. `rg -i "postgres(ql)?://|supabase\.co|service_role|eyJ[A-Za-z0-9_-]{20,}|[0-9]{6}[-+]?[0-9]{4}|@gmail|@stena" docs/commercial-readiness/` — expect no matches in new content.

- [x] Run required gates before moving beyond `ready-for-dev`. (AC: 1-5)
  - [x] You MUST write or update tests for every code change. Before reporting completion, run the full test suite (`npx vitest run` for unit tests, `npx playwright test` for e2e) and confirm all tests pass. If any test fails, fix it. Do not report done until exit code is 0.
  - [x] **Estimated tests: 0** — this is a docs-only story; NO code changes are expected. The automated Vitest/Playwright gate may be waived per the established `estimated_tests: 0` pattern (Stories 22.4/22.5), with the targeted hygiene search recorded as the gate.
  - [x] If ANY code is touched (it should not be), the waiver is void and full gates are mandatory:
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
- 2026-06-12: Dev verified numbering before assigning prefixes: `docs/commercial-readiness/` tops out at `22_`, so `23_`/`24_`/`25_` are free (no repeat of the `15_` collision). Story 22.8 artifact names verified real before linking: `22_supabase_security_evidence_package.md` and `evidence/restore-drill-2026-06-11.md` both exist.
- 2026-06-12: Hygiene gate run: `rg -i "postgres(ql)?://|supabase\.co|service_role|eyJ[A-Za-z0-9_-]{20,}|[0-9]{6}[-+]?[0-9]{4}|@gmail|@stena"` over the three new docs returned no matches (exit 1). The same search over the five changed docs returned only four pre-existing `14_evidence_index.md` rows (migration timestamps and GitHub run IDs matching the digit pattern) — none in lines added by this story.
- 2026-06-12: `git status`/`git diff --stat` confirm docs-only change set: three new docs, five changed readiness docs, status artifacts. No `src/`, test, or config changes — the `estimated_tests: 0` automated-gate waiver applies; the recorded hygiene search is the gate.

### Implementation Plan

- Reuse, don't fork: build the annex from `07_gdpr_and_privacy_overview.md` (processing activities, DSAR table, retention state, open questions), the register from `10_dependencies_subprocessors_and_licenses.md` (SaaS dependency and data-map tables), and the incident process from the `09_operations_support_and_sla.md` minimum-target list — linking back wherever content is shared.
- Ground data categories in actual fields: `src/lib/types/employee.ts` read directly; categories cross-referenced with `20_field_access_matrix.md` and `06_data_inventory_and_data_flows.md`.
- Controller/processor: per-model assumption table (current pilot / managed service / customer-hosted) keyed to `12_commercial_pack.md` models, all marked pending the Epic 23.1 decision.
- Mark every claim: shared `Technical fact from repository evidence` vs `Draft — needs legal review` convention declared in the annex and applied across all three docs; every doc opens with the `07`-pattern not-legal-advice disclaimer.
- Wire links last, then run the hygiene gate and synchronize all five status artifacts in the same turn.

### Completion Notes

- AC1: `docs/commercial-readiness/23_privacy_annex_draft.md` covers controller/processor assumptions per commercial model (pilot / managed service / customer-hosted, all pending Epic 23.1), legal basis as honest "must be assessed" status with candidate bases, special-category flags for SSN/dietary/payroll-adjacent/health-training-adjacent/free-text fields, data categories aligned with the actual `employee.ts` fields (no invented fields), retention facts + gaps (unscheduled `/api/cron/gdpr-anonymize`, unconfirmed 3-month threshold, 14-day backup pruning, backup-restore re-introduction question), DSAR supported-today vs missing-process table, DPIA screening concluding a DPIA is recommended (carrying `07` section 9 forward unsoftened), and 12 open legal questions (9 carried from `07` section 8 + 3 new).
- AC2: `docs/commercial-readiness/24_subprocessor_register.md` lists Supabase, Vercel, GitHub, the Google Workspace SMTP relay, and npm/open-source with role, purpose, personal data exposed, environment, contract/DPA status, transfer posture, and review owner+date. SMTP relay operator-confirmed as Google Workspace (`smtp-relay.gmail.com`, Google LLC), corroborated by the repo's Gmail-specific send-rate handling; its DPA/transfer terms remain the open item (not the identity). Cloudflare confirmed not part of this project's data path (company-website DNS only). Regions recorded as "held privately / needs DPA confirmation" per evidence convention. DPA status: vendor standard terms, not executed — Epic 23.2 follow-up.
- AC3: `docs/commercial-readiness/25_incident_breach_process.md` defines role labels (incident lead, technical owner, business/data owner, privacy contact — no personal names), SEV-1..3 severity levels, 9-step triage, private-record evidence capture (logs + deployment identifiers never in the public repo), 72-hour supervisory-authority assessment checkpoint as a draft obligation to confirm with legal, Art. 34 data-subject notification step, communication template placeholders for five audiences, post-incident review, and known gaps. Cross-links `09` rather than duplicating runbook content.
- AC4: every new document opens with the `07`-pattern not-legal-advice disclaimer; the explicit `Draft — needs legal review` vs `Technical fact from repository evidence` marker convention is declared in the annex and applied per-section in all three documents; the annex's section 9 states the pack is not a DPA/Art. 30 record/DPIA/compliance claim and inherits the "never describe as GDPR compliant" rule.
- AC5: the annex section 1 links to `16_presentation_data_scope_and_access_preconditions.md` (Story 22.4 data-scope decision) and to the real Story 22.8 artifacts `22_supabase_security_evidence_package.md` + `evidence/restore-drill-2026-06-11.md` (filenames verified to exist). `14_evidence_index.md` gained three rows, `17_blocker_remediation_tracker.md` gained `E-009` in the `E-006`/`E-007` column format, `00_index.md` lists the three new documents, and `07`/`10` carry forward links where they previously said "create subprocessor register" / "write incident runbook".
- Gates: docs-only waiver applied per the Stories 22.4/22.5 pattern (`estimated_tests: 0`, no code touched); targeted hygiene search recorded in the Debug Log with no matches in new content. Scope boundaries honored: no `vercel.json`/cron/retention changes, no commercial-model decision, no compliance claims; AC checkbox marking is left to the code-review workflow per the dev-story permitted-sections rule.

### File List

- `docs/commercial-readiness/23_privacy_annex_draft.md` (new)
- `docs/commercial-readiness/24_subprocessor_register.md` (new)
- `docs/commercial-readiness/25_incident_breach_process.md` (new)
- `docs/commercial-readiness/00_index.md` (modified: Updated date; three new document rows)
- `docs/commercial-readiness/07_gdpr_and_privacy_overview.md` (modified: forward links to `24`/`25` in sections 5 and 7 and in the control-table subprocessor/incident rows)
- `docs/commercial-readiness/10_dependencies_subprocessors_and_licenses.md` (modified: forward link to `24` in header and procurement action 2)
- `docs/commercial-readiness/14_evidence_index.md` (modified: Updated date; three new evidence rows)
- `docs/commercial-readiness/17_blocker_remediation_tracker.md` (modified: Updated date; new `E-009` row)
- `docs/sprint-artifacts/story-22.9.md` (modified: status sync to review)
- `docs/sprint-artifacts/epic-22-sprint-status.yaml` (modified: status sync to review)
- `docs/sprint-artifacts/sprint-status.yaml` (modified: status sync)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified: status sync to review)
- `_bmad-output/implementation-artifacts/22-9-draft-privacy-annex-subprocessors-and-incident-process.md` (modified: tasks, status, Dev Agent Record, File List, Change Log)

### Review Findings

**Round 1 of 3** — code review 2026-06-13. Three adversarial layers ran (Blind Hunter, Edge Case Hunter, Acceptance Auditor); all completed, no failed layers. Acceptance Auditor rated AC1–AC5 all **SATISFIED** and all scope/DoD boundaries honored. Edge Case Hunter fact-checked the documents against the repo and confirmed every cited field (`employee.ts`), function (`anonymizeOldArchivedEmployees`), route (`/api/cron/gdpr-anonymize` present and absent from `vercel.json`), retention number (14 days), backup workflow, admin session-revocation, hard-delete route, `column_config` mechanism, all 17 cross-document links, all `07` section citations, story/epic references, and four-way sprint-status consistency are accurate; hygiene search over the three new docs found no secrets/PII. The findings below are accuracy/marker-precision refinements, not AC failures.

Patch (unchecked):

- [x] [Review][Patch] Evidence-index SMTP row is stale — it still says "SMTP provider (unidentified — open confirmation item)", but `24_subprocessor_register.md` and the implementation now treat the relay as operator-confirmed Google Workspace, with only the DPA/transfer terms open. Update the row so the index matches the document it indexes. [docs/commercial-readiness/14_evidence_index.md] (sources: blind+auditor)
- [x] [Review][Patch] Cloudflare exclusion note is marked `Technical fact from repository evidence`, but the "used only for the company website's DNS" purpose is operator-asserted, not repository-verifiable. Only "no Cloudflare reference exists in this repo's code/config" is a repo fact — split or re-mark the operator-sourced clause so the marker convention stays honest (AC4). [docs/commercial-readiness/24_subprocessor_register.md] (source: blind)
- [x] [Review][Patch] "Gmail-specific send-rate handling" overstates the code: `src/lib/services/email-service.ts` has a generic ~1000ms inter-send delay with a comment noting Gmail rate limits, not Gmail-specific branching. Soften the corroboration wording (e.g. "a send delay the code annotates for Gmail rate limits"). [docs/commercial-readiness/24_subprocessor_register.md] (source: edge)

Defer (pre-existing):

- [x] [Review][Defer] Operator personal name appears in committed tracker/status owner fields (E-008 risk-acceptance owner; Story 22.8 next-action lines). Pre-existing from Story 22.8 (deliberate risk-acceptance ownership convention), not introduced by 22.9; superficial tension with the privacy pack's role-label-only rule. [docs/commercial-readiness/17_blocker_remediation_tracker.md] — deferred, pre-existing (recorded in `deferred-work.md`)

Dismissed as noise (11): DPIA dietary hedging (both hedge "potentially"); open-questions count (verified 9 carried + 3 new = 12); `15_` link ambiguity (link resolves to `15_dependency_advisory_risk_register.md`); `auth.users` backup-scope wording (consistent with `supabase db dump` public-schema behavior); `@gmail` hygiene pattern (`smtp-relay.gmail.com` is a public endpoint, not `@gmail`); §4 Data-Categories "Technical fact" scope nit; E-009 "Ready for review" status (accurate for an in-review story); uneven Updated-date bumping on `07`/`10`; open-question 9 "carried forward" framing (preamble does not claim verbatim); self-referential evidence-index link columns; Vercel env classification (draft-marked, within latitude).

## Change Log

- 2026-06-11: Created ready-for-dev BMAD implementation story context for Story 22.9 with privacy-annex/subprocessor-register/incident-process scope, draft-vs-fact marking rules, existing-document reuse map, redaction rules, docs-only gate waiver conditions, and status-sync requirements.
- 2026-06-12: Implemented Story 22.9 (docs-only). Created the draft privacy pack: `23_privacy_annex_draft.md` (controller/processor assumptions per commercial model, legal basis status, actual data categories, retention facts+gaps, DSAR handling, DPIA screening, open legal questions), `24_subprocessor_register.md` (Supabase/Vercel/GitHub/SMTP/npm with purpose, data exposure, DPA/transfer status; SMTP provider recorded as open confirmation item), and `25_incident_breach_process.md` (roles, severity, triage, private evidence capture, 72-hour breach-assessment checkpoint, communication templates, post-incident review). Wired links into `00_index.md`, `14_evidence_index.md` (3 rows), `17_blocker_remediation_tracker.md` (E-009), and forward links in `07`/`10`. Hygiene search passed with no matches in new content; docs-only automated-gate waiver recorded per `estimated_tests: 0` pattern. Status moved to review across all synchronized artifacts.
- 2026-06-12 (post-review operator input): Operator initially indicated Cloudflare; `24_subprocessor_register.md` was updated to split SMTP into an unconfirmed outbound relay row plus a Cloudflare assumption row with the inbound-routing-vs-outbound-SMTP caveat.
- 2026-06-12 (operator correction): Operator corrected the SMTP relay to the Google Workspace relay `smtp-relay.gmail.com`, and confirmed Cloudflare is unrelated to this project (company-website DNS only). Replaced the two rows in `24_subprocessor_register.md` with a single operator-confirmed Google Workspace (SMTP relay) row — corroborated by the repo's Gmail-specific send-rate handling in `src/lib/services/email-service.ts` — and added a note that Cloudflare is explicitly out of this project's data path. The open item is now the DPA/transfer terms (Google Workspace DPA, EU contracting entity, SCCs), not the provider identity. Updated annex open question 9, the E-009 tracker note, and the epic-22 status note to match. Re-ran the hygiene search (matching `enhancior`/`rasmus.thunborg`/`noreply@`/`gmail`/secrets) over the three new docs — no forbidden matches; `smtp-relay.gmail.com` is a public vendor endpoint, not a secret or personal email.
