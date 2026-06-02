# HR Masterdata Management System

HR Masterdata is a private, Swedish-only web application for Stena Line seasonal recruitment operations. It replaces a spreadsheet-driven process with a centralized Next.js and Supabase system for employee masterdata, partner access, important dates, staffing targets, role-based permissions, exports, reminders, and operational follow-up.

> All user-facing product copy is intended to be Swedish. This repository is a private showcase/portfolio piece and is not licensed for public use or redistribution.

## Current Status

- **Product status:** feature-rich MVP / internal operations platform with active hardening and test coverage.
- **Primary app label:** `Säsongsrekrytering 2026`.
- **Architecture:** single-stack Next.js App Router application with Supabase PostgreSQL backend.
- **Deployment target:** Vercel + Supabase, with GitHub Actions for test checks and Supabase backup/staging automation.
- **Mobile support:** responsive card/table experience. Offline/PWA support is currently disabled; the app unregisters service workers.

## Problem It Solves

The HR team previously managed seasonal recruitment masterdata through Excel files, manual email distribution, and custom scripts. Multiple external parties needed different parts of the same employee data, while HR needed strict control over who could view or update sensitive fields.

This app provides one source of truth with:

- secure login and database-backed role isolation
- configurable column visibility and edit permissions
- real-time updates and change highlighting
- structured employee lifecycle workflows
- date, capacity, room, staffing, and notification automation
- controlled exports for HR and external parties

## Core Capabilities

### Employee Masterdata

- Create, import, edit, archive, restore, terminate, and reactivate employees.
- Inline editing in a spreadsheet-like table with typed editors for text, number, date, boolean, and select-style fields.
- Validation with Zod for employee fields, SSN format, salary level, rank/gender values, date rules, dietary fields, and termination workflow inputs.
- Checklist-style boolean fields with a visual progress indicator and default sorting for internal users.
- Special workflow fields such as One, Talmundo, ISPS, photo, Origo, Lönenivå, bank details, passport, C17, hotel requirement, diet details, and Crewing done.
- Termination workflow that clears date assignments, releases capacity, captures repayment requirements, and supports reactivation.
- GDPR-oriented anonymization endpoint for old archived employees.

### Important Dates, Capacity, and Rooms

- Manage Stena dates, ÖMC dates, PE3 dates, and other operational dates.
- Track capacity with `max_spots`, `remaining_spots`, and assigned employees.
- Support ÖMC two-day date handling and PE3 appointment times.
- Automatically calculate PE3 submission and cancellation deadlines during PE3 imports.
- Export employees by date category with optional date range and field selection.
- Preview and assign ÖMC hotel rooms based on rank, gender, hotel requirement, and assigned ÖMC date.

### Filtering, Search, and Saved Views

- Advanced filter panel across configured employee columns.
- Text, boolean, select, date range, and specific important-date filters.
- Quick filter to hide employees already marked as Crewing done.
- Active-filter indicators, empty-state messaging, filtered counts, and URL-synced filter state.
- Per-user saved filters with create, apply, current-match indication, and delete flows.
- Global search plus mobile search history.

### Import and Export

- CSV employee import with relaxed mapping support, validation, preview, success/error summaries, and error report download.
- Important-date and PE3 CSV import.
- Role-aware employee export with selectable fields.
- Export selected employees or filtered result sets.
- Crew-ready export that marks eligible employees as `crewing_done`.
- Export behavior respects role permissions and HR Admin role-preview/impersonation mode.

### External Party Workflows

- External parties see only permitted columns and a simplified dashboard.
- Partners can create, edit, categorize, color-code, export, and delete their own custom columns where they have permission.
- Custom columns are implemented as real typed columns on the `employees` table, tracked by `column_config`, rather than the older JSONB model.
- HR Admin controls column-level view/edit permissions through a matrix-style column settings interface.
- External users receive change summaries and field highlights for masterdata changes since their last login.

