# Pricing And Business Case

Prepared: 2026-06-07

Scope: commercial/pricing strategy for converting the existing informal HR Masterdata usage into a professional paid arrangement. This document is based on repository evidence, existing commercial-readiness documentation, and current public pricing/rate anchors. It is not legal, tax, accounting, or procurement advice.

Privacy note: no production employee rows, SSNs, tokens, API keys, cookies, database URLs, private environment variable values, or other secrets are included here.

Repository evidence reviewed: `README.md`, `LICENSE`, `package.json`, `.env.example`, `.gitignore`, `.github/workflows/test-check.yml`, `.github/workflows/supabase-nightly-backup.yml`, `vercel.json`, `supabase/migrations`, `src/app/api`, `src/lib`, tests, and the existing `docs/commercial-readiness/` package, especially `01_executive_summary.md`, `06_data_inventory_and_data_flows.md`, `07_gdpr_and_privacy_overview.md`, `08_security_overview.md`, `09_operations_support_and_sla.md`, `10_dependencies_subprocessors_and_licenses.md`, `11_risk_register_and_open_questions.md`, `12_commercial_pack.md`, `13_exit_and_handover_plan.md`, `16_presentation_data_scope_and_access_preconditions.md`, `17_blocker_remediation_tracker.md`, `19_api_auth_matrix.md`, and `20_field_access_matrix.md`.

External anchors checked on 2026-06-07:

- Vercel pricing and plan documentation: https://vercel.com/pricing and https://vercel.com/docs/plans
- Supabase billing and usage documentation: https://supabase.com/docs/guides/platform/billing-on-supabase and https://supabase.com/pricing
- Kammarkollegiet/Avropa IT consulting framework price examples: https://www.avropa.se/
- Current Swedish IT consulting-rate commentary from Workamo: https://workamo.com/blogg/konsultarvode-it-konsult.html

## 1. Executive Summary

### Recommended primary model

Use a hybrid recurring model:

1. A one-time formalization/regularization project.
2. A fixed annual or monthly platform/license fee for continued right to use the software.
3. Included business-hours support and maintenance hours.
4. Separate hourly billing or fixed quotes for new development, larger security work, integrations, SSO, reporting, or customer-specific changes.

The recommended first offer should be the **Standard Managed Continuity Package**:

- One-time formalization project: **150,000-300,000 SEK**.
- Recurring license/managed platform fee: **25,000-45,000 SEK/month**, preferably invoiced annually at **270,000-480,000 SEK/year** after a modest annual prepayment discount.
- Included support: **4-6 hours/month**, business-hours only, use-it-or-lose-it or one-month rollover capped at the same monthly allowance.
- Extra work: **1,200-1,600 SEK/hour** or fixed-price statements of work.
- Initial term: **12 months** after a short interim review phase, with **3 months' notice**.

This is the cleanest commercial shape because the value is not the number of users. The value is continuity of an already-used HR operations system, avoided return to Excel, reduced manual error risk, controlled access for internal/external parties, ongoing maintenance, backup/restore discipline, support, and a formal right to keep using the tool.

### Best fallback model

If procurement, IT, or legal cannot yet approve a normal annual license, the best fallback is a **3-month interim formalization and continuity agreement**:

- 50,000-150,000 SEK one-time minimum formalization work.
- 20,000-35,000 SEK/month for temporary continuity, limited support, vendor onboarding, and review support.
- Clear end state: approve managed license, approve customer-hosted handover/license, or decommission/export in a controlled way.

This avoids a sudden ultimatum and gives the company time to review without expecting free indefinite operation.

### What should not be proposed initially

Do not open with:

- Retroactive billing for the last six months.
- A full source-code/IP sale.
- A rebuild-cost invoice.
- Per-user-only pricing.
- A 24/7 enterprise SLA.
- A hostile shutdown date.
- A vague "support only" arrangement with no license/right-to-use fee.

These options either create unnecessary friction, undervalue the product, or create obligations the creator's company may not be staffed to deliver.

### Safest conversation framing

Frame the conversation as a working-pilot conversion:

> The HR team already has a working tool that replaced a risky manual Excel workflow. Now that it is being used operationally, it should not remain informal. The professional options are to formalize continued use, hand it over under agreed terms, or decommission it safely.

The first thing the HR manager should hear is:

> There is no expectation of retroactive payment. The question is only how future use, support, hosting, maintenance, privacy/security review, and operational continuity should be handled.

## 2. Situation Analysis

### Current state

The system is already used by an HR team inside a large Swedish enterprise, but without a formal vendor/customer relationship. That creates a commercially valuable but sensitive situation:

- The product value is already demonstrated in live operational use.
- The system replaced a manual Excel/email/script workflow described in the README and product docs.
- The current use appears to involve employee/candidate masterdata, role-specific partner access, date planning, exports, notifications, staffing follow-up, backups, and privacy-supporting workflows.
- The codebase is proprietary/source-available only. `LICENSE` states all rights are reserved and that use, copy, modification, distribution, sublicensing, or sale requires explicit written permission.
- The project is currently tied historically to the creator and personal/project accounts, while future paid operation should move under the creator's company or customer-owned accounts.
- The creator's partner is moving role, so the informal relationship anchor is weakening.
- HR users want continuity, but HR probably cannot approve the full vendor, security, legal, and budget process alone.

### Commercial opportunity

The opportunity is not "selling a side project." It is converting a successful internal pilot into a supported operational system.

Commercial value drivers:

- Avoiding a return to error-prone spreadsheet workflows.
- Reducing manual distribution and reconciliation work.
- Maintaining a single source of truth for seasonal recruitment masterdata.
- Controlled access for HR, recruiters, Crewing, Sodexo, ÖMC, Payroll, Toplux, and limited admins.
- Continuity during seasonal recruitment periods.
- Support when users have access, import/export, notification, or data issues.
- Maintenance of Next.js, Supabase, dependencies, CI, backups, and security fixes.
- Reduction of person dependency by adding documentation, support boundaries, and handover options.

The estimated 1,000-2,000 replacement hours is a useful anchor, but not the main invoice logic. It helps procurement understand that rebuilding is materially more expensive than formalizing continued use. At 1,200-1,600 SEK/hour, a rebuild could easily represent **1.2-3.2 million SEK** before enterprise review, handover, warranty, and internal management cost. The recurring fee should be defended mainly on future continuity and operational risk reduction, not past sunk cost.

### Legal/privacy/security risk

The existing commercial-readiness package correctly avoids claiming GDPR compliance. The system may support GDPR-related work through access controls, RLS, archiving, anonymization support, backups, and export/deletion routes, but it requires formal review.

Known or documented risk areas include:

- Personal data and potentially sensitive HR-related data categories.
- Undefined controller/processor role depending on hosting model.
- DPA/subprocessor review needed for Supabase, Vercel, GitHub, SMTP, and any support access.
- Diagnostic endpoint exposure recorded as a P0 readiness issue until runtime/E2E proof closes it.
- Supabase hosted RLS policies were inventoried from a backup snapshot in Story 22.8 (drift found, `R-023`, reconciliation pending); Auth dashboard settings not yet verified.
- Supabase SSL/network/PITR posture is formally risk-accepted (2026-06-11, review 2026-09-30); documented hardening steps remain before enterprise use.
- Full production restore drill verified 2026-06-11; backup-failure alerting still missing.
- Platform logging, support access, and incident process are not yet enterprise-formalized.
- Some service-role paths bypass RLS after app-layer checks and need review.

These issues should be priced and framed as formalization work, not hidden inside a small support retainer.

### Relationship and conflict-of-interest considerations

The partner relationship makes positioning important. The partner should not be the commercial buyer, approver, or sole advocate. The internal need should be owned by HR operations or management.

Best framing:

