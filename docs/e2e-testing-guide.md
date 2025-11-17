# E2E Testing Guide

## Overview

End-to-end (E2E) tests validate complete user workflows through the entire application stack (UI → API → Database → Real-time Updates). This guide explains how to set up, run, and maintain E2E tests for the HR Masterdata application.

## Framework

**Playwright** is used for E2E testing, providing:
- Cross-browser testing (Chrome, Firefox)
- Automatic waiting and retries
- Screenshot and video capture on failures
- Real-time sync testing with multiple browser contexts

## Prerequisites

1. **Playwright installed**: Already included in `package.json`
2. **Browsers installed**: Run `npx playwright install --with-deps chromium firefox`
3. **Test database configured**: Ensure `.env.test` has valid Supabase credentials
4. **Test users created**: Run `npm run setup:test-users` to create test users
5. **Development server**: E2E tests automatically start the dev server, but you can run it manually with `npm run dev`

## Environment Setup

### 1. Environment Variables

E2E tests use the same environment variables as integration tests (`.env.test`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Test User Credentials
TEST_HR_ADMIN_EMAIL=admin@test.com
TEST_HR_ADMIN_PASSWORD=Test123!
```

### 2. Test Database Setup

E2E tests use a separate test database (configured via `.env.local` or `.env.test`). 

**IMPORTANT: Create test users before running E2E tests:**

```bash
# Create HR Admin test user (required for E2E tests)
npx tsx scripts/apply-hr-admin-migration.ts

# Create other test users (optional, for multi-user tests)
npm run setup:test-users
```

This creates the following test users:
- **HR Admin**: admin@test.com / Test123! (created by apply-hr-admin-migration.ts)
- **Sodexo**: sodexo@test.com / Test123! (created by setup:test-users)
- **OMC**: omc@test.com / Test123! (created by setup:test-users)
- **Payroll**: payroll@test.com / Test123! (created by setup:test-users)
- **Toplux**: toplux@test.com / Test123! (created by setup:test-users)

**Note**: E2E tests primarily use `admin@test.com`, so at minimum run the HR admin migration script.

The global setup script (`tests/e2e/global-setup.ts`) automatically seeds test data (important dates) before running tests, but **test users must be created manually** using the script above.

## Running E2E Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Tests in UI Mode (Interactive)

```bash
npm run test:e2e:ui
```

Opens Playwright's interactive UI where you can:
- See all tests
- Run individual tests
- Debug tests step-by-step
- View test execution timeline

### Run Tests in Headed Mode (See Browser)

```bash
npm run test:e2e:headed
```

Runs tests with visible browser windows (useful for debugging).

### Run Tests in Debug Mode

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector for step-by-step debugging.

### Run Specific Test File

```bash
npx playwright test tests/e2e/employee-lifecycle.spec.ts
```

### Run Tests for Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
```

## Test Structure

### Test Files

All E2E tests are located in `tests/e2e/`:

- `employee-lifecycle.spec.ts` - AC1: Complete employee lifecycle journey
- `termination-reactivation.spec.ts` - AC2: Termination and reactivation workflows
- `csv-import-export.spec.ts` - AC3: CSV import and validation
- `prerequisites-export.spec.ts` - AC4: Prerequisites completion and export
- `concurrent-users.spec.ts` - AC5: Concurrent user race conditions
- `real-time-sync.spec.ts` - AC6: Real-time updates between users
- `room-assignment.spec.ts` - AC7: Room assignment calculation
- `capacity-management.spec.ts` - AC8: Capacity limits and badge updates

### Test Helpers

Helper utilities are in `tests/e2e/helpers/`:

- `e2e-helpers.ts` - UI interaction helpers (createEmployeeViaUI, loginAsUser, etc.)
- `seed-data.ts` - Test data seeding and cleanup functions

### Test Fixtures

Test data files are in `tests/e2e/fixtures/`:

- `test-employees.csv` - Sample CSV for import tests

## Writing E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { loginAsUser, createEmployeeViaUI } from './helpers/e2e-helpers';

test.describe('Feature E2E Journey', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'admin@test.com', 'Test123!');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('AC: Feature workflow', async ({ page }) => {
    // Test steps here
  });
});
```

### Using Test Helpers

```typescript
// Login
await loginAsUser(page, 'admin@test.com', 'Test123!');

