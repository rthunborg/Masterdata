# One-Page Readiness Brief

Prepared: 2026-06-07
Updated: 2026-06-10

Purpose: pre-meeting handout for a controlled external review or handover/sale discussion. This brief positions HR Masterdata as a working pilot candidate and keeps known readiness gaps visible.

## Recommended Positioning

HR Masterdata is a functioning operational pilot candidate for Stena Line seasonal recruitment masterdata. It has real product value and a credible technical foundation, but it must be described as a controlled working system that still needs formal hardening, evidence, privacy, and operational governance before enterprise or contract-ready production use.

Do not describe the system as enterprise-ready, production-approved, security-certified, privacy-approved, SLA-backed, or contract-ready.

## Current State

- Single-stack Next.js application with Supabase PostgreSQL/Auth/RLS and Swedish user-facing copy.
- Supports employee masterdata, role-based partner workflows, exports, important dates, staffing tracker, realtime updates, and reminders.
- TypeScript, Zod validation, RLS migrations, branch protection, CI, and broad test coverage provide a useful foundation.
- Story 22.2, Story 22.3, and Story 22.4 are done in the current status artifacts.
- Story 22.1 is done. The route handlers are removed in the repository and local/non-production gates pass. After final Epic 22 deployment, unauthenticated production runtime checks for the removed diagnostic paths must return non-success responses before the readiness package is treated as P0-complete.

## Review-Ready Scope

After the post-deployment diagnostic endpoint verification gate is closed or formally risk-accepted by the accountable owner, use the external review only for controlled evaluation of the product's workflow value and pilot potential:

- Dashboard employee list, filters, date planning, staffing tracker, and role-specific operational workflows.
- Role/account context that matches the audience and selected business population.
- Production data only under the standing controls in `16_presentation_data_scope_and_access_preconditions.md`.
- Non-production or synthetic-data review only through Story 22.2-compliant local or isolated staging paths.
- Readiness evidence limited to policies, controls, status artifacts, and non-secret documentation.

## Known Risks To State

- Public diagnostic endpoint implementation is complete, but production runtime closure is not accepted as verified until post-deployment runtime checks for the removed diagnostic paths return non-success responses.
- Residual moderate/low production dependency advisories remain documented and accepted only for controlled external review, not enterprise use.
- Production data can be shown only through the application UI with the approved account, role, population, field, export, screenshot, browser-history, recording, transcription, and AI-notes controls.
- Supabase hosted RLS/Auth settings, full restore drill, privacy/legal package, incident process, and long-term support model are not yet fully proven.

## Non-Ready Areas

The following are future evidence, security, privacy, or contract-readiness work, not completed enterprise proof:

- Supabase security evidence package and full restore drill.
- Privacy annex, subprocessors, DPA/DPIA inputs, retention decisions, and incident process.
- Formal support/SLA, operating RACI, production access governance, SSO/MFA decisions, DB network/SSL/PITR hardening, and contract-ready operations.
- Epic 23 commercial, legal, support, governance, and enterprise controls. Epic 23 should remain future contract-dependent scope until a serious commercial path or signed contract exists.

## Meeting Ask

Use the meeting to decide whether the remaining post-deployment diagnostic endpoint verification gate will be closed before external review, formally risk-accepted by the accountable owner, or treated as a reason to defer the controlled pilot/formalization or handover/sale path. Keep the message factual: the system works, creates value, and has documented readiness gaps that need named owners and dates.