- "The HR team has piloted a tool that works."
- "Now the company needs to choose a responsible operating model."
- "The creator's company can offer a formal supplier relationship, but the company should review it through normal channels."

Avoid:

- "My partner's team wants to keep using my app."
- "The creator did this privately, so now the company must pay."
- "The team depends on it, so you have no choice."

### Operational continuity considerations

Continuity is a real service, not just uptime:

- Who handles user access and role changes?
- Who monitors cron jobs, email delivery, backups, and dependency advisories?
- Who responds during recruitment-critical periods?
- Who verifies restore capability?
- Who owns vendor accounts and secrets?
- Who decides when new HR requests are support, bugfixes, or chargeable development?

The commercial model should make those responsibilities explicit.

## 3. Buyer And Stakeholder Analysis

| Stakeholder | What they care about | What they may worry about | Message that resonates | What could block approval | Evidence they need |
| --- | --- | --- | --- | --- | --- |
| HR manager | Operational continuity, fewer errors, team productivity, seasonal readiness | Budget, internal politics, why pay now, dependency on one person | "This is a working pilot that should be formalized or decommissioned safely." | No budget owner, procurement threshold, IT/security objections | One-page business case, before/after workflow, package price, support boundaries |
| HR operations/process owner | Day-to-day reliability, imports/exports, reminders, access, workflow fit | Losing a tool that already works, slow procurement, too much IT overhead | "We can preserve the workflow while making it supportable." | Requirements unclear, hidden manual work, unsupported edge cases | Feature matrix, user roles, workflow demo, support process |
| HR team users | Ease of use, fast fixes, not going back to Excel | Price conversation causing shutdown, changes to workflow | "No retroactive payment; future use just needs a responsible model." | Users are not decision-makers | User feedback, time/error examples, current usage description |
| IT/security | Authentication, authorization, hosting, secrets, backups, logs, vendor controls | Shadow IT, personal accounts, personal data exposure, one-person supplier | "Formalization explicitly includes security review, account migration, access review, and hardening." | Unresolved P0 findings, no DPA, unsupported hosting model | Architecture, security overview, risk register, API/field access matrices, test evidence |
| Legal/privacy/DPO | Controller/processor roles, DPA, subprocessors, retention, DPIA, data subject rights | GDPR claims, unclear processing roles, personal data in logs/backups/emails | "The system has privacy-supporting features, but legal review is required before calling it compliant." | No DPA, unclear subprocessors, no retention decision | Data inventory, privacy overview, subprocessor list, support access model |
| Procurement | Fair price, vendor onboarding, contract structure, liability, renewals | Non-standard supplier, sole-source justification, no prior approval | "This is a controlled conversion of an already-used pilot; alternative is rebuild/handover/decommission." | Supplier onboarding failure, insurance/liability, budget threshold | Offer structure, comparison table, hourly rates, source/license terms, exit plan |
| Finance/budget owner | Cost predictability, annual budget, ROI logic | Ongoing subscription creep, unclear capex/opex treatment | "Annual license gives predictable spend; new development is separately approved." | No business owner, price too vague | Annual price, formalization fee, usage scope, avoided rebuild/Excel cost logic |
| Internal system owner | Accountability, access, releases, incidents, roadmap | Owning a system without resources | "The contract defines vendor and customer responsibilities, not just software access." | No owner nominated | RACI, runbook, SLA/support assumptions, escalation path |
| Senior management | Risk reduction, governance, continuity, optics | Conflict of interest, shadow IT, reputational risk | "Continuing informally is the risky option; formalize, hand over, or retire." | Awkward origin story, enterprise policy | Neutral briefing, relationship disclosure, decision options |

## 4. Recommended Primary Pricing Model

### Model

**Initial formalization project + fixed platform/license fee + included support/maintenance + separately billed improvements.**

This model fits because:

- The product is already built and used.
- The customer needs continuity, not a greenfield build.
- User count is likely too small for pure per-seat economics.
- The system's value comes from operational workflow, data control, and avoided mistakes.
- Procurement can understand a formalization project plus annual software/service fee.
- The creator can cap obligations and avoid unpaid scope creep.

### What the one-time formalization project covers

- Vendor onboarding material.
- Architecture overview and system documentation.
- Security review support.
- Privacy/GDPR support material, data inventory, and DPA/subprocessor inputs.
- Migration from personal accounts to creator-company-owned or customer-owned accounts.
- Access review and role review.
- Backup/restore verification.
- Production hardening and remediation of known blockers.
- Review of Supabase/Vercel/GitHub/SMTP configuration.
- Test evidence and release checklist.
- Meetings with HR, IT/security, legal/privacy, procurement, and management.

### What the recurring license covers

- Right to use the proprietary application within the agreed scope.
- Continued availability of the managed application, subject to platform/vendor availability and agreed support limits.
- Maintenance of the deployed version.
- Minor bug fixes and operational support within included support hours.
- Dependency/security update monitoring within a defined cadence.
- Backup workflow monitoring and basic recovery coordination.
- Vendor/account administration where the creator's company operates the service.
- Access to source only as agreed; repository visibility alone should not imply ownership or transfer rights.

### What support/maintenance covers

Support should cover:

- User access and role troubleshooting.
- Bug triage.
- Minor fixes that preserve existing behavior.
- Production deployment help.
- Backup job review.
- Cron/email troubleshooting.
- Platform incident coordination.
- Routine dependency maintenance.
- Questions from HR/IT/procurement during the agreed support window.

Support should not cover unlimited feature development. Use an explicit rule:

> Support keeps the existing agreed system working. New development changes what the system does.

### What should be included in the monthly fee

Recommended standard inclusion:

- Production hosting oversight for one production instance and one non-production/staging instance.
- Routine deployment and rollback coordination.
- Backup job review and documented restore check cadence.
- Monthly operational health check.
- 4-6 support/maintenance hours.
- Dependency advisory monitoring.
- Minor bugfixes within the included hours.
- Basic vendor/procurement/security-response support.
- License/right to use for the agreed HR team and named external-party roles.

### What should be excluded

Exclude by default:

- 24/7 support or guaranteed uptime beyond platform/vendor capabilities.
- Penetration testing by a third party.
- Legal advice, DPIA authorship, or GDPR compliance certification.
- SSO/MFA implementation unless quoted separately.
- Major data model changes.
- New integrations with HRIS, payroll, identity providers, or data warehouses.
- Large UI redesigns.
- New country/team rollouts beyond the agreed scope.
- Custom reporting beyond existing export workflows.
- Full source/IP transfer.
- Customer-side infrastructure work unless explicitly included.

### What counts as new development

New development includes:

- New workflows, dashboards, reports, exports, data fields, automations, or integrations.
- Changes that require new acceptance criteria, new data processing review, or new tests beyond a minor fix.
- Security hardening beyond normal maintenance, if it materially changes architecture or vendor setup.
- SSO, SCIM, MFA, SIEM/log drain, new backup model, or customer cloud migration.

### Hourly work and separate quotes

Use hourly billing for small enhancements and investigation:

- Standard hourly rate: **1,200-1,600 SEK/hour**.
- Security/architecture/procurement-heavy work: **1,400-1,800 SEK/hour**.
- Out-of-hours emergency work: only if agreed; **1,800-2,500 SEK/hour** is defensible, but do not promise availability without an on-call arrangement.

Use fixed quotes for:

- SSO/MFA implementation.
- Customer-hosted migration.
- Large workflow additions.
- Formal security remediation project.
- Source handover/transition.
- Decommissioning/export.

### Hosting costs

Hosting costs are not the main value driver. Public vendor pricing indicates Vercel/Supabase can start at low monthly platform fees, but enterprise features, backup/PITR, observability, usage overages, SSO, support, and account governance can materially change costs.

Recommended approach:

