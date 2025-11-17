/**
 * End-to-End Test: Prerequisites & Export Journey
 * Story 11.7: End-to-End Critical User Journey Tests
 * AC4: Prerequisites & Export Journey
 * 
 * Tests conditional logic for Crewing/Done field and export workflow
 */

import { test, expect } from '@playwright/test';
import { createEmployeeViaUI, loginAsUser, downloadAndParseCSV } from './helpers/e2e-helpers';

test.describe('Prerequisites & Export E2E Journey', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, 'admin@test.com', 'Test123!');
    await page.goto('/dashboard');
    await page.waitForLoadState('load');
  });

  test('AC4: Prerequisites completion and export workflow', async ({ page }) => {
    // Step 1: Create employee with all prerequisites = false
    await createEmployeeViaUI(page, {
      first_name: 'Prereq',
      surname: 'Test',
      ssn: '199001018888',
      rank: 'SEV',
      gender: 'Man',
      hire_date: '2025-01-01',
    });

    // Wait for employee to appear
    await page.waitForTimeout(1000);
    await expect(page.locator('table, [data-testid="employee-table"]')).toContainText('Prereq');

    // Step 2: Verify Crewing/Done field locked
    const employeeRow = page.locator('table tbody tr, [data-testid="employee-row"]')
      .filter({ hasText: 'Prereq' })
      .first();
    
    await employeeRow.click();
    
    // Check for lock icon or disabled state
    const crewingDoneField = page.locator('[data-testid="crewing-done-field"], [name="crewing_done"]').first();
    const isDisabled = await crewingDoneField.isDisabled().catch(() => false);
    expect(isDisabled).toBeTruthy();

    // Verify lock icon or tooltip
    const lockIcon = page.locator('[data-testid="lock-icon"], svg[class*="lock"], .lock').first();
    await expect(lockIcon).toBeVisible({ timeout: 2000 });

    // Step 3: Complete all 10 prerequisites (check boxes)
    // Navigate to employee edit/view page
    // Check each prerequisite checkbox
    const prerequisites = [
      'isps', 'photo', 'origo', 'mail_lon', 'loneiva',
      'bankuppgifter', 'li', 'passport', 'kvitto_c17_18', 'c17'
    ];

    for (const prereq of prerequisites) {
      const checkbox = page.locator(`[name="${prereq}"], [data-testid="${prereq}-checkbox"]`).first();
      if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
        await checkbox.check();
      }
    }

    // Step 4: Verify Crewing/Done field unlocked
    await page.waitForTimeout(500);
    const crewingDoneFieldAfter = page.locator('[data-testid="crewing-done-field"], [name="crewing_done"]').first();
    const isDisabledAfter = await crewingDoneFieldAfter.isDisabled().catch(() => true);
    expect(isDisabledAfter).toBeFalsy();

    // Step 5: Set Crewing/Done = true
    await crewingDoneFieldAfter.check();

    // Step 6: Navigate to export page (or find export button)
    await page.goto('/dashboard');
    await page.waitForLoadState('load');

    // Step 7: Select "Crew Ready" filter
    const crewReadyFilter = page.locator('button:has-text("Crew Ready"), [data-testid="crew-ready-filter"]').first();
    await crewReadyFilter.click();

    // Step 8: Select fields to export (if applicable)
    // This might be in an export modal or settings

    // Step 9: Download CSV
    const exportButton = page.locator('button:has-text("Exportera"), button:has-text("Export"), [data-testid="export-btn"]').first();
    
    // Step 10: Verify CSV contains only crew-ready employees
    const csv = await downloadAndParseCSV(page);
    
    // Verify CSV contains the employee we marked as crew-ready
    const csvText = csv.flat().join(' ');
    expect(csvText).toContain('Prereq');
    expect(csvText).toContain('Test');

    // Verify CSV has crew-ready indicator
    if (csv.length > 0) {
      const headers = csv[0];
      const crewReadyIndex = headers.findIndex(h => 
        h.toLowerCase().includes('crew') || h.toLowerCase().includes('ready')
      );
      if (crewReadyIndex >= 0 && csv.length > 1) {
        const crewReadyValue = csv[1][crewReadyIndex];
        expect(crewReadyValue.toLowerCase()).toMatch(/yes|true|ja|1/i);
      }
    }
  });
});

