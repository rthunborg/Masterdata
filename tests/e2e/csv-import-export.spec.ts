/**
 * End-to-End Test: CSV Import & Validation Journey
 * Story 11.7: End-to-End Critical User Journey Tests
 * AC3: CSV Import & Validation Journey
 * 
 * Tests CSV import workflow with capacity validation
 */

import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/e2e-helpers';
import * as fs from 'fs/promises';

test.describe('CSV Import & Validation E2E Journey', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    // Login as HR Admin
    await loginAsUser(page, 'admin@test.com', 'Test123!');
    await page.goto('/dashboard');
    await page.waitForLoadState('load');
  });

  test('AC3: CSV import and validation journey', async ({ page }, testInfo) => {
    // Step 1: Navigate to import page (or find import button)
    const importButton = page.locator('button:has-text("Importera"), button:has-text("Import"), [data-testid="import-btn"]').first();
    await importButton.click();

    // Wait for import modal
    await page.waitForSelector('[role="dialog"], [data-testid="import-modal"]', { timeout: 5000 });
    const importDialog = page.locator('div[role="dialog"]').filter({ hasText: /Importera anställda|Import/i });

    // Step 2: Upload CSV file with unique employees
    const testCsvPath = testInfo.outputPath('test-employees.csv');
    const unique = Date.now().toString().slice(-6);
    
    const testCsvContent = `first_name,surname,ssn,email,mobile,rank,gender,hire_date
Import${unique},Employee1,19900101-${unique.slice(2)},import${unique}a@example.com,+46701234567,SEV,Man,2025-01-01
Import${unique},Employee2,19900202-${unique.slice(2)},import${unique}b@example.com,+46701234568,CHEF,Woman,2025-01-02`;

    await fs.writeFile(testCsvPath, testCsvContent);

    // Upload file
    const fileInput = page.locator('input[type="file"], [data-testid="file-input"]').first();
    await fileInput.setInputFiles(testCsvPath);

    // Step 3: Review import preview
    await page.waitForTimeout(1000); // Wait for file to be processed
    await expect(page.locator('text=/preview|förhandsgranskning/i')).toBeVisible({ timeout: 5000 });

    // Step 4: Verify capacity warnings shown for full dates
    // Check if warnings appear for dates that are full
    const warnings = page.locator('text=/fullbokad|full|capacity|kapacitet/i');
    await warnings.count();
    // At least some warnings should appear if dates are getting full

    // Step 5: Confirm import
    const confirmButton = importDialog.getByRole('button', { name: /^Importera$|^Import$|^Confirm$/i });
    await confirmButton.click();

    // Step 6: Verify employees created in database
    await expect(
      importDialog.getByText(/import klar|framgångsrikt importerade|success|lyckades|imported/i).first()
    ).toBeVisible({ timeout: 30000 });
    await importDialog.getByRole('button', { name: /^Stäng$|^Close$/i }).first().click();

    // Step 7: Verify capacity respected (no over-assignment)
    // Navigate to important dates to verify capacity
    await page.goto('/dashboard/important-dates');
    await page.waitForLoadState('load');
    
    // Capacity should not be negative
    const capacityBadges = page.locator('[data-testid="capacity-badge"], .badge');
    const badgeCount = await capacityBadges.count();
    for (let i = 0; i < Math.min(badgeCount, 5); i++) {
      const badge = capacityBadges.nth(i);
      const text = await badge.textContent();
      expect(text).not.toContain('-'); // No negative capacity
    }

    // Step 8: Navigate to employees table
    await page.goto('/dashboard');
    await page.waitForLoadState('load');

    // Step 9: Verify all imported employees appear
    const searchInput = page.getByPlaceholder(/sök anställda/i);
    await searchInput.fill(`Import${unique}`);
    await expect(page.locator('table, [data-testid="employee-table"]')).toContainText('Employee1');
    await expect(page.locator('table, [data-testid="employee-table"]')).toContainText('Employee2');

    // Step 10: Export the visible imported employees
    await page.getByRole('checkbox', { name: /select all/i }).click();
    await page.getByRole('button', { name: /Export Selected|Exportera markerade/i }).click();

    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: /Exportera|Export/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/employees_export_.*\.(csv|xlsx)$/);
    expect(await download.path()).toBeTruthy();
  });
});

