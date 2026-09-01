# Incident And Breach Process (Draft)

Prepared: 2026-06-12
Story: 22.9

This is not legal advice. It is a draft incident/breach process based on repository evidence and the minimum target defined in `09_operations_support_and_sla.md` "Incident Handling". Breach-notification obligations, timing, and accountability must be assessed by the responsible organization with qualified legal/privacy support before any commercial deployment.

**Markers:** `Technical fact from repository evidence` — the current-state description. `Draft — needs legal review` — the entire process below; it is a draft runbook for a working pilot, not a certified ISO/enterprise incident-response program, and no part of it has been exercised or legally confirmed.

## 1. Current State

`Technical fact from repository evidence` (from `07_gdpr_and_privacy_overview.md` section 7 and `09_operations_support_and_sla.md`):

- No formal incident handling process exists in code, configuration, or operations documentation beyond the minimum-target list in `09`.
- Technical logs exist through console/Vercel/GitHub; there is no alerting pipeline (the 2026-06-05 backup failure went unnoticed for six days — failure alerting is Story 22.12).
- Admin user deactivation with session-revocation attempts exists (`src/app/api/admin/users/*`), which supports the containment step below.

## 2. Roles

`Draft — needs legal review` — role labels follow the `17_blocker_remediation_tracker.md` convention; no personal names or emails in committed docs. Mapping role labels to named individuals happens in the private operations record, not here.

| Role | Responsibility in an incident |
| --- | --- |
| Incident lead | Owns the incident end-to-end: declares severity, coordinates the steps below, decides escalation, owns the timeline record |
| Technical owner | Investigation, containment, secret rotation, restore actions, technical evidence capture |
| Business/data owner | Operational impact assessment, decision authority for customer/stakeholder communication, data-subject impact input |
| Privacy contact | Breach assessment, notification-obligation analysis (with legal support), supervisory-authority and data-subject notification drafting |

One person may hold multiple roles in the current pilot; the roles must still be explicitly assigned at incident start. Current confirmation status of the underlying responsibility split is tracked in `09_operations_support_and_sla.md` "Responsibility Split To Confirm".

## 3. Severity Levels

`Draft — needs legal review`

| Severity | Definition | Examples |
| --- | --- | --- |
| SEV-1 | Confirmed or suspected personal-data breach, or full production outage | Unauthorized access to employee data, leaked credentials with production scope, data exfiltration, destructive data loss |
| SEV-2 | Security weakness with plausible exposure, or major functional outage without confirmed data impact | Exposed diagnostic endpoint, RLS policy gap discovered in production, backup pipeline compromise |
| SEV-3 | Degraded operation or contained security finding with no plausible personal-data exposure | Failed backup run, dependency advisory, non-production misconfiguration |

Any incident involving the data categories in `23_privacy_annex_draft.md` section 4 (especially SSN, dietary, payroll-adjacent fields, or backups) starts at SEV-1 until the privacy contact downgrades it.

## 4. Triage Steps

`Draft — needs legal review`

1. **Detect/report** — anyone observing a suspected incident reports it to the incident lead immediately. Detection sources today are manual: user reports, log review, platform dashboards (no alerting yet — Story 22.12).
2. **Open the private incident record** — the incident lead opens a timestamped record in the PRIVATE operations store (not in this repository). Record: detection time, reporter, initial description, assigned roles.
3. **Classify severity** — per section 3; record the rationale.
4. **Contain** — technical owner: disable compromised accounts (admin user deactivation revokes sessions), rotate affected Supabase/Vercel/GitHub/SMTP secrets, take affected functionality offline if needed (per `09` minimum target).
5. **Preserve evidence** — see section 5, before any cleanup that could destroy it.
6. **Assess breach obligations** — see section 6, started in parallel with containment for SEV-1.
7. **Investigate and remediate** — root cause, fix, verification.
8. **Communicate** — see section 7.
9. **Close and review** — see section 8.

## 5. Evidence Capture

`Draft — needs legal review`

- Preserve relevant logs (Vercel function logs, GitHub Actions logs, Supabase logs) and deployment identifiers in the PRIVATE incident record — never in the public repository. This follows the established evidence convention (`00_index.md` scope note): committed docs carry summaries only; identifiers, raw logs, and personal data stay private.
- Record an incident timeline: detection, classification, containment actions with timestamps, who did what.
- If data exposure is suspected, capture what data categories (per `23_privacy_annex_draft.md` section 4), which data subjects (count or population rule, not raw rows), and the time window.
- Do not paste employee rows, SSNs, secrets, tokens, or database URLs into any committed file, ticket title, or chat channel with broad visibility.

