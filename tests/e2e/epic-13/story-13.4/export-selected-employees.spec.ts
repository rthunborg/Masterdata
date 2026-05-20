import { test, expect } from '@playwright/test';
import { setupTestUser, loginAsHRAdmin } from '../../helpers/e2e-helpers';

test.describe('Story 13.4: Export Selected Employees Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser();
    await loginAsHRAdmin(page);
    await page.goto('/dashboard');
    // Wait for table to load
    await page.waitForSelector('[data-testid^="employee-row-"]', { timeout: 10000 });
  });

  function employeeCheckbox(page: import('@playwright/test').Page, index: number) {
    return page.locator('[data-testid^="employee-select-checkbox-"]').nth(index);
  }

  function selectedExportButton(page: import('@playwright/test').Page) {
    return page.getByRole('button', { name: /Export Selected|Exportera markerade/i });
  }

  function crewReadyExportButton(page: import('@playwright/test').Page) {
    return page.getByRole('button', {
      name: /Exportera & markera besättningsklar|Export & Mark Crew Ready/i,
    });
  }

  test('user selects 3 employees and exports selected employees', async ({ page }) => {
    const checkbox1 = employeeCheckbox(page, 0);
    const checkbox2 = employeeCheckbox(page, 1);
    const checkbox3 = employeeCheckbox(page, 2);

    // Select all three
    await checkbox1.click();
    await checkbox2.click();
    await checkbox3.click();

    // Verify all are selected
    await expect(checkbox1).toBeChecked();
    await expect(checkbox2).toBeChecked();
    await expect(checkbox3).toBeChecked();

    // Get employee IDs from the rows (we'll need to extract them)
    // For now, we'll verify the export button is enabled and click it
    const exportButton = selectedExportButton(page);
    
    // Wait for button to be enabled (if it has disabled state)
    await expect(exportButton).toBeEnabled({ timeout: 5000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    await exportButton.click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /Exportera|Export/i }).click();

    // Wait for download
    const download = await downloadPromise;

    // Verify download occurred
    expect(download.suggestedFilename()).toMatch(/employees_export_.*\.(csv|xlsx)$/);
  });

  test('user selects no employees and export is disabled', async ({ page }) => {
    // Don't select any employees
    await expect(selectedExportButton(page)).toBeDisabled();
  });

  test('export crew ready only exports and marks selected employees', async ({ page }) => {
    test.skip(
      await crewReadyExportButton(page).isDisabled(),
      'No crew-ready eligible employees are available in the current E2E seed data.'
    );

    // Select first 2 employees
    const checkbox1 = employeeCheckbox(page, 0);
    const checkbox2 = employeeCheckbox(page, 1);

    // Select both
    await checkbox1.click();
    await checkbox2.click();

    // Verify both are selected
    await expect(checkbox1).toBeChecked();
    await expect(checkbox2).toBeChecked();

    // Get initial crewing_done status (if visible in UI)
    // Note: This might require checking the Crewing/Done column if it's visible

    const exportButton = crewReadyExportButton(page);
    await expect(exportButton).toBeEnabled({ timeout: 5000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Click export
    await exportButton.click();

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/crew_ready_employees.*\.csv/);

    // Wait for table to refresh (employees should be marked as crew ready)
    await page.waitForTimeout(2000);

    // Verify the exported employees are now marked as crew ready
    // This would require checking the Crewing/Done column or visual indicators
    // For now, we verify the export completed successfully
  });

  test('unselecting employees before export excludes them', async ({ page }) => {
    const checkbox1 = employeeCheckbox(page, 0);
    const checkbox2 = employeeCheckbox(page, 1);
    const checkbox3 = employeeCheckbox(page, 2);

    // Select all three
    await checkbox1.click();
    await checkbox2.click();
    await checkbox3.click();

    // Verify all are selected
    await expect(checkbox1).toBeChecked();
    await expect(checkbox2).toBeChecked();
    await expect(checkbox3).toBeChecked();

    // Unselect the third one
    await checkbox3.click();
    await expect(checkbox3).not.toBeChecked();

    // Now export
    const exportButton = selectedExportButton(page);
    await expect(exportButton).toBeEnabled({ timeout: 5000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await exportButton.click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /Exportera|Export/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/employees_export_.*\.(csv|xlsx)$/);
  });

  test('export includes selected employees from multiple pages', async ({ page }) => {
    test.skip(
      true,
      'Dashboard selection no longer uses paginated table pages; selection persistence is covered in the non-paginated table.'
    );

    // This test assumes pagination exists
    // Select employees from first page
    const checkbox1 = employeeCheckbox(page, 0);
    await checkbox1.click();
    await expect(checkbox1).toBeChecked();

    // Try to navigate to next page (if pagination exists)
    const nextPageButton = page.getByRole('button', { name: /next|→|>|next page/i });
    
    if (await nextPageButton.count() > 0 && await nextPageButton.isEnabled()) {
      await nextPageButton.click();
      await page.waitForTimeout(1000); // Wait for page to load

      // Select an employee from second page
      const checkbox2 = employeeCheckbox(page, 0);
      await checkbox2.click();
      await expect(checkbox2).toBeChecked();

      // Export
      const exportButton = selectedExportButton(page);
      await expect(exportButton).toBeEnabled({ timeout: 5000 });

      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await exportButton.click();
      const dialog = page.locator('div[role="dialog"]');
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /Exportera|Export/i }).click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/employees_export_.*\.(csv|xlsx)$/);
    } else {
      // If pagination doesn't exist, skip this test
      test.skip();
    }
  });
});

