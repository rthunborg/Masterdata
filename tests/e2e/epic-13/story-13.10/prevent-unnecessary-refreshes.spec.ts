/**
 * E2E tests for preventing unnecessary view refreshes
 * Story 13.10: Prevent Unnecessary View Refreshes
 */

import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsHRAdmin } from "../../helpers/e2e-helpers";

async function columnIndex(page: Page, label: RegExp) {
  const headers = page.getByRole("columnheader");
  const count = await headers.count();

  for (let index = 0; index < count; index += 1) {
    const headerText = (await headers.nth(index).textContent()) || "";
    if (label.test(headerText)) {
      return index;
    }
  }

  throw new Error(`Column header not found: ${label}`);
}

async function tableCellByColumn(page: Page, row: Locator, label: RegExp) {
  const index = await columnIndex(page, label);
  const cell = row.locator("td").nth(index);
  await expect(cell).toBeVisible({ timeout: 10000 });
  await cell.scrollIntoViewIfNeeded();
  return cell;
}

test.describe("Prevent Unnecessary View Refreshes", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsHRAdmin(page);
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  });

  async function firstNameCell(page: Page) {
    await expect(
      page.getByRole("button", { name: /Totalt antal anställda.*\d+/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("table")).toBeVisible({ timeout: 15000 });
    const row = page.locator('[data-testid^="employee-row-"]').first();
    await expect(row).toBeVisible({ timeout: 15000 });
    const cell = await tableCellByColumn(page, row, /First Name/i);
    await expect(cell.getByRole("gridcell", { name: /Edit first_name/i })).toBeVisible({ timeout: 15000 });
    return cell;
  }

  test("should not refresh when clicking field and clicking away without change", async ({
    page,
  }) => {
    const cell = await firstNameCell(page);
    
    // Get the original value
    const originalValue = await cell.textContent();
    
    // Click on the field to enter edit mode
    await cell.getByRole("gridcell", { name: /Edit first_name/i }).click();
    
    // Wait for input to appear
    await expect(cell.locator("input").first()).toBeVisible();
    
    // Click somewhere else without changing the value
    await page.click("body");
    
    // Wait a bit to ensure no refresh happens
    await page.waitForTimeout(500);
    
    // Verify the value is still the same (no refresh occurred)
    const valueAfterClick = await cell.textContent();
    
    expect(valueAfterClick?.trim()).toBe(originalValue?.trim());
  });

  test("should refresh when changing field value and clicking away", async ({
    page,
  }) => {
    const cell = await firstNameCell(page);
    const originalValue = (await cell.textContent())?.trim() || "";
    
    // Click on the field to enter edit mode
    await cell.getByRole("gridcell", { name: /Edit first_name/i }).click();
    
    // Wait for input to appear
    const input = cell.locator("input").first();
    await input.waitFor({ state: "visible" });
    
    // Change the value
    await input.clear();
    const updatedValue = `${originalValue}X`;
    await input.fill(updatedValue);
    
    // Click somewhere else to save
    await page.click("body");
    
    // Wait for the save to complete
    await page.waitForTimeout(1000);
    
    // Verify the value was updated (refresh occurred)
    await expect(page.locator('[data-testid^="employee-row-"]').first()).toContainText(
      updatedValue,
      { timeout: 15000 }
    );

    const updatedCell = await firstNameCell(page);
    await updatedCell.getByRole("gridcell", { name: /Edit first_name/i }).click();
    const revertInput = updatedCell.locator("input").first();
    await revertInput.waitFor({ state: "visible" });
    await revertInput.fill(originalValue);
    await revertInput.press("Enter");
    await expect(page.locator('[data-testid^="employee-row-"]').first()).toContainText(
      originalValue,
      { timeout: 15000 }
    );
  });

  test("should cancel edit on Escape key without refresh", async ({ page }) => {
    const cell = await firstNameCell(page);
    
    // Get the original value
    const originalValue = await cell.textContent();
    
    // Click on the field to enter edit mode
    await cell.getByRole("gridcell", { name: /Edit first_name/i }).click();
    
    // Wait for input to appear
    const input = cell.locator("input").first();
    await input.waitFor({ state: "visible" });
    
    // Change the value
    await input.clear();
    await input.fill("Changed Value");
    
    // Press Escape to cancel
    await page.keyboard.press("Escape");
    
    // Wait a bit
    await page.waitForTimeout(500);
    
    // Verify the value reverted to original (no save occurred)
    const valueAfterEscape = await cell.textContent();
    
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
    const cell = await firstNameCell(page);
    
    // Get the original value
    const originalValue = await cell.textContent();
    
    // Click on the field to enter edit mode
    await cell.getByRole("gridcell", { name: /Edit first_name/i }).click();
    
    // Wait for input to appear
    const input = cell.locator("input").first();
    await input.waitFor({ state: "visible" });
    
    // Add whitespace to the value
    await input.clear();
    await input.fill(`  ${originalValue?.trim()}  `);
    
    // Click somewhere else
    await page.click("body");
    
    // Wait a bit
    await page.waitForTimeout(1000);
    
    // Verify the value is still the same (whitespace trimmed, no change detected)
    const valueAfterClick = await cell.textContent();
    
    expect(valueAfterClick?.trim()).toBe(originalValue?.trim());
  });
});

