import { test, expect } from "@playwright/test";
import { loginAsHRAdmin } from "../../helpers/e2e-helpers";

test.describe("Export Field Selection", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsHRAdmin(page);
  });

  async function selectFirstEmployee(page: import("@playwright/test").Page) {
    const employeeRows = page.locator('[data-testid^="employee-row-"]');
    const firstRowCheckbox = page.locator('[data-testid^="employee-select-checkbox-"]').first();
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });
    await expect(employeeRows.first()).toBeVisible({ timeout: 15000 });
    await expect(firstRowCheckbox).toBeEnabled({ timeout: 15000 });
    await firstRowCheckbox.click({ timeout: 30000 });
    await expect(firstRowCheckbox).toBeChecked({ timeout: 15000 });
  }

  test("should open export dialog when employees are selected and export button is clicked", async ({ page }) => {
    await selectFirstEmployee(page);

    // Click Export button
    await page.getByRole('button', { name: /Export Selected|Exportera markerade/i }).click();

    // Verify dialog opens
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Välj fält att exportera"), h2:has-text("Select Fields to Export")')).toBeVisible();
  });

  test("should keep export disabled without selection", async ({ page }) => {
    // Ensure no employees are selected (reload page to clear selection)
    await page.reload();

    await expect(page.getByRole('button', { name: /Exportera markerade|Export All Employees/i })).toBeDisabled();
  });

  test("should allow selecting fields and exporting", async ({ page }) => {
    await selectFirstEmployee(page);

    // Click Export button
    await page.getByRole('button', { name: /Export Selected|Exportera markerade/i }).click();

    // Wait for dialog
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Uncheck a field (e.g., Email)
    const emailCheckbox = dialog.locator('label:has-text("Email")');
    await emailCheckbox.click();

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click Export in dialog
    await dialog.getByRole('button', { name: /Exportera|Export/i }).click();

    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('employees_export');
    
    // Verify dialog closes
    await expect(dialog).not.toBeVisible();
  });

  test("should close dialog when cancel is clicked", async ({ page }) => {
    await selectFirstEmployee(page);

    // Click Export button
    await page.getByRole('button', { name: /Export Selected|Exportera markerade/i }).click();

    // Wait for dialog
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Click Cancel
    await dialog.getByRole('button', { name: /Avbryt|Cancel/i }).click();

    // Verify dialog closes
    await expect(dialog).not.toBeVisible();
  });
});