- Include ordinary hosting/vendor costs up to a stated cap in the Standard and Enterprise packages.
- Pass through vendor overages, upgraded plans, external security tools, SMTP costs, custom domains, PITR, log drains, SSO add-ons, and third-party review costs with prior approval.
- If the customer insists on customer-owned accounts, reduce the managed-ops component only modestly. The creator still provides license, maintenance, support, release, and advisory value.

### Included support hours

Recommendation:

- Light package: 1-2 hours/month, use-it-or-lose-it.
- Standard package: 4-6 hours/month, use-it-or-lose-it or one-month rollover capped at one month's allowance.
- Enterprise package: 8-12 hours/month, one-month rollover capped at one month's allowance.

Do not allow unlimited rollover. Large banks of unused hours turn into unmanaged feature backlog and weaken the distinction between support and development.

### Annual prepayment, term, notice, and scope creep

- Encourage annual prepayment because it fits enterprise budgeting and reduces monthly admin.
- Offer a **10-15% discount** for annual prepayment versus month-to-month.
- Initial contract: 12 months after any 3-month interim bridge.
- Renewal: annual, with indexation or price review.
- Notice: 3 months.
- Scope: one HR business unit/seasonal recruitment workflow, agreed domains/environments, agreed roles, and named external parties.
- Expansion: extra department/site/country requires a change order or package upgrade.

### Suggested packages

| Package | Intended use case | License scope | Support | Maintenance | Hosting/ops assumption | Excluded work | Monthly price | Annual price | Pros | Cons | Approval difficulty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Light / Continuity | Interim continuation, low bureaucracy, small HR team while review runs | One HR team, existing workflows, existing users/roles only | 1-2 h/month, business hours, no guaranteed urgent response | Critical fixes only, basic dependency monitoring | Existing hosting, basic backup review, no major account migration unless separately quoted | New features, SSO, heavy security work, data migration, 24/7 SLA | 12,000-20,000 SEK | 130,000-220,000 SEK | Easier entry, avoids free continuation, good for 3-month bridge | Too weak for enterprise operation; risks underfunded support | Low to medium |
| Standard / Managed | Recommended normal operating model | One HR function/business process plus agreed external-party roles; production + staging | 4-6 h/month, business hours, same/next business-day target for critical issues during covered hours | Monthly health check, dependency review, minor fixes, backup-job review, release coordination | Vendor-managed or customer-visible Vercel/Supabase/GitHub setup; ordinary platform costs included up to cap | Major features, integrations, SSO/MFA, pen test, legal work, source transfer | 25,000-45,000 SEK | 270,000-480,000 SEK | Best balance of value, support, procurement clarity, and creator sustainability | Needs clear scope and formal owner | Medium |
| Enterprise / Enhanced Support | Higher-risk formal enterprise review, more users/roles/sites, stronger IT/security needs | Broader HR scope, more external parties/sites, more governance artifacts | 8-12 h/month, business hours, named escalation, stronger response targets but no 24/7 unless separately staffed | Monthly/quarterly service review, restore drill cadence, security-advisory review, access review support | More formal vendor-account management, stronger monitoring, possible paid vendor plan upgrades passed through | 24/7, certified compliance, third-party pen test, unlimited procurement/security support, large dev | 55,000-95,000 SEK | 600,000-1,100,000 SEK | Defensible for enterprise risk and heavy support | Harder HR approval; may trigger formal procurement/security thresholds | High |

Recommended opening: offer Standard as the intended model, with Light as a bridge and Enterprise as an upgrade path if IT/security requires more governance.

## 5. Initial Formalization / Regularization Project

### Should there be a one-time fee?

Yes. Charge a one-time formalization fee.

Reason: the current system is moving from informal usage to formal enterprise use. That requires work that is not normal monthly support: documentation, vendor onboarding, account migration, security review, privacy support, access review, backups, restore verification, and remediation of known blockers.

This must be framed as:

> Payment for risk reduction and professionalization of future use.

Not:

> Payment for the last six months or past development.

### Formalization workstreams

| Workstream | What it includes |
| --- | --- |
| Documentation | Architecture overview, deployment model, runbook, support boundaries, feature scope, known gaps |
| Security review support | Route/auth overview, RLS evidence, service-role path review, secrets inventory without values, dependency advisory register |
| GDPR/privacy support | Data inventory, processing activities, DPA/subprocessor inputs, retention/open questions, presentation data controls |
| Vendor onboarding | Company information, contact/escalation path, insurance/tax info if available, commercial terms, support terms |
| Account migration | Move from personal accounts to creator-company-owned or customer-owned Vercel/Supabase/GitHub/SMTP setup |
| Access review | HR Admin accounts, external-party roles, active/inactive users, least-privilege confirmation |
| Backup/restore | Verify backup job, perform restore drill or staged restore, document RPO/RTO assumptions |
| Production hardening | Close or risk-accept P0 blockers, review Supabase/Vercel settings, dependency follow-up, logging controls |
| Handover material | Admin guide, operational runbook, decommission/export plan, support intake process |
| Meetings | HR manager, IT/security, legal/privacy/DPO, procurement, finance/budget owner |

### Price ranges

| Formalization level | Scope | Estimated effort | Suggested price |
| --- | --- | --- | --- |
| Minimal formalization | Commercial proposal, light documentation, initial security/privacy pack, 1-2 stakeholder meetings, no major account migration | 35-70 hours | 50,000-100,000 SEK |
| Standard formalization | Recommended. Documentation, vendor onboarding support, risk register update, access review, backup verification, account migration planning/execution, security/privacy support, 3-5 stakeholder meetings | 100-200 hours | 150,000-300,000 SEK |
| Extensive enterprise-readiness | Standard plus full customer-hosted migration or heavy vendor onboarding, restore drill, SSO/MFA discovery, procurement/legal workshops, deeper security remediation, runbook and training | 250-500 hours | 350,000-750,000 SEK |

If the customer requests extensive security work before any paid agreement, propose a paid discovery/formalization SOW first. Unpaid enterprise review work can easily become weeks of uncompensated consulting.

## 6. Alternative Pricing Models

### A. Per-user pricing

Per-user pricing makes sense when:

- User count is large and growing.
- Users receive similar value individually.
- Procurement expects a SaaS seat model.
- The product is standardized across many customers.

It does not fit well as the primary model here because user count is likely small and the value is process continuity, controlled data access, and avoided operational mistakes. A five-user HR team can still rely on a system worth hundreds of thousands of SEK per year.

If used, combine with a platform minimum:

- Platform minimum: **20,000-35,000 SEK/month**.
- HR admin/process owner seats: **600-1,200 SEK/user/month**.
- Standard internal users: **300-700 SEK/user/month**.
- External partner/viewer users: **0-300 SEK/user/month**, preferably included up to a cap.

Viewer users should be free or low-cost when they are needed for controlled data access. Charging heavily for external viewers may push the team back toward spreadsheet sharing.

Recommendation: do not lead with per-user pricing. Use it only as an expansion metric above a platform minimum.

### B. Per-onboarding/case pricing

Per-onboarding pricing makes sense when:

- Case volume is measurable and stable.
- Value is tied directly to each processed candidate/employee.
- HR wants variable cost by season.

Possible range:

- Platform minimum: **15,000-30,000 SEK/month**.
- Per onboarding/case: **50-250 SEK** depending on included workflows.

Pros:

- Ties spend to seasonal volume.
- Can feel fair if usage changes dramatically.

Cons:

- HR may dislike variable internal cost per candidate.
- It can create disputes about what counts as a case.
- It may underprice continuity during quiet months.
- It does not pay for maintenance, security review, and support when case count is low.

Recommendation: only use as an add-on for very large seasonal expansion, not as the core model.

### C. Department/team license

This may fit better than per-user pricing.

Structure:

