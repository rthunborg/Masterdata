/**
 * Playwright Global Teardown
 * Story 11.7: End-to-End Critical User Journey Tests
 * 
 * Runs once after all E2E tests to clean up test data
 */

import { FullConfig } from '@playwright/test';
import { cleanupTestData } from './helpers/seed-data';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test data...');

  try {
    await cleanupTestData();
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    // Don't fail teardown
  }

  console.log('✅ E2E test teardown complete');
}

export default globalTeardown;

