# HR Masterdata Management System

A modern, real-time HR masterdata management platform built with Next.js, TypeScript, and Supabase. This system enables HR administrators to manage employee information with role-based access control and custom column configurations for external parties.

## Problem Statement

The HR team was managing employee masterdata through an Excel spreadsheet distributed weekly to six external parties (Sodexo, ÖMC, Payroll, Toplux, and others). Each party needed to view specific employee data and maintain their own custom columns. This workflow created significant challenges:

- **Manual Distribution Overhead**: HR spent hours each week manually emailing Excel files and consolidating changes
- **Data Synchronization Issues**: External parties worked on outdated data, causing conflicts when merging updates
- **VB Script Maintenance**: Complex macros broke frequently, requiring constant IT intervention
- **No Real-time Updates**: Changes by HR took days to reach external parties
- **Security Concerns**: Sensitive employee data distributed via email attachments
- **No Access Control**: External parties could see all columns, not just their relevant data

## Solution

This web-based application replaces the Excel workflow with a secure, real-time HR masterdata management system:

- **Centralized Data Repository**: Single source of truth maintained by HR administrators
- **Real-time Synchronization**: Changes propagate to all users within 2 seconds via WebSocket subscriptions
- **Role-Based Access**: External parties see only columns relevant to their role
- **Custom Column Management**: Each party manages their own columns without affecting others
- **Zero Operational Costs**: Runs entirely on free-tier infrastructure (Supabase + Vercel)
- **User-Friendly Interface**: Intuitive spreadsheet-like table with inline editing

## Features

### Core Functionality

- **Real-time Employee Data Management** - Create, read, update, and archive employee records with instant updates across all users
- **Role-Based Access Control** - Middleware and API-level protection with five distinct user roles (HR Admin, Sodexo, ÖMC, Payroll, Toplux)
- **Protected Routes** - Admin panel accessible only to HR administrators with automatic role validation
- **Custom Column Configuration** - External parties can create, edit, and manage their own custom columns without affecting masterdata
- **Important Dates Calendar** - Track employee birthdays, work anniversaries, and custom milestones
- **CSV Import/Export** - Bulk employee data operations for efficient migration and reporting
- **Responsive Design** - Mobile-friendly interface built with Tailwind CSS and shadcn/ui components

### Admin Features (HR Admin Only)

- **User Account Management** - Create and manage user accounts for all external parties
- **Column Permission Configuration** - Configure which columns each role can view and edit via permission matrix
- **Role Preview Mode** - "View As" feature allows HR to see exactly what each external party sees
- **Custom Column Deletion** - Remove custom columns created by external parties when no longer needed
- **Employee Archival** - Soft-delete employees while preserving historical data

### External Party Features

- **Read-Only Masterdata Access** - View core employee data (name, email, hire date, etc.) without ability to modify
- **Custom Column CRUD** - Create, edit, and delete custom columns specific to their role
- **Real-time Data Sync** - See HR changes immediately without manual refresh
- **Search and Filter** - Find employees quickly using search and column filters
- **Category Organization** - Organize custom columns into logical categories

## Screenshots

### Dashboard - Employee Table View

![Dashboard](docs/screenshots/dashboard-employee-table.png)
_Main employee table with inline editing, search, and filters (HR Admin view)_

### Admin Panel - User Management

![User Management](docs/screenshots/admin-user-management.png)
_Create and manage user accounts with role assignment_

### Admin Panel - Column Permissions

![Column Permissions](docs/screenshots/admin-column-permissions.png)
_Configure which columns each role can view and edit_

### Role Preview Mode

![Role Preview](docs/screenshots/role-preview-mode.png)
_HR Admin viewing the system as an external party would see it_

_Note: Screenshots to be added during UAT phase_

## Role-Based Access Control

The application implements comprehensive role-based access control at both the route and API levels.

### User Roles

