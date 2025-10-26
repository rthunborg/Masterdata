# Unified Project Structure

```
hr-masterdata/
 .github/                      # CI/CD workflows
    workflows/
        ci.yml                # Run tests on PR
        deploy.yml            # Deploy to Vercel (automatic via Vercel integration)

 src/                          # Application source code
    app/                      # Next.js App Router
       (auth)/
          login/
              page.tsx
       (dashboard)/
          layout.tsx
          page.tsx
          important-dates/
             page.tsx
          admin/
              users/
                 page.tsx
              columns/
                  page.tsx
       api/                  # API routes (serverless functions)
          auth/
          employees/
          columns/
          important-dates/
          admin/
          health/
       layout.tsx
       globals.css
       not-found.tsx
   
    components/               # React components
       ui/                   # shadcn/ui base components
       dashboard/            # Dashboard-specific components
       admin/                # Admin panel components
       layout/               # Layout components
   
    lib/                      # Shared libraries
       types/                # TypeScript type definitions
       services/             # Frontend API services
       server/               # Server-only code
          services/         # Business logic services
          repositories/     # Database repositories
       hooks/                # Custom React hooks
       stores/               # Zustand state stores
       utils/                # Utility functions
       supabase/             # Supabase clients
       validation/           # Zod schemas
   
    middleware.ts             # Next.js middleware for auth

 public/                       # Static assets
    favicon.ico
    images/

 supabase/                     # Supabase configuration
    migrations/               # Database migrations (versioned)
       20250101000000_initial_schema.sql
       20250102000000_add_rls_policies.sql
       20250103000000_seed_column_config.sql
    seed.sql                  # Development seed data
    config.toml               # Supabase project config

 tests/                        # Test files
    unit/
       services/
       utils/
    integration/
       api/
    e2e/
        user-flows/

 scripts/                      # Utility scripts
    setup-local-db.sh         # Initialize local Supabase
    migrate-prod.sh           # Run migrations in production

 docs/                         # Documentation
    prd.md                    # Product requirements
    front-end-spec.md         # UX specification
    architecture.md           # This document

 .env.local.example            # Example environment variables
 .env.local                    # Local development env vars (gitignored)
 .gitignore
 .eslintrc.json                # ESLint configuration
 .prettierrc                   # Prettier configuration
 next.config.js                # Next.js configuration
 tailwind.config.ts            # Tailwind CSS configuration
 tsconfig.json                 # TypeScript configuration
 package.json                  # Dependencies and scripts
 pnpm-lock.yaml                # Lock file
 vitest.config.ts              # Vitest test configuration
 README.md                     # Project overview and setup
```

---
