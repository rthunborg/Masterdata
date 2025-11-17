/**
 * Playwright Global Setup
 * Story 11.7: End-to-End Critical User Journey Tests
 * 
 * Runs once before all E2E tests to:
 * - Load environment variables
 * - Seed test data
 * - Verify test environment
 */

import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { seedTestData } from './helpers/seed-data';

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
    console.log('⚠️  NOTE: Ensure test users exist. Run: npx tsx scripts/apply-hr-admin-migration.ts');
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
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000';
  console.log(`🌐 Verifying application at ${baseURL}...`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(baseURL, { timeout: 30000, waitUntil: 'networkidle' });
    console.log('✅ Application is accessible');
  } catch (error) {
    console.warn('⚠️  Application may not be running');
    console.warn('   Make sure to start the dev server: npm run dev');
  } finally {
    await browser.close();
  }

  console.log('✅ E2E test environment setup complete');
}

export default globalSetup;

