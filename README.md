# HR Masterdata Management System

A modern, real-time HR masterdata management platform built with Next.js, TypeScript, and Supabase. This system enables HR administrators to manage employee information with role-based access control and custom column configurations for external parties.

## Features

- **Real-time Employee Data Management** - Create, read, update, and archive employee records with instant updates
- **Role-Based Access Control** - HR Admin, External Party, and Read-Only roles with granular permissions
- **Custom Column Configuration** - External parties can define custom fields for employee tracking
- **Important Dates Calendar** - Track birthdays, anniversaries, and custom milestones
- **CSV Import/Export** - Bulk data operations for efficient data management
- **Responsive Design** - Mobile-friendly interface built with Tailwind CSS and shadcn/ui

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
