# Presentation Data Scope And Access Preconditions

Prepared: 2026-06-07

Scope: controlled external presentation or handover/sale discussion for HR Masterdata as a working pilot candidate. Production HR data may be shown during these presentations. This document defines the standing controls for doing that safely.

Privacy note: do not write raw SSNs, private employee examples, access tokens, cookies, database URLs, or secret values into this document or related presentation material.

## Standing Presentation Policy

Production employee data is allowed in controlled presentations when the presenter stays within these safeguards:

- Use a normal named application account with the role context that matches the workflow being demonstrated.
- Show the system through the application UI only.
- Keep the employee population, visible fields, exports, screenshots, browser tabs, browser history, downloads, meeting recording, transcription, and AI notes under presenter control.
- Do not use service-role access, direct database access, diagnostic endpoints, API clients, logs, environment screens, or developer tools as the presentation path.
- Do not store employee exports, screenshots, recordings, or private examples as readiness evidence unless the presentation owner has separately requested and accepted that artifact handling.

Story 22.2 controls are required only when a non-production presentation path is deliberately chosen. They are not a prerequisite for showing production data through the production application.

## Role And Account Context

Use only a normal named application account with the role context needed for the presentation:

| Presentation need | Account type | Controls |
| --- | --- | --- |
| Internal HR operational walkthrough | Named `hr_admin` or `recruiter` app account | Show HR operational screens and fields relevant to the stated walkthrough |
| External-party role demonstration | Named app account for the exact role being demonstrated: `crewing`, `sodexo`, `omc`, `payroll`, or `toplux` | Show only the columns and workflows visible to that role |
| Limited admin/checklist walkthrough | Named `admin_limited` app account | Show only checklist fields and screens available to that role |
| Non-production demonstration path | Named local or isolated staging app account | Use Story 22.2 controls and do not target production Supabase resources |

Explicitly prohibited presentation paths:

- Supabase service-role access or any code path using service-role credentials as the presentation mechanism.
- Supabase Studio, direct SQL, database browser, SQL editor, or raw database export.
- Admin shortcut accounts, shared accounts, or accounts with broader privileges than the demonstrated role context.
- Public or internal diagnostic routes, including `/api/debug/auth-status`, `/api/test-db`, and any debug/test view.
- Browser developer tools, API clients, database logs, build logs, environment-variable screens, or secret-management screens.

## Presentation-Safe Scope

Allowed workflows and screens must come from the current app role capabilities:

- Dashboard employee list filtered to the business population being demonstrated.
- Employee detail or edit screens when the visible fields match the demonstrated role.
- Filters, status views, and operational follow-up views needed for the stated purpose.
- Important dates and staffing tracker screens when relevant to the audience and selected population.
- Role-specific external-party views showing only the role's visible columns.
- Export modal or export output only when an export is intentionally part of the presentation scope.

Field visibility must be described by category when discussing the presentation. Do not include private values in documentation or notes. Example categories may include role, rank, location/route, operational status, date categories, and role-specific custom columns. If custom columns are demonstrated, use the exact columns visible to the selected role and avoid improvised field expansion during the presentation.

Restricted data and views:

- Out-of-scope employee populations, including unrelated routes, departments, seasons, managers, archived records, terminated records, or all-employee views when those are not part of the stated walkthrough.
- SSN, private contact details, health or diet information, payroll-related flags, room/housing details, free-text comments, internal notes, and custom columns that are not part of the demonstrated workflow.
- User administration, column administration, service-role behavior, direct database views, admin-only pages, debug/test pages, and raw API responses.
- Exports, downloaded files, screenshots, screen recordings, browser history, autocomplete suggestions, unrelated browser tabs, cached files, meeting recordings, transcription, and AI notes unless intentionally included in the presentation handling.

## Pre-Presentation Operator Checks

Run these checks immediately before the presentation:

| Check | Required result |
| --- | --- |
| Logged-in account | Account identity and app role match the demonstrated role context |
| Role preview/account context | Presenter is not relying on broader admin access to simulate restricted access |
| Employee population filter | Active filters match the business population being demonstrated |
| Visible fields and custom columns | Visible columns match the selected role and walkthrough scope |
| Open browser tabs | Only presentation-safe tabs are open |
| Browser history/autocomplete | Address bar and search suggestions do not reveal private data, secrets, internal URLs, or previous employee searches |
| Downloads folder/export files | No old employee exports or private files are visible or likely to be opened accidentally |
| Screenshots/recording/transcription | Disabled unless intentionally included in the presentation handling |
| Admin/debug views | Admin-only, debug, test, Supabase, Vercel, GitHub, and environment screens are closed |
| Scope change | If the role, population, environment, export, screenshot, or recording scope changes, rerun these checks before continuing |

## Non-Production Path

Use a Story 22.2-compliant non-production path when the presenter deliberately wants synthetic data, training data, or an isolated demo environment. That path must use local or isolated staging configuration that refuses production Supabase targets.

Choosing a non-production path is an operational choice, not a requirement for external presentation. Production data remains permitted through the production application when the safeguards in this document are followed.

## Relationship To Remaining P0 Work

This document controls presentation data scope and access path. It does not claim the product is enterprise-ready, and it does not waive remaining P0 readiness work such as Story 22.5's blocker tracker and one-page presentation brief.

## Evidence Handling

Keep readiness evidence limited to the policy, role/account context, scope controls, and operator checks. Do not attach employee exports, screenshots of private records, database dumps, environment files, auth tokens, cookies, SQL output, or direct employee examples to the readiness package.

If an export, screenshot, recording, transcript, or AI-notes artifact is intentionally created, record its owner, recipients, storage location, retention date, deletion owner, and deletion proof under the presentation owner's handling process.
