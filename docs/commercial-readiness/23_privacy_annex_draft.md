# Privacy Annex (Draft)

Prepared: 2026-06-12
Story: 22.9

This is not legal advice. It is a draft privacy annex based on repository evidence, prepared as diligence material for commercial discussions. Controller/processor roles, legal basis, retention, DPIA need, and data subject rights must be assessed by the responsible organization with qualified legal/privacy support before any commercial deployment. The final legal/privacy contract pack is Epic 23 work (Story 23.2); this annex does not replace it.

**Marker convention used in this document and the rest of the privacy pack** (`24_subprocessor_register.md`, `25_incident_breach_process.md`):

- `Technical fact from repository evidence` — verified from code, migrations, configuration, or recorded evidence in this package.
- `Draft — needs legal review` — assumption, candidate position, or open question that a lawyer/privacy professional must confirm or replace.

This document restructures and extends `07_gdpr_and_privacy_overview.md` into diligence shape. Where content is shared, `07` remains the technical privacy baseline; this annex must not be read as superseding it.

## 1. Privacy Pack Contents

| Document | Purpose |
| --- | --- |
| `23_privacy_annex_draft.md` (this file) | Controller/processor assumptions, legal basis status, data categories, retention, DSAR handling, DPIA screening, open legal questions |
| `24_subprocessor_register.md` | Draft subprocessor register with purpose, data exposure, and DPA/transfer status |
| `25_incident_breach_process.md` | Draft incident/breach response process |

Link targets required by Story 22.9 AC5:

- Presentation data-scope decision: [`16_presentation_data_scope_and_access_preconditions.md`](16_presentation_data_scope_and_access_preconditions.md) (Story 22.4).
- Supabase security evidence package: [`22_supabase_security_evidence_package.md`](22_supabase_security_evidence_package.md) and restore-drill evidence [`evidence/restore-drill-2026-06-11.md`](evidence/restore-drill-2026-06-11.md) (Story 22.8).

## 2. Controller/Processor Assumptions

`Draft — needs legal review`

Controller/processor allocation depends on the deployment/commercial model, which is not yet decided (Epic 23.1 selects the commercial/handover model; see `12_commercial_pack.md` "Possible Commercial Models"). This annex therefore records per-model assumptions instead of one definitive answer. Nothing here decides the commercial model.

| Model (per `12_commercial_pack.md`) | Assumed controller | Assumed processor(s) | Notes and open points |
| --- | --- | --- | --- |
| Current pilot operation (system operated by the developing party for Stena Line seasonal recruitment) | The organization whose HR operations the data serves (assumed: the business operating the recruitment process) | The operating/developing party plus the platform vendors in `24_subprocessor_register.md` | The informal pilot arrangement has no executed DPA. Whether the operating party is a processor or a joint controller must be assessed against actual decision-making about purposes and means. |
| Managed-service model (supplier hosts and maintains) | Customer | Supplier (processor), with Supabase/Vercel/GitHub/SMTP as subprocessors | Closest to a classic controller→processor→subprocessor chain. Requires an executed DPA and a maintained subprocessor list (Story 23.2). |
| Customer-hosted handover model (customer owns Vercel/Supabase/GitHub accounts and operates) | Customer | Platform vendors become the customer's direct processors; supplier's processor role shrinks to support/maintenance access, if any | Support access to production data, if granted, needs its own DPA terms. Handover plan: `13_exit_and_handover_plan.md`. |

All three rows are draft assumptions pending the Epic 23.1 commercial-model decision and legal review (open question carried from `07_gdpr_and_privacy_overview.md` section 8).

## 3. Legal Basis Per Processing Activity

`Draft — needs legal review`

No legal basis has been assessed or assigned for any processing activity. The table records honest "must be assessed" status with candidate bases for the assessment to consider. Processing activities are the ones evidenced in `07_gdpr_and_privacy_overview.md` section 2.

| Processing activity | Status | Candidate legal bases to assess | Special-category / national-rule flag |
| --- | --- | --- | --- |
| Employee masterdata management | Must be assessed | Art. 6(1)(b) contract (employment-related), 6(1)(f) legitimate interests, 6(1)(c) legal obligation for parts | SSN: national identification number — Swedish national rules (GDPR Art. 87) apply; see flag list below |
| Partner role-specific access (Sodexo/ÖMC/Payroll/Toplux/Crewing) | Must be assessed | 6(1)(b), 6(1)(f); sharing arrangement itself needs controller/processor analysis per partner | Partner custom columns are unreviewed free-form fields |
| Scheduling and capacity (training dates) | Must be assessed | 6(1)(b), 6(1)(f) | Training/certification-adjacent data; assess whether any entries reveal health data |
| Notifications (email reminders) | Must be assessed | 6(1)(f) | Emails may include employee names and missing-field lists; content review is an open question |
| Audit/change tracking | Must be assessed | 6(1)(f) security/traceability | — |
| Backups | Must be assessed | Same basis as the underlying processing plus 6(1)(f) for disaster recovery | Backups contain all categories including SSN and dietary details |
| Anonymization of archived employees | Must be assessed | Data-minimization measure rather than separate processing; legal basis for the 3-month threshold unconfirmed | — |