- License covers one named HR function, recruitment process, country/site, or seasonal business process.
- Includes agreed external-party roles.
- Defines production/staging environments and data population.
- Expansion to another team/site/country is priced separately.

Suggested expansion pricing:

- Additional department/site using same workflow: **+8,000-20,000 SEK/month**.
- Additional country/legal/privacy context: **+20,000-50,000 SEK/month** plus formalization SOW.
- Major new workflow: separate project quote.

Recommendation: use this as the primary scope definition for the Standard package.

### D. Annual enterprise license

Annual license may be easier for procurement because it creates one budget line and one renewal event.

Suggested structure:

- Annual license/platform/support fee.
- One-time formalization SOW.
- Change-order mechanism for new development.
- Named service owner and support contacts.
- 12-month term with renewal and price review.

Discounting:

- Monthly Standard: 25,000-45,000 SEK.
- Annual prepaid Standard: 270,000-480,000 SEK, representing roughly 10-15% discount.

Renewal strategy:

- First renewal should include a service review: usage, support hours, incidents, new requirements, risk register, platform costs, and expansion.

Recommendation: prefer annual once the internal owner and review process are in place.

### E. Managed service

Managed service means the creator's company operates hosting, database, backups, monitoring, deployment, maintenance, and support.

Pros:

- HR gets continuity without becoming a software operator.
- Fastest path to keep the current system working.
- The creator knows the system.
- Clear recurring revenue.

Cons:

- Higher privacy/security responsibility for the creator's company.
- DPA, subprocessors, support access, insurance/liability, incident response, and vendor account ownership must be clarified.
- One-person supplier risk must be addressed honestly.

Pricing implication:

- This is the Standard/Enterprise pricing basis.
- Do not price as "hosting cost plus margin"; hosting is cheap but responsibility is not.

Agreements needed:

- Software/license agreement or SaaS terms.
- Support terms/SLA schedule.
- DPA and subprocessor list, if the creator's company processes personal data.
- Security/privacy appendix.
- Exit/handover clause.
- Limitation of liability and acceptable-use/scope terms.

### F. Customer-hosted license

Customer-hosted means the customer operates Vercel/Supabase/GitHub/SMTP or equivalent, while the creator licenses the code/application and provides support/development.

Pros:

- May be easier for IT/security if the company wants control over data, vendor accounts, identity, logs, and backups.
- Reduces some processor/subprocessor concerns for the creator's company.
- Helps with enterprise governance.

Cons:

- Slower to implement.
- Customer IT must own operations.
- The creator may lose direct control needed for fast support.
- Support boundaries must be strict because customer changes can break the system.

Pricing:

- One-time customer-hosted migration/formalization: **200,000-600,000 SEK** depending on account setup, environments, CI/CD, security review, and data migration.
- Recurring source-available/customer-hosted license and support: **18,000-40,000 SEK/month** or **200,000-450,000 SEK/year**.
- Extra support/dev: **1,200-1,800 SEK/hour**.

Do not discount too much. Hosting is not the main cost. The customer still receives right to use, updates, expert support, and continuity.

### G. Source code / IP sale

Selling source code makes sense only if:

- The customer refuses recurring vendor dependency.
- IT must own and operate the system.
- Procurement cannot accept a small supplier as SaaS operator.
- The creator wants to exit operational responsibility.
- The price reflects asset value, opportunity cost, handover, and future rights.

It should not be the first proposal because:

- It shifts the conversation from continuity to acquisition.
- It invites procurement to compare it to "just some code."
- It may eliminate future productization or reuse opportunities.
- It may be awkward given the origin story.
- It can be underpriced if anchored only to current hosting costs.

Valuation logic:

- Replacement cost anchor: 1,000-2,000 hours.
- Market hourly anchor: 1,200-1,600 SEK/hour for senior software/product/security work is defensible in Swedish consulting contexts.
- Replacement cost range: **1.2-3.2 million SEK** before enterprise governance, testing, internal time, and risk.
- Mature working-pilot premium: the system is already proven in the business process.
- Discount factor: it is custom, small-supplier-originated, and may need hardening.
- Rights factor: exclusive IP transfer costs more than source-access license.

Suggested price logic:

| Source option | What customer gets | Suggested range |
| --- | --- | --- |
| Source escrow/review only | Conditional source access for continuity, no ownership transfer | 50,000-150,000 SEK setup plus annual license |
| Customer-hosted source-available license | Right to use/modify internally, creator retains IP and reuse rights | 300,000-900,000 SEK setup/license plus support |
| Non-exclusive internal source license | Customer can run internally; creator retains ownership and can reuse generic concepts/components | 750,000-1,800,000 SEK plus handover |
| Full exclusive IP/source buyout | Customer owns code/IP; creator loses reuse/commercial rights unless carved out | 2,500,000-5,500,000+ SEK plus transition |

Separate transition/handover fee:

- **150,000-400,000 SEK** for documentation, environment transfer, training, release tag, migration verification, and 30-60 days of transition support.

Creator should retain rights to generic know-how, non-customer-specific concepts, reusable patterns, and unrelated components unless the buyout price explicitly compensates for losing them.

### H. Support-only model

Support-only means the customer pays for support hours but no license/platform fee.

Why it is commercially weak:

- It implies the right to use is free.
- It pays only when something is wrong.
- It underfunds maintenance, dependency updates, security monitoring, vendor administration, and opportunity cost.
- It makes future pricing harder.

When it may be useful:

- Short interim bridge.
- Customer-hosted scenario where a separate license already exists.
- Decommissioning or handover period.

Suggested fallback:

- Minimum support retainer: **10,000-25,000 SEK/month** for 5-15 reserved hours/quarter, plus hourly billing.
- It should explicitly include a temporary use license or reference a separate license agreement.

Recommendation: avoid as the main model.

### I. Paid decommissioning/export

This applies if the customer cannot or will not formalize continued use.

It includes:

- Freeze plan.
- Data export scoped by HR/legal.
- User notification support.
- Backup/export validation.
- Access disablement.
- Secrets rotation.
- Domain/deployment shutdown.
- Data deletion/anonymization support under customer instruction.
- Final disposition record.

Pricing:

- Minimal controlled decommission: **50,000-125,000 SEK**.
- Standard export/decommission with legal/privacy coordination: **125,000-300,000 SEK**.
- Complex customer handover/decommission with migration support: **300,000-600,000 SEK**.

This is professional because it gives the company a non-hostile alternative and avoids trapping them.

### J. Low-friction entry / low-license + paid support model

This model tries to make the first formal agreement as cheap and easy as possible. It can be useful when the main obstacle is not value, but internal hesitation, procurement friction, or the fact that the tool has previously been free.

The commercial idea is:

- Keep the initial signature small.
- Charge a relatively low license fee, for example **200-300 SEK per named active user/month**.
- Make support, bug fixing, security work, and new development clearly paid through a retainer, prepaid hour block, or hourly billing.
- Use the entry model as a bridge into a normal managed license once the company has accepted that the system is no longer informal.

This can be a good tactical option, but it should not become the long-term default unless there is a real paid services component. A low user license alone will usually underprice the risk. For example, 10 users at 250 SEK/user/month is only 2,500 SEK/month, which does not pay for security responsibility, hosting oversight, backups, supplier availability, maintenance, procurement work, or support.

Recommended structure:

