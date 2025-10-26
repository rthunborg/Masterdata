# Supabase Database Migration Instructions

## Story 1.2: Remaining Manual Steps

Most of the setup has been completed automatically. The following steps require manual execution in the Supabase Dashboard.

---

## ✅ Completed Automatically

- [x] Task 1: Supabase Project created (credentials in `.env.local`)
- [x] Task 2: Environment variables configured
- [x] Task 3: Migration infrastructure created (`supabase/` directory)
- [x] Task 4: Initial schema migration file created
- [x] Task 5: External party tables migration file created
- [x] Task 6: RLS policies migration file created
- [x] Task 7: Seed column config migration file created
- [x] Task 9: Supabase client configuration created
- [x] Part of Task 12: README.md updated with setup instructions

---

## 🔴 Manual Steps Required

### Task 8: Execute Migrations in Supabase Dashboard

You need to execute the migration files in the Supabase Dashboard SQL Editor.

#### Steps:

1. **Navigate to Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `hr-masterdata`

2. **Open SQL Editor**
   - Click **SQL Editor** in the left sidebar

3. **Execute Migration 1: Initial Schema**
   - Open file: `supabase/migrations/20250126000000_initial_schema.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run** (or press Ctrl+Enter)
   - Verify success message

4. **Execute Migration 2: External Party Tables**
   - Open file: `supabase/migrations/20250126000001_external_party_tables.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**
   - Verify success message

5. **Execute Migration 3: RLS Policies**
   - Open file: `supabase/migrations/20250126000002_rls_policies.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**
   - Verify success message

6. **Execute Migration 4: Seed Column Config**
   - Open file: `supabase/migrations/20250126000003_seed_column_config.sql`
   - Copy the entire contents
   - Paste into SQL Editor
   - Click **Run**
   - Verify success message

7. **Verify Tables Created**
   - Navigate to **Table Editor** in Supabase Dashboard
   - Confirm the following tables exist:
     - ✓ users
     - ✓ employees
     - ✓ column_config
     - ✓ important_dates
     - ✓ sodexo_data
     - ✓ omc_data
     - ✓ payroll_data
     - ✓ toplux_data

8. **Verify RLS Policies**
   - In **Table Editor**, select any table
   - Click **Policies** tab
   - Confirm policies are listed

9. **Verify Seed Data**
   - In **Table Editor**, select `column_config` table
   - Click **View Data**
   - Confirm 10 rows exist (masterdata column configurations)

---

### Task 10: Test Database Connection

After executing migrations, test the database connection:

1. **Start Development Server**

   ```bash
   pnpm dev
   ```

2. **Test API Endpoint**
   - Open browser to: http://localhost:3000/api/test-db
   - Expected response:
     ```json
     {
       "success": true,
       "columnCount": 10,
       "message": "Database connection successful. Found 10 column configurations.",
       "data": [...]
     }
     ```

3. **Verify Response**
   - `success` should be `true`
   - `columnCount` should be `10`
   - `data` array should contain 10 column configurations

If you see errors:

- Check `.env.local` has correct Supabase credentials
- Verify all migrations executed successfully
- Check Supabase Dashboard > Logs for error details

---

### Task 11: Update Vercel Environment Variables

1. **Navigate to Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Select your project: `masterdata-seven`

2. **Add Environment Variables**
   - Go to **Settings** > **Environment Variables**
   - Add the following (use values from `.env.local`):
     - `NEXT_PUBLIC_SUPABASE_URL` → Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Your anon key
     - `SUPABASE_SERVICE_ROLE_KEY` → Your service role key (mark as **Sensitive**)
   - Apply to: **Production**, **Preview**, **Development**

3. **Trigger Deployment**
   - Go to **Deployments** tab
   - Click **Redeploy** on latest deployment
   - Or push a commit to trigger new deployment

4. **Verify Deployment**
   - Wait for deployment to complete
   - Check deployment logs for errors

---

## Testing Checklist

After completing manual steps, verify:

- [ ] All 8 tables exist in Supabase Table Editor
- [ ] RLS is enabled on all tables (check Policies tab)
- [ ] 10 column_config seed records inserted
- [ ] Local test endpoint returns success: http://localhost:3000/api/test-db
- [ ] Vercel environment variables configured
- [ ] Vercel deployment succeeds

---

## Troubleshooting

### Migration Errors

If a migration fails:

1. Check error message in SQL Editor
2. Verify previous migrations completed successfully
3. Check for duplicate table/policy names (migrations use `IF NOT EXISTS` to handle this)

### Connection Test Fails

If `/api/test-db` returns error:

1. Verify `.env.local` has correct credentials
2. Check Supabase project is active (not paused)
3. Verify migrations executed (check Table Editor)
4. Check browser console and server logs for details

### RLS Blocking Queries

If queries fail with permission errors:

1. Verify RLS policies exist (Table Editor > Policies tab)
2. Check `get_user_role()` function exists
3. For testing, you can temporarily disable RLS:
   ```sql
   ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
   ```
   (Re-enable after testing: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`)

---

## Next Steps

Once all manual steps are completed and tests pass:

1. Delete this file (`MIGRATION_INSTRUCTIONS.md`)
2. Delete test route (`src/app/api/test-db/`) or keep for debugging
3. Update Story 1.2 file to mark all tasks complete
4. Commit all changes to Git
5. Proceed to Story 1.3 (Authentication implementation)

---

**Status:** ⏳ Awaiting manual migration execution in Supabase Dashboard
