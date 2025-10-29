# Production Setup Guide

Complete checklist for deploying HR Masterdata Management System to production on Vercel.

**Status:** Everything deployed to Vercel ✅  
**Next Step:** Create test users for smoke testing

---

## Quick Start: Create Test Users Now

You've already set `NODE_ENV=production` in Vercel. Now create the test user accounts:

### Option 1: Via Local Script (Recommended)

1. **Create `.env.production` file** (copy from template):

   ```bash
   copy .env.production.template .env.production
   ```

2. **Fill in your production Supabase credentials** in `.env.production`:
   - Get from: [Supabase Dashboard](https://app.supabase.com) > Your Project > Settings > API
   - `NEXT_PUBLIC_SUPABASE_URL` - Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon public key
   - `SUPABASE_SERVICE_ROLE_KEY` - service_role key (keep secret!)

3. **Run the test user creation script**:

   ```bash
   pnpm setup:test-users:prod
   ```

   This creates 6 test accounts:
   - `hradmin@test.com` / `Test123!` (HR Admin)
   - `sodexo@test.com` / `Test123!` (Sodexo)
   - `omc@test.com` / `Test123!` (ÖMC)
   - `payroll@test.com` / `Test123!` (Payroll)
   - `toplux@test.com` / `Test123!` (Toplux)
   - `inactive@test.com` / `Test123!` (Inactive user for testing)

### Option 2: Via Supabase SQL Editor

If you can't run scripts locally, use the Supabase Dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your **production** project
3. Click "SQL Editor" in left sidebar
4. Run this SQL:

```sql
-- Create test users for smoke testing
DO $$
DECLARE
  v_auth_id UUID;
BEGIN
  -- HR Admin
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'hradmin@test.com', crypt('Test123!', gen_salt('bf')), NOW(), '{}', '{}', NOW(), NOW())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_auth_id;
  IF v_auth_id IS NOT NULL THEN
    INSERT INTO public.users (auth_user_id, email, role, is_active) VALUES (v_auth_id, 'hradmin@test.com', 'hr_admin', true);
  END IF;

  -- Sodexo
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'sodexo@test.com', crypt('Test123!', gen_salt('bf')), NOW(), '{}', '{}', NOW(), NOW())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_auth_id;
  IF v_auth_id IS NOT NULL THEN
    INSERT INTO public.users (auth_user_id, email, role, is_active) VALUES (v_auth_id, 'sodexo@test.com', 'sodexo', true);
  END IF;

  -- ÖMC
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'omc@test.com', crypt('Test123!', gen_salt('bf')), NOW(), '{}', '{}', NOW(), NOW())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_auth_id;
  IF v_auth_id IS NOT NULL THEN
    INSERT INTO public.users (auth_user_id, email, role, is_active) VALUES (v_auth_id, 'omc@test.com', 'omc', true);
  END IF;

  -- Payroll
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'payroll@test.com', crypt('Test123!', gen_salt('bf')), NOW(), '{}', '{}', NOW(), NOW())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_auth_id;
  IF v_auth_id IS NOT NULL THEN
    INSERT INTO public.users (auth_user_id, email, role, is_active) VALUES (v_auth_id, 'payroll@test.com', 'payroll', true);
  END IF;

  -- Toplux
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'toplux@test.com', crypt('Test123!', gen_salt('bf')), NOW(), '{}', '{}', NOW(), NOW())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_auth_id;
  IF v_auth_id IS NOT NULL THEN
    INSERT INTO public.users (auth_user_id, email, role, is_active) VALUES (v_auth_id, 'toplux@test.com', 'toplux', true);
  END IF;

  -- Inactive user (for testing)
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'inactive@test.com', crypt('Test123!', gen_salt('bf')), NOW(), '{}', '{}', NOW(), NOW())
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_auth_id;
  IF v_auth_id IS NOT NULL THEN
    INSERT INTO public.users (auth_user_id, email, role, is_active) VALUES (v_auth_id, 'inactive@test.com', 'sodexo', false);
  END IF;
END $$;
```

---

## Verification Steps

After creating test users, verify they work:

1. **Go to your production URL**: `https://hr-masterdata.vercel.app` (or your custom domain)

2. **Test login with HR Admin**:
   - Navigate to `/login`
   - Email: `hradmin@test.com`
   - Password: `Test123!`
   - Should redirect to `/dashboard` ✅

3. **Test login with External Party**:
   - Logout (click profile menu > Log Out)
   - Login as: `sodexo@test.com` / `Test123!`
   - Should see limited columns ✅

4. **Check database connection**:
   - Open browser DevTools (F12) > Network tab
   - Refresh dashboard
   - Look for API calls to `/api/employees` - should return 200 OK ✅

---

## Complete Production Checklist

### ✅ Already Done

- [x] Code pushed to GitHub (triggers automatic Vercel deployment)
- [x] `NODE_ENV=production` set in Vercel environment variables

### 🔄 Do Next (In Order)

#### 1. Database Setup

- [ ] **Production Supabase project created**
  - Go to: https://app.supabase.com
  - Click "New Project"
  - Name: `hr-masterdata-prod`
  - Region: Choose closest to users (e.g., `eu-west-1` for Europe)
  - Strong database password
  - Wait for setup to complete (~2 minutes)

- [ ] **Apply all migrations to production**

  ```bash
  # Link to production project
  npx supabase link --project-ref <your-prod-ref>

  # Push all migrations
  npx supabase db push
  ```

  Or manually via Supabase Dashboard SQL Editor:
  - Run each file in `migrations/` folder in order
  - Files to run:
    1. `20251027000000_initial_schema.sql`
    2. `20251028000001_create_important_dates.sql`
    3. `20251028104344_seed_column_config.sql`
    4. `20251028144051_seed_test_users.sql` _(skip if using script above)_
    5. `20251029000000_add_user_rls_policies.sql`
    6. `20251029000001_seed_hr_admin_test_user.sql` _(skip if using script above)_
    7. `20251029000002_add_remove_jsonb_key_function.sql`
    8. `20251029000003_fix_remove_jsonb_key_security.sql`

- [ ] **Verify RLS policies enabled**
  - Supabase Dashboard > Database > Tables
  - Check each table has "RLS enabled" badge:
    - ✅ `employees`
    - ✅ `users`
    - ✅ `column_config`
    - ✅ `important_dates`
    - ✅ `sodexo_data`, `omc_data`, `payroll_data`, `toplux_data`

#### 2. Vercel Configuration

- [ ] **Environment variables set** (in Vercel Dashboard > Settings > Environment Variables):
  - ✅ `NODE_ENV=production` (already set)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` - From Supabase Settings > API > Project URL
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase Settings > API > anon public
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` - From Supabase Settings > API > service_role (**mark as Secret**)
  - [ ] `NEXT_PUBLIC_APP_URL` - Your production domain

- [ ] **Redeploy after setting env vars**:
  - Vercel Dashboard > Deployments > (latest) > "⋯" menu > "Redeploy"
  - OR: Push a commit to trigger rebuild

#### 3. Test User Creation

- [ ] **Create test accounts** (see "Quick Start" section above)
  - Run: `pnpm setup:test-users:prod`
  - OR: Use SQL in Supabase Dashboard

- [ ] **Verify test users created**:
  - Supabase Dashboard > Authentication > Users
  - Should see 6 users: hradmin@test.com, sodexo@test.com, etc.

#### 4. Smoke Testing

- [ ] **Execute smoke tests** from `docs/SMOKE_TEST_CHECKLIST.md`
  - Open checklist: `docs/SMOKE_TEST_CHECKLIST.md`
  - Minimum pass rate: 95% (41/43 tests)
  - Focus on critical paths:
    - ✅ Authentication (6 tests)
    - ✅ HR CRUD (10 tests)
    - ✅ Column Permissions (6 tests)
    - ✅ Real-time Sync (5 tests)

- [ ] **Document test results**:
  - Fill in test results in smoke test checklist
  - Create GitHub issues for any failures
  - Re-test after fixes

---

## Troubleshooting

### "Invalid login credentials" error

**Cause:** Users not created or wrong password  
**Fix:** Re-run test user creation script or check Supabase Auth > Users

### "Failed to fetch" or network errors

**Cause:** Environment variables not set in Vercel  
**Fix:**

1. Verify all env vars set in Vercel Dashboard
2. Redeploy after adding env vars
3. Check Vercel Function Logs for errors

### Database connection errors

**Cause:** Wrong Supabase URL or migrations not applied  
**Fix:**

1. Verify `NEXT_PUBLIC_SUPABASE_URL` matches production project
2. Run migrations: `npx supabase db push`
3. Check Supabase Dashboard > Database > Tables exist

### RLS policy errors ("new row violates row-level security policy")

**Cause:** RLS policies not applied or incorrect  
**Fix:**

1. Run migration: `20251029000000_add_user_rls_policies.sql`
2. Supabase Dashboard > Database > Policies
3. Verify policies exist for all tables

### Real-time sync not working

**Cause:** Supabase Realtime not enabled  
**Fix:**

1. Supabase Dashboard > Database > Replication
2. Enable replication for: `employees`, `sodexo_data`, `omc_data`, `payroll_data`, `toplux_data`
3. Toggle "Insert", "Update", "Delete" events

---

## Post-Deployment Monitoring

### Vercel Dashboard

Monitor at: https://vercel.com/dashboard

- **Deployments**: Check build status, view logs
- **Functions**: Monitor API response times
- **Analytics**: Page views, load times (if enabled)

### Supabase Dashboard

Monitor at: https://app.supabase.com

- **Database**: Size usage (limit: 500 MB on free tier)
- **Auth**: Active users
- **Storage**: File storage usage (limit: 1 GB)
- **API**: Request count, bandwidth (limit: 2 GB/month)

### Free Tier Limits

**Vercel:**

- 100 GB bandwidth/month
- 100 hours serverless function execution/month

**Supabase:**

- 500 MB database size
- 1 GB file storage
- 2 GB bandwidth/month
- 50,000 monthly active users

---

## Next Steps After Smoke Testing

1. **User Acceptance Testing (UAT)**
   - Invite HR team to test with real workflows
   - Collect feedback on usability
   - Document any issues

2. **Production Data Seeding**
   - Import real employee data (via CSV or API)
   - Create real user accounts for HR admins
   - Delete or deactivate test accounts

3. **Go-Live Preparation**
   - Train HR team on system usage
   - Prepare user documentation
   - Set up support process
   - Plan communication to external parties

4. **Post-Launch**
   - Monitor error logs daily for first week
   - Check performance metrics
   - Gather user feedback
   - Plan iteration based on feedback

---

## Support & Documentation

- **Deployment Checklist**: `docs/DEPLOYMENT_CHECKLIST.md`
- **Smoke Test Checklist**: `docs/SMOKE_TEST_CHECKLIST.md`
- **User Guide**: `docs/USER_GUIDE.md`
- **Known Issues**: `docs/KNOWN_ISSUES.md`
- **Architecture**: `docs/architecture.md`

---

**Last Updated:** October 29, 2025  
**Version:** 1.0
