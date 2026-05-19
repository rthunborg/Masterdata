/**
 * E2E Tests: Story 20.7 - Export Verification & Fixes
 * 
 * Tests the complete flow of exporting employees with active filters.
 */

import { test, expect } from '@playwright/test';
import { loginAsHRAdmin } from '../../helpers/e2e-helpers';

test.describe('Story 20.7: Export with Filters', () => {
  test.beforeEach(async ({ page }) => {
    // Login as HR Admin
    await loginAsHRAdmin(page);
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for employee table to load
    await page.waitForSelector('table', { timeout: 10000 });
  });

  test('AC 1.1: Export button label updates when filters are active', async ({ page }) => {
    // Initially, export button should show default text (disabled if nothing selected)
    const exportButton = page.getByRole('button', { name: /export/i }).first();
    await expect(exportButton).toBeVisible();

    // Open filter panel
    const filterButton = page.getByRole('button', { name: /filter/i });
    await filterButton.click();

    // Wait for filter panel to open
    await expect(page.getByText('Filtrera anställda')).toBeVisible();

    // Find and expand First Name filter
    await page.getByText('First Name').click();

    // Enter filter value
    const firstNameInput = page.getByPlaceholder(/sök/i).first();
    await firstNameInput.fill('John');

    // Apply filter
    const applyButton = page.getByRole('button', { name: /tillämpa filter/i });
    await applyButton.click();

    // Wait for filter to be applied
    await page.waitForTimeout(500);

    // Export button should now show filtered count
    await expect(exportButton).toContainText(/filtered/i);
  });

  test('AC 2.1: Select All checkbox selects only filtered employees', async ({ page }) => {
    // Get initial employee count
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(1);

    // Apply a filter
    await page.getByRole('button', { name: /filter/i }).click();
    await expect(page.getByText('Filtrera anställda')).toBeVisible();

    // Apply text filter on First Name
    await page.getByText('First Name').click();
    const firstNameInput = page.getByPlaceholder(/sök/i).first();
    await firstNameInput.fill('J'); // Match names starting with J

    await page.getByRole('button', { name: /tillämpa filter/i }).click();
    await page.waitForTimeout(500);

    // Get filtered row count
    const filteredRows = await page.locator('table tbody tr').count();
    expect(filteredRows).toBeLessThan(rows);
    expect(filteredRows).toBeGreaterThan(0);

    // Click Select All checkbox
    const selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });
    await selectAllCheckbox.click();

    // Verify export button shows count matching filtered employees
    const exportButton = page.getByRole('button', { name: /export selected/i });
    await expect(exportButton).toContainText(`(${filteredRows})`);
  });

  test('AC 3.1: Export button label updates based on state', async ({ page }) => {
    const exportButton = page.getByRole('button', { name: /export/i }).first();

    // State 1: No filters, no selection - should be disabled or show default text
    await expect(exportButton).toBeVisible();

    // State 2: Apply filter - button should show "Export Filtered (X)"
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByText('First Name').click();
    await page.getByPlaceholder(/sök/i).first().fill('John');
    await page.getByRole('button', { name: /tillämpa filter/i }).click();
    await page.waitForTimeout(500);

    await expect(exportButton).toContainText(/filtered/i);

    // State 3: Select employee - button should show "Export Selected (X)"
    const firstCheckbox = page.locator('table tbody tr').first().getByRole('checkbox');
    await firstCheckbox.click();

    await expect(exportButton).toContainText(/selected/i);
    await expect(exportButton).toContainText('(1)');
  });

  test('AC 4.1: Export respects filtered employee list', async ({ page }) => {
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Apply filter to narrow down employees
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByText('First Name').click();
    await page.getByPlaceholder(/sök/i).first().fill('John');
    await page.getByRole('button', { name: /tillämpa filter/i }).click();
    await page.waitForTimeout(500);

    // Verify filtered count display
    await expect(page.getByText(/showing \d+ of \d+ employees/i)).toBeVisible();

    // Select the filtered employee(s)
    const selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });
    await selectAllCheckbox.click();

    // Click export button
    const exportButton = page.getByRole('button', { name: /export selected/i });
    await exportButton.click();

    // Field selection dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select some fields
    const firstNameCheckbox = page.getByLabel('First Name').first();
    const surnameCheckbox = page.getByLabel('Surname').first();
    await firstNameCheckbox.click();
    await surnameCheckbox.click();

    // Confirm export
    const confirmButton = page.getByRole('button', { name: /^export$/i });
    await confirmButton.click();

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/employees_export_.*\.(csv|xlsx)/);

    // Verify file was downloaded
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('AC 5.1: Shows confirmation dialog when exporting filtered data', async ({ page }) => {
    // Clear any previous "don't ask again" setting
    await page.evaluate(() => {
      localStorage.removeItem('export-confirmation-dismissed');
    });

    // Apply filter
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByText('First Name').click();
    await page.getByPlaceholder(/sök/i).first().fill('John');
    await page.getByRole('button', { name: /tillämpa filter/i }).click();
    await page.waitForTimeout(500);

    // Select filtered employees
    const selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });
    await selectAllCheckbox.click();

    // Click export
    const exportButton = page.getByRole('button', { name: /export selected/i });
    await exportButton.click();

    // Confirmation dialog should appear
    await expect(page.getByText('Export Filtered Employees')).toBeVisible();
    await expect(page.getByText(/you are about to export/i)).toBeVisible();
    await expect(page.getByText(/of \d+ employees/i)).toBeVisible();

    // Dialog should have "Don't ask again" checkbox
    await expect(page.getByLabel(/don't ask/i)).toBeVisible();

    // Dialog should have Cancel and Export buttons
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /export.*employees/i })).toBeVisible();
  });

  test('AC 5.2: Respects "Don\'t ask again" preference', async ({ page }) => {
    // Clear previous setting
    await page.evaluate(() => {
      localStorage.removeItem('export-confirmation-dismissed');
    });

    // Apply filter and select employees
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByText('First Name').click();
    await page.getByPlaceholder(/sök/i).first().fill('John');
    await page.getByRole('button', { name: /tillämpa filter/i }).click();
    await page.waitForTimeout(500);

    const selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });
    await selectAllCheckbox.click();

    // First export - confirmation should appear
    await page.getByRole('button', { name: /export selected/i }).click();
    await expect(page.getByText('Export Filtered Employees')).toBeVisible();

    // Check "Don't ask again"
    await page.getByLabel(/don't ask/i).click();

    // Confirm
    await page.getByRole('button', { name: /export.*employees/i }).click();

    // Field selection dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Cancel the export
    await page.getByRole('button', { name: /cancel/i }).click();

    // Try to export again - confirmation should NOT appear
    await page.getByRole('button', { name: /export selected/i }).click();

    // Should go directly to field selection dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Should NOT show confirmation text
    await expect(page.getByText('Export Filtered Employees')).not.toBeVisible();
  });

  test('AC 4.2: Crew Ready export respects filtered state', async ({ page }) => {
    // Apply filter
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByText('Rank').click();
    await page.getByRole('combobox').selectOption('SEV');
    await page.getByRole('button', { name: /tillämpa filter/i }).click();
    await page.waitForTimeout(500);

    // Check if Crew Ready export button exists and is visible
    const crewReadyButton = page.getByRole('button', { name: /crew ready/i });
    
    if (await crewReadyButton.isVisible()) {
      const buttonText = await crewReadyButton.textContent();
      
      // Button should show count of eligible employees from filtered set
      expect(buttonText).toMatch(/\(\d+\)/);

      // If there are eligible employees, test the export
      if (!buttonText?.includes('(0)')) {
        // Setup download listener
        const downloadPromise = page.waitForEvent('download');

        // Click export crew ready
        await crewReadyButton.click();

        // Wait for download
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/crew_ready_employees_.*\.csv/);
      }
    }
  });

  test('AC 4.3: Clear filters updates export button state', async ({ page }) => {
    // Apply filter
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByText('First Name').click();
    await page.getByPlaceholder(/sök/i).first().fill('John');
    await page.getByRole('button', { name: /tillämpa filter/i }).click();
    await page.waitForTimeout(500);

    // Export button should show filtered state
    const exportButton = page.getByRole('button', { name: /export/i }).first();
    await expect(exportButton).toContainText(/filtered/i);

    // Clear filters
    const clearButton = page.getByRole('button', { name: /clear.*filter/i });
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await page.waitForTimeout(500);

      // Export button should return to default state
      await expect(exportButton).not.toContainText(/filtered/i);
    }
  });

  test('AC 1.2: Export count matches filtered count', async ({ page }) => {
    // Apply filter
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByText('First Name').click();
    await page.getByPlaceholder(/sök/i).first().fill('J');
    await page.getByRole('button', { name: /tillämpa filter/i }).click();
    await page.waitForTimeout(500);

    // Get filtered count from display
    const filteredCountText = await page.getByText(/showing \d+ of \d+ employees/i).textContent();
    const filteredMatch = filteredCountText?.match(/showing (\d+)/);
    const filteredCount = filteredMatch ? parseInt(filteredMatch[1]) : 0;

    // Select all filtered employees
    await page.getByRole('checkbox', { name: /select all/i }).click();

    // Export button should show same count
    const exportButton = page.getByRole('button', { name: /export selected/i });
    const buttonText = await exportButton.textContent();
    const buttonMatch = buttonText?.match(/\((\d+)\)/);
    const buttonCount = buttonMatch ? parseInt(buttonMatch[1]) : 0;

    expect(buttonCount).toBe(filteredCount);
  });
});
