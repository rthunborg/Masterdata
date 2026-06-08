# HR Masterdata Management System

A modern, real-time HR masterdata management platform built with **Next.js 16**, **React 19**, and **Supabase**. This system enables HR administrators to manage employee information with granular role-based access control and custom column configurations for external parties.

> **Note:** This application is **Swedish-only**. All user-facing text is in Swedish.

## License & Status

**Project Status:** Completed MVP Showcase  
**License:** This project is a **Showcase Portfolio Piece** and is NOT available for public use or distribution. All rights reserved.

---

## Problem Statement

The HR team was managing employee masterdata through a fragile Excel spreadsheet distributed weekly to six external parties (Sodexo, ÖMC, Payroll, Toplux, etc.). Each party needed to view specific employee data and maintain their own custom columns.

**Key Challenges:**

- **Manual Distribution Overhead**: Hours spent weekly emailing files and merging changes.
- **Data Synchronization Issues**: External parties worked on outdated data.
- **Security Risks**: Sensitive employee data sent via email.
- **Fragile Tooling**: Reliance on complex, error-prone VB scripts.
- **No Mobile Access**: Impossible to use on the go.

## Solution

We replaced the Excel workflow with a secure, real-time web application:

- **Centralized Data Repository**: Single source of truth.
- **Real-time Synchronization**: Changes propagate to all 10+ concurrent users in <2 seconds.
- **Role-Based Access**: 5 distinct roles (HR Admin, Sodexo, ÖMC, Payroll, Toplux) with granular column-level permissions.
- **Zero Operational Costs**: Architected to run entirely on free-tier infrastructure (Vercel + Supabase).

---

## Key Features

### 1. Foundation & Security

- **Role-Based Access Control (RBAC)**: Five user roles with strict data isolation.
- **Secure Authentication**: Session management with automatic timeouts and secure HTTP-only cookies.
- **Health Monitoring**: Automated system health checks and smoke testing.

### 2. HR Masterdata Management

- **Employee Lifecycle**: Create, edit, terminate, and archive employees.
- **Inline Editing**: Excel-like table experience with instant saving.
- **Advanced Filtering**: Filter by status, crew readiness, or custom attributes.
- **Bulk Operations**: CSV Import/Export with data validation.

### 3. External Party Access

- **Custom Column Management**: External parties can create/edit their own data columns (stored as JSONB) without affecting core masterdata.
- **Dynamic Permissions**: HR Admins configure exactly which columns each role can view/edit via a matrix interface.
- **Role Preview Mode**: "View As" feature allows HR to verify exactly what external parties see.

### 4. Real-Time Collaboration

- **Instant Sync**: WebSocket-based updates ensure all users see the latest data immediately.
- **Change Notifications**: Visual indicators highlighted in yellow when data changes while viewing.
- **Optimistic UI**: Immediate feedback for better user experience.

### 5. Mobile Experience

- **Responsive Design**: Fully optimized for mobile devices.
- **Card View**: Touch-friendly card interface for mobile users.
- **PWA Capabilities**: Offline support and installable home screen icon.
- **Mobile-Specific Gestures**: Swipe actions and pull-to-refresh.

### 6. Automated Workflows

- **Email Notifications**: Automated reminders for missing data and upcoming deadlines (e.g., 3 days post-training).
- **Audit Logging**: Comprehensive tracking of all changes to masterdata fields.
- **Room Assignment**: Automated hotel room allocation algorithms based on gender and rank.

---

## User Roles & Permissions

The system implements a strict **Role-Based Access Control (RBAC)** model. Users are assigned one of five roles, determining both their feature access and data visibility:

| Role           | Access Level             | Description                                                                                                                                                     |
| :------------- | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HR Admin**   | **Full System Access**   | Can manage all employees, dates, users, and system configurations. Has exclusive access to the Admin Panel to configure column permissions and view audit logs. |
| **Recruiters** | **Limited Access**       | Can manage all employees and dates.                                                                                                                             |
| **Sodexo**     | **Partner (Restricted)** | Access to employee's data relevant for uniform and meal services.                                                                                               |
| **ÖMC**        | **Partner (Restricted)** | Access to employee's relevant occupational health data. Manages ÖMC-specific training dates and health checks.                                                  |
| **Payroll**    | **Partner (Restricted)** | Access to employees' salary-relevant data. Manages payroll-specific notes and custom fields.                                                                    |
| **Toplux**     | **Partner (Restricted)** | Access to employees requiring housing/cleaning services. Manages room cleaning schedules and housing requests.                                                  |
| **Crewing**    | **Partner (Restricted)** | Access to employees about to join a crew. Manages room cleaning schedules and housing requests.                                                                 |

