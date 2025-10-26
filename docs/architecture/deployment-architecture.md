# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:**
- **Platform:** Vercel
- **Build Command:** pnpm build
- **Output Directory:** .next
- **CDN/Edge:** Vercel Edge Network (automatic)
- **Deployment Trigger:** Push to main branch (automatic via Vercel GitHub integration)

**Backend Deployment:**
- **Platform:** Vercel (serverless functions from /app/api/* routes)
- **Build Command:** Same as frontend (unified build)
- **Deployment Method:** Automatic with frontend

**Database Deployment:**
- **Platform:** Supabase hosted PostgreSQL
- **Migration Method:** Manual via Supabase CLI or Supabase Studio
- **Backup Strategy:** Supabase automatic daily backups (free tier)

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm build
```

## Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|--------------|-------------|---------|
| **Development** | http://localhost:3000 | http://localhost:3000/api | Local development |
| **Staging** | https://hr-masterdata-staging.vercel.app | https://hr-masterdata-staging.vercel.app/api | Pre-production testing (optional) |
| **Production** | https://hr-masterdata.vercel.app | https://hr-masterdata.vercel.app/api | Live environment |

**Deployment Process:**

1. Developer pushes code to GitHub
2. GitHub triggers Vercel build automatically
3. Vercel builds Next.js application
4. Vercel deploys to edge network
5. API routes deployed as serverless functions
6. Preview URL generated for PRs
7. Merge to main deploys to production

**Database Migration Process:**

```bash
# Local development
supabase migration new add_audit_log_table
# Edit the generated migration file
supabase db reset  # Test locally

# Production deployment
supabase link --project-ref <production-project-ref>
supabase db push  # Push migrations to production
```

---