Fields flagged for special-category (GDPR Art. 9) and national-rule review (open question carried from `07` section 8):

- **SSN** (`employees.ssn`) — not Art. 9 data, but a national identification number subject to Swedish national restrictions (Art. 87); its broad visibility and presence in exports/backups makes it a priority review item.
- **Dietary details** (`special_diet`, `diet_details`) — free-text dietary notes can reveal health conditions or religious/philosophical beliefs (potential Art. 9 data). Treat as potentially special-category until reviewed.
- **Payroll-adjacent fields** (`loneiva` salary level, `bankuppgifter`, `mail_lon`, repayment flags `repayment_needed_omc`/`repayment_needed_pe3`) — financial/payroll-adjacent; assess under national employment-data practice.
- **Health/training-adjacent fields** (training-date assignments, completion flags) — assess whether combinations reveal medical fitness or certification status under maritime-sector rules.
- **Free-text fields** (`comments`, `diet_details`, custom partner columns) — uncontrolled content can carry any category of data; needs a content policy.

## 4. Data Categories

`Technical fact from repository evidence` — categories below are aligned with the actual fields in `src/lib/types/employee.ts`, the field inventory in `20_field_access_matrix.md`, and the data inventory in `06_data_inventory_and_data_flows.md`. No fields are invented; field-level role visibility is evidenced in `20_field_access_matrix.md`.

| Category | Actual fields/objects | Data subjects |
| --- | --- | --- |
| Identity | `first_name`, `surname`, `ssn`, `gender`, `stena_id_origo_nummer` | Employees/candidates |
| Contact | `email`, `mobile`, `town_district` | Employees/candidates |
| Employment status | `rank`, `hire_date`, `termination_date`, `termination_reason`, `is_terminated`, `is_archived`, `archived_at`, `is_anonymized` | Employees/candidates |
| Scheduling/training | `stena_date`, `omc_date`, `pe3_date` (references to `important_dates`), `hotel_required`, `room_number_shared`, `omc_masterdata_reminder_sent_at`; `important_dates` assigned-employee JSON | Employees/candidates |
| Onboarding/completion flags | `one`, `one_marked_at`, `talmundo`, `isps`, `photo`, `origo`, `li`, `passport`, `kvitto_c17_18`, `c17`, `crewing_done` | Employees/candidates |
| Dietary | `special_diet`, `diet_details` | Employees/candidates |
| Payroll-adjacent | `loneiva`, `mail_lon`, `bankuppgifter`, `repayment_needed_omc`, `repayment_needed_pe3` | Employees/candidates |
| Free-text comments | `comments` | Employees/candidates |
| Custom partner columns | Dynamically added real columns on `employees` governed by `column_config` (content unreviewed) | Employees/candidates |
| Application users | `users` (email, role, active state) and Supabase `auth.users` (email, password hash, session metadata) | HR/partner staff |
| Audit metadata | `employee_column_changes`, `staffing_needs_changelog` (changed fields, timestamps, user references) | Employees/candidates, users |
| Email content | Notification emails (employee names, missing fields, deadline/staffing info) | Employees/candidates, recipients |
| Logs | Console/Vercel/GitHub logs (may include emails, user ids, employee ids) | Potentially all of the above |
| Backups | Full nightly logical DB dumps (all categories above except `auth.users`, which is outside logical backup scope) | All DB subjects |

## 5. Retention And Deletion

Current technical state — `Technical fact from repository evidence` (from `07_gdpr_and_privacy_overview.md` section 6 and `06_data_inventory_and_data_flows.md`):

- Archived employees receive `archived_at`.
- The anonymization function (`anonymizeOldArchivedEmployees`) masks selected fields for archived employees older than 3 months, exposed via `/api/cron/gdpr-anonymize`.
- A hard-delete route exists for employees.
- The nightly backup workflow prunes backup objects older than 14 days (`scripts/supabase-backup-storage.mjs`).

Known gaps — facts and open questions, not resolved policy:

- `Technical fact from repository evidence`: the anonymization cron `/api/cron/gdpr-anonymize` is **not scheduled** — `vercel.json` does not list it. Anonymization currently runs only if invoked manually. Documenting this gap is deliberate; scheduling it requires legal approval first (`07` section 9).
- `Draft — needs legal review`: no approved retention schedule exists. The 3-month anonymization threshold and the 14-day backup retention are implementation choices without confirmed legal basis.
- `Draft — needs legal review`: retention/deletion coverage for custom partner columns, audit tables, and platform logs is unverified.
- `Draft — needs legal review`: deletion from backups is currently handled only by 14-day expiry; restore behavior re-introduces deleted/anonymized records until the restored copy is cleaned (observed and handled in the Story 22.8 drill, [`evidence/restore-drill-2026-06-11.md`](evidence/restore-drill-2026-06-11.md)).

## 6. DSAR Handling

Based on `07_gdpr_and_privacy_overview.md` section 4. What the product supports today versus what is missing as process:

