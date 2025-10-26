# Project Source Tree

This document defines the complete file and directory structure for the HR Masterdata Management System.

## Complete Directory Structure

```
hr-masterdata/
 .github/
    workflows/
        ci.yml                          # GitHub Actions CI/CD pipeline
 .vscode/
    settings.json                       # VS Code workspace settings
 public/                                 # Static assets
    favicon.ico
    images/
 src/
    app/                                # Next.js App Router
       (auth)/                         # Auth layout group
          login/
              page.tsx                # Login page
       dashboard/                      # Main dashboard (protected)
          page.tsx                    # Employee table view
          important-dates/
              page.tsx                # Important dates calendar
       admin/                          # Admin routes (HR only)
          users/
             page.tsx                # User management
          columns/
              page.tsx                # Column configuration
       api/                            # API routes (serverless functions)
          health/
             route.ts                # GET /api/health
          auth/
             login/
                route.ts            # POST /api/auth/login
             logout/
                 route.ts            # POST /api/auth/logout
          employees/
             route.ts                # GET, POST /api/employees
             [id]/
                route.ts            # PATCH /api/employees/:id
                archive/
                   route.ts        # POST /api/employees/:id/archive
                unarchive/
                   route.ts        # POST /api/employees/:id/unarchive
                terminate/
                   route.ts        # POST /api/employees/:id/terminate
                custom-data/
                    route.ts        # GET, PATCH /api/employees/:id/custom-data
             import/
                 route.ts            # POST /api/employees/import
          columns/
             route.ts                # GET, POST /api/columns
             [id]/
                 route.ts            # PATCH, DELETE /api/columns/:id
          important-dates/
             route.ts                # GET, POST /api/important-dates
             [id]/
                 route.ts            # PATCH, DELETE /api/important-dates/:id
          admin/
              users/
                  route.ts            # GET, POST /api/admin/users
                  [id]/
                      route.ts        # PATCH /api/admin/users/:id
       layout.tsx                      # Root layout
       page.tsx                        # Landing/home page
       error.tsx                       # Global error boundary
    components/
       dashboard/
          employee-table.tsx          # Main data table component
          add-employee-modal.tsx      # Create employee form
          edit-employee-modal.tsx     # Edit employee form
          import-csv-modal.tsx        # CSV import dialog
          terminate-employee-modal.tsx # Termination form
          role-preview-banner.tsx     # View As role indicator
          table-filters.tsx           # Search and filter controls
       important-dates/
          dates-table.tsx             # Important dates table
          add-date-modal.tsx          # Add date form
       admin/
          user-management-table.tsx   # User list and actions
          add-user-modal.tsx          # Create user form
          column-config-table.tsx     # Column permission grid
          add-column-modal.tsx        # Create custom column form
       ui/                             # shadcn/ui components
          button.tsx
          dialog.tsx
          input.tsx
          table.tsx
          select.tsx
          checkbox.tsx
          toast.tsx
          ... (other shadcn components)
       layout/
          header.tsx                  # App header with nav
          sidebar.tsx                 # Navigation sidebar
          footer.tsx                  # App footer
       shared/
           loading-spinner.tsx         # Loading indicator
           error-message.tsx           # Error display
    lib/
       types/                          # Shared TypeScript types
          employee.ts                 # Employee interfaces
          user.ts                     # User and session types
          column-config.ts            # Column configuration types
          important-date.ts           # Important date types
          api.ts                      # API request/response types
          database.ts                 # Generated Supabase types
       services/                       # Frontend services
          api-client.ts               # Base API client with error handling
          employee-service.ts         # Employee CRUD operations
          column-service.ts           # Column configuration operations
          important-date-service.ts   # Important dates operations
          user-service.ts             # User management operations
       server/                         # Backend-only code
          services/
             employee-service.ts     # Employee business logic
             column-service.ts       # Column business logic
             auth-service.ts         # Authentication logic
          repositories/
             employee-repository.ts  # Employee data access
             user-repository.ts      # User data access
             column-config-repository.ts # Column config data access
             custom-data-repository.ts   # Custom columns data access
             important-date-repository.ts # Important dates data access
          auth.ts                     # Auth helpers and middleware
       validation/                     # Zod validation schemas
          employee-schema.ts          # Employee validation
          user-schema.ts              # User validation
          column-schema.ts            # Column validation
          important-date-schema.ts    # Date validation
       hooks/                          # Custom React hooks
          use-auth.ts                 # Authentication hook
          use-employees.ts            # Employee data hook
          use-columns.ts              # Column config hook
          use-realtime.ts             # Supabase realtime hook
       store/                          # Zustand state management
          auth-store.ts               # Auth global state
          ui-store.ts                 # UI state (modals, preview mode)
       supabase/                       # Supabase client setup
          client.ts                   # Client-side Supabase client
          server.ts                   # Server-side Supabase client
       config.ts                       # Environment configuration
       utils.ts                        # Utility functions
       constants.ts                    # App constants
       logger.ts                       # Server-side logger
    middleware.ts                       # Next.js middleware (auth, routing)
    styles/
        globals.css                     # Global styles and Tailwind imports
 supabase/
    migrations/
       20251026000001_initial_schema.sql     # Initial database schema
       20251026000002_rls_policies.sql       # Row-level security policies
       20251026000003_seed_columns.sql       # Seed column configurations
    seed.sql                            # Additional seed data
    config.toml                         # Supabase project configuration
 tests/
    unit/
       components/
          employee-table.test.tsx
          add-employee-modal.test.tsx
       services/
          employee-service.test.ts
          column-service.test.ts
       utils/
           utils.test.ts
    integration/
       api/
          employees.integration.test.ts
          columns.integration.test.ts
          auth.integration.test.ts
       repositories/
           employee-repository.integration.test.ts
    e2e/                                # End-to-end tests (post-MVP)
       hr-admin-crud.spec.ts
       external-party-view.spec.ts
       realtime-sync.spec.ts
    fixtures/
       employees.json                  # Test employee data
       users.json                      # Test user data
    setup.ts                            # Test environment setup
 docs/                                   # Documentation
    prd.md                              # Product Requirements Document
    architecture.md                     # Full architecture document
    architecture/                       # Sharded architecture files
       tech-stack.md
       coding-standards.md
       source-tree.md (this file)
    README.md                           # Project overview
 .env.local.example                      # Environment variables template
 .env.local                              # Local environment variables (gitignored)
 .gitignore
 .eslintrc.json                          # ESLint configuration
 .prettierrc                             # Prettier configuration
 next.config.js                          # Next.js configuration
 tailwind.config.ts                      # Tailwind CSS configuration
 tsconfig.json                           # TypeScript configuration
 vitest.config.ts                        # Vitest configuration
 package.json                            # Dependencies and scripts
 pnpm-lock.yaml                          # pnpm lockfile
 README.md                               # Project setup and overview
```