### Staffing Needs Tracker

- Tracks headcount needs for Göteborg and Trelleborg.
- Shows crew-ready progress against each location's target in dashboard tracker cards.
- HR Admin and Crewing can update staffing needs.
- Every staffing target change is written to an audit changelog.
- Users can open a per-location history modal for the current year's changes.
- Staffing target changes trigger Swedish email notifications to active HR/recruiter recipients, excluding the editor.

### Admin and Access Control

- Supabase Auth-backed login with active/inactive user enforcement.
- Application users are stored in `users` with role, status, and last-active tracking.
- Middleware protects dashboard and admin routes, while API handlers perform server-side role checks.
- Database RLS policies provide the primary data isolation layer.
- HR Admin can manage users, activate/deactivate accounts, delete users, and configure columns.
- HR Admin role preview mode shows what another role can see without switching accounts.

## Roles

| Role | Purpose | High-level access |
| --- | --- | --- |
| `hr_admin` / HR Superuser | Full internal owner | Employee workflows, user management, column settings, role preview, exports, staffing needs |
| `recruiter` | Internal recruitment user | Employee workflow access with shared HR column visibility and checklist editing |
| `admin_limited` / Administratör | Restricted internal helper | Shared HR visibility, but edit access is limited to checklist fields |
| `crewing` | Crewing partner | Partner dashboard plus staffing-needs editing |
| `sodexo` | External partner | Restricted employee data and Sodexo-controlled custom columns |
| `omc` / ÖMC | External partner | Restricted occupational-health/training-related access |
| `payroll` | External partner | Restricted salary/payroll-relevant access |
| `toplux` | External partner | Restricted housing/cleaning-related access |

Internal HR roles share HR Superuser column visibility. Edit permissions remain role-specific and are enforced in application logic and API routes in addition to database policies.

## Table and Mobile UX

- TanStack Table powers the desktop employee grid.
- Sticky checkbox/name columns and sticky horizontal scrollbars keep wide tables usable.
- Column headers support category labels and category color contrast handling.
- Column resizing persists per user in local storage.
- Compact and comfortable density modes are available.
- Mobile uses employee cards with always-visible key fields, expandable details, inline editing, swipe actions, long-press context actions, pull-to-refresh, and virtual scrolling for large lists.
- Accessibility work includes keyboard/focus handling, aria announcements, mobile touch target coverage, and color contrast utilities.

## Automation and Notifications

- Supabase Realtime updates employee data without manual refresh.
- Optimistic UI updates and mutation queue support smoother editing flows.
- Vercel cron routes run weekday notification checks for:
  - ÖMC masterdata follow-up after incomplete masterdata remains unresolved
  - PE3 submission and cancellation deadlines
- Notification logic uses Stockholm timezone calculations and duplicate-send guards.
- SMTP email delivery is configurable and can be disabled in test/E2E runs.
- GitHub Actions run nightly Supabase backups at 02:00 UTC, keep a 14-day window in Supabase Storage, and partially refresh staging from the oldest available backup.
- Preview/staging deployments can show a test-environment banner via `NEXT_PUBLIC_IS_STAGING=true`.

## Architecture

### Stack

- **Framework:** Next.js 16 App Router
- **Runtime/UI:** React 19, TypeScript 5.9, Tailwind CSS 4
- **Database/Auth:** Supabase PostgreSQL + Supabase Auth + RLS
- **Data fetching/state:** TanStack Query, Zustand
- **Tables/virtualization:** TanStack Table, TanStack Virtual
- **Forms/validation:** React Hook Form, Zod
- **UI primitives:** Radix UI, shadcn-style components, Lucide icons
- **Email:** Nodemailer SMTP
- **Testing:** Vitest, Testing Library, Playwright, axe-core Playwright, performance benches

### Key Directories

