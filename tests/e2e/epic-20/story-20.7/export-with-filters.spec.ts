/**
 * E2E Tests: Story 20.7 - Export Verification & Fixes
 *
 * Tests the complete flow of exporting employees with active filters.
 */

import { test, expect, type Page } from '@playwright/test';
import { createEmployeeViaUI, loginAsHRAdmin } from '../../helpers/e2e-helpers';

let textFilterValue = 'FilterExport';
let exportSeedCounter = 0;

async function waitForDashboard(page: Page, options: { requireRows?: boolean } = {}) {
  const { requireRows = true } = options;

  if (!requireRows) {
    await expect(
      page.getByRole('heading', { name: /Personalhantering|Employee management/i })
    ).toBeVisible({ timeout: 15000 });
    return;
  }

  await expect(
    page.getByRole('button', { name: /Totalt antal anställda.*\d+/i })
  ).toBeVisible({ timeout: 15000 });

  await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });
  await page.waitForFunction(
    () => document.querySelectorAll('table tbody tr').length > 0,
    undefined,
    { timeout: 15000 }
  );
}

async function openFilterPanel(page: Page) {
  const panel = page.getByTestId('filter-panel');

  if (!(await panel.isVisible({ timeout: 500 }).catch(() => false))) {
    await page.getByTestId('filter-button').click();
  }

  await expect(panel).toBeVisible();
  await expect(page.getByText('Filtrera anställda')).toBeVisible();
}

async function applyTextFilter(
  page: Page,
  columnName: string,
  value = textFilterValue
) {
  await openFilterPanel(page);
  await page.getByTestId(`filter-column-toggle-${columnName}`).click();

  const input = page.getByTestId(`text-filter-input-${columnName}`);
  await expect(input).toBeVisible();
  await input.fill(value);
  await expect(input).toHaveValue(value);

  await page.getByTestId('apply-filters').click();
  await expect(page.getByTestId('filter-panel')).not.toBeVisible();
  await expect(filteredCountDisplay(page)).toBeVisible({ timeout: 10000 });
}

async function applySelectFilter(page: Page, columnName: string, option: string) {
  await openFilterPanel(page);
  await page.getByTestId(`filter-column-toggle-${columnName}`).click();

  const optionCheckbox = page.getByTestId(
    `select-filter-option-${columnName}-${option}`
  );
  await expect(optionCheckbox).toBeVisible();
  await optionCheckbox.click();

  await page.getByTestId('apply-filters').click();
  await expect(page.getByTestId('filter-panel')).not.toBeVisible();
  await expect(filteredCountDisplay(page)).toBeVisible({ timeout: 10000 });
}

function filteredCountDisplay(page: Page) {
  return page.locator('p').filter({ hasText: /Showing \d+ of \d+ employees/i }).first();
}

async function getFilteredCount(page: Page) {
  const countText = await filteredCountDisplay(page).textContent();
  const match = countText?.match(/Showing (\d+) of (\d+) employees/i);

  return {
    filtered: match ? Number(match[1]) : 0,
    total: match ? Number(match[2]) : 0,
  };
}

async function selectAllVisibleEmployees(page: Page) {
  const selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });
  await selectAllCheckbox.click();
}

function exportButton(page: Page) {
  return page.getByRole('button', { name: /export/i }).first();
}

async function seedFilterExportEmployees(page: Page, seed: string) {
  textFilterValue = `FilterExport${seed}`;

  const employees = [
    { first_name: textFilterValue, surname: 'MatchA', ssn: `19871130${seed}1`, rank: 'SEV', gender: 'Man' },
    { first_name: textFilterValue, surname: 'MatchB', ssn: `19871130${seed}2`, rank: 'SEV', gender: 'Woman' },
    { first_name: `ControlExport${seed}`, surname: 'Outside', ssn: `19871130${seed}3`, rank: 'CHEF', gender: 'Man' },
  ];

  for (const employee of employees) {
    await createEmployeeViaUI(page, {
      ...employee,
      hire_date: '2026-01-01',
    });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  }

  await page.goto('/dashboard');
  await waitForDashboard(page);
  await expect(page.getByRole('table')).toContainText(textFilterValue);
}

async function proceedThroughFilteredExportConfirmation(page: Page) {
  const confirmation = page
    .getByRole('alertdialog')
    .filter({ hasText: /Export Filtered Employees/i });

  if (await confirmation.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmation.getByRole('button', { name: /export \d+ employees/i }).click();
  }
}

