import { test, expect } from "@playwright/test";

test.describe("Export Field Selection", () => {
  test.beforeEach(async ({ page }) => {
    // Login as HR Admin
    await page.goto("/login");
    await page.fill('input[name="email"]', "hr-admin@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should open export dialog when employees are selected and export button is clicked", async ({ page }) => {
    // Select first employee
    const firstRowCheckbox = page.locator('input[type="checkbox"]').nth(1); // nth(0) is header checkbox
    await firstRowCheckbox.click();

    // Click Export button
    await page.click('button:has-text("Export")');

    // Verify dialog opens
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Select Fields to Export")')).toBeVisible();
  });

  test("should show error when export button is clicked without selection", async ({ page }) => {
    // Ensure no employees are selected (reload page to clear selection)
    await page.reload();

    // Click Export button
    await page.click('button:has-text("Export")');

    // Verify error message (toast or alert)
    await expect(page.locator('text=No employees selected')).toBeVisible();
    
    // Verify dialog does NOT open
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();
  });

  test("should allow selecting fields and exporting", async ({ page }) => {
    // Select first employee
    const firstRowCheckbox = page.locator('input[type="checkbox"]').nth(1);
    await firstRowCheckbox.click();

    // Click Export button
    await page.click('button:has-text("Export")');

    // Wait for dialog
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Uncheck a field (e.g., Email)
    const emailCheckbox = dialog.locator('label:has-text("Email")');
    await emailCheckbox.click();

    // Setup download listener
    const downloadPromise = page.waitForEvent('download');

    // Click Export in dialog
    await dialog.locator('button:has-text("Export")').click();

    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('employees_export');
    
    // Verify dialog closes
    await expect(dialog).not.toBeVisible();
  });

  test("should close dialog when cancel is clicked", async ({ page }) => {
    // Select first employee
    const firstRowCheckbox = page.locator('input[type="checkbox"]').nth(1);
    await firstRowCheckbox.click();

    // Click Export button
    await page.click('button:has-text("Export")');

    // Wait for dialog
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Click Cancel
    await dialog.locator('button:has-text("Cancel")').click();

    // Verify dialog closes
    await expect(dialog).not.toBeVisible();
  });
});