// Create employee
await createEmployeeViaUI(page, {
  first_name: 'Test',
  surname: 'Employee',
  ssn: '199001011234',
  rank: 'SEV',
  gender: 'Man',
  hire_date: '2025-01-01',
  omc_date: '8-9/3',
});

// Wait for table update
await waitForTableUpdate(page, expectedRowCount);

// Verify capacity badge
await verifyCapacityBadge(page, 'almost-full', '8-9 mars');

// Download and parse CSV
const csv = await downloadAndParseCSV(page);
```

### Best Practices

1. **Use data-testid attributes**: Prefer `[data-testid="..."]` over text selectors when possible
2. **Wait for network idle**: Use `waitForLoadState('networkidle')` after navigation
3. **Use helper functions**: Reuse helpers from `e2e-helpers.ts` for common operations
4. **Test user journeys**: Focus on complete workflows, not individual components
5. **Handle async operations**: Use proper waits for real-time updates
6. **Clean up test data**: Tests should clean up after themselves (handled by global teardown)

## Test Execution

### Automatic Server Management

Playwright automatically starts the Next.js dev server before tests and stops it after. You don't need to run `npm run dev` manually.

### Test Isolation

Each test runs in isolation:
- Fresh browser context
- Clean test data (seeded before each test suite)
- No shared state between tests

### Retries

In CI, tests automatically retry up to 2 times on failure. Locally, tests run once.

## Debugging Failed Tests

### View Test Report

After running tests, view the HTML report:

```bash
npx playwright show-report
```

The report shows:
- Test execution timeline
- Screenshots on failure
- Video recordings (if enabled)
- Console logs
- Network requests

### Debug in UI Mode

```bash
npm run test:e2e:ui
```

Click on a test to:
- Run it individually
- See step-by-step execution
- Inspect page state at each step

### Debug with Inspector

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector with:
- Step-by-step execution
- Page inspector
- Console access
- Network monitoring

### View Screenshots and Videos

Screenshots and videos are saved to `test-results/` directory:
- Screenshots: `test-results/` (only on failure)
- Videos: `test-results/` (only on failure)
- Traces: `test-results/` (on first retry)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: test-results/e2e-html
```

## Troubleshooting

### Tests Fail with "Application not accessible"

- Ensure `.env.test` has correct Supabase credentials
- Check that test users exist: `npm run setup:test-users`
- Verify Supabase project is accessible

### Tests Fail with "Element not found"

- Check if selectors match current UI
- Use `data-testid` attributes when possible
- Verify page has loaded: `await page.waitForLoadState('networkidle')`

### Tests Are Flaky

- Increase timeouts for slow operations
- Use proper waits instead of fixed `setTimeout`
- Check for race conditions in real-time updates
- Verify test data is properly isolated

### Browser Not Found

Run: `npx playwright install --with-deps chromium firefox`

## Coverage

E2E tests cover 8 critical user journeys:

1. ✅ Employee lifecycle (create → assign → export)
2. ✅ Termination and reactivation
3. ✅ CSV import and validation
4. ✅ Prerequisites and export
5. ✅ Concurrent user scenarios
6. ✅ Real-time sync
7. ✅ Room assignment
8. ✅ Capacity management

## Maintenance

### Updating Tests After UI Changes

1. Run tests to see which selectors fail
2. Update selectors in test files
3. Prefer `data-testid` attributes for stable selectors
4. Update helpers if common patterns change

### Adding New E2E Tests

1. Create new test file in `tests/e2e/`
2. Follow existing test structure
3. Use helpers from `e2e-helpers.ts`
4. Add test to appropriate acceptance criteria
5. Update this guide if needed

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test File Structure](./stories/11.7.e2e-critical-user-journey-tests.md)

