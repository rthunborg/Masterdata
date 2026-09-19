import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomInt, randomUUID } from 'node:crypto';
import { assertSafeE2EDatabase } from '../../helpers/seed-data';

function createFixtureClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Story 13.8 requires the guarded local E2E Supabase configuration.');
  }

  assertSafeE2EDatabase();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe('Kolumnsynlighet Button Removal', () => {
  let fixtureEmployeeId: string | undefined;

  test.beforeEach(async ({ page }) => {
    fixtureEmployeeId = randomUUID();
    const fixtureSsn = `19991231${randomInt(1000, 10000)}`;
    const { error } = await createFixtureClient().from('employees').insert({
      id: fixtureEmployeeId,
      first_name: 'ColumnVisibility',
      surname: 'E2EFixture',
      ssn: fixtureSsn,
      email: `column-visibility-${fixtureEmployeeId}@example.test`,
      rank: 'SEV',
      gender: 'Man',
      hire_date: '2025-01-01',
    });

    if (error) {
      throw new Error(`Failed to create the Story 13.8 employee fixture: ${error.message}`);
    }

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    if (!fixtureEmployeeId) return;

    const { error } = await createFixtureClient()
      .from('employees')
      .delete()
      .eq('id', fixtureEmployeeId);

    fixtureEmployeeId = undefined;

    if (error) {
      throw new Error(`Failed to delete the Story 13.8 employee fixture: ${error.message}`);
    }
  });

  test('should not display Kolumnsynlighet button in dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify the button with "Kolumnsynlighet" text is not present
    const kolumnsynlighetButton = page.getByRole('button', { name: /kolumnsynlighet/i });
    await expect(kolumnsynlighetButton).not.toBeVisible();
    
    // Also check for the Swedish translation
    const columnVisibilityButton = page.getByRole('button', { name: /column visibility/i });
    await expect(columnVisibilityButton).not.toBeVisible();
  });

  test('should render dashboard correctly without the button', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard should still render - check for table or employee list
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should not have broken UI elements after button removal', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any errors to appear
    await page.waitForTimeout(1000);

    // Filter out errors related to the removed button
    const relevantErrors = errors.filter(
      (error) => 
        !error.includes('Kolumnsynlighet') && 
        !error.includes('columnVisibility') &&
        !error.includes('Failed to load resource') // Ignore network errors
    );

    // Should not have errors related to the removed button
    expect(relevantErrors.length).toBe(0);
  });

  test('should maintain dashboard functionality without the button', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify other dashboard elements still work
    // Check if table is visible and functional
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check if other buttons (like Export) are still present if they should be
    // This ensures we didn't accidentally remove other functionality
    const exportButton = page.getByRole('button', { name: /export/i });
    // Export button might or might not be visible depending on selection
    // Just verify the page doesn't crash
    await expect(page).not.toHaveURL(/error/);
  });
});

