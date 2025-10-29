# 🚀 Quick Production Start

Your app is deployed! Follow these 3 steps to start testing:

---

## Step 1: Set Up Production Environment File (2 minutes)

1. **Copy the template**:

   ```bash
   copy .env.production.template .env.production
   ```

2. **Get your Supabase credentials**:
   - Go to: https://app.supabase.com
   - Select your **production** project
   - Click: **Settings** > **API**
   - Copy these values into `.env.production`:
     - `NEXT_PUBLIC_SUPABASE_URL` = **Project URL**
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = **anon** **public** key
     - `SUPABASE_SERVICE_ROLE_KEY` = **service_role** key

---

## Step 2: Create Test User Accounts (1 minute)

Run this command:

```bash
pnpm setup:test-users:prod
```

Wait 5 seconds (production safety delay), then the script will create:

- ✅ `hradmin@test.com` / `Test123!` (HR Admin)
- ✅ `sodexo@test.com` / `Test123!` (Sodexo)
- ✅ `omc@test.com` / `Test123!` (ÖMC)
- ✅ `payroll@test.com` / `Test123!` (Payroll)
- ✅ `toplux@test.com` / `Test123!` (Toplux)
- ✅ `inactive@test.com` / `Test123!` (Inactive - for testing)

---

## Step 3: Verify It Works (2 minutes)

1. **Open your production app**: `https://hr-masterdata.vercel.app`

2. **Login as HR Admin**:
   - Email: `hradmin@test.com`
   - Password: `Test123!`
   - ✅ Should redirect to dashboard

3. **Check it works**:
   - ✅ Dashboard loads
   - ✅ Can see employee table
   - ✅ No errors in browser console (F12)

4. **Test External Party**:
   - Logout
   - Login as: `sodexo@test.com` / `Test123!`
   - ✅ Should see limited columns (no SSN, etc.)

---

## ✅ Done! Now What?

### Option A: Quick Smoke Test (15 minutes)

Run critical tests from `docs/SMOKE_TEST_CHECKLIST.md`:

- Test authentication (6 tests)
- Test HR CRUD operations (10 tests)
- Test column permissions (6 tests)

### Option B: Full Smoke Test (45-60 minutes)

Execute all 43 test cases from `docs/SMOKE_TEST_CHECKLIST.md`

### Option C: User Acceptance Testing

Invite HR team to test real workflows

---

## 🆘 Troubleshooting

**Can't create test users?**

- Alternative: Use SQL in Supabase Dashboard (see `PRODUCTION_SETUP.md`)

**Login fails?**

- Check Vercel env vars are set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Redeploy in Vercel after setting env vars

**Database errors?**

- Verify migrations applied: Supabase Dashboard > Database > Tables
- Should see: `employees`, `users`, `column_config`, `important_dates`

---

## 📚 Full Documentation

- **Complete Setup**: `PRODUCTION_SETUP.md`
- **Deployment Checklist**: `docs/DEPLOYMENT_CHECKLIST.md`
- **Smoke Test Checklist**: `docs/SMOKE_TEST_CHECKLIST.md`

---

**Need help?** Check `PRODUCTION_SETUP.md` for detailed troubleshooting.