| Component | Low-friction option |
| --- | --- |
| Initial cost | 0-25,000 SEK if the goal is only to sign a temporary agreement; 25,000-75,000 SEK if review meetings, documentation tailoring, or account cleanup are needed |
| License fee | 200-300 SEK per named active user/month |
| Platform minimum | Strongly recommended: 3,000-10,000 SEK/month so the fee does not collapse if user count is low |
| External/viewer users | Include up to a cap or price at 0-100 SEK/user/month to avoid pushing people back to spreadsheets |
| Support retainer option | 10,000-25,000 SEK/month, credited against support/bugfix hours, no unlimited rollover |
| Prepaid-hours option | 25-50 hours/quarter prepaid at 1,300-1,600 SEK/hour |
| Hourly work | 1,300-1,700 SEK/hour for support, bug fixes, small improvements, review work, and new development |
| Term | 3 months, renewable once; convert to Standard, customer-hosted, or decommission after 3-6 months |
| SLA | Business-hours best-effort or simple response targets only; no uptime or 24/7 promise |
| Scope cap | Existing HR team/process only, agreed user cap, no new workflows unless paid hourly or quoted |

Possible offer shape:

> For the first 3 months, the company can sign a low-friction entry agreement with no retroactive payment, no large setup fee, a 250 SEK/user/month license with a 5,000 SEK/month platform minimum, and a 25-hour quarterly prepaid support/development block at 1,400 SEK/hour. At the end of the period, the company chooses whether to move to a normal managed agreement, move to a customer-hosted model, or decommission/export.

When this makes sense:

- HR agrees the tool is useful but does not yet have a formal budget.
- Procurement can approve consulting hours faster than a larger software purchase.
- The creator wants to reduce awkwardness and get the first written agreement signed.
- The customer needs time for IT/security/legal review.
- The relationship risk of a higher opening price is materially greater than the revenue risk.

Risks:

- It anchors the software as cheap even though the operational dependency is valuable.
- If the system runs smoothly, paid support hours may be low while responsibility remains high.
- It may encourage the customer to delay a proper managed agreement.
- It can look like staff augmentation rather than a software/license relationship.
- It may not fund enterprise security/privacy obligations.

Mitigations:

- Make it time-limited.
- Require a platform minimum or prepaid hours.
- State that the low price is an entry/bridge arrangement, not the long-term operating model.
- Include a conversion decision date.
- Keep support and new development paid from day one.
- Do not include major security, legal, procurement, or account-migration work for free.

Recommendation: use this only as a tactical "make it easy to say yes" path. It is better than indefinite free use, but weaker than the Standard Managed Continuity model.

## 7. Pricing Ranges And Reasoning

### Model comparison

| Model | One-time fee range | Monthly fee range | Annual fee range | Included support | Best for | Risk to creator | Ease of approval | Profitability | Recommendation level |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Standard managed license + formalization | 150,000-300,000 SEK | 25,000-45,000 SEK | 270,000-480,000 SEK | 4-6 h/month | Normal future operation | Medium | Medium | Good | Primary recommendation |
| Light interim continuity | 50,000-150,000 SEK | 12,000-20,000 SEK | 130,000-220,000 SEK | 1-2 h/month | 3-month bridge/review | Medium-high if it drags on | Easier | Moderate | Good fallback, time-limited |
| Enterprise enhanced support | 350,000-750,000 SEK | 55,000-95,000 SEK | 600,000-1,100,000 SEK | 8-12 h/month | Heavy IT/security governance | Medium-high | Harder | Good if staffed | Upgrade path |
| Customer-hosted license | 200,000-600,000 SEK | 18,000-40,000 SEK | 200,000-450,000 SEK | 2-6 h/month | IT wants control | Medium due support boundaries | Medium-hard | Good if scoped | Strong fallback |
| Annual enterprise license only | 100,000-300,000 SEK formalization | N/A or optional | 300,000-900,000 SEK | Contracted bundle | Procurement prefers annual | Medium | Medium | Good | Good procurement shape |
| Per-user with platform minimum | 50,000-150,000 SEK | 20,000-35,000 SEK minimum + seats | 220,000-420,000 SEK minimum + seats | Varies | Larger user base | Underpricing if minimum absent | Medium | Good only with minimum | Secondary |
| Low-friction entry / low license + paid hours | 0-75,000 SEK | 200-300 SEK/user/month, preferably 3,000-10,000 SEK platform minimum + 10,000-25,000 SEK retainer or prepaid hours | 36,000-120,000 SEK license minimum + support/development hours | Retainer/prepaid/paid hourly only | Getting the first formal agreement signed | High if no retainer, minimum, or conversion date | Easy | Good only if services are paid | Tactical bridge |
| Per-onboarding/case | 50,000-150,000 SEK | 15,000-30,000 SEK minimum + 50-250 SEK/case | Variable | Varies | High seasonal volume | Revenue volatility | Medium | Uncertain | Limited use |
| Support-only | 0-100,000 SEK | 10,000-25,000 SEK | 100,000-250,000 SEK | Retainer hours | Temporary bridge only | High | Easy | Weak | Avoid as core |
| Source/IP sale | 150,000-400,000 SEK transition | Optional support | 2,500,000-5,500,000+ SEK buyout | Transition only unless retained | Customer wants ownership | High if underpriced | Hard | One-time only | Do not propose first |
| Decommission/export | 50,000-600,000 SEK | None | None | Project support only | No formal continuation | Low-medium | Medium | One-time | Professional exit option |

### Reasoning

The recommended ranges are based on several anchors:

- **Avoided rebuild cost:** a comparable system at 1,000-2,000 hours could cost roughly 1.2-3.2 million SEK at senior Swedish software consulting rates before internal overhead.
- **Operational value:** the application supports seasonal recruitment continuity, partner access, exports, reminders, staffing follow-up, and reduced Excel risk.
- **Risk reduction:** the formalization work reduces security/privacy/continuity risk and creates evidence for IT, legal, procurement, and management.
- **Support burden:** even a small system needs user support, dependency monitoring, backup checks, release control, and stakeholder management.
- **Hosting costs:** Vercel/Supabase base costs may be low, but enterprise-grade operation is not mostly hosting cost. It is accountability, expertise, maintenance, documentation, and risk management.
- **Enterprise procurement expectations:** a large enterprise is used to paying for software continuity and vendor support. Extremely low pricing may make the supplier look non-serious and can fail to fund obligations.
- **Solo/small supplier limitations:** pricing must avoid promising an enterprise SLA that cannot be staffed.
- **Value to HR:** the tool's value is avoiding broken process, data errors, manual reconciliation, and loss of visibility, not maximizing seat count.

No exact price is objectively knowable without usage data, support history, internal budget thresholds, security requirements, and hosting/account decisions. The ranges above are designed to be defensible and negotiable.

## 8. Recommended Final Offer Structure

### Offer name

**HR Masterdata Managed Continuity Agreement**

### Recommended offer

| Term | Recommendation |
| --- | --- |
| One-time formalization fee | 200,000 SEK fixed fee, adjustable to 150,000-300,000 SEK after discovery |
| Recurring fee | 35,000 SEK/month or 360,000 SEK/year prepaid |
| Included support | 5 hours/month business-hours support/maintenance; one-month rollover capped at 5 extra hours |
| Extra hourly rate | 1,400 SEK/hour for support/development; fixed quote for larger work |
| Hosting/operations | Vendor-managed production and staging oversight; ordinary Vercel/Supabase/GitHub/SMTP administration included up to agreed usage/cost cap |
| SLA assumptions | Business-hours support. Critical outage response target same business day during covered hours; high-impact bug next business day; normal requests 2-5 business days. No 24/7 on-call unless separately contracted |
| Exclusions | Legal advice, GDPR compliance certification, SSO/MFA, pen testing, major new features, large integrations, customer IT infrastructure, source/IP transfer, platform overages beyond cap |
| Contract length | 12 months after formalization, with optional 3-month interim bridge |
| Notice period | 3 months |
| Expansion terms | Additional department/site/country or materially new workflow requires change order or package upgrade |
| Customer responsibilities | Business owner, data owner, approval of users/roles, retention/legal decisions, review participation, timely acceptance of vendor/subprocessor terms |
| Vendor responsibilities | Operate agreed system, maintain code, support users/admins, document runbook, manage agreed deployments/backups, notify material risks/incidents |
| Optional add-ons | Restore drill, SSO/MFA discovery, security hardening sprint, custom reporting, integrations, role/access audit, training, annual roadmap workshop |
| Customer-hosted alternative | 300,000-600,000 SEK setup/migration plus 25,000-40,000 SEK/month license/support |
| Source-code buyout alternative | Not first proposal. If requested: 2.5-5.5 million SEK+ plus 150,000-400,000 SEK transition, with rights negotiated separately |

