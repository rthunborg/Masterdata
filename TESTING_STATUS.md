# Testing Infrastructure Setup - Status Report

**Date**: October 29, 2025  
**QA Architect**: Quinn

## Executive Summary

✅ **Test infrastructure has been set up** with authentication helpers, environment configuration, and database seeding.  
⚠️ **Integration tests for admin-users require network configuration** to connect to Supabase auth from Node.js environment.  
✅ **Most other integration tests (115/139) are passing successfully.**

## What Was Completed

### 1. Test Database Setup ✅

- Created migration for HR Admin test user (`migrations/20251029000001_seed_hr_admin_test_user.sql`)
- Successfully applied migration using Supabase Admin API
- Test users created:
  - `admin@test.com` (hr_admin role) - ✅ Created
  - `sodexo@test.com` (sodexo role) - ✅ Exists
  - `omc@test.com` (omc role) - ✅ Exists
  - `payroll@test.com` (payroll role) - ✅ Exists
  - `toplux@test.com` (toplux role) - ✅ Exists

### 2. Test Environment Configuration ✅

- Created `.env.test` with proper Supabase credentials
- Installed `dotenv-cli` for environment variable loading
- Added `test:integration` script to package.json
- Configured test setup with node-fetch polyfill

### 3. Authentication Test Helper ✅

- Created `tests/utils/auth-test-helper.ts`
- Provides `getTestAuthToken()` function to obtain real Supabase auth tokens
- Implements token caching for performance
- Supports all user roles (hrAdmin, sodexo, omc, payroll, toplux)

### 4. Integration Test Updates ✅

- Updated `tests/integration/api/admin-users.test.ts` to use real authentication
- Removed mock tokens in favor of actual Supabase authentication

### 5. Documentation ✅

- Created `docs/testing-setup.md` with comprehensive testing guide
- Includes troubleshooting section
- Documents all test user credentials

## Current Test Results

### Overall Stats

```
Test Files: 4 failed | 8 passed (12)
Tests: 9 failed | 115 passed | 15 skipped (139)
Success Rate: 92.7% (115/124 executed tests)
```

### Passing Test Suites ✅

- `tests/integration/api/columns.test.ts` - 15/15 passed
- `tests/integration/api/important-dates.test.ts` - 16/16 passed
- `tests/integration/api/employees.test.ts` - 36/36 passed
- `tests/integration/column-creation.test.tsx` - 5/5 passed
- `tests/integration/realtime-sync.test.tsx` - 11/11 passed
- `tests/integration/components/employee-table-columns.test.tsx` - 6/6 passed
- `tests/integration/components/employee-table-permissions.test.tsx` - 8/8 passed
- `tests/integration/external-party-dashboard.test.tsx` - 9/9 passed

### Failing Test Files ⚠️

1. **`tests/integration/api/admin-users.test.ts`** - 15 skipped
   - **Issue**: ECONNREFUSED when connecting to Supabase auth
   - **Root Cause**: Node.js fetch/undici unable to connect to remote Supabase instance
   - **Impact**: Cannot obtain authentication tokens for test execution

2. **`tests/integration/edit-column.test.ts`** - Module mocking error
   - **Issue**: Vi.mock factory initialization error
   - **Root Cause**: Vitest module mocking timing issue
   - **Impact**: Test suite fails to load

3. **`tests/integration/api/employees-import.test.ts`** - 8/9 failed
   - **Issue**: Form-data content-type errors and undefined response
   - **Root Cause**: Test is calling route handlers directly, not via HTTP
   - **Impact**: File upload tests not working properly

4. **`tests/integration/api/role-protection.test.ts`** - 1/9 failed
   - **Issue**: One test returns 500 instead of 200
   - **Error**: "`cookies` was called outside a request scope"
   - **Root Cause**: Next.js cookies() API requires proper request context
   - **Impact**: One admin user list test fails

## Recommended Next Steps

### Priority 1: Fix admin-users.test.ts Authentication (REQUIRED FOR STORY 5.1)

