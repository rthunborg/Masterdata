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

The project uses GitHub Actions to automatically run tests and checks on every pull request and push to main. This ensures that no failing tests are deployed to production.

**Workflow File:** `.github/workflows/test-check.yml`

**What it does:**
- Runs on every pull request targeting `main`
- Runs on every push to `main`
- Executes type checking (`pnpm type-check`)
- Runs linting (`pnpm lint`)
- Runs unit tests (`pnpm test:silent`)
- Runs integration tests (if GitHub secrets are configured)
- **Blocks PR merge and deployment if any check fails**

**Required GitHub Secrets (for integration tests):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_APP_URL` (optional) - Defaults to `http://localhost:3000`
- `TEST_HR_ADMIN_EMAIL` (optional) - Defaults to `admin@test.com`
- `TEST_HR_ADMIN_PASSWORD` (optional) - Defaults to `Test123!`

See `docs/CI_CD_SETUP.md` for detailed setup instructions.

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
