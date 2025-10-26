# Development Workflow

## Local Development Setup

### Prerequisites

```bash
# Required software
node --version    # Node.js 18.17+ or 20+
pnpm --version    # pnpm 8.14+
git --version     # Git 2.0+

# Install pnpm globally if not installed
npm install -g pnpm

# Install Supabase CLI
pnpm install -g supabase

# Verify Supabase CLI
supabase --version
```

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd hr-masterdata

# Install dependencies
pnpm install

# Copy environment variables template
cp .env.local.example .env.local

# Start local Supabase (requires Docker)
supabase start

# This will output:
# - API URL: http://localhost:54321
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio URL: http://localhost:54323
# - anon key: <anon-key>
# - service_role key: <service-role-key>

# Update .env.local with the output values

# Run database migrations
supabase db reset

# Start development server
pnpm dev

# Application will be available at http://localhost:3000
```

### Development Commands

```bash
# Start all services (Next.js dev server)
pnpm dev

# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Run tests
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm test:e2e          # E2E tests (post-MVP)

# Build for production
pnpm build

# Run production build locally
pnpm start

# Database commands
supabase db reset            # Reset local database
supabase db push             # Push migrations to local DB
supabase migration new <name> # Create new migration
supabase db diff            # Generate migration from schema changes

# Generate TypeScript types from database
supabase gen types typescript --local > src/lib/types/database.ts
```

## Environment Configuration

### Required Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Backend (same .env.local file)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Production (Vercel environment variables)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Base URL for app
NODE_ENV=development                        # Environment
```

---
