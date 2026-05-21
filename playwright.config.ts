import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const e2ePort = process.env.E2E_PORT || '3100';
const baseURL = process.env.BASE_URL || `http://localhost:${e2ePort}`;
const adminStorageState = path.resolve(__dirname, './test-results/.auth/admin.json');

/**
 * Playwright Configuration for E2E Tests
 * Story 11.7: End-to-End Critical User Journey Tests
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Keep E2E execution serial by default: many specs mutate shared Supabase
  // test data and auth/session state, so parallel workers make the suite flaky.
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    ['list'],
  ],
  globalSetup: path.resolve(__dirname, './tests/e2e/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './tests/e2e/global-teardown.ts'),
  use: {
    baseURL,
    storageState: adminStorageState,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --webpack --port ${e2ePort}`,
    url: baseURL,
    reuseExistingServer: false,
    env: {
      ...process.env,
      E2E: 'true',
      DISABLE_EMAIL_DELIVERY: 'true',
    },
    timeout: 120000,
  },
});