### Optional low-friction entry offer

If the immediate goal is to make the first formal step as easy as possible, offer this as a tactical bridge rather than the main recommendation:

| Term | Low-friction entry recommendation |
| --- | --- |
| Name | HR Masterdata Entry Continuity Agreement |
| Term | 3 months, renewable once only by written agreement |
| Initial cost | 0-25,000 SEK if no extra formalization work is included; 25,000-75,000 SEK if meetings/document tailoring/account cleanup are included |
| License | 250 SEK per named active user/month |
| Minimum | 5,000 SEK/month platform minimum |
| Included users | Existing HR team and agreed external-party users, capped at a defined number such as 20-30 users |
| Support/development | Either 15,000 SEK/month retainer credited against hours, or 25 prepaid hours/quarter at 1,400 SEK/hour |
| Extra hourly rate | 1,400-1,600 SEK/hour |
| Included work | Existing operation, access/helpdesk questions, bug triage, minor bug fixes if paid hours are available |
| Excluded work | Major formalization, security remediation, legal/procurement workshops, SSO/MFA, new workflows, source transfer, 24/7 SLA |
| Conversion decision | Before the end of month 3: move to Standard Managed, customer-hosted, or decommission/export |

This offer can be useful if the HR manager needs a very low-friction internal ask. The important protection is that the support/development mechanism is not optional. Without a retainer or prepaid hours, the creator carries production risk for a license fee that may be too small to be commercially rational.

### Simple offer text

> The recommended arrangement is a 12-month Managed Continuity Agreement. It includes the right for the HR team and agreed partner roles to keep using HR Masterdata, business-hours support, maintenance, hosting/operations oversight, backup checks, and minor fixes. A one-time formalization project brings the current informal pilot into a documented, reviewable vendor/customer setup. Larger improvements are estimated and approved separately.

## 9. How To Talk About The Price To An HR Manager

### Short verbal pitch

> I want to be clear that there is no expectation of retroactive payment. The system was built to help the team, and it has now proven useful. The question is only how continued use should be handled going forward. Because it is now part of an operational HR process and handles sensitive HR-related data, it should not remain informal indefinitely. The sensible options are to formalize it, hand it over under agreed terms, or decommission it in a controlled way.
>
> My recommendation is a simple model: a one-time formalization project to make the setup reviewable and professional, then a fixed monthly or annual fee covering the right to use the system, continuity, maintenance, support, hosting/operations, and minor fixes. Larger improvements would be quoted separately.

### Email draft

Subject: Formalizing continued use of HR Masterdata

Hi [Name],

I wanted to raise the next step for HR Masterdata now that the team has been using it operationally for several months.

There is no expectation of retroactive payment for the period when the system was built and used informally. The question is only how continued use should be handled going forward.

The system has effectively acted as a working pilot. It has replaced parts of the previous Excel-based workflow and is now connected to day-to-day HR operations, user access, role-based permissions, employee data, exports, reminders, and operational continuity. Because of that, it should not remain an informal tool indefinitely.

I see three responsible options:

1. Formalize continued use through a proper agreement, support model, and IT/security/privacy review.
2. Hand it over under agreed customer-hosted/source-license terms.
3. Decommission/export in a controlled way if the company does not want to formalize it.

My recommended option is a one-time formalization project followed by a fixed monthly or annual managed license/support agreement. The recurring fee would cover continued right to use, maintenance, support, hosting/operations oversight, backup checks, and minor fixes. Larger improvements would be estimated and approved separately.

A reasonable first step would be to identify the right internal owner and schedule a short meeting with HR, IT/security or privacy as appropriate, and whoever owns the budget/procurement path.

Best regards,

[Name]

### One-paragraph explanation of the pricing model

The price is not a retroactive charge for past development. It is a future-use arrangement covering the right to keep using the proprietary system, support, maintenance, hosting/operations oversight, backup and continuity work, risk reduction, and supplier availability. A one-time formalization project brings the current informal setup into a reviewable vendor/customer arrangement. New features and larger changes are handled separately so the monthly fee stays predictable and scope creep is controlled.

### Response: "Why should we pay now when it has been free?"

> Because the situation has changed from informal help to operational use. The past period can be treated as a pilot with no retroactive charge. But if the company wants to keep relying on the system, it needs a proper agreement, support model, data/privacy review, account ownership, and maintenance responsibility. The fee is for future continuity and controlled operation, not for the fact that it was previously free.

### Response: "Can we just keep using it as-is?"

> I would not recommend that. It handles HR-related operational data and depends on hosting, accounts, backups, updates, and support. Leaving it informal creates risk for the company and for me as the maintainer. The responsible options are to formalize it, hand it over under agreed terms, or decommission it safely.

### Response: "Can we buy the source code?"

> That is possible to discuss, but I would separate it from the first decision. Buying source code is materially different from paying for continued use and support. If the company wants ownership or customer-hosting, we should define exactly what rights transfer, what support is included, how handover works, and what happens to generic know-how and reusable components. It would be priced separately from a normal managed-use agreement.

### Response: "Can IT take over the system?"

> Potentially, yes. That would be a customer-hosted or handover model rather than a managed service. It would need a scoped transition project: repository/source rights, environment setup, Supabase/Vercel or alternative hosting, secrets transfer/rotation, migrations, backup/restore, test runs, admin training, and support boundaries. It is more work upfront, but it may fit IT governance better.

### Response: "Can you support this as a one-person supplier?"

> Within realistic boundaries, yes. I can support business-hours continuity, maintenance, bugfixes, small improvements, and operational coordination. I should not promise a 24/7 enterprise SLA unless we create a staffed on-call arrangement or involve another support partner. The agreement should be honest about response targets, escalation, source/handover options, and what happens if I am unavailable.

## 10. Internal Sponsor Pitch

### Short Slack/Teams message

> We are already using HR Masterdata in the HR workflow, and it has replaced parts of the old Excel process. Since it is now operational and touches HR data, we should decide whether to formalize it properly, hand it over, or decommission it safely. Continuing informally is not ideal, and going back to Excel would have operational downsides.

### Email draft

Subject: Decision needed: formalize or decommission HR Masterdata

Hi [Manager],

We should make a decision about HR Masterdata.

The team is already using the tool in practice, and it solves a real workflow problem that we previously handled through Excel/manual sharing. It gives us better structure, visibility, role-based access, exports, reminders, and operational follow-up.

The issue is that the system has grown from an informal pilot into something we rely on. That means we should not continue indefinitely without a formal owner, agreement, IT/security/privacy review, support model, and budget decision.

I think the decision is not "do we buy a new tool from scratch?" The decision is whether we formalize a working tool, hand it over under agreed terms, or decommission it in a controlled way. Going back to Excel is possible, but it would reintroduce manual work, lower visibility, and higher error risk.

Could we schedule a short discussion to decide who should own the internal evaluation and what the next step should be?

Best,

[Name]

### Meeting talking points

- We are already using the system operationally.
- It replaced an Excel/manual workflow that caused errors and overhead.
- It supports structured HR masterdata, access roles, exports, reminders, and follow-up.
- The current informal setup is not appropriate long term.
- The responsible choices are formalize, hand over, or decommission.
- HR should own the business need, not the origin story.
- IT/security/privacy/procurement should review the setup before long-term use.
- A recurring fee would cover future use, support, maintenance, hosting, and continuity.
- Larger improvements can be handled separately.