## 6. Breach Assessment And Notification Timing

`Draft — needs legal review` — these are draft obligations to confirm with legal counsel; the current informal pilot has no executed DPA assigning notification duties (open legal question 10 in `23_privacy_annex_draft.md`).

- The privacy contact assesses, for any SEV-1/SEV-2 incident: is this a personal data breach (destruction, loss, alteration, unauthorized disclosure or access)?
- **72-hour checkpoint (draft obligation):** GDPR Art. 33 requires controller notification to the supervisory authority without undue delay and where feasible within 72 hours of becoming aware, unless the breach is unlikely to result in a risk to data subjects. Treat 72 hours from detection as a hard assessment deadline: by then the privacy contact must have a documented decision — notify, or documented justification why not.
- If the (assumed) processor role applies, the processor must notify the controller without undue delay — who the controller is depends on the unresolved commercial model (`23_privacy_annex_draft.md` section 2); under the current pilot this must be resolved as part of the incident, which is itself a documented gap.
- **Data-subject notification (draft obligation):** GDPR Art. 34 requires communicating to affected data subjects without undue delay when the breach is likely to result in a high risk to them. The privacy contact drafts; the business/data owner approves.
- Record every assessment outcome (including "no notification required") with rationale in the private incident record.

## 7. Customer/Stakeholder Communication

`Draft — needs legal review` — placeholder templates; final wording requires legal review per incident.

| Audience | Trigger | Owner | Template placeholder |
| --- | --- | --- | --- |
| Internal stakeholders (HR sponsor, system owner) | Any SEV-1/SEV-2 at classification | Incident lead | "[Date/time] We are investigating an incident affecting [system area]. Current impact: [known impact]. Next update by: [time]." |
| Customer/controller contact | Confirmed incident affecting their data, or per future DPA terms | Business/data owner | "[Date/time] We detected [incident type] affecting [data categories/population rule]. Containment status: [status]. Assessment of notification obligations is [in progress/complete]. Contact: [privacy contact role]." |
| External partners (Sodexo/ÖMC/Payroll/Toplux/Crewing) | Their access or data is affected | Business/data owner | "[Date/time] Access to [system/feature] is [suspended/restored] due to a security incident. Action required from you: [action]." |
| Supervisory authority | Per section 6 decision | Privacy contact | Use the authority's breach-notification form; prepared from the private incident record |
| Data subjects | Per Art. 34 decision in section 6 | Privacy contact (drafts), business/data owner (approves) | "[Date] [What happened] involving [data categories]. What we have done: [containment]. What you can do: [advice]. Contact: [contact point]." |

## 8. Post-Incident Follow-Up

`Draft — needs legal review`

1. Post-incident review within 10 business days of closure: timeline, root cause, what worked, what failed, detection gap analysis.
2. Action items with owner (role label) and target date, tracked in the blocker/remediation tracker (`17_blocker_remediation_tracker.md`) or sprint backlog as appropriate.
3. Update this process document with lessons learned.
4. If the incident was a notifiable breach, verify the breach register entry (Art. 33(5) documentation duty) is complete in the private record.
5. Re-check whether risk acceptances recorded in `22_supabase_security_evidence_package.md` (SSL, network restrictions, PITR) contributed and whether they should be revisited before their 2026-09-30 review date.

## 9. Known Gaps

`Draft — needs legal review`

- No alerting: detection is manual (backup-failure alerting is Story 22.12).
- No executed DPA assigning notification duties between the parties (Story 23.2).
- Roles in section 2 are unassigned pending the responsibility-split confirmation in `09_operations_support_and_sla.md`.
- This process has never been exercised; a tabletop walkthrough is recommended before any commercial deployment.

## Related Documents

- [`09_operations_support_and_sla.md`](09_operations_support_and_sla.md) — operational runbook this process extends (deploy/verify/rollback/backup-restore steps live there; this document does not duplicate them).
- [`23_privacy_annex_draft.md`](23_privacy_annex_draft.md) — data categories and breach-obligation legal questions.
- [`24_subprocessor_register.md`](24_subprocessor_register.md) — vendors whose secrets/contacts are touched by containment and notification.
- [`22_supabase_security_evidence_package.md`](22_supabase_security_evidence_package.md) — current Supabase security posture and risk acceptances.
- [`16_presentation_data_scope_and_access_preconditions.md`](16_presentation_data_scope_and_access_preconditions.md) — standing data-handling controls that also bound incident evidence handling.
