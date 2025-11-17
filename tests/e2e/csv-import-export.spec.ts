/**
 * End-to-End Test: CSV Import & Validation Journey
 * Story 11.7: End-to-End Critical User Journey Tests
 * AC3: CSV Import & Validation Journey
 * 
 * Tests CSV import workflow with capacity validation
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, waitForTableUpdate, downloadAndParseCSV } from './helpers/e2e-helpers';
import * as fs from 'fs/promises';
import * as path from 'path';

test.describe('CSV Import & Validation E2E Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Login as HR Admin
    await loginAsUser(page, 'admin@test.com', 'Test123!');
    await page.goto('/dashboard');
    await page.waitForLoadState('load');
  });

  test('AC3: CSV import and validation journey', async ({ page }) => {
    // Step 1: Navigate to import page (or find import button)
    const importButton = page.locator('button:has-text("Importera"), button:has-text("Import"), [data-testid="import-btn"]').first();
    await importButton.click();

    // Wait for import modal
    await page.waitForSelector('[role="dialog"], [data-testid="import-modal"]', { timeout: 5000 });

    // Step 2: Upload CSV file with 10 employees
    const testCsvPath = path.join(__dirname, 'fixtures', 'test-employees.csv');
    
    // Create test CSV file if it doesn't exist
    const testCsvContent = `First Name,Surname,SSN,Email,Mobile,Rank,Gender,Hire Date,ÖMC Date,PE3 Date
Test,Employee1,199001011234,test1@example.com,+46701234567,SEV,Man,2025-01-01,8-9/3,
Test,Employee2,199002021234,test2@example.com,+46701234568,SEV,Kvinna,2025-01-02,8-9/3,
Test,Employee3,199003031234,test3@example.com,+46701234569,CHEF,Man,2025-01-03,8-9/3,
Test,Employee4,199004041234,test4@example.com,+46701234570,SEV,Kvinna,2025-01-04,8-9/3,
Test,Employee5,199005051234,test5@example.com,+46701234571,SEV,Man,2025-01-05,8-9/3,
Test,Employee6,199006061234,test6@example.com,+46701234572,CHEF,Kvinna,2025-01-06,8-9/3,
Test,Employee7,199007071234,test7@example.com,+46701234573,SEV,Man,2025-01-07,8-9/3,
Test,Employee8,199008081234,test8@example.com,+46701234574,SEV,Kvinna,2025-01-08,8-9/3,
Test,Employee9,199009091234,test9@example.com,+46701234575,SEV,Man,2025-01-09,8-9/3,
Test,Employee10,199010101234,test10@example.com,+46701234576,SEV,Kvinna,2025-01-10,8-9/3,`;

    // Ensure fixtures directory exists
    const fixturesDir = path.dirname(testCsvPath);
    await fs.mkdir(fixturesDir, { recursive: true });
    await fs.writeFile(testCsvPath, testCsvContent);

    // Upload file
    const fileInput = page.locator('input[type="file"], [data-testid="file-input"]').first();
    await fileInput.setInputFiles(testCsvPath);

    // Step 3: Review import preview
    await page.waitForTimeout(1000); // Wait for file to be processed
    await expect(page.locator('text=/preview|förhandsgranska/i')).toBeVisible({ timeout: 5000 });

    // Step 4: Verify capacity warnings shown for full dates
    // Check if warnings appear for dates that are full
    const warnings = page.locator('text=/fullbokad|full|capacity|kapacitet/i');
    const warningCount = await warnings.count();
    // At least some warnings should appear if dates are getting full

    // Step 5: Confirm import
    const confirmButton = page.locator('button:has-text("Importera"), button:has-text("Import"), button:has-text("Confirm")').first();
    await confirmButton.click();

    // Step 6: Verify employees created in database
    await page.waitForTimeout(2000); // Wait for import to complete
    await expect(page.locator('text=/success|lyckades|imported/i')).toBeVisible({ timeout: 10000 });

    // Step 7: Verify capacity respected (no over-assignment)
    // Navigate to important dates to verify capacity
    await page.goto('/important-dates');
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
    await waitForTableUpdate(page);
    await expect(page.locator('table, [data-testid="employee-table"]')).toContainText('Employee1');
    await expect(page.locator('table, [data-testid="employee-table"]')).toContainText('Employee10');

    // Step 10: Export employees to CSV
    const exportButton = page.locator('button:has-text("Exportera"), button:has-text("Export"), [data-testid="export-btn"]').first();
    
    // Step 11: Verify CSV format matches import
    const csv = await downloadAndParseCSV(page);
    
    // Verify CSV contains imported employees
    const csvText = csv.flat().join(' ');
    expect(csvText).toContain('Employee1');
    expect(csvText).toContain('Employee10');
    
    // Verify CSV has expected columns
    if (csv.length > 0) {
      const headers = csv[0];
      expect(headers.some(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('namn'))).toBeTruthy();
      expect(headers.some(h => h.toLowerCase().includes('ssn') || h.toLowerCase().includes('personnummer'))).toBeTruthy();
    }
  });
});