**Option A: Use Pre-Generated Tokens** (Quickest)

1. Manually sign in to your app with test users
2. Extract access tokens from browser DevTools (Application → Local Storage → Supabase auth token)
3. Store tokens as environment variables in `.env.test`:
   ```bash
   TEST_HR_ADMIN_TOKEN=eyJhbGci...
   TEST_SODEXO_TOKEN=eyJhbGci...
   ```
4. Update test to use these tokens directly instead of authenticating

**Option B: Use Supabase Service Role** (More Robust)

1. Create authentication helper that uses service role key to generate tokens
2. Use Supabase Admin API: `supabase.auth.admin.generateAccessToken(userId)`
3. Requires fetching user IDs first, then generating tokens

**Option C: Mock Authentication** (For Now)

1. Mock the Supabase auth in tests
2. Focus on testing API route logic rather than full integration
3. Add end-to-end tests later with tools like Playwright

### Priority 2: Fix role-protection.test.ts Cookie Error

The "cookies was called outside request scope" error occurs when Next.js API routes are called directly in tests without proper request context.

**Solution**: Update the test to make actual HTTP requests instead of importing route handlers:

```typescript
// Instead of:
import { GET } from '@/app/api/admin/users/route';
const response = await GET(request);

// Do:
const response = await fetch('http://localhost:3000/api/admin/users', {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Priority 3: Fix employees-import.test.ts Form Data

File upload tests need proper multipart/form-data handling:

1. Use `FormData` API correctly
2. Ensure Content-Type header is set properly
3. Test via HTTP requests, not direct route handler calls

### Priority 4: Fix edit-column.test.ts Mocking

Resolve the Vitest module mocking timing issue:

1. Move vi.mock() calls to top of file
2. Ensure no top-level variable references in mock factories
3. Consider using vi.hoisted() for factory functions

## Files Created/Modified

### New Files

- `.env.test` - Test environment configuration
- `migrations/20251029000001_seed_hr_admin_test_user.sql` - HR Admin test user migration
- `scripts/apply-hr-admin-migration.ts` - Script to apply HR Admin migration
- `tests/utils/auth-test-helper.ts` - Authentication helper for tests
- `docs/testing-setup.md` - Testing setup documentation
- `TESTING_STATUS.md` - This status report

### Modified Files

- `package.json` - Added test:integration script and dotenv-cli dependency
- `tests/setup.ts` - Added node-fetch polyfill for Supabase client
- `tests/integration/api/admin-users.test.ts` - Updated to use real authentication

## Quick Start for Developers

### Running Tests Now

```bash
# Terminal 1: Start Next.js server
pnpm dev

# Terminal 2: Run passing integration tests
pnpm test tests/integration/api/employees.test.ts
pnpm test tests/integration/api/columns.test.ts
pnpm test tests/integration/api/important-dates.test.ts

# Run all tests (will show failures documented above)
pnpm test:integration
```

### Manual Test for admin-users API

Until authentication is fixed, you can manually test the admin users API:

1. Start the dev server: `pnpm dev`
2. Open browser to http://localhost:3000
3. Sign in as admin@test.com / Test123!
4. Open DevTools → Network tab
5. Navigate to Admin → Users page
6. Inspect API calls to `/api/admin/users`

## Conclusion

The test infrastructure foundation is solid. The main blocker is establishing reliable Supabase authentication from the Node.js test environment. This is a common challenge in integration testing.

**Recommendation**: Use Option A (pre-generated tokens) for immediate unblocking, then migrate to Option B (service role) for long-term reliability.

The 92.7% test pass rate shows that most of the application logic is working correctly. The failures are primarily environment/setup issues rather than application bugs.

---

**Next Actions for Product Team**:

1. Choose authentication approach (A, B, or C above)
2. Implement chosen approach
3. Fix remaining 3 test files using patterns from passing tests
4. Add to CI/CD pipeline once stable

**Estimated Time to Fix**:

- Option A: 30 minutes
- Option B: 2 hours
- Option C: 1 hour
