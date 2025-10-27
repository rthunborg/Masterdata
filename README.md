# HR Masterdata Management System

A modern, real-time HR masterdata management platform built with Next.js, TypeScript, and Supabase. This system enables HR administrators to manage employee information with role-based access control and custom column configurations for external parties.

## Features

- **Real-time Employee Data Management** - Create, read, update, and archive employee records with instant updates
- **Role-Based Access Control** - Middleware and API-level protection with five distinct user roles
- **Protected Routes** - Admin panel accessible only to HR administrators with automatic role validation
- **Custom Column Configuration** - External parties can define custom fields for employee tracking
- **Important Dates Calendar** - Track birthdays, anniversaries, and custom milestones
- **CSV Import/Export** - Bulk data operations for efficient data management
- **Responsive Design** - Mobile-friendly interface built with Tailwind CSS and shadcn/ui

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

- **Next.js 16.0** - React meta-framework with App Router
- **TypeScript 5.9** - Type-safe development with strict mode
- **React 19.2** - UI component library
- **Tailwind CSS 4.1** - Utility-first styling framework
- **shadcn/ui** - Accessible component library (to be added in later stories)

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - PostgreSQL database with real-time subscriptions and authentication
- **Row-Level Security (RLS)** - Database-level access control

### Development Tools

- **pnpm 10.19** - Fast, disk-efficient package manager
- **ESLint 9.38** - Code linting with Next.js configuration
- **Prettier 3.6** - Code formatting
- **Vitest 4.0** - Fast unit testing framework
- **React Testing Library 16.3** - Component testing utilities

### Deployment

- **Vercel** - Frontend and API hosting (to be configured in Task 8)
- **GitHub Actions** - CI/CD pipeline (optional)

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

**Production URL:** (To be added after deployment)

### Deploy to Vercel

1. Install Vercel CLI: `pnpm add -g vercel`
2. Link project: `vercel link`
3. Deploy: `vercel --prod`

Or connect your GitHub repository to Vercel for automatic deployments on push to `main`.

## Contributing

This is a private project. For development guidelines, see:

- [Coding Standards](docs/architecture/coding-standards.md)
- [Development Workflow](docs/architecture/development-workflow.md)
- [Tech Stack](docs/architecture/tech-stack.md)

## License

Proprietary - All rights reserved
