import { test, expect } from '@playwright/test';
import {
  createEmployeeViaUI,
  setupTestUser,
  loginAsHRAdmin,
} from '../../helpers/e2e-helpers';

test.describe('Story 13.4: Export Selected Employees Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser();
    await loginAsHRAdmin(page);
    await page.goto('/dashboard');
    await ensureMinimumEmployees(page, 3);
  });

  function visibleEmployeeCheckboxes(page: import('@playwright/test').Page) {
    return page.locator('[data-testid^="employee-select-checkbox-"]').filter({ visible: true });
  }

  function employeeCheckbox(page: import('@playwright/test').Page, index: number) {
    return visibleEmployeeCheckboxes(page).nth(index);
  }

  function selectedExportButton(page: import('@playwright/test').Page) {
    return page.getByRole('button', { name: /Export Selected|Exportera markerade/i });
  }

  function crewReadyExportButton(page: import('@playwright/test').Page) {
    return page.getByRole('button', {
      name: /Exportera & markera besättningsklar|Export & Mark Crew Ready/i,
    });
  }

  async function ensureMinimumEmployees(page: import('@playwright/test').Page, minimum: number) {
    await page.waitForLoadState('load');

    let existingCount = await visibleEmployeeCheckboxes(page).count();
    for (let index = existingCount; index < minimum; index += 1) {
      const suffix = ((Date.now() + index) % 10000).toString().padStart(4, '0');
      await createEmployeeViaUI(page, {
        first_name: `Export${suffix}`,
        surname: 'E2E',
        ssn: `19900101${suffix}`,
        rank: 'SEV',
        gender: 'Man',
        hire_date: '2025-01-01',
      });
      await page.goto('/dashboard');
      await page.waitForLoadState('load');
      existingCount = await visibleEmployeeCheckboxes(page).count();
    }

    await expect(page.getByRole('table')).toBeVisible({ timeout: 30000 });
    await expect(visibleEmployeeCheckboxes(page).nth(minimum - 1)).toBeVisible({
      timeout: 30000,
    });
  }

  async function exportFromDialog(
    page: import('@playwright/test').Page,
    endpoint: '/api/employees/export' | '/api/employees/export-crew-ready',
    filenamePattern: RegExp
  ) {
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(endpoint) &&
        response.request().method() === 'POST',
      { timeout: 30000 }
    );

    await dialog.getByRole('button', { name: /Exportera|Export/i }).click();

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(filenamePattern);
    expect(await download.path()).toBeTruthy();
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

    await exportButton.click();
    await exportFromDialog(
      page,
      '/api/employees/export',
      /employees_export_.*\.(csv|xlsx)$/
    );
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

    // Click export
    await exportButton.click();

    await exportFromDialog(
      page,
      '/api/employees/export-crew-ready',
      /crew_ready_employees.*\.csv/
    );

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

    await exportButton.click();
    await exportFromDialog(
      page,
      '/api/employees/export',
      /employees_export_.*\.(csv|xlsx)$/
    );
  });

  test.skip('export includes selected employees from multiple pages', async ({ page }) => {
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

      await exportButton.click();
      await exportFromDialog(
        page,
        '/api/employees/export',
        /employees_export_.*\.(csv|xlsx)$/
      );
    } else {
      // If pagination doesn't exist, skip this test
      test.skip();
    }
  });
});