| Right | Supported today (`Technical fact from repository evidence`) | Missing (`Draft — needs legal review`) |
| --- | --- | --- |
| Access | Authorized users can query/export employee data (CSV/XLSX export routes) | No dedicated DSAR export workflow or scoped DSAR format |
| Rectification | HR/recruiter can update employee records (PATCH routes) | Process approval and audit review |
| Erasure | Archive, hard delete, anonymization endpoint | Legal retention rules and backup deletion policy |
| Restriction | Archive hides records from main views and external RLS | No formal restriction state beyond archive |
| Portability | CSV/XLSX exports | Scoped DSAR export format |
| Objection | Not implemented as a product feature | Must be handled as a process outside the app |
| Auditability | Staffing changelog and `employee_column_changes` | Audit RLS and retention review |

A documented DSAR intake/response process (who receives requests, identity verification, deadlines, response format) does not exist and is an Epic 23 follow-up. Building a DSAR export feature is out of scope for this story and recorded as a gap.

## 7. DPIA Screening

`Draft — needs legal review`

Screening factors present in this system:

- HR/candidate personal data processed at operational scale, including SSN (national identification number).
- Potentially special-category data in free-text dietary fields.
- Systematic access by multiple external parties (Sodexo, ÖMC, Payroll, Toplux, Crewing) under role-based permissions.
- Email notifications carrying employee names and missing-field details to operational recipients.
- Full-database backups handled through CI infrastructure (GitHub Actions).

**Conclusion:** a DPIA is recommended before formal operation. This carries forward the existing recommendation in `07_gdpr_and_privacy_overview.md` section 9 unchanged — nothing in this annex softens it. The DPIA itself is Epic 23 work and has not been performed.

## 8. Open Legal Questions

`Draft — needs legal review` — carried forward from `07_gdpr_and_privacy_overview.md` section 8, plus new questions raised by this story:

1. Who is the controller and who is processor for each deployment/commercial model? (Section 2 records per-model assumptions only.)
2. What legal basis applies to each category of processing? (Section 3 records candidates only.)
3. Are SSN, dietary notes, payroll/bank-related fields, and health/training-related fields processed under special rules?
4. What retention periods apply to active, terminated, archived, anonymized, and backup data?
5. Should a DPIA be performed before formal use? (Screening in section 7 says yes — confirm and scope it.)
6. Which subprocessors must be listed in the DPA? (Draft register: `24_subprocessor_register.md`.)
7. Are emails allowed to include employee names and missing fields?
8. What is the process for DSARs, correction, deletion, and restriction?
9. Are international transfers involved through Vercel/Supabase/GitHub and Google Workspace (the confirmed SMTP relay, `smtp-relay.gmail.com`, Google LLC)? (Register records transfer posture as needing private confirmation; Google's US ties make its contracting entity, SCCs, and transfer terms a specific item to confirm.)
10. New (Story 22.9): under the current informal pilot, who is accountable for breach notification to the supervisory authority and to data subjects, given that no DPA or incident contract terms exist? (Draft process: `25_incident_breach_process.md`.)
11. New (Story 22.9): does restoring a backup that contains since-deleted or since-anonymized employee records require a documented re-deletion step as part of the restore runbook? (The Story 22.8 drill cleaned up restored personal data manually.)
12. New (Story 22.9): do the dynamically added custom partner columns require per-column privacy review before partners can populate them?

## 9. Draft Status And Legal-Review Boundary

`Draft — needs legal review`

- This annex and the rest of the privacy pack are **draft diligence material** prepared without legal review. They must not be represented as a DPA, a record of processing under Art. 30, a completed DPIA, or evidence of GDPR compliance.
- Per the standing rule in `07_gdpr_and_privacy_overview.md`, the system must not be described as "GDPR compliant" without legal/privacy review and production control verification. This pack inherits that rule.
- Final legal/privacy contract work (DPA execution, subprocessor agreements, retention schedule approval, DPIA) is Epic 23 (Story 23.2 and related), gated on the Epic 23.1 commercial-model decision.

## 10. Related Documents

- [`07_gdpr_and_privacy_overview.md`](07_gdpr_and_privacy_overview.md) — technical privacy baseline this annex restructures.
- [`06_data_inventory_and_data_flows.md`](06_data_inventory_and_data_flows.md) — table-level data inventory and flows.
- [`20_field_access_matrix.md`](20_field_access_matrix.md) — field-level role visibility/editability/exportability evidence.
- [`16_presentation_data_scope_and_access_preconditions.md`](16_presentation_data_scope_and_access_preconditions.md) — Story 22.4 presentation data-scope decision and standing controls.
- [`22_supabase_security_evidence_package.md`](22_supabase_security_evidence_package.md) and [`evidence/restore-drill-2026-06-11.md`](evidence/restore-drill-2026-06-11.md) — Story 22.8 Supabase security evidence and restore drill (backup/security posture, risk acceptances).
- [`24_subprocessor_register.md`](24_subprocessor_register.md) — draft subprocessor register.
- [`25_incident_breach_process.md`](25_incident_breach_process.md) — draft incident/breach process.
- [`12_commercial_pack.md`](12_commercial_pack.md) — commercial model options driving the controller/processor assumptions.