| Path | Purpose |
| --- | --- |
| `src/app` | App Router pages, layouts, middleware-facing UI routes, and API route handlers |
| `src/components` | Dashboard, admin, layout, UI primitive, mobile, and modal components |
| `src/lib/server/repositories` | Server-side data access layer for employees, columns, important dates, users, staffing needs, audit, and lifecycle operations |
| `src/lib/services` | Business workflows such as export, room assignment, capacity, notifications, termination, Talmundo, and staffing emails |
| `src/lib/validation` | Zod schemas for auth, users, employees, columns, important dates, and staffing needs |
| `src/lib/filters` | Advanced filtering engine and URL serializer |
| `supabase/migrations` | PostgreSQL schema, RLS, functions, seed data, role migrations, and feature migrations |
| `tests` | Unit, integration, E2E, accessibility, and performance coverage |
| `.github/workflows` | CI test check and Supabase nightly backup/staging refresh |

### Database Model

Important tables and structures include:

- `users` - application users, roles, active status, last active timestamp
- `employees` - core masterdata plus dynamic typed custom columns
- `column_config` - column metadata, ordering, visibility, categories, category colors, checklist flags, and role permissions
- `important_dates` - Stena/ÖMC/PE3/other date records, capacity, deadlines, and assigned employees
- `employee_column_changes` - column-level audit/change detection for masterdata changes
- `user_filters` - per-user saved advanced filters
- `staffing_needs` and `staffing_needs_changelog` - location headcount targets and audit history
- `pe3_notifications_log` - idempotency tracking for PE3 deadline emails

## Quality and Test Coverage

The repository contains broad coverage across unit, integration, E2E, and performance tests:

- 190 unit test files
- 91 integration test files
- 46 E2E files
- 10 performance benchmark files
- CI runs type-checking, linting, unit tests, and integration tests on `main` and `staging`

Useful commands:

```bash
pnpm type-check
pnpm lint
pnpm test
pnpm test:integration
pnpm test:e2e
```

E2E tests start a local Next.js dev server on port `3100` by default and require suitable Supabase test credentials or an isolated staging database.

## Recent Major Upgrades

Since the original README, the project has added or substantially improved:

- typed real-table custom columns replacing the older JSONB custom-data design
- advanced filtering, saved filters, filtered exports, and filter URL synchronization
- field-selection exports, selected-employee exports, role-preview-aware exports, and crew-ready export flow
- Admin Limited role and shared internal HR column visibility
- checklist progress indicators, checklist-aware default sorting, and tightened checklist edit restrictions
- staffing needs tracker for Göteborg/Trelleborg with history and email notifications
- sticky table columns, sticky horizontal scrollbar, persisted column widths, and table density controls
- mobile card performance, pull-to-refresh, search history, swipe/long-press actions, and virtual scrolling
- Supabase nightly backup and staging-refresh pipeline
- hardened notification idempotency for cron-triggered emails
- larger CI and test suite coverage across API routes, constraints, responsive UI, exports, notifications, and critical workflows

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 10+
- Git
- Supabase project credentials

### Install

```bash
git clone <repo-url>
cd hr-masterdata
pnpm install
```

### Configure Environment

Copy `.env.example` to `.env.local` and provide at least:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional production/staging features use:

```bash
CRON_SECRET=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
SMTP_SECURE=false
NEXT_PUBLIC_IS_STAGING=true
DISABLE_EMAIL_DELIVERY=true
```

Apply the SQL migrations in `supabase/migrations` with the Supabase CLI or your configured database migration process.

### Run Locally

```bash
pnpm dev
```

Then open `http://localhost:3000`.

## Documentation

Additional docs live in `docs/`, including product requirements, architecture, backup/staging runbooks, custom column guidance, testing setup, and story-level implementation notes. The README is intentionally the high-level GitHub-facing overview; the detailed BMAD artifacts remain in `docs/` and `docs/sprint-artifacts/`.

## License

This project is a private showcase portfolio piece by Enhancior AB and is not available for public use, copying, or distribution. All rights reserved.