### Five-bullet business case

1. The system is already proven in the HR process.
2. It reduces reliance on spreadsheet sharing, manual reconciliation, and script-dependent workflows.
3. It improves visibility and role-based access for HR and operational partners.
4. Formalization reduces shadow-IT, privacy, security, and continuity risk.
5. The cost of formalizing continued use is likely far lower than rebuilding a comparable system or reverting to inefficient manual work.

### Before/after comparison

| Area | Before | After |
| --- | --- | --- |
| Data source | Excel files and manual sharing | Centralized application/database |
| Access | Broad/manual distribution | Role-based app access and configured column permissions |
| Updates | Manual reconciliation and outdated copies | Realtime or near-realtime shared view |
| External parties | Separate manual files | Role-specific views and exports |
| Errors | Spreadsheet/script/process risk | Validation, structured workflows, tests, audit/change support |
| Continuity | Person/process dependent | Can be formalized with support, backups, runbook, and ownership |
| Risk posture | Informal manual workflow | Reviewable system, but still needs formal IT/privacy/security approval |

## 11. Procurement And Legal Framing

### Make it easier to approve

A small initial formalization project may be easier than a large software purchase because:

- It is a bounded review/professionalization effort.
- It avoids forcing a full annual commitment before IT/security/legal understand the system.
- It creates the artifacts procurement needs for a larger decision.
- It gives the company an off-ramp if approval fails.

A 3-month interim agreement may be useful because:

- It keeps support and hosting funded during review.
- It avoids indefinite free usage.
- It gives the company time to nominate owners.
- It creates a controlled decision point.

Annual license may be cleaner than per-user pricing because:

- The user count is likely small.
- The value is process continuity, not seats.
- It avoids debates about viewer/external users.
- It is easier to budget and renew.

### Conflict-of-interest controls

- The partner should not be the buyer, budget approver, or sole internal sponsor.
- The HR manager/process owner should own the business need.
- The creator should disclose the origin story calmly and factually if asked.
- The proposal should be made through the creator's company.
- Pricing should be normal, documented, and defensible.
- The customer should run its normal vendor/procurement/legal process.

### Source code and GitHub licensing

Current evidence:

- `LICENSE` says all rights are reserved.
- `README.md` says the project is a showcase portfolio piece and not available for public use or distribution.
- GitHub visibility or forks do not grant operational use, modification, distribution, or ownership rights beyond platform viewing/forking permissions.

Commercial framing:

- A license/right-to-use agreement is different from source ownership.
- Customer-hosted operation can be licensed without full IP transfer.
- Source escrow/review can be offered if continuity risk is a concern.
- Full source/IP sale should be separately priced.

### Documents likely requested

- Proposal/SOW.
- Company registration/VAT/tax information.
- Insurance/liability information if available.
- DPA and subprocessor list.
- Security overview.
- Architecture overview.
- Data inventory and data flows.
- Support/SLA terms.
- Privacy/retention open questions.
- Exit/handover plan.
- License terms and IP ownership clause.
- Accessibility/security/testing evidence if required.
- Third-party license/dependency list.

### Terms to have ready

- Scope of use.
- License term and renewal.
- Fees and payment terms.
- Support hours and response targets.
- Exclusions and change-order process.
- Hosting model.
- Customer responsibilities.
- Vendor responsibilities.
- Data processing and subprocessors.
- Confidentiality.
- Liability cap.
- Termination, export, and handover.
- Source access/escrow/buyout options.

### What not to promise

- GDPR compliance certification.
- Legal advice.
- 24/7 support.
- Unlimited fixes or unlimited feature changes.
- Enterprise uptime guarantee dependent on Vercel/Supabase unless backed by proper vendor plans and contract terms.
- That IT/security will approve the current setup without changes.
- That personal accounts are acceptable long term.

## 12. Negotiation Strategy

### Opening position

Open with:

- Standard formalization: **200,000 SEK**.
- Standard recurring: **35,000 SEK/month** or **360,000 SEK/year prepaid**.
- Included support: **5 hours/month**.
- Extra work: **1,400 SEK/hour**.
- Initial 12-month term after a 3-month interim review if needed.

This is specific enough to be credible and still leaves room to adjust.

### Acceptable fallback

Acceptable fallback:

- 3-month interim agreement at **20,000-35,000 SEK/month** plus a minimal formalization SOW of **50,000-150,000 SEK**.
- Or customer-hosted discovery/handover SOW at **150,000-300,000 SEK**, followed by annual source-available license/support.

Do not accept indefinite free support during review.

### Walk-away conditions

Walk away or pause operation if:

- The company wants continued operational use with no agreement and no timeline.
- The company wants source/IP transfer at a token price.
- The company requires 24/7 SLA without budget/staffing.
- The company requires extensive security/legal/procurement work unpaid.
- The company refuses to identify an internal owner/data owner.
- The company wants to continue processing HR data in an informal setup that creates unacceptable risk.

### Avoid underpricing

- Do not price based on current hosting cost.
- Do not price based only on user count.
- Do not apologize for charging after the pilot.
- Do not treat past free use as evidence the future service has no value.
- Use the rebuild cost as an anchor, but not as an invoice.
- Separate license, support, maintenance, hosting/ops, and new development.

### Avoid scope creep

- Define included support hours.
- Define what counts as new development.
- Require written approval for new features.
- Keep a backlog with estimate/priority.
- Use fixed SOWs for large work.
- Add a quarterly review for roadmap and support usage.

### Requests for free continued usage during review

Suggested response:

> I understand procurement and review can take time. I can support a short interim arrangement so the team is not disrupted while the company evaluates the options. But continued operational use should not remain informal or unpaid indefinitely. The interim agreement can be simple and time-limited.

### Requests for source code

Suggested response:

> Source access, customer-hosting, and IP transfer are possible models, but they need separate pricing and legal terms. The normal managed-use fee does not include source ownership. If source access is needed for continuity, we can discuss source escrow or a customer-hosted license before discussing a full buyout.

### Requests for extensive security work before payment

Suggested response:

> A reasonable security overview can be provided as part of the first discussion. Detailed security remediation, evidence production, workshops, and account migration are exactly what the formalization project covers. If the company needs that work before deciding on a long-term license, we can start with a paid formalization/discovery SOW.

### Anchoring value without retroactive compensation

Use this framing:

- The past six months are a pilot.
- No retroactive invoice.
- The system is proven.
- Rebuilding would likely cost materially more than formalizing.
- Continued use should pay for future rights, continuity, support, maintenance, and risk reduction.

### Preserving future productization

- Keep IP ownership with the creator's company by default.
- Grant customer an internal-use license.
- Avoid exclusive rights unless paid at buyout level.
- Carve out generic concepts, reusable components, know-how, and non-customer-specific patterns.
- Avoid custom terms that block selling similar tools to other customers unless compensated.

## 13. Risk Analysis