| Role         | Description            | Access Level                                                                   |
| ------------ | ---------------------- | ------------------------------------------------------------------------------ |
| **hr_admin** | HR Administrator       | Full system access - can manage users, employees, and all configurations       |
| **sodexo**   | Sodexo External Party  | Limited access - can view employees and manage Sodexo-specific custom columns  |
| **omc**      | OMC External Party     | Limited access - can view employees and manage OMC-specific custom columns     |
| **payroll**  | Payroll External Party | Limited access - can view employees and manage payroll-specific custom columns |
| **toplux**   | Toplux External Party  | Limited access - can view employees and manage Toplux-specific custom columns  |

### Route Protection

| Route          | Access                                              | Redirect on Unauthorized                           |
| -------------- | --------------------------------------------------- | -------------------------------------------------- |
| `/`            | Public                                              | -                                                  |
| `/login`       | Public (redirects to `/dashboard` if authenticated) | -                                                  |
| `/dashboard/*` | All authenticated users                             | `/login`                                           |
| `/admin/*`     | HR Admin only                                       | `/403` for wrong role, `/login` if unauthenticated |
| `/403`         | Public (error page)                                 | -                                                  |

### API Endpoint Protection

| Endpoint           | Method    | Required Role          | Error Response                            |
| ------------------ | --------- | ---------------------- | ----------------------------------------- |
| `/api/profile`     | GET       | Any authenticated user | 401 if unauthenticated                    |
| `/api/admin/users` | GET, POST | HR Admin only          | 401 if unauthenticated, 403 if wrong role |
| `/api/auth/login`  | POST      | Public                 | -                                         |
| `/api/auth/logout` | POST      | Any authenticated user | -                                         |

### Authentication Flow

1. **Login**: Users authenticate with email/password via Supabase Auth
2. **Session Management**: 8-hour session timeout with automatic refresh
3. **Role Validation**: User role fetched from `users` table and validated on each request
4. **Middleware Protection**: Next.js proxy function validates routes before page render
5. **API Protection**: Server-side helpers validate authentication and roles for API endpoints

### Error Handling

- **401 Unauthorized**: Authentication required (redirects to `/login`)
- **403 Forbidden**: Insufficient role permissions (displays `/403` page)
- **User-friendly Error Messages**: Clear explanations and next steps for access violations

## Technology Stack

### Frontend

- **Next.js 16.0** - React meta-framework with App Router for unified frontend/backend development
- **TypeScript 5.9** - Type-safe development with strict mode enabled for compile-time error detection
- **React 19.2** - Modern UI component library with hooks and concurrent rendering
- **Tailwind CSS 4.1** - Utility-first styling framework for rapid, consistent UI development
- **shadcn/ui** - Accessible component library built on Radix UI primitives (WCAG AA compliant)
- **TanStack Table** - High-performance headless table library with virtual scrolling for 1,000+ row datasets

**Rationale:** Next.js provides excellent developer experience with file-based routing, built-in API routes, and seamless Vercel deployment. TypeScript catches errors early and enables confident refactoring. Tailwind accelerates UI development while maintaining design consistency.

### Backend

- **Next.js API Routes** - Serverless API endpoints co-located with frontend code
- **Supabase PostgreSQL 15+** - Managed PostgreSQL database with real-time subscriptions
- **Supabase Auth** - Email/password authentication with 8-hour session timeout
- **Supabase Realtime** - WebSocket-based real-time data synchronization (<2s latency)
- **Row-Level Security (RLS)** - Database-level access control as primary security enforcement

**Rationale:** Supabase provides a complete backend-as-a-service on free tier (sufficient for 10 users, 1,000 employees). PostgreSQL offers ACID compliance, JSONB support for custom columns, and powerful full-text search. Real-time subscriptions eliminate polling overhead.

### Development Tools

- **pnpm 10.19** - Fast, disk-efficient package manager with strict dependency resolution
- **ESLint 9.38** - Code linting with Next.js and TypeScript configurations
- **Prettier 3.6** - Automatic code formatting for consistent style
- **Vitest 4.0** - Fast unit testing framework with Jest-compatible API
- **React Testing Library 16.3** - Component testing utilities following best practices

**Rationale:** Vitest is 10x faster than Jest for large test suites. pnpm reduces disk usage by 3x compared to npm. ESLint + Prettier enforce code quality automatically.