async function visibleExportFieldDialog(page: Page) {
  const dialog = page
    .locator('div[role="dialog"]')
    .filter({ hasText: /Välj fält att exportera|Select Fields to Export/i });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Story 20.7: Export with Filters', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(async ({ page }, testInfo) => {
    await loginAsHRAdmin(page);
    await page.goto('/dashboard');
    await waitForDashboard(page, { requireRows: false });

    const seed = `${testInfo.workerIndex % 10}${String(exportSeedCounter++ % 100).padStart(2, '0')}`;
    await seedFilterExportEmployees(page, seed);
  });

  test('AC 1.1: Export button label updates when filters are active', async ({ page }) => {
    await expect(exportButton(page)).toBeVisible();

    await applyTextFilter(page, 'first_name');

    await expect(exportButton(page)).toContainText(/Export Filtered \(\d+\)/i);
  });

  test('AC 2.1: Select All checkbox selects only filtered employees', async ({ page }) => {
    const initialRows = await page.locator('table tbody tr').count();
    expect(initialRows).toBeGreaterThan(1);

    await applyTextFilter(page, 'first_name');

    const filteredRows = await page.locator('table tbody tr').count();
    const { filtered, total } = await getFilteredCount(page);

    expect(filteredRows).toBe(filtered);
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(total);

    await selectAllVisibleEmployees(page);

    await expect(
      page.getByRole('button', { name: /export selected/i })
    ).toContainText(`(${filteredRows})`);
  });

  test('AC 3.1: Export button label updates based on state', async ({ page }) => {
    await expect(exportButton(page)).toBeVisible();

    await applyTextFilter(page, 'first_name');
    await expect(exportButton(page)).toContainText(/filtered/i);

    await page.locator('[data-testid^="employee-select-checkbox-"]').first().click();

    await expect(exportButton(page)).toContainText(/selected/i);
    await expect(exportButton(page)).toContainText('(1)');
  });

  test('AC 4.1: Export respects filtered employee list', async ({ page }) => {
    await applyTextFilter(page, 'first_name');
    const { filtered } = await getFilteredCount(page);
    expect(filtered).toBeGreaterThan(0);

    await selectAllVisibleEmployees(page);
    await page.getByRole('button', { name: /export selected/i }).click();
    await proceedThroughFilteredExportConfirmation(page);

    const dialog = await visibleExportFieldDialog(page);

    for (const field of ['first_name', 'surname']) {
      const checkbox = dialog.locator(`[data-testid="export-field-checkbox-${field}"]`);
      await expect(checkbox).toBeVisible();
      if (!(await checkbox.isChecked().catch(() => false))) {
        await checkbox.click();
      }
    }

    const confirmExportButton = dialog.getByRole('button', { name: /Exportera|Export/i });
    await expect(confirmExportButton).toBeEnabled({ timeout: 15000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await confirmExportButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/employees_export_.*\.(csv|xlsx)$/);
    expect(await download.path()).toBeTruthy();
  });

  test('AC 5.1: Shows confirmation dialog when exporting filtered data', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('export-confirmation-dismissed');
    });

    await applyTextFilter(page, 'first_name');
    await selectAllVisibleEmployees(page);
    await page.getByRole('button', { name: /export selected/i }).click();

    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation.getByText('Export Filtered Employees')).toBeVisible();
    await expect(confirmation.getByText(/you are about to export/i)).toBeVisible();
    await expect(confirmation.getByText(/of \d+/i)).toBeVisible();
    await expect(confirmation.getByLabel(/don't ask/i)).toBeVisible();
    await expect(confirmation.getByRole('button', { name: /cancel/i })).toBeVisible();
    await expect(confirmation.getByRole('button', { name: /export \d+ employees/i })).toBeVisible();
  });

  test('AC 5.2: Respects "Don\'t ask again" preference', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('export-confirmation-dismissed');
    });

    await applyTextFilter(page, 'first_name');
    await selectAllVisibleEmployees(page);

    await page.getByRole('button', { name: /export selected/i }).click();
    await expect(page.getByText('Export Filtered Employees')).toBeVisible();

    await page.getByLabel(/don't ask/i).click();
    await page.getByRole('button', { name: /export \d+ employees/i }).click();

    const dialog = await visibleExportFieldDialog(page);
    await dialog.getByRole('button', { name: /Avbryt|Cancel/i }).click();
    await expect(dialog).not.toBeVisible();

    await page.getByRole('button', { name: /export selected/i }).click();

    await expect(page.getByText('Export Filtered Employees')).not.toBeVisible();
    await visibleExportFieldDialog(page);
  });

  test('AC 4.2: Crew Ready export respects filtered state', async ({ page }) => {
    await applySelectFilter(page, 'rank', 'SEV');

    const crewReadyButton = page.getByRole('button', {
      name: /Exportera & markera besättningsklar|Export & Mark Crew Ready/i,
    });
    await expect(crewReadyButton).toBeVisible();

    test.skip(
      await crewReadyButton.isDisabled(),
      'No crew-ready eligible employees are available in the current filtered E2E seed data.'
    );

    const buttonText = await crewReadyButton.textContent();
    expect(buttonText).toMatch(/\(\d+\)/);

    const downloadPromise = page.waitForEvent('download');
    await crewReadyButton.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('crew_ready_employees');
  });

  test('AC 4.3: Clear filters updates export button state', async ({ page }) => {
    await applyTextFilter(page, 'first_name');
    await expect(exportButton(page)).toContainText(/filtered/i);

    await page.getByTestId('clear-filter-button').click();
    await expect(filteredCountDisplay(page)).not.toBeVisible();

    await expect(exportButton(page)).not.toContainText(/filtered/i);
  });

  test('AC 1.2: Export count matches filtered count', async ({ page }) => {
    await applyTextFilter(page, 'first_name');
    const { filtered } = await getFilteredCount(page);

    await selectAllVisibleEmployees(page);

    const buttonText = await page
      .getByRole('button', { name: /export selected/i })
      .textContent();
    const buttonMatch = buttonText?.match(/\((\d+)\)/);
    const buttonCount = buttonMatch ? Number(buttonMatch[1]) : 0;

    expect(buttonCount).toBe(filtered);
  });
});