> **Security Note:** Data isolation is enforced at the database level via RLS policies. Partners cannot access or modify each other's custom data.

---

## Architecture & Tech Stack

### Tech Stack

- **Frontend**: Next.js 16.0 (App Router), React 19.2, Tailwind CSS 4.1
- **Language**: TypeScript 5.9 (Strict Mode)
- **Database**: Supabase (PostgreSQL 15+)
- **State Management**: Zustand + TanStack Query
- **UI Components**: shadcn/ui (Radix Primitives) + Lucide Icons
- **Testing**: Vitest (Unit), Playwright (E2E)

### Architecture Decision Records (ADR)

We have documented key architectural decisions that shaped this project:

| ADR         | Decision                        | Rationale                                                                                                                                                                                                       |
| ----------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ADR-001** | **Platform: Vercel + Supabase** | Selected for "Zero Cost" MVP requirement. Provides serverless scalability and robust free tiers.                                                                                                                |
| **ADR-002** | **Serverless Monolith**         | Next.js App Router provides unified frontend/backend developer experience and simple deployment without separate API servers.                                                                                   |
| **ADR-003** | **Hybrid Data Schema (JSONB)**  | Core masterdata uses strict relational schema, while external party custom columns use JSONB. This allows parties to manage their own data structure without database migrations.                               |
| **ADR-004** | **Defense-in-Depth Security**   | Security is enforced at three levels: 1) Database RLS Policies (Primary), 2) API Middleware (Secondary), 3) Frontend Route Guards (UX).                                                                         |
| **ADR-005** | **Soft Delete Strategy**        | "Archival" system preserves historical data integrity. Records are flagged `is_archived` rather than deleted.                                                                                                   |
| **ADR-006** | **Headless UI Strategy**        | Used **TanStack Table** for the complex grid. It offers 100% control over rendering logic (crucial for inline editing and virtualization) compared to pre-built grids.                                          |
| **ADR-007** | **Repository Pattern**          | Data access is abstracted into a Repository layer. This decouples business logic from Supabase specifics, facilitating testing and future backend changes.                                                      |
| **ADR-008** | **Real-time via WebSockets**    | **Supabase Realtime** chosen over polling. Delivers sub-2-second latency required for collaborative editing.                                                                                                    |
| **ADR-009** | **Mobile-First PWA**            | Designed as a Progressive Web App to support HR staff on the move. Includes offline caching and touch-optimized interfaces.                                                                                     |
| **ADR-010** | **Idempotent Notifications**    | Notification system uses daily cron jobs with state tracking to ensure users never receive duplicate alerts for the same event.                                                                                 |
| **ADR-011** | **Granular RBAC Strategy**      | Implemented a static 5-role system (`hr_admin`, `sodexo`, etc.) for type safety, combined with dynamic database-driven column permissions. This balances code stability with runtime configuration flexibility. |

---

## Database Schema

The application uses PostgreSQL with a hybrid schema:

- **`users`**: RBAC and profile data.
- **`employees`**: Core masterdata (Relational).
- **`column_config`**: Meta-definition of all columns and their permissions.
- **other tables**: Other tables containing tracking of updated fields, important dates, notifications, etc

## Setup & Development

### Prerequisites

- Node.js 20+
- pnpm 10+
- Git
- Docker Desktop with WSL2 for local Supabase and SMTP capture

### Installation

1. **Clone & Install**

   ```bash
   git clone <repo-url>
   cd hr-masterdata
   pnpm install
   ```

2. **Environment Setup**
   Copy `.env.example` to `.env.local` and add your Supabase credentials.

   For local Docker/Supabase defaults, see [`docs/local-docker.md`](docs/local-docker.md). The local Supabase CLI stack uses high ports (`15421` API, `15422` Postgres) to avoid collisions with other repos and agents.

3. **Run Development Server**

   ```bash
   pnpm dev
   ```

4. **Run Tests**
   ```bash
   pnpm test          # Unit tests
   pnpm test:e2e      # E2E tests
   ```

### Local Docker Quick Reference

```bash
pnpm supabase:start   # Local Supabase Auth/REST/Realtime/Postgres
pnpm docker:up        # Mailpit for app SMTP at 127.0.0.1:11025, UI at 127.0.0.1:18025
pnpm supabase:reset   # Recreate local DB schema/data from migrations
pnpm docker:down      # Stop Compose services
pnpm supabase:stop    # Stop this repo's Supabase stack
```

---

## Contact

**Technical Lead:** Enhancior AB
**Project Owner:** HR Department
