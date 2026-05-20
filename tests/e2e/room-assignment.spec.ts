/**
 * End-to-End Test: Room Assignment Journey
 * Story 11.7: End-to-End Critical User Journey Tests
 * AC7: Room Assignment Journey
 * 
 * Tests room number calculation and display
 */

import { test, expect } from '@playwright/test';
import { createEmployeeViaUI, loginAsUser } from './helpers/e2e-helpers';

// Skipped because this legacy journey targets the old date-row room assignment
// modal. Current room management is employee-scoped and the old setup exhausts
// finite date capacity while creating five employees.
test.describe.skip('Room Assignment E2E Journey', () => {
  test.describe.configure({ timeout: 120000 });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'admin@test.com', 'Test123!');
    await page.goto('/dashboard');
    await page.waitForLoadState('load');
  });

  test('AC7: Room assignment workflow', async ({ page }) => {
    const runId = Date.now().toString().slice(-4);

    // Step 1: Create ÖMC date (assumed to exist via seed data)
    
    // Step 2: Create 5 employees with different ranks/genders
    const employees = [
      { first_name: `Room${runId}`, surname: 'Test1', ssn: `199001${runId}01`, rank: 'SEV', gender: 'Man', omc_date: '8-9/3' },
      { first_name: `Room${runId}`, surname: 'Test2', ssn: `199001${runId}02`, rank: 'CHEF', gender: 'Kvinna', omc_date: '8-9/3' },
      { first_name: `Room${runId}`, surname: 'Test3', ssn: `199001${runId}03`, rank: 'SEV', gender: 'Man', omc_date: '8-9/3' },
      { first_name: `Room${runId}`, surname: 'Test4', ssn: `199001${runId}04`, rank: 'SEV', gender: 'Kvinna', omc_date: '8-9/3' },
      { first_name: `Room${runId}`, surname: 'Test5', ssn: `199001${runId}05`, rank: 'CHEF', gender: 'Man', omc_date: '8-9/3' },
    ];

    for (const emp of employees) {
      await createEmployeeViaUI(page, emp);
      await page.waitForTimeout(500); // Small delay between creations
    }

    // Wait for all employees to appear
    await page.waitForTimeout(2000);
    await page.goto('/dashboard');
    await page.waitForLoadState('load');

    // Step 3: Open room assignment modal
    // Navigate to important dates or find room assignment button
    await page.goto('/dashboard/important-dates');
    await page.waitForLoadState('load');

    // Find the date row and click to open room assignment
    const dateRow = page.locator('tr, [data-testid="date-row"]')
      .filter({ hasText: '8-9 mars' })
      .first();
    
    await dateRow.click();
    
    // Open room assignment modal (if separate button)
    const roomButton = page.locator('button:has-text("Rum"), button:has-text("Room"), [data-testid="room-assignment-btn"]').first();
    if (await roomButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await roomButton.click();
    }

    // Step 4: Verify room assignments
    await page.waitForSelector('[role="dialog"], [data-testid="room-modal"]', { timeout: 5000 });

    // Room 1: Employee 1, Employee 3 (2 Men, SEV)
    await expect(page.locator('text=/Room 1|Rum 1/i')).toBeVisible();
    await expect(page.locator('text=/Test1/i')).toBeVisible();
    await expect(page.locator('text=/Test3/i')).toBeVisible();

    // Room 2: Employee 2 (1 Woman, CHEF - private)
    await expect(page.locator('text=/Room 2|Rum 2/i')).toBeVisible();
    await expect(page.locator('text=/Test2/i')).toBeVisible();

    // Room 3: Employee 4 (1 Woman, SEV)
    await expect(page.locator('text=/Room 3|Rum 3/i')).toBeVisible();
    await expect(page.locator('text=/Test4/i')).toBeVisible();

    // Room 4: Employee 5 (1 Man, CHEF - private)
    await expect(page.locator('text=/Room 4|Rum 4/i')).toBeVisible();
    await expect(page.locator('text=/Test5/i')).toBeVisible();

    // Step 5: Change Employee 3 gender to Kvinna
    await page.goto('/dashboard');
    await page.waitForLoadState('load');

    const employeeRow = page.locator('table tbody tr, [data-testid="employee-row"]')
      .filter({ hasText: 'Test3' })
      .first();
    
    await employeeRow.click();
    
    // Edit gender
    const genderSelect = page.locator('[name="gender"], [data-testid="gender-select"]').first();
    await genderSelect.selectOption('Kvinna');
    
    // Save if needed
    const saveButton = page.locator('button:has-text("Spara"), button:has-text("Save")').first();
    if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await saveButton.click();
    }

    // Step 6: Verify room recalculated (Employee 3 now in room 3 with Employee 4)
    await page.goto('/dashboard/important-dates');
    await page.waitForLoadState('load');

    const dateRowAfter = page.locator('tr, [data-testid="date-row"]')
      .filter({ hasText: '8-9 mars' })
      .first();
    
    await dateRowAfter.click();
    
    const roomButtonAfter = page.locator('button:has-text("Rum"), button:has-text("Room")').first();
    if (await roomButtonAfter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await roomButtonAfter.click();
    }

    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Employee 3 should now be in Room 3 with Employee 4
    const room3Section = page.locator('text=/Room 3|Rum 3/i').locator('..');
    await expect(room3Section).toContainText('Test3');
    await expect(room3Section).toContainText('Test4');
  });
});

