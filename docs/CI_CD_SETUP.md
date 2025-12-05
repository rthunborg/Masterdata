# CI/CD Setup Guide

This guide explains how to configure GitHub Actions to automatically run tests and block deployments when tests fail.

## Overview

The project includes a GitHub Actions workflow (`.github/workflows/test-check.yml`) that automatically:

1. Runs type checking
2. Runs linting
3. Runs unit tests
4. Runs integration tests (if configured)
5. **Blocks PR merge and deployment if any check fails**

## Workflow Triggers

The workflow runs automatically on:
- **Pull requests** targeting the `main` branch
- **Pushes** to the `main` branch

## Setup Instructions

### 1. Verify Workflow File Exists

The workflow file should be located at:
```
.github/workflows/test-check.yml
```

If it doesn't exist, it will be created automatically when you push to GitHub.

### 2. Configure GitHub Secrets (Optional but Recommended)

Integration tests require Supabase credentials. To enable integration tests in CI:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

#### Required Secrets for Integration Tests

| Secret Name | Description | Example |
|------------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Get from Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Get from Supabase Dashboard → Settings → API |

#### Optional Secrets

| Secret Name | Description | Default Value |
|------------|-------------|---------------|
| `NEXT_PUBLIC_APP_URL` | Application base URL | `http://localhost:3000` |
| `TEST_HR_ADMIN_EMAIL` | Test HR admin email | `admin@test.com` |
| `TEST_HR_ADMIN_PASSWORD` | Test HR admin password | `Test123!` |

**Note:** If secrets are not configured, integration tests will be skipped. Unit tests, type checking, and linting will still run.

### 3. Enable Branch Protection (Recommended)

To ensure tests must pass before merging:

1. Go to **Settings** → **Branches**
2. Add a branch protection rule for `main`
3. Enable **Require status checks to pass before merging**
4. Select the **test** check from the list
5. Optionally enable **Require branches to be up to date before merging**

This ensures that:
- PRs cannot be merged if tests fail
- PRs cannot be merged if the branch is out of date with main

## How It Works

### On Pull Request

1. Developer creates a PR targeting `main`
2. GitHub Actions automatically triggers the workflow
3. Workflow runs all checks:
   - Type checking
   - Linting
   - Unit tests
   - Integration tests (if secrets configured)
4. If all checks pass:
   - ✅ Green checkmark appears on PR
   - PR can be merged
5. If any check fails:
   - ❌ Red X appears on PR
   - PR cannot be merged (if branch protection is enabled)
   - Developer must fix issues and push again

### On Push to Main

1. Code is pushed to `main` branch
2. GitHub Actions automatically triggers the workflow
3. If tests fail:
   - Workflow fails
   - Vercel deployment may be blocked (if configured)
   - Team is notified of failure

## Viewing Workflow Results

### In GitHub

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Select the **Test Check** workflow
4. View individual run results

### In Pull Requests

- Check status appears directly on the PR page
- Click the "Details" link to see full workflow logs

## Troubleshooting

### Workflow Not Running

- **Check:** Is the workflow file in `.github/workflows/test-check.yml`?
- **Check:** Is the file committed and pushed to GitHub?
- **Check:** Are you creating a PR or pushing to `main`?

### Integration Tests Skipped

- **Check:** Are GitHub secrets configured?
- **Check:** Do secrets have the correct names (case-sensitive)?
- **Check:** Workflow logs will show: "Integration tests skipped - secrets not configured"

### Tests Pass Locally But Fail in CI

Common causes:
- **Environment differences:** CI uses a clean environment
- **Missing dependencies:** Check that all dependencies are in `package.json`
- **Timing issues:** Some tests may be flaky - check for race conditions
- **Missing test data:** Integration tests may need test users set up in the test database

### Type Checking Fails

- Run `pnpm type-check` locally to see the same errors
- Fix TypeScript errors before pushing

### Linting Fails

- Run `pnpm lint` locally to see the same errors
- Fix linting errors before pushing

## Local Testing

Before pushing, you can run the same checks locally:

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Unit tests
pnpm test:silent

# Integration tests (requires .env.test file)
pnpm test:integration
```

## Best Practices

1. **Run checks locally before pushing** - Don't wait for CI to catch issues
2. **Fix failing tests immediately** - Don't let test failures accumulate
3. **Keep secrets secure** - Never commit secrets to the repository
4. **Monitor workflow runs** - Check the Actions tab regularly
5. **Update secrets when needed** - If Supabase credentials change, update GitHub secrets

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)

