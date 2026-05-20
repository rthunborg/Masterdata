/**
 * Playwright Global Setup
 * Story 11.7: End-to-End Critical User Journey Tests
 * 
 * Runs once before all E2E tests to:
 * - Load environment variables
 * - Seed test data
 * - Verify test environment
 */

import { chromium, FullConfig, type Browser } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { assertSafeE2EDatabase, ensureTestUsers, seedTestData } from './helpers/seed-data';

const TEST_USER_PASSWORD = 'Test123!';

const AUTH_STATE_USERS = [
  { email: 'admin@test.com', password: TEST_USER_PASSWORD },
  { email: 'hr@test.com', password: TEST_USER_PASSWORD },
  { email: 'sodexo@test.com', password: TEST_USER_PASSWORD },
  { email: 'omc@test.com', password: TEST_USER_PASSWORD },
  { email: 'payroll@test.com', password: TEST_USER_PASSWORD },
  { email: 'toplux@test.com', password: TEST_USER_PASSWORD },
];

function isLocalAppUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^\[(.*)\]$/, '$1');
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

function authStatePathForEmail(authDir: string, email: string) {
  const normalized = email.trim().toLowerCase();
  const fileBase =
    normalized === 'admin@test.com'
      ? 'admin'
      : normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return path.join(authDir, `${fileBase}.json`);
}

async function createAuthState(
  browser: Browser,
  baseURL: string,
  authDir: string,
  email: string,
  password: string
) {
  const page = await browser.newPage({ baseURL });

  try {
    await page.goto('/login', { timeout: 30000, waitUntil: 'networkidle' });
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForSelector(
      'table, [aria-label="Employee list"], article[aria-label], [data-testid*="dashboard"], [data-testid*="employee"], h1, h2, [class*="dashboard"]',
      { timeout: 15000 }
    );
    await page.context().storageState({ path: authStatePathForEmail(authDir, email) });
  } finally {
    await page.close();
  }
}

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up E2E test environment...');

  // Load environment variables from .env.test or .env.local
  const envTestPath = path.resolve(process.cwd(), '.env.test');
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  
  // Try .env.test first (for test-specific config), then .env.local
  if (fs.existsSync(envTestPath)) {
    dotenv.config({ path: envTestPath });
    console.log('📄 Loaded environment from .env.test');
  } else if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    console.log('📄 Loaded environment from .env.local');
  } else {
    console.warn('⚠️  No .env.test or .env.local file found');
  }

  // Verify environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️  Missing Supabase environment variables');
    console.warn('   E2E tests may fail without proper database configuration');
    console.warn('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  } else {
    console.log('✅ Supabase environment variables loaded');
  }

  // Ensure auth users used by the E2E suite exist and have known passwords.
  try {
    console.log('👤 Ensuring E2E test users...');
    await ensureTestUsers();
    console.log('✅ E2E test users ready');
  } catch (error) {
    console.error('❌ Error ensuring E2E test users:', error);
    throw error;
  }

  const baseURL = String(config.projects[0]?.use?.baseURL || process.env.BASE_URL || 'http://localhost:3100');
  if (!isLocalAppUrl(baseURL) && process.env.E2E_ALLOW_REMOTE_APP !== 'true') {
    throw new Error(
      'Refusing to run E2E tests against a remote app URL. ' +
      'Use localhost, or set E2E_ALLOW_REMOTE_APP=true only for an isolated staging deployment.'
    );
  }

  if (supabaseUrl && supabaseServiceKey) {
    assertSafeE2EDatabase();
  }

  // Seed test data
  try {
    console.log('📦 Seeding test data...');
    await seedTestData();
    console.log('✅ Test data seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    // Don't fail setup - tests might work with existing data
  }

  // Verify application is accessible
  console.log(`🌐 Verifying application at ${baseURL}...`);

  const authDir = path.resolve(process.cwd(), 'test-results/.auth');
  fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  try {
    await page.goto('/', { timeout: 30000, waitUntil: 'networkidle' });
    await page.goto('/login', { timeout: 30000, waitUntil: 'networkidle' });
    await page.waitForSelector('#email', { timeout: 10000 });
    console.log('✅ Application is accessible');

    for (const user of AUTH_STATE_USERS) {
      await createAuthState(browser, baseURL, authDir, user.email, user.password);
    }
    console.log('✅ E2E authentication states created');
  } catch {
    throw new Error(
      `E2E app verification failed for ${baseURL}. ` +
      'The test server must serve this app, render the /login form, and allow seeded E2E users to sign in.'
    );
  } finally {
    await page.close().catch(() => {});
    await browser.close();
  }

  console.log('✅ E2E test environment setup complete');
}

export default globalSetup;