## Key Directory Purposes

### /src/app/
Next.js App Router directory containing all pages and API routes. Uses file-based routing.

### /src/components/
React components organized by feature area. UI components from shadcn/ui live in /ui/.

### /src/lib/types/
**Critical:** Single source of truth for TypeScript interfaces. Shared between frontend and backend.

### /src/lib/services/
Frontend service layer that abstracts API calls. Components never call fetch() directly.

### /src/lib/server/
Backend-only code including business logic services and data access repositories.

### /src/lib/validation/
Zod schemas for input validation, reused across frontend and backend.

### /supabase/migrations/
Database schema migrations version-controlled as SQL files. Applied via Supabase CLI.

### /tests/
Organized test suite following testing pyramid: 70% unit, 25% integration, 5% e2e.

## File Naming Patterns

| Pattern | Example | Usage |
|---------|---------|-------|
| \page.tsx\ | \pp/dashboard/page.tsx\ | Next.js page component |
| \oute.ts\ | \pp/api/employees/route.ts\ | Next.js API route |
| \layout.tsx\ | \pp/layout.tsx\ | Next.js layout component |
| \*.tsx\ | \employee-table.tsx\ | React component with JSX |
| \*.ts\ | \employee-service.ts\ | TypeScript module (no JSX) |
| \*.test.tsx\ | \employee-table.test.tsx\ | Component test |
| \*.test.ts\ | \employee-service.test.ts\ | Unit test |
| \*.integration.test.ts\ | \employees.integration.test.ts\ | Integration test |
| \*.spec.ts\ | \hr-admin-crud.spec.ts\ | E2E test (Playwright) |
| \use-*.ts\ | \use-auth.ts\ | Custom React hook |
| \*-schema.ts\ | \employee-schema.ts\ | Zod validation schema |
| \*-repository.ts\ | \employee-repository.ts\ | Data access repository |
| \*-service.ts\ | \employee-service.ts\ | Business logic service |
| \*-store.ts\ | \uth-store.ts\ | Zustand state store |