### Deployment & Hosting

- **Vercel** - Frontend and API hosting with automatic deployments from Git
- **Supabase Cloud** - Managed PostgreSQL database with global CDN
- **GitHub** - Source control and CI/CD trigger

**Rationale:** Both platforms offer generous free tiers, seamless integration, and automatic SSL certificates. Vercel provides instant preview deployments for pull requests.

### Cost Structure

**Monthly Operational Costs: $0**

- Vercel Free Tier: 100 GB bandwidth, unlimited requests
- Supabase Free Tier: 500 MB database, 2 GB file storage, 50,000 monthly active users
- GitHub Free Tier: Unlimited public/private repositories

**Scalability:** Current free tiers support up to 50 concurrent users and 10,000 employee records before requiring paid plans.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.17+ or 20+ ([Download](https://nodejs.org/))
- **pnpm** 8.14+ (installed globally: `npm install -g pnpm`)
- **Git** 2.0+ ([Download](https://git-scm.com/))

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hr-masterdata
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Supabase Project

#### Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in (or create an account)
2. Click "New Project"
3. Fill in project details:
   - Name: `hr-masterdata` (or your preferred name)
   - Database Password: Generate a strong password (save this securely)
   - Region: Select region closest to your users
4. Wait for database provisioning to complete (~2 minutes)

#### Get Supabase Credentials

1. Navigate to **Project Settings** > **API**
2. Copy the following values:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → Use for `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

#### Enable Email Authentication

1. Navigate to **Authentication** > **Providers**
2. Ensure **Email** provider is enabled
3. For development: Disable email confirmation (can enable for production)

#### Run Database Migrations

1. Navigate to **SQL Editor** in Supabase Dashboard
2. Execute migrations in order (copy/paste content from `supabase/migrations/` directory):
   - `20250126000000_initial_schema.sql` - Core tables
   - `20250126000001_external_party_tables.sql` - Party data tables
   - `20250126000002_rls_policies.sql` - Security policies
   - `20250126000003_seed_column_config.sql` - Initial column configurations
3. Verify execution using **Table Editor** to confirm all tables exist

### 4. Configure Environment Variables

Copy the environment template and populate with your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials from Step 3:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Commands

| Command           | Description                                    |
| ----------------- | ---------------------------------------------- |
| `pnpm dev`        | Start development server with hot reload       |
| `pnpm build`      | Build production bundle                        |
| `pnpm start`      | Run production server locally                  |
| `pnpm lint`       | Run ESLint to check code quality               |
| `pnpm type-check` | Run TypeScript compiler without emitting files |
| `pnpm test`       | Run unit tests with Vitest                     |
| `pnpm test:watch` | Run tests in watch mode                        |
| `pnpm format`     | Format code with Prettier                      |

## Project Structure

```
hr-masterdata/
├── src/
│   ├── app/                 # Next.js App Router (routes and pages)
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── api/             # API routes
│   ├── components/          # React components (to be added)
│   │   └── ui/              # shadcn/ui components
│   ├── lib/                 # Shared libraries
│   │   ├── supabase/        # Supabase client configuration
│   │   ├── types/           # TypeScript type definitions
│   │   ├── services/        # Frontend API services (to be added)
│   │   ├── server/          # Server-only code (to be added)
│   │   └── utils/           # Utility functions (to be added)
│   └── styles/
│       └── globals.css      # Global styles and Tailwind imports
├── supabase/
│   ├── migrations/          # Database migration files
│   ├── seed.sql             # Development seed data
│   └── config.toml          # Supabase configuration
├── public/                  # Static assets
├── tests/                   # Test files (to be added)
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
├── .env.example             # Environment variable template
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
├── vitest.config.ts         # Vitest test configuration
└── package.json             # Dependencies and scripts
```

## Database Schema

The application uses PostgreSQL (via Supabase) with the following core tables:

- **users** - Application users with role-based access control
- **employees** - Employee masterdata (HR-managed)
- **column_config** - Dynamic column definitions and permissions
- **important_dates** - Shared operational calendar
- **sodexo_data**, **omc_data**, **payroll_data**, **toplux_data** - External party custom data (JSONB)

For detailed schema documentation, see [docs/architecture/database-schema.md](docs/architecture/database-schema.md).

### Migration Workflow

**Development (Manual Migrations via Supabase Dashboard):**

1. Create migration file in `supabase/migrations/` with format: `YYYYMMDDHHMMSS_description.sql`
2. Copy SQL content to Supabase Dashboard > SQL Editor
3. Execute migration
4. Commit migration file to Git

**Production:**
Migrations are currently run manually. Future stories may implement Supabase CLI for automated migrations.

## API Authentication

All API endpoints require proper authentication and role validation.

### Authentication Headers

The application uses Supabase Auth for session management. When making API requests:

1. **Browser Requests**: Cookies are automatically included for authenticated users
2. **External API Calls**: Include the Authorization header with a valid JWT token

```bash
Authorization: Bearer <jwt-token>
```

### Testing API Endpoints with curl

#### Profile Endpoint (Any Authenticated User)

```bash
# Success (authenticated user)
curl -X GET http://localhost:3000/api/profile \
  -H "Cookie: sb-access-token=<valid-jwt-token>"

# Error Response (unauthenticated)
# HTTP 401: {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
```

#### Admin Endpoints (HR Admin Only)

```bash
# Success (HR Admin)
curl -X GET http://localhost:3000/api/admin/users \
  -H "Cookie: sb-access-token=<hr-admin-jwt-token>"

# Error Response (external party user)
# HTTP 403: {"error":{"code":"FORBIDDEN","message":"Insufficient permissions"}}

# Error Response (unauthenticated)
# HTTP 401: {"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
```

### API Response Format

All API endpoints follow a consistent response format:

#### Success Response

```json
{
  "data": {
    // Response data
  }
}
```

#### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

| Code               | Status | Description                                         |
| ------------------ | ------ | --------------------------------------------------- |
| `UNAUTHORIZED`     | 401    | Authentication required                             |
| `FORBIDDEN`        | 403    | Insufficient permissions for the requested resource |
| `VALIDATION_ERROR` | 400    | Invalid input data                                  |
| `INTERNAL_ERROR`   | 500    | Unexpected server error                             |

## Developer Guide: Adding Protected Routes

### Adding New Admin Routes

1. Create route file under `/src/app/admin/`
2. Routes are automatically protected by the admin layout
3. Only HR Admin users can access these routes

```typescript
// src/app/admin/new-feature/page.tsx
export default function NewAdminFeature() {
  // This route is automatically protected
  return <div>Admin-only content</div>;
}
```

### Adding New API Endpoints

1. Use the provided auth helpers for role validation:

```typescript
// src/app/api/admin/new-endpoint/route.ts
import { requireHRAdminAPI, createErrorResponse } from '@/lib/server/auth';

export async function GET() {
  try {
    // Require HR Admin role
    const user = await requireHRAdminAPI();

    // Your endpoint logic here
    return NextResponse.json({ data: { message: 'Success' } });
  } catch (error) {
    return createErrorResponse(error);
  }
}
```

2. For endpoints requiring any authenticated user:

```typescript
import { requireAuthAPI, createErrorResponse } from '@/lib/server/auth';

export async function GET() {
  try {
    const user = await requireAuthAPI();
    // Endpoint logic
  } catch (error) {
    return createErrorResponse(error);
  }
}
```

3. For endpoints requiring specific roles:

```typescript
import { requireRoleAPI, createErrorResponse } from '@/lib/server/auth';
import { UserRole } from '@/lib/types/user';

export async function GET() {
  try {
    const user = await requireRoleAPI([UserRole.HR_ADMIN, UserRole.SODEXO]);
    // Endpoint logic
  } catch (error) {
    return createErrorResponse(error);
  }
}
```

## Deployment

This project is configured for deployment on Vercel.

**Production URL:** (To be configured)  
**System Health:** [Health Check](https://your-app.vercel.app/api/health) (To be configured)  
**Deployment Status:** [![Deployment Status](https://img.shields.io/badge/status-pending-yellow)](https://vercel.com)

### Deploy to Vercel

#### Prerequisites

- GitHub repository connected to Vercel
- Supabase project created and configured

#### Deployment Steps

1. **Connect Repository to Vercel**
   - Visit [https://vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Select the `hr-masterdata` directory as the root

2. **Configure Environment Variables**
   - In Vercel Project Settings > Environment Variables, add:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```
   - Add for all environments (Production, Preview, Development)

3. **Configure Build Settings**
   - Framework Preset: **Next.js** (auto-detected)
   - Build Command: `pnpm build` (auto-configured)
   - Output Directory: `.next` (default)
   - Install Command: `pnpm install --frozen-lockfile`

4. **Deploy**
   - Click **Deploy**
   - Wait for build to complete (~2-3 minutes)
   - Access your production URL

5. **Enable Automatic Deployments**
   - Push to `main` branch triggers production deployment
   - Pull requests trigger preview deployments

#### Verify Deployment

After deployment completes, verify the following:

1. **Landing Page**: Visit production URL - should display landing page
2. **Health Check**: Visit `/api/health` - should return JSON: `{"status":"ok","version":"0.1.0","timestamp":"..."}`
3. **Login Flow**: Navigate to `/login` - should display login page
4. **Authentication**: Login with test credentials - should redirect to dashboard
5. **Protected Routes**: Try accessing `/admin/*` without HR admin role - should show 403 page

#### Troubleshooting

- **Build Failures**: Check Vercel build logs for TypeScript or dependency errors
- **Runtime Errors**: Check Vercel Function Logs in dashboard
- **Authentication Issues**: Verify environment variables are set correctly
- **Database Connection**: Ensure Supabase project is running and accessible

### Local Production Build

Test production build locally before deploying:

```bash
pnpm build
pnpm start
```

Open [http://localhost:3000](http://localhost:3000) to test the production build.

## Contributing

This is a private project for internal HR use. For development guidelines, see:

- [Architecture Documentation](docs/architecture/index.md) - Comprehensive system architecture
- [Coding Standards](docs/architecture/coding-standards.md) - Development patterns and conventions
- [Development Workflow](docs/architecture/development-workflow.md) - Git workflow and deployment process
- [Tech Stack](docs/architecture/tech-stack.md) - Technology choices and rationale
- [User Guide](docs/USER_GUIDE.md) - End-user documentation for HR and external parties
- [API Documentation](docs/API_DOCUMENTATION.md) - API endpoint reference
- [Testing Strategy](docs/architecture/testing-strategy.md) - Testing approach and coverage goals

### Development Process

1. **Create Branch**: `git checkout -b feature/story-x.x-description`
2. **Implement Changes**: Follow coding standards and update tests
3. **Run Tests**: `pnpm test` (unit tests must pass)
4. **Lint Code**: `pnpm lint` (zero errors required)
5. **Type Check**: `pnpm type-check` (strict TypeScript mode)
6. **Create Pull Request**: Request review from QA agent
7. **Deploy**: Merge to `main` triggers automatic Vercel deployment

### Architecture Decision Records (ADRs)

Key architectural decisions documented in `docs/architecture/`:

- **ADR-001**: Chose Supabase over Firebase for PostgreSQL and RLS support
- **ADR-002**: Used Next.js API Routes instead of separate Express backend for simplicity
- **ADR-003**: JSONB for custom columns instead of dynamic table creation for security
- **ADR-004**: Middleware + API auth instead of RLS-only for defense-in-depth
- **ADR-005**: Soft delete (archival) instead of hard delete to preserve historical data

## License

Proprietary - All rights reserved. Internal use only for HR masterdata management.

## Contact

- **Project Owner**: HR Department
- **Technical Lead**: Development Team
- **Support**: Internal IT Support

## Acknowledgments

- Built with [Next.js](https://nextjs.org/) by Vercel
- Database powered by [Supabase](https://supabase.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide Icons](https://lucide.dev/)
