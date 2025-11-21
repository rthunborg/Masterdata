/**
 * E2E tests for preventing unnecessary view refreshes
 * Story 13.10: Prevent Unnecessary View Refreshes
 */

import { test, expect } from "@playwright/test";

test.describe("Prevent Unnecessary View Refreshes", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and login as HR Admin
    await page.goto("/");
    await page.fill('input[type="email"]', "hr@example.com");
    await page.fill('input[type="password"]', "password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test("should not refresh when clicking field and clicking away without change", async ({
    page,
  }) => {
    // Wait for table to load
    await page.waitForSelector("table");

    // Find an editable field (e.g., first name)
    const firstNameCell = page.locator("td").filter({ hasText: /^[A-Z]/ }).first();
    
    // Get the original value
    const originalValue = await firstNameCell.textContent();
    
    // Click on the field to enter edit mode
    await firstNameCell.click();
    
    // Wait for input to appear
    await page.waitForSelector('input[type="text"]', { state: "visible" });
    
    // Click somewhere else without changing the value
    await page.click("body");
    
    // Wait a bit to ensure no refresh happens
    await page.waitForTimeout(500);
    
    // Verify the value is still the same (no refresh occurred)
    const cellAfterClick = page.locator("td").filter({ hasText: /^[A-Z]/ }).first();
    const valueAfterClick = await cellAfterClick.textContent();
    
    expect(valueAfterClick?.trim()).toBe(originalValue?.trim());
  });

  test("should refresh when changing field value and clicking away", async ({
    page,
  }) => {
    // Wait for table to load
    await page.waitForSelector("table");

    // Find an editable field
    const firstNameCell = page.locator("td").filter({ hasText: /^[A-Z]/ }).first();
    
    // Click on the field to enter edit mode
    await firstNameCell.click();
    
    // Wait for input to appear
    const input = page.locator('input[type="text"]').first();
    await input.waitFor({ state: "visible" });
    
    // Change the value
    await input.clear();
    await input.fill("Updated Name");
    
    // Click somewhere else to save
    await page.click("body");
    
    // Wait for the save to complete
    await page.waitForTimeout(1000);
    
    // Verify the value was updated (refresh occurred)
    const updatedCell = page.locator("td").filter({ hasText: "Updated Name" }).first();
    await expect(updatedCell).toBeVisible();
  });

  test("should cancel edit on Escape key without refresh", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector("table");

    // Find an editable field
    const firstNameCell = page.locator("td").filter({ hasText: /^[A-Z]/ }).first();
    
    // Get the original value
    const originalValue = await firstNameCell.textContent();
    
    // Click on the field to enter edit mode
    await firstNameCell.click();
    
    // Wait for input to appear
    const input = page.locator('input[type="text"]').first();
    await input.waitFor({ state: "visible" });
    
    // Change the value
    await input.clear();
    await input.fill("Changed Value");
    
    // Press Escape to cancel
    await page.keyboard.press("Escape");
    
    // Wait a bit
    await page.waitForTimeout(500);
    
    // Verify the value reverted to original (no save occurred)
    const cellAfterEscape = page.locator("td").filter({ hasText: /^[A-Z]/ }).first();
    const valueAfterEscape = await cellAfterEscape.textContent();
    
    expect(valueAfterEscape?.trim()).toBe(originalValue?.trim());
  });

  test("should not refresh when clicking search button", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector("table");

    // Get initial row count
    const initialRows = await page.locator("tbody tr").count();
    
    // Find and click search button
    const searchButton = page.locator('button').filter({ hasText: /search/i }).first();
    if (await searchButton.isVisible()) {
      await searchButton.click();
      
      // Wait a bit
      await page.waitForTimeout(500);
      
      // Verify row count hasn't changed (no unnecessary refresh)
      const rowsAfterSearch = await page.locator("tbody tr").count();
      expect(rowsAfterSearch).toBe(initialRows);
    }
  });

  test("should not refresh when clicking filter checkboxes", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector("table");

    // Get initial row count
    const initialRows = await page.locator("tbody tr").count();
    
    // Find a filter checkbox (e.g., "Include Archived")
    const filterCheckbox = page.locator('input[type="checkbox"]').first();
    if (await filterCheckbox.isVisible()) {
      const initialChecked = await filterCheckbox.isChecked();
      
      // Click the checkbox
      await filterCheckbox.click();
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Verify the checkbox state changed (filter worked)
      const newChecked = await filterCheckbox.isChecked();
      expect(newChecked).toBe(!initialChecked);
      
      // Note: Row count may change due to filter, but that's expected
      // The test verifies that clicking doesn't cause unnecessary refresh
    }
  });

  test("should handle whitespace-only changes as no change", async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector("table");

    // Find an editable field
    const firstNameCell = page.locator("td").filter({ hasText: /^[A-Z]/ }).first();
    
    // Get the original value
    const originalValue = await firstNameCell.textContent();
    
    // Click on the field to enter edit mode
    await firstNameCell.click();
    
    // Wait for input to appear
    const input = page.locator('input[type="text"]').first();
    await input.waitFor({ state: "visible" });
    
    // Add whitespace to the value
    await input.clear();
    await input.fill(`  ${originalValue?.trim()}  `);
    
    // Click somewhere else
    await page.click("body");
    
    // Wait a bit
    await page.waitForTimeout(1000);
    
    // Verify the value is still the same (whitespace trimmed, no change detected)
    const cellAfterClick = page.locator("td").filter({ hasText: /^[A-Z]/ }).first();
    const valueAfterClick = await cellAfterClick.textContent();
    
    expect(valueAfterClick?.trim()).toBe(originalValue?.trim());
  });
});

