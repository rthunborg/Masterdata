# Testing Setup Guide

## Overview

This document explains how to set up and run integration tests for the HR Masterdata application.

## Test Environment Setup

### 1. Environment Variables

Integration tests use the `.env.test` file for configuration:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://njgmfvsqevhoxpqbnpnd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Test User Credentials
TEST_HR_ADMIN_EMAIL=admin@test.com
TEST_HR_ADMIN_PASSWORD=Test123!
TEST_SODEXO_EMAIL=sodexo@test.com
TEST_SODEXO_PASSWORD=Test123!

# Environment
NODE_ENV=test
```

### 2. Test Database Setup

Ensure test users exist in your Supabase database:

```bash
# Apply the HR Admin test user migration
npx tsx scripts/apply-hr-admin-migration.ts
```

This creates the following test users:

- **HR Admin**: admin@test.com / Test123!
- **Sodexo**: sodexo@test.com / Test123!
- **OMC**: omc@test.com / Test123!
- **Payroll**: payroll@test.com / Test123!
- **Toplux**: toplux@test.com / Test123!

### 3. Next.js Development Server

Integration tests require the Next.js server to be running:

```bash
# Terminal 1: Start the development server
pnpm dev
```

Wait for the server to be ready (shows "Ready in Xs").

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test tests/unit

# Run specific unit test file
pnpm test tests/unit/example.test.ts
```

### Integration Tests

```bash
# Run all integration tests
pnpm test:integration

# Run specific integration test file
npx dotenv -e .env.test -- npx vitest --run tests/integration/api/admin-users.test.ts
```

### Watch Mode

```bash
# Run tests in watch mode
pnpm test:watch
```

## Integration Test Structure

### API Route Tests

Integration tests for API routes (`tests/integration/api/*.test.ts`) test the full HTTP request/response cycle:

1. **Authentication**: Uses real Supabase auth tokens via `getTestAuthToken()`
2. **HTTP Requests**: Makes actual HTTP requests to `localhost:3000`
3. **Database**: Uses real Supabase database
4. **Assertions**: Validates responses, status codes, and data

Example:

```typescript
import { getTestAuthToken } from '../../utils/auth-test-helper';

beforeAll(async () => {
  const hrAdminAuth = await getTestAuthToken('hrAdmin');
  hrAdminToken = hrAdminAuth.token;
});

it('returns user list for HR Admin', async () => {
  const response = await fetch('http://localhost:3000/api/admin/users', {
    headers: {
      Authorization: `Bearer ${hrAdminToken}`,
    },
  });

  expect(response.status).toBe(200);
});
```

### Component Tests

Component integration tests (`tests/integration/**/*.test.tsx`) test React components with mocked dependencies.

## Troubleshooting

### Server Not Running

**Error**: `ECONNREFUSED` when running integration tests

**Solution**: Ensure the Next.js dev server is running on port 3000:

```bash
pnpm dev
```

### Authentication Failures

**Error**: `Failed to authenticate hrAdmin`

**Solution**:

1. Check that test users exist in Supabase
2. Verify `.env.test` has correct credentials
3. Run the migration: `npx tsx scripts/apply-hr-admin-migration.ts`

### Database Seeding

**Error**: Tests fail because data doesn't exist

**Solution**: Apply all migrations:

```bash
npx tsx scripts/apply-migration.ts
npx tsx scripts/apply-hr-admin-migration.ts
```

## Test Utilities

### Authentication Helper

Location: `tests/utils/auth-test-helper.ts`

Provides functions to obtain real Supabase authentication tokens:

```typescript
import { getTestAuthToken, testUsers } from './auth-test-helper';

// Get auth token for specific role
const { token, userId } = await getTestAuthToken('hrAdmin');

// Available roles
-'hrAdmin' - 'sodexo' - 'omc' - 'payroll' - 'toplux';
```

### Role Test Utils

Location: `tests/utils/role-test-utils.ts`

Provides mock users and role validation utilities for unit tests.

## CI/CD Considerations

For CI/CD pipelines:

1. Set up a dedicated test Supabase project
2. Configure environment variables in CI
3. Run migrations before tests
4. Start Next.js server in background
5. Run tests
6. Clean up test data after tests

Example GitHub Actions workflow:

```yaml
- name: Setup test database
  run: |
    npx tsx scripts/apply-migration.ts
    npx tsx scripts/apply-hr-admin-migration.ts

- name: Start Next.js server
  run: pnpm dev &

- name: Wait for server
  run: npx wait-on http://localhost:3000

- name: Run integration tests
  run: pnpm test:integration
```