## Import Path Aliases

Configured in \	sconfig.json\:

\\\json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/lib/types/*"]
    }
  }
}
\\\

**Usage:**
\\\	ypescript
// Instead of relative imports
import { Employee } from '../../../lib/types/employee';

// Use aliases
import { Employee } from '@/types/employee';
import { employeeService } from '@/lib/services/employee-service';
import { Button } from '@/components/ui/button';
\\\

## Critical Files for Development

### Always-Loaded Files (per core-config.yaml)

These files should always be loaded by dev agents:

1. **\docs/architecture/coding-standards.md\** - Development standards and patterns
2. **\docs/architecture/tech-stack.md\** - Technology versions and rationale
3. **\docs/architecture/source-tree.md\** - This file (project structure)

### Configuration Files

- **\.env.local\** - Environment variables (never commit)
- **\.env.local.example\** - Template for environment setup
- **\
ext.config.js\** - Next.js build configuration
- **\	ailwind.config.ts\** - Tailwind CSS theme and plugins
- **\	sconfig.json\** - TypeScript compiler options
- **\package.json\** - Dependencies and npm scripts

### Entry Points

- **\src/app/layout.tsx\** - Root layout (renders on every page)
- **\src/app/page.tsx\** - Landing page (/)
- **\src/middleware.ts\** - Auth and routing middleware (runs before routes)

## Git Ignore Patterns

From \.gitignore\:

\\\
# Dependencies
node_modules/
.pnp/

# Next.js
.next/
out/

# Environment
.env.local
.env.*.local

# Testing
coverage/
.nyc_output/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Supabase
.supabase/
\\\

## Development Workflow File Changes

### Adding a New Feature

1. **Create types** in \src/lib/types/feature.ts\
2. **Create validation** in \src/lib/validation/feature-schema.ts\
3. **Create repository** in \src/lib/server/repositories/feature-repository.ts\
4. **Create service** in \src/lib/server/services/feature-service.ts\
5. **Create API route** in \src/app/api/feature/route.ts\
6. **Create frontend service** in \src/lib/services/feature-service.ts\
7. **Create components** in \src/components/feature/\
8. **Create tests** in \	ests/unit/\ and \	ests/integration/\

### Adding a New Page

1. Create \src/app/feature-name/page.tsx\
2. Update \src/components/layout/header.tsx\ with navigation link
3. Add route protection in \src/middleware.ts\ if needed
4. Create page-specific components in \src/components/feature-name/\

### Adding a Database Table

1. Create migration: \supabase migration new add_table_name\
2. Write DDL in \supabase/migrations/YYYYMMDDHHMMSS_add_table_name.sql\
3. Add RLS policies in same or separate migration
4. Generate TypeScript types: \supabase gen types typescript --local\
5. Create TypeScript interface in \src/lib/types/\
6. Create repository in \src/lib/server/repositories/\

---

**This source tree represents the complete file structure. Follow this organization for consistency.**
