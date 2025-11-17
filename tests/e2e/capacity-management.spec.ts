/**
 * End-to-End Test: Capacity Management Journey
 * Story 11.7: End-to-End Critical User Journey Tests
 * AC8: Capacity Management Journey
 * 
 * Tests capacity limits enforcement and badge updates
 */

import { test, expect } from '@playwright/test';
import { createEmployeeViaUI, loginAsUser, verifyCapacityBadge } from './helpers/e2e-helpers';

test.describe('Capacity Management E2E Journey', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'admin@test.com', 'Test123!');
    await page.goto('/dashboard');
    await page.waitForLoadState('load');
  });

  test('AC8: Capacity management workflow', async ({ page }) => {
    // Step 1: Create ÖMC date with max_spots = 2
    // Navigate to important dates
    await page.goto('/important-dates');
    await page.waitForLoadState('load');

    // Note: Date should be created via seed data or API
    // For E2E, we'll assume date "15-16 maj" exists with max_spots = 2

    // Step 2: Create Employee 1 with ÖMC date (remaining = 1)
    await page.goto('/dashboard');
    await createEmployeeViaUI(page, {
      first_name: 'Capacity',
      surname: 'Test1',
      ssn: '199001011111',
      rank: 'SEV',
      gender: 'Man',
      hire_date: '2025-01-01',
      omc_date: '15-16 maj',
    });

    // Step 3: Verify badge shows "Nästan fullbokad" (yellow)
    await page.goto('/important-dates');
    await page.waitForLoadState('load');
    await verifyCapacityBadge(page, 'almost-full', '15-16 maj');

    // Step 4: Create Employee 2 with ÖMC date (remaining = 0)
    await page.goto('/dashboard');
    await createEmployeeViaUI(page, {
      first_name: 'Capacity',
      surname: 'Test2',
      ssn: '199001012222',
      rank: 'SEV',
      gender: 'Kvinna',
      hire_date: '2025-01-02',
      omc_date: '15-16 maj',
    });

    // Step 5: Verify badge shows "Fullbokad" (red)
    await page.goto('/important-dates');
    await page.waitForLoadState('load');
    await verifyCapacityBadge(page, 'full', '15-16 maj');

    // Step 6: Try to create Employee 3 with same ÖMC date
    await page.goto('/dashboard');
    await createEmployeeViaUI(page, {
      first_name: 'Capacity',
      surname: 'Test3',
      ssn: '199001013333',
      rank: 'SEV',
      gender: 'Man',
      hire_date: '2025-01-03',
      omc_date: '15-16 maj',
    });

    // Step 7: Verify error message "Datum är fullbokat"
    await expect(page.locator('text=/fullbokat|full|capacity/i')).toBeVisible({ timeout: 5000 });

    // Step 8: Terminate Employee 1
    await page.goto('/dashboard');
    await page.waitForLoadState('load');
    
    // Find employee row
    const employeeRow = page.locator('table tbody tr, [data-testid="employee-row"]')
      .filter({ hasText: 'Capacity Test1' })
      .first();
    
    await employeeRow.click();
    
    // Click terminate button
    const terminateButton = page.locator('button:has-text("Avsluta"), button:has-text("Terminate"), [data-testid="terminate-btn"]').first();
    await terminateButton.click();
    
    // Wait for modal
    await page.waitForSelector('[role="dialog"], [data-testid="terminate-modal"]', { timeout: 5000 });
    
    // Fill termination form
    const terminationDate = page.locator('[name="termination_date"], [data-testid="termination-date"]').first();
    await terminationDate.fill('2025-11-13');
    
    // Confirm termination
    const confirmButton = page.locator('button:has-text("Bekräfta"), button:has-text("Confirm"), [data-testid="confirm-terminate-btn"]').first();
    await confirmButton.click();
    
    // Wait for success
    await expect(page.locator('text=/success|lyckades|terminated/i')).toBeVisible({ timeout: 10000 });

    // Step 9: Verify remaining spots = 1
    await page.goto('/important-dates');
    await page.waitForLoadState('load');
    await verifyCapacityBadge(page, 'almost-full', '15-16 maj');

    // Step 10: Verify badge updates to "Nästan fullbokad"
    // Already verified in step 9

    // Step 11: Create Employee 3 with ÖMC date (should succeed)
    await page.goto('/dashboard');
    await createEmployeeViaUI(page, {
      first_name: 'Capacity',
      surname: 'Test3',
      ssn: '199001013333',
      rank: 'SEV',
      gender: 'Man',
      hire_date: '2025-01-03',
      omc_date: '15-16 maj',
    });

    // Verify success (no error message)
    await expect(page.locator('text=/fullbokat|full|error/i')).not.toBeVisible({ timeout: 2000 });
  });
});

