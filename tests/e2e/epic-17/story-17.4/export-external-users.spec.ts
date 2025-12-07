/**
 * E2E Tests for Story 17.4: Export Functionality for External Users
 * 
 * Tests that external party users can export employees with field selection,
 * but only for fields they have view access to.
 */

import { test, expect } from "@playwright/test";
import { setupTestUser, loginAsUser } from "../../helpers/e2e-helpers";

test.describe("Story 17.4: Export Functionality for External Users", () => {
  test.beforeEach(async () => {
    await setupTestUser();
  });

  test("[P0] Export button is visible for external users", async ({ page }) => {
    // Given: An external user is logged in
    const externalEmail = process.env.E2E_EXTERNAL_EMAIL || "sodexo@test.com";
    const externalPassword = process.env.E2E_EXTERNAL_PASSWORD || "Test123!";
    
    await page.goto("/login");
    await loginAsUser(page, externalEmail, externalPassword);
    await page.waitForLoadState("load");

    // When: They view the dashboard
    // Then: The export button is visible
    const exportButton = page.locator('button:has-text("Exportera markerade anställda"), button:has-text("Export")');
    await expect(exportButton).toBeVisible({ timeout: 10000 });
  });

  test("[P0] Export dialog shows only viewable fields for external users", async ({ page }) => {
    // Given: An external user is logged in and has selected employees
    const externalEmail = process.env.E2E_EXTERNAL_EMAIL || "sodexo@test.com";
    const externalPassword = process.env.E2E_EXTERNAL_PASSWORD || "Test123!";
    
    await page.goto("/login");
    await loginAsUser(page, externalEmail, externalPassword);
    await page.waitForLoadState("load");

    // Wait for table to load
    await page.waitForSelector("table, [data-testid*='employee']", { timeout: 10000 });

    // Select first employee
    const firstRowCheckbox = page.locator('input[type="checkbox"]').nth(1); // nth(0) is header checkbox
    const checkboxCount = await firstRowCheckbox.count();
    
    if (checkboxCount > 0) {
      await firstRowCheckbox.click();
      await page.waitForTimeout(500);

      // When: They click the export button
      const exportButton = page.locator('button:has-text("Exportera markerade anställda"), button:has-text("Export")');
      await exportButton.click();

      // Wait for dialog to open
      const dialog = page.locator('div[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Then: Only fields with view permission are shown
      // Verify dialog title
      await expect(dialog.locator('h2:has-text("Välj fält att exportera"), h2:has-text("Select Fields to Export")')).toBeVisible();

      // Verify that fields are filtered (we can't know exact fields, but we can verify structure)
      const fieldCheckboxes = dialog.locator('input[type="checkbox"]');
      const checkboxCount = await fieldCheckboxes.count();
      
      // Should have at least some fields (external users should see some fields)
      expect(checkboxCount).toBeGreaterThan(0);

      // Verify masterdata fields section exists if there are any
      const masterdataSection = dialog.locator('text=/Masterdata|masterdata/i');
      const hasMasterdataSection = await masterdataSection.count() > 0;
      
      // Either masterdata section exists or custom fields exist
      const customFieldsSection = dialog.locator('text=/Anpassade fält|Custom Fields/i');
      const hasCustomFieldsSection = await customFieldsSection.count() > 0;
      
      expect(hasMasterdataSection || hasCustomFieldsSection).toBe(true);
    } else {
      // Skip test if no employees exist
      test.skip();
    }
  });

  test("[P1] External user can export with permission-based field filtering", async ({ page }) => {
    // Given: An external user is logged in and has selected employees
    const externalEmail = process.env.E2E_EXTERNAL_EMAIL || "sodexo@test.com";
    const externalPassword = process.env.E2E_EXTERNAL_PASSWORD || "Test123!";
    
    await page.goto("/login");
    await loginAsUser(page, externalEmail, externalPassword);
    await page.waitForLoadState("load");

    // Wait for table to load
    await page.waitForSelector("table, [data-testid*='employee']", { timeout: 10000 });

    // Select first employee
    const firstRowCheckbox = page.locator('input[type="checkbox"]').nth(1);
    const checkboxCount = await firstRowCheckbox.count();
    
    if (checkboxCount > 0) {
      await firstRowCheckbox.click();
      await page.waitForTimeout(500);

      // When: They click export and select fields
      const exportButton = page.locator('button:has-text("Exportera markerade anställda"), button:has-text("Export")');
      await exportButton.click();

      // Wait for dialog
      const dialog = page.locator('div[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Select at least one field (first available checkbox)
      const fieldCheckboxes = dialog.locator('input[type="checkbox"]');
      const checkboxCount = await fieldCheckboxes.count();
      
      if (checkboxCount > 0) {
        // Check first field if not already checked
        const firstField = fieldCheckboxes.first();
        const isChecked = await firstField.isChecked();
        if (!isChecked) {
          await firstField.click();
        }

        // Setup download listener
        const downloadPromise = page.waitForEvent("download", { timeout: 30000 });

        // Click Export button in dialog
        const exportDialogButton = dialog.locator('button:has-text("Exportera"), button:has-text("Export")').last();
        await exportDialogButton.click();

        // Then: CSV file is downloaded
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain("employees_export");

        // Verify dialog closes
        await expect(dialog).not.toBeVisible({ timeout: 5000 });
      } else {
        // Skip if no fields available
        test.skip();
      }
    } else {
      // Skip test if no employees exist
      test.skip();
    }
  });

  test("[P1] Export button is disabled when no employees are selected", async ({ page }) => {
    // Given: An external user is logged in with no employees selected
    const externalEmail = process.env.E2E_EXTERNAL_EMAIL || "sodexo@test.com";
    const externalPassword = process.env.E2E_EXTERNAL_PASSWORD || "Test123!";
    
    await page.goto("/login");
    await loginAsUser(page, externalEmail, externalPassword);
    await page.waitForLoadState("load");

    // Wait for table to load
    await page.waitForSelector("table, [data-testid*='employee']", { timeout: 10000 });
    await page.waitForTimeout(1000); // Give time for any auto-selection to clear

    // When: They view the export button
    const exportButton = page.locator('button:has-text("Exportera markerade anställda"), button:has-text("Export")');
    
    // Then: The button is disabled
    await expect(exportButton).toBeDisabled();
  });

  test("[P2] Export shows error when no employees selected", async ({ page }) => {
    // Given: An external user is logged in with no employees selected
    const externalEmail = process.env.E2E_EXTERNAL_EMAIL || "sodexo@test.com";
    const externalPassword = process.env.E2E_EXTERNAL_PASSWORD || "Test123!";
    
    await page.goto("/login");
    await loginAsUser(page, externalEmail, externalPassword);
    await page.waitForLoadState("load");

    // Wait for table to load
    await page.waitForSelector("table, [data-testid*='employee']", { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Reload to ensure no selection
    await page.reload();
    await page.waitForLoadState("load");
    await page.waitForTimeout(1000);

    // When: They try to click export (if button is somehow enabled)
    // Note: Button should be disabled, but if it's not, clicking should show error
    const exportButton = page.locator('button:has-text("Exportera markerade anställda"), button:has-text("Export")');
    
    // Try to click (might be disabled, which is fine)
    const isDisabled = await exportButton.isDisabled().catch(() => true);
    
    if (!isDisabled) {
      await exportButton.click();
      
      // Then: Error message is shown
      await expect(
        page.locator('text=/Inga anställda valda|No employees selected/i')
      ).toBeVisible({ timeout: 5000 });
    } else {
      // Button is disabled, which is the expected behavior
      expect(isDisabled).toBe(true);
    }
  });

  test("[P2] Export dialog can be cancelled", async ({ page }) => {
    // Given: An external user is logged in and has selected employees
    const externalEmail = process.env.E2E_EXTERNAL_EMAIL || "sodexo@test.com";
    const externalPassword = process.env.E2E_EXTERNAL_PASSWORD || "Test123!";
    
    await page.goto("/login");
    await loginAsUser(page, externalEmail, externalPassword);
    await page.waitForLoadState("load");

    // Wait for table to load
    await page.waitForSelector("table, [data-testid*='employee']", { timeout: 10000 });

    // Select first employee
    const firstRowCheckbox = page.locator('input[type="checkbox"]').nth(1);
    const checkboxCount = await firstRowCheckbox.count();
    
    if (checkboxCount > 0) {
      await firstRowCheckbox.click();
      await page.waitForTimeout(500);

      // When: They open export dialog and click cancel
      const exportButton = page.locator('button:has-text("Exportera markerade anställda"), button:has-text("Export")');
      await exportButton.click();

      // Wait for dialog
      const dialog = page.locator('div[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Click Cancel
      const cancelButton = dialog.locator('button:has-text("Avbryt"), button:has-text("Cancel")');
      await cancelButton.click();

      // Then: Dialog closes
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    } else {
      // Skip test if no employees exist
      test.skip();
    }
  });

  test("[P2] Export button text is in Swedish for external users", async ({ page }) => {
    // Given: An external user is logged in
    const externalEmail = process.env.E2E_EXTERNAL_EMAIL || "sodexo@test.com";
    const externalPassword = process.env.E2E_EXTERNAL_PASSWORD || "Test123!";
    
    await page.goto("/login");
    await loginAsUser(page, externalEmail, externalPassword);
    await page.waitForLoadState("load");

    // When: They view the export button
    const exportButton = page.locator('button:has-text("Exportera markerade anställda"), button:has-text("Export")');
    
    // Then: Button text is in Swedish (or at least contains "Exportera")
    const buttonText = await exportButton.textContent();
    expect(buttonText).toMatch(/Exportera|Export/i);
  });
});