| Risk | Severity | Likelihood | Mitigation | Owner |
| --- | --- | --- | --- | --- |
| Compliance/privacy risk | High | Medium-high | DPA, subprocessor list, privacy review, retention decision, access review, no GDPR-compliance claims | Customer legal/privacy + vendor |
| Security readiness risk | High | Medium | Close P0 blockers, verify RLS/Auth, review service-role paths, harden Supabase/Vercel/GitHub settings | Vendor technical owner + customer IT/security |
| Procurement risk | Medium-high | High | Start with formalization/interim SOW, provide clear packages, identify budget owner | HR manager + procurement |
| Relationship/conflict risk | Medium-high | Medium | Partner not decision-maker, disclose origin factually, HR owns business need, use creator's company | HR manager + creator |
| Underpricing risk | High | High | Use platform minimum, annual license, separate dev work, no support-only core model | Creator |
| Support burden | High | Medium | Included-hour cap, support window, change-order process, no 24/7 promise | Creator |
| SLA risk | High | Medium | Business-hours targets only unless staffed; platform dependencies excluded/limited | Creator + customer |
| Source-code transfer risk | High | Medium | Keep as exception, price rights separately, retain generic know-how unless paid | Creator + legal advisor |
| Liability risk | High | Medium | Contract liability cap, exclusions, DPA, insurance review, no legal/compliance guarantees | Creator's company + lawyer/accountant |
| Customer dependency risk | Medium-high | Medium | Handover/exit plan, source escrow option, customer-hosted alternative, documentation | Both |
| Reputational risk | Medium | Medium | Calm framing, no ultimatum, professional proposal, controlled decommission option | Creator + HR sponsor |
| Data hosting risk | High | Medium | Account migration, vendor review, backups, restore drill, subprocessors, platform settings | Vendor + customer IT |
| Unpaid support indefinitely | High | High | Time-limited bridge, written support terms, stop accepting new unpaid requests | Creator |
| Approval delay | Medium | High | 3-month interim agreement, meeting sequence, clear decision gates | HR manager + procurement |
| Feature creep during formalization | Medium | High | Formalization scope excludes new features; backlog separate | Creator + HR owner |
| One-person supplier risk | Medium-high | Medium | Honest support limits, source escrow/handover option, documentation, possible partner backup | Creator |

## 14. Recommended Next Steps

### What the HR team should do

- Confirm internally that the system is currently used and valuable.
- Identify the HR manager/process owner who owns the business need.
- Document before/after pain points and examples without exposing personal data.
- Decide whether the preferred outcome is managed continuation, customer-hosted handover, or decommissioning.
- Bring IT/security/privacy/procurement into the process early enough to avoid surprise objections.

### What the creator should do

- Prepare a one-page business summary and pricing offer.
- Avoid retroactive billing language.
- Avoid emotional or relationship-based framing.
- Prepare the formalization SOW and Managed Continuity Agreement outline.
- Prepare a short demo with safe data controls.
- Keep risk language cautious: privacy-supporting features, not GDPR compliance.
- Avoid exposing secrets or production employee examples.
- Define support boundaries before taking more requests.

### What the creator's company should prepare

- Company registration and invoicing details.
- Draft proposal/SOW.
- Draft license/support terms.
- Draft DPA/subprocessor input or lawyer-ready outline.
- Insurance/liability position if available.
- Hourly rate card.
- Support process and contact method.
- Exit/handover option.
- Account migration plan from personal to company/customer ownership.

### What should be documented before the first formal meeting

- Current business use and value.
- Current users/roles at a high level.
- Architecture and hosting overview.
- Data inventory and privacy open questions.
- Security/readiness blockers and mitigation plan.
- Backup/restore posture.
- Support/SLA boundaries.
- Pricing options.
- Decision options: formalize, hand over, decommission.

### What should be avoided

- Threatening shutdown.
- Asking for back payment.
- Letting the partner act as buyer or sole internal sponsor.
- Showing secrets, logs, production database screens, or broad employee data.
- Promising enterprise compliance.
- Agreeing to free procurement/security work without a paid SOW.
- Offering source/IP sale as the first or cheapest option.

### Proposed meeting sequence

1. **Internal HR validation:** HR users/process owner align on value, pain points, and need for a decision.
2. **Manager discussion:** HR manager decides whether to sponsor formal review.
3. **Technical/compliance discovery:** IT/security/privacy review system evidence, hosting model, data scope, and known gaps.
4. **Interim agreement or decommissioning decision:** If review will take time, sign a short paid bridge; if not, plan decommission/export.
5. **Formal commercial proposal:** Submit Standard Managed Continuity proposal or customer-hosted alternative.
6. **Long-term contract or handover:** Execute agreement, migrate accounts, close formalization actions, and schedule service reviews.

### Proposed timeline as phases

| Phase | Goal | Typical duration | Output |
| --- | --- | --- | --- |
| 1. Internal HR validation | Confirm business need and sponsor | 1-2 weeks | Internal business case and owner |
| 2. Manager discussion | Decide whether to evaluate formalization | 1 week | Decision to proceed, pause, or decommission |
| 3. Technical/compliance discovery | Review data/security/procurement path | 2-6 weeks | Formalization scope and blockers |
| 4. Interim agreement or decommissioning decision | Avoid indefinite informal use | 1-2 weeks | Paid bridge or exit plan |
| 5. Formal commercial proposal | Agree model and price | 2-6 weeks | SOW/license/support terms |
| 6. Long-term contract or handover | Move to stable operating model | 1-3 months | Managed service, customer-hosted license, or controlled shutdown |

## 15. Final Recommendation

### Best model

Use the **Standard Managed Continuity Agreement**:

- One-time formalization project: **150,000-300,000 SEK**, with **200,000 SEK** as a practical starting quote.
- Recurring platform/license/support fee: **25,000-45,000 SEK/month**, with **35,000 SEK/month** or **360,000 SEK/year prepaid** as a practical opening offer.
- Included support: **5 hours/month**, business-hours only.
- Extra work: **1,400 SEK/hour** or separately quoted.
- Contract: 12 months, 3 months' notice, clear scope and exclusions.

### Second-best fallback

Use a **3-month paid interim formalization/continuity agreement**:

- 50,000-150,000 SEK for minimal formalization.
- 20,000-35,000 SEK/month for continuity and limited support.
- Clear decision at the end: full managed license, customer-hosted handover/license, or decommissioning.

### Tactical cheap-entry option

If the main objective is to make the first formal signature as easy as possible, use a **3-month HR Masterdata Entry Continuity Agreement**:

- 0-25,000 SEK initial cost if no extra formalization work is included.
- 250 SEK per named active user/month.
- 5,000 SEK/month platform minimum.
- Mandatory support/development mechanism: either 15,000 SEK/month retainer credited against hours, or 25 prepaid hours/quarter at 1,400 SEK/hour.
- Conversion decision before the end of month 3: Standard Managed, customer-hosted, or decommission/export.

This is commercially weaker than the Standard model, but it is far better than indefinite free use. Use it only if a low entry cost materially improves the chance of getting a written agreement and a paid services relationship started.

### Model to avoid initially

Avoid leading with full source/IP sale, per-user-only pricing without a platform minimum and paid support mechanism, support-only pricing, or 24/7 enterprise SLA.

### Suggested starting price logic

The opening price should be based on:

- Continued right to use proprietary software.
- Operational continuity and support.
- Maintenance and security/dependency work.
- Hosting/ops/accountability.
- Formal review and risk reduction.
- Avoided rebuild cost and avoided return to Excel.

Do not base it on:

- Historical hours as a retroactive invoice.
- Current hosting cost.
- Number of HR users alone.

### Suggested conversation framing

> This has been a successful informal pilot. There is no retroactive payment expectation. But continued operational use should now be handled professionally: formalize, hand over, or decommission. The proposed fee is for future use, continuity, maintenance, support, hosting/ops, and formal review support.

### Key message to HR manager

> The team already has a tool that solves a real HR operations problem. The decision is whether to preserve it responsibly or step away from it responsibly.

### Key message to procurement/IT/legal

> This is a working custom application that needs a formal operating model, not an unmanaged shadow-IT continuation. The proposal separates formalization, license/support, optional customer-hosting, and source/IP transfer so each risk can be reviewed and priced correctly.

### Key decision the customer must make

The customer must decide whether HR Masterdata is now an operational system they want to keep. If yes, they should formalize it with an owner, review path, contract, support model, and budget. If no, they should fund a controlled export/decommissioning path rather than drifting back into informal use.
