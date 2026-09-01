# Commercial Pack

Prepared: 2026-06-03

## Value Proposition

HR Masterdata is a functioning operational system that centralizes seasonal recruitment masterdata and replaces a fragile spreadsheet/email/script workflow with controlled access, live updates, structured exports, operational reminders, and staffing follow-up.

The commercial conversation should be factual: the system creates value, but it also needs formalization, risk assessment, and support agreements before enterprise use.

## Problem Solved

Before:

- Employee masterdata spread across Excel workflows.
- Manual sharing with external parties.
- Limited access control and traceability.
- Manual date, capacity, staffing, and reminder follow-up.
- Person-dependent scripts and operational knowledge.

After:

- One database-backed source of truth.
- Role-specific dashboard and exports.
- HR Admin-controlled users and columns.
- Realtime updates and visible change highlights.
- Automated PE3/ÖMC/staffing notifications.
- Backup workflow and test suite foundation.

## ROI Drivers

- Reduced administration and spreadsheet maintenance.
- Fewer manual copy/paste and sharing errors.
- Faster onboarding and date assignment workflows.
- Better traceability of staffing target changes and employee field updates.
- Better access control than shared files.
- Reduced person dependency.
- Better base for compliance work than ad hoc spreadsheets.

## Target Audiences

- HR/recruitment operations.
- Crewing/staffing coordinators.
- External operational partners.
- IT/security reviewers.
- Legal/privacy and procurement stakeholders.

## Use Cases

- Seasonal recruitment masterdata control.
- Partner-specific employee views and updates.
- Important date/capacity planning.
- ÖMC/PE3 deadline follow-up.
- Crew-ready/staffing progress tracking.
- Controlled exports for operational handoff.

## Possible Commercial Models

1. One-time formalization/handover project: security hardening, docs, testing, privacy support, deployment review.
2. Fixed monthly/annual fee for license, operations, and support: app use, hosting oversight, backup checks, support window.
3. Separate hourly/fixed quote for larger new development: new workflows, integrations, reporting, SSO, customer-specific changes.
4. Customer-hosted model: customer owns Vercel/Supabase/GitHub or equivalent and operates with handover support.
5. Managed-service model: supplier hosts and maintains with agreed support, security, and privacy processes.
6. Full source code acquisition/IP transfer: separate larger option requiring legal/IP/commercial agreement.

## Clarifying Commercial Concepts

| Concept | Meaning |
| --- | --- |
| Historical development work | Past effort to build the system; does not automatically define future right to use |
| Future license/right to use | Contractual permission to use the software going forward |
| Operations | Hosting, deployments, backups, monitoring, environment management |
| Support | Handling incidents, access issues, questions, minor bug triage |
| Maintenance | Dependency updates, security patches, platform changes |
| New development | New features and integrations beyond support/maintenance |
| Handover | Documentation, environment transfer, training, access transfer |
| IP transfer | Transfer of ownership/source rights; materially different from a use license |

## Sponsor Pitch

We already have a functioning system that is being used in practice. The question is not whether to start a new development project, but whether to formalize, risk-assess, and maintain a solution that already creates value — or decommission it in a controlled way.

## Suggested Meeting Agenda

1. Business problem and current operational use.
2. Live walkthrough of employee dashboard, roles, exports, dates, staffing tracker.
3. Architecture and hosting overview.
4. Data inventory and privacy discussion.
5. Security findings and required hardening.
6. Operations/support model and backup/restore.
7. Commercial model options.
8. Decision: formalize, pilot under controls, hand over, or decommission.

## Checklist Before First External Meeting

- Remove/protect diagnostic endpoints or state they are a known pre-release fix.
- Patch or prepare dependency advisory remediation plan.
- Prepare demo data, not production personal data.
- Confirm who can discuss privacy/legal terms.
- Confirm preferred hosting model.
- Bring architecture diagram, risk register, data inventory, and evidence index.
- Prepare answer for support owner and incident contact.

## Recommended Next Steps

1. Run a hardening sprint for critical security/ops gaps.
2. Conduct privacy/DPIA workshop.
3. Verify production/staging environment controls.
4. Restore drill done (2026-06-11); backup-failure alerting + one-shot CLI-setup retry added in Story 22.12 (2026-06-16). Keep periodic drills.
5. Decide commercial/hosting/support model.
6. Prepare formal statement of work and support agreement.
