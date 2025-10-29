# Deployment Verification Checklist

This checklist ensures a successful production deployment of the HR Masterdata Management System to Vercel with zero downtime and full functionality verification.

---

## Table of Contents

- [Pre-Deployment Checks](#pre-deployment-checks)
- [Production Deployment Steps](#production-deployment-steps)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Plan](#rollback-plan)
- [Monitoring & Alerts](#monitoring--alerts)

---

## Pre-Deployment Checks

Complete all checks before initiating production deployment:

### Code Quality & Testing

- [ ] **All automated tests passing** - Run `pnpm test` (target: ≥95% pass rate)
  - Current status: 95.7% (578/604 tests passing)
  - [ ] Verify no critical test failures
  - [ ] Review remaining failures (should be non-critical UI edge cases)

- [ ] **Linting passes** - Run `pnpm lint` (0 errors required)
  - [ ] TypeScript compilation succeeds (`pnpm type-check`)
  - [ ] ESLint rules pass with no errors
  - [ ] No console.log statements in production code

- [ ] **Build succeeds locally** - Run `pnpm build`
  - [ ] No build errors
  - [ ] Build output size within reasonable limits (<5 MB total)
  - [ ] No warnings about missing dependencies

### Manual Testing

- [ ] **Smoke test execution complete** - Reference `docs/SMOKE_TEST_CHECKLIST.md`
  - [ ] All 43 smoke test cases executed
  - [ ] Pass rate ≥95% (max 2 failures allowed)
  - [ ] Any failures have GitHub issues created
  - [ ] Critical failures resolved before deployment

### Database Preparation

- [ ] **Production Supabase project created**
  - Project name: `hr-masterdata-prod`
  - Region: Closest to primary users (e.g., `eu-west-1` for Europe)
  - [ ] Free tier limits reviewed and acceptable
    - Max 500 MB database size
    - Max 1 GB file storage
    - Max 2 GB bandwidth per month
    - Max 50,000 monthly active users

- [ ] **Database migrations applied to production**
  - [ ] Run `supabase link --project-ref <prod-project-ref>`
  - [ ] Run `supabase db push` to apply all migrations
  - [ ] Verify migrations: `20251027000000_initial_schema.sql`
  - [ ] Verify migrations: `20251028000001_create_important_dates.sql`
  - [ ] Verify migrations: `20251028104344_seed_column_config.sql`
  - [ ] Verify migrations: `20251028144051_seed_test_users.sql`
  - [ ] Verify migrations: `20251029000000_add_user_rls_policies.sql`
  - [ ] Verify migrations: `20251029000001_seed_hr_admin_test_user.sql`
  - [ ] Verify migrations: `20251029000002_add_remove_jsonb_key_function.sql`
  - [ ] Verify migrations: `20251029000003_fix_remove_jsonb_key_security.sql`

- [ ] **Row Level Security (RLS) policies enabled**
  - [ ] `employees` table: RLS enabled
  - [ ] `users` table: RLS enabled
  - [ ] `column_config` table: RLS enabled
  - [ ] `important_dates` table: RLS enabled
  - [ ] All party data tables: RLS enabled (sodexo_data, omc_data, payroll_data, toplux_data)

- [ ] **Production seed data applied**
  - [ ] HR Admin user created (production email/password)
  - [ ] Column configuration seeded
  - [ ] Test users created for UAT (optional)

### Environment Configuration

- [ ] **Vercel project created**
  - Project name: `hr-masterdata`
  - Framework: Next.js
  - Root directory: `.` (project root)
  - Build command: `pnpm build`
  - Install command: `pnpm install --frozen-lockfile`
  - Output directory: `.next` (default)

- [ ] **Production environment variables configured in Vercel**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://<prod-project-ref>.supabase.co`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<prod-anon-key>` (from Supabase Settings > API)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` = `<prod-service-role-key>` (from Supabase Settings > API)
  - [ ] ⚠️ **SECURITY**: Verify service role key is marked as "Secret" in Vercel
  - [ ] `NEXT_PUBLIC_APP_URL` = `https://hr-masterdata.vercel.app` (or custom domain)

### Security Review

- [ ] **No critical known issues** - Review `docs/KNOWN_ISSUES.md`
  - [ ] No security vulnerabilities in dependency scan
  - [ ] No data exposure risks identified
  - [ ] Authentication/authorization working correctly

- [ ] **API routes protected**
  - [ ] Admin routes require `hr_admin` role (`/api/admin/*`)
  - [ ] Middleware enforces authentication for all protected routes
  - [ ] Service role key isolation verified (no leakage to client)

### Documentation & Communication

- [ ] **Deployment plan communicated to stakeholders**
  - [ ] HR team notified of deployment window
  - [ ] External parties notified (if system already in use)
  - [ ] Estimated downtime: 0 minutes (zero-downtime deployment)

- [ ] **Rollback plan documented** - See section below
  - [ ] Previous deployment URL saved (Vercel provides automatic rollback)
  - [ ] Database backup taken (Supabase automatic daily backups confirmed)

---

## Production Deployment Steps

Follow these steps to deploy to production on Vercel:

### 1. Deploy to Vercel

```bash
# If not already connected, link repository to Vercel
vercel link

# Deploy to production
vercel --prod
```

**Or use Vercel GitHub Integration (recommended):**

1. Push code to `main` branch
2. Vercel automatically triggers build and deployment
3. Monitor build progress at https://vercel.com/dashboard

### 2. Verify Deployment URL

- [ ] Production URL accessible: `https://hr-masterdata.vercel.app`
- [ ] Custom domain configured (if applicable): `https://hr.yourcompany.com`
- [ ] SSL certificate valid (automatic via Vercel)

### 3. Tag Release in Git

```bash
# Tag the release for future reference
git tag -a v1.0.0 -m "MVP production release"
git push origin v1.0.0
```

---

## Post-Deployment Verification

Execute all verification steps immediately after deployment:

### Health & Connectivity

- [ ] **Production URL accessible**
  - [ ] Navigate to `https://hr-masterdata.vercel.app`
  - [ ] Page loads without errors
  - [ ] No 404 or 500 errors displayed

- [ ] **Health check endpoint returns 200 OK**

  ```bash
  curl https://hr-masterdata.vercel.app/api/health
  # Expected response: {"status":"ok","timestamp":"..."}
  ```

- [ ] **Database connected**
  - [ ] Employees table queryable via API
  - [ ] No database connection errors in Vercel logs

### Authentication & Authorization

- [ ] **Authentication working**
  - [ ] Login page loads at `/login`
  - [ ] Can login with HR Admin test user
  - [ ] Session cookie created successfully
  - [ ] Session persists across page refresh

- [ ] **All user roles can login**
  - [ ] HR Admin can login
  - [ ] Sodexo user can login
  - [ ] ÖMC user can login
  - [ ] Payroll user can login
  - [ ] Toplux user can login

- [ ] **Role-based access control working**
  - [ ] HR Admin sees admin panel navigation link
  - [ ] External parties do NOT see admin panel link
  - [ ] Admin routes return 403 for non-admin users
  - [ ] Test: External party navigates to `/dashboard/admin` → redirected or 403 error

### Core Functionality

- [ ] **Dashboard loads for all roles**
  - [ ] HR Admin dashboard displays employee table
  - [ ] External party dashboards display filtered employee table
  - [ ] No JavaScript errors in browser console

- [ ] **HR CRUD operations functional**
  - [ ] HR Admin can create new employee
  - [ ] HR Admin can edit employee masterdata fields
  - [ ] HR Admin can archive employee
  - [ ] HR Admin can unarchive employee
  - [ ] Search and filter working

- [ ] **Column permissions enforced correctly**
  - [ ] HR Admin sees all columns (masterdata + all party columns)
  - [ ] Sodexo user sees only: Masterdata + Sodexo columns
  - [ ] ÖMC user sees only: Masterdata + ÖMC columns
  - [ ] Payroll user sees only: Masterdata + Payroll columns
  - [ ] Toplux user sees only: Masterdata + Toplux columns

- [ ] **Real-time sync functional**
  - [ ] Test: Open two browsers (HR Admin + External Party)
  - [ ] HR creates employee in Browser 1
  - [ ] External Party sees new employee in Browser 2 within 2 seconds
  - [ ] HR edits employee in Browser 1
  - [ ] External Party sees updated data in Browser 2 within 2 seconds

### Admin Features

- [ ] **User management working**
  - [ ] HR Admin can access `/dashboard/admin/users`
  - [ ] Can create new user account
  - [ ] Can deactivate user
  - [ ] Can activate user
  - [ ] Cannot deactivate own account (expected behavior)

- [ ] **Column permissions management working**
  - [ ] HR Admin can access `/dashboard/admin/columns`
  - [ ] Can view column configuration
  - [ ] Can modify column permissions
  - [ ] Changes take effect immediately

- [ ] **Role preview ("View As") working**
  - [ ] HR Admin can switch to "View As" mode
  - [ ] Can preview Sodexo view
  - [ ] Can preview ÖMC view
  - [ ] Can preview Payroll view
  - [ ] Can preview Toplux view
  - [ ] Exit preview returns to HR Admin view

### Performance Verification

- [ ] **Page load times acceptable** - Target: <2 seconds
  - [ ] Dashboard initial load (cold cache): **\_** seconds
  - [ ] Dashboard reload (warm cache): **\_** seconds
  - [ ] Admin pages load time: **\_** seconds

- [ ] **API response times acceptable** - Target: <500ms
  - [ ] `GET /api/employees`: **\_** ms
  - [ ] `POST /api/employees`: **\_** ms
  - [ ] `GET /api/columns`: **\_** ms

- [ ] **Real-time sync latency acceptable** - Target: <2 seconds
  - [ ] HR creates employee → visible to external party: **\_** seconds
  - [ ] HR edits employee → changes propagate: **\_** seconds

### Cross-Browser Testing

Test on supported browsers (last 2 versions):

- [ ] **Chrome**
  - [ ] Login works
  - [ ] Dashboard displays correctly
  - [ ] Real-time sync works

- [ ] **Firefox**
  - [ ] Login works
  - [ ] Dashboard displays correctly
  - [ ] Real-time sync works

- [ ] **Edge**
  - [ ] Login works
  - [ ] Dashboard displays correctly
  - [ ] Real-time sync works

- [ ] **Safari** (if accessible)
  - [ ] Login works
  - [ ] Dashboard displays correctly
  - [ ] Real-time sync works

### Error Handling

- [ ] **Graceful error handling**
  - [ ] Invalid login credentials show error message (not blank page)
  - [ ] Network errors display user-friendly message
  - [ ] 404 page displays for invalid routes
  - [ ] 500 errors logged to Vercel (check logs)

---

## Rollback Plan

If critical issues are discovered post-deployment, follow this rollback procedure:

### Immediate Rollback (Vercel)

Vercel allows instant rollback to previous deployment:

1. **Navigate to Vercel Dashboard**
   - Go to https://vercel.com/dashboard
   - Select `hr-masterdata` project
   - Click "Deployments" tab

2. **Identify Previous Working Deployment**
   - Find the last successful deployment before current one
   - Note the deployment URL (e.g., `hr-masterdata-abc123.vercel.app`)

3. **Promote to Production**
   - Click three-dot menu on previous deployment
   - Select "Promote to Production"
   - Confirm promotion

4. **Verify Rollback**
   - Check production URL is serving previous version
   - Run post-deployment verification steps above
   - Confirm issue is resolved

**Expected Downtime:** <30 seconds

### Database Rollback (If Needed)

⚠️ **WARNING**: Database rollback is more complex and should only be done for critical data integrity issues.

1. **Assess Impact**
   - Determine if database schema changes caused the issue
   - Review recent migrations applied
   - Check if data was modified in production

2. **Backup Current State**

   ```bash
   # Download current database backup from Supabase
   supabase db dump -f backup-before-rollback.sql
   ```

3. **Restore Previous Backup**
   - Navigate to Supabase Dashboard > Database > Backups
   - Select backup from before deployment
   - Click "Restore" (this will overwrite current data)
   - Confirm restoration

4. **Verify Database State**
   - Check that tables match expected schema
   - Verify RLS policies are correct
   - Test queries work as expected

**Expected Downtime:** 5-15 minutes (depending on database size)

### Communication Plan for Rollback

- [ ] **Notify stakeholders immediately**
  - Email HR team: "We've detected an issue and are rolling back to previous version"
  - Expected resolution time: <30 minutes
  - Provide incident summary after resolution

- [ ] **Document incident**
  - What failed and why
  - Steps taken to rollback
  - Root cause analysis
  - Prevention measures for future

---

## Monitoring & Alerts

### Vercel Dashboard Monitoring

**What to Monitor:**

- [ ] Deployment status (automatic on every commit to `main`)
- [ ] Build errors (check build logs if deployment fails)
- [ ] Runtime errors (check function logs for API errors)
- [ ] Performance metrics (page load times, function execution times)

**How to Access:**

1. Navigate to https://vercel.com/dashboard
2. Select `hr-masterdata` project
3. View tabs: Deployments, Analytics, Logs, Settings

### Supabase Dashboard Monitoring

**What to Monitor:**

- [ ] Database size (free tier limit: 500 MB)
- [ ] Active connections (free tier limit: 60 concurrent)
- [ ] Bandwidth usage (free tier limit: 2 GB/month)
- [ ] Storage usage (free tier limit: 1 GB)

**How to Access:**

1. Navigate to https://app.supabase.com
2. Select `hr-masterdata-prod` project
3. View tabs: Database, Auth, Storage, Settings

### Free Tier Limit Alerts

**Vercel:**

- Automatic email alerts when approaching bandwidth/function execution limits
- Monitor: https://vercel.com/docs/limits

**Supabase:**

- Automatic email alerts when approaching database/storage/bandwidth limits
- Monitor: https://supabase.com/docs/guides/platform/going-into-prod

### Manual Checks (Weekly for First Month)

- [ ] **Monday morning health check**
  - Verify production URL accessible
  - Check Vercel logs for errors
  - Review Supabase usage metrics

- [ ] **End-of-week user feedback**
  - Ask HR team: Any issues this week?
  - Review any support tickets or questions
  - Document issues in `docs/KNOWN_ISSUES.md`

---

## Post-Deployment Checklist Summary

- [ ] All pre-deployment checks completed ✅
- [ ] Production deployment successful ✅
- [ ] All post-deployment verification passed ✅
- [ ] Rollback plan tested and documented ✅
- [ ] Monitoring configured and reviewed ✅
- [ ] Stakeholders notified of successful deployment ✅
- [ ] UAT phase can begin ✅

**Deployment Sign-off:**

- **Deployed by:** **********\_********** Date: ****\_\_****
- **Verified by:** **********\_********** Date: ****\_\_****
- **Approved by (Product Owner):** **********\_********** Date: ****\_\_****

---

## Additional Resources

- [Vercel Deployment Documentation](https://vercel.com/docs/deployments/overview)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Next.js Deployment Best Practices](https://nextjs.org/docs/deployment)
- Project Documentation: `docs/README.md`
- User Guide: `docs/USER_GUIDE.md`
- Known Issues: `docs/KNOWN_ISSUES.md`
