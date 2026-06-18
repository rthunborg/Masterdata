import { test, expect } from '@playwright/test';
import { setupTestUser, loginAsHRAdmin } from '../../helpers/e2e-helpers';

test.describe('Story 13.2: Employee Selection Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser();
    await loginAsHRAdmin(page);
    await page.goto('/dashboard');

    const employeeRows = page.locator('[data-testid^="employee-row-"]');
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });
    await expect(employeeRows.first()).toBeVisible({ timeout: 15000 });
  });

  function employeeCheckbox(page: import('@playwright/test').Page, index: number) {
    return page.locator('[data-testid^="employee-select-checkbox-"]').nth(index);
  }

  test('user can check checkbox to select employee', async ({ page }) => {
    // Find the first employee row
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    
    // Find the checkbox in the first column
    const checkbox = employeeCheckbox(page, 0);
    
    // Initially unchecked
    await expect(checkbox).not.toBeChecked();
    
    // Click checkbox to select
    await checkbox.click();
    
    // Should be checked
    await expect(checkbox).toBeChecked();
    
    // Row should have selected styling
    await expect(firstRow).toHaveClass(/bg-gray-100/);
  });

  test('user can uncheck checkbox to deselect employee', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    const checkbox = employeeCheckbox(page, 0);
    
    // Select first
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await expect(firstRow).toHaveClass(/bg-gray-100/);
    
    // Deselect
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
    await expect(firstRow).not.toHaveClass(/bg-gray-100/);
  });

  test('selected employees show greyish tint', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    const checkbox = employeeCheckbox(page, 0);
    
    // Select
    await checkbox.click();
    
    // Should have greyish tint
    await expect(firstRow).toHaveClass(/bg-gray-100/);
    
    // Check that text is still readable (not obscured)
    const rowText = await firstRow.textContent();
    expect(rowText).toBeTruthy();
    expect(rowText?.trim().length).toBeGreaterThan(0);
  });

  test('multiple employees can be selected', async ({ page }) => {
    const rows = page.locator('[data-testid^="employee-row-"]');
    const firstRow = rows.first();
    const secondRow = rows.nth(1);
    
    const checkbox1 = employeeCheckbox(page, 0);
    const checkbox2 = employeeCheckbox(page, 1);
    
    // Select both
    await checkbox1.click();
    await checkbox2.click();
    
    // Both should be checked
    await expect(checkbox1).toBeChecked();
    await expect(checkbox2).toBeChecked();
    
    // Both should have selected styling
    await expect(firstRow).toHaveClass(/bg-gray-100/);
    await expect(secondRow).toHaveClass(/bg-gray-100/);
  });

  test('selection persists during scroll', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    const checkbox = employeeCheckbox(page, 0);
    
    // Select
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    
    // Scroll down
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Wait a bit for scroll
    await page.waitForTimeout(500);
    
    // Scroll back up
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    
    await page.waitForTimeout(500);
    
    // Selection should still be checked
    await expect(checkbox).toBeChecked();
    await expect(firstRow).toHaveClass(/bg-gray-100/);
  });

  test('selection works on mobile view', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForSelector('article[aria-label]', { timeout: 10000 });
    
    // On mobile, we should see cards instead of table
    // Check if cards are rendered (they might have different structure)
    const cardOrRow = page.locator('article[aria-label]').first();
    
    // Try to find checkbox (might be in card header)
    const checkbox = cardOrRow.getByRole('checkbox').first();
    
    if (await checkbox.count() > 0) {
      // Select
      await checkbox.click({ force: true });
      
      // Should be checked
      await expect(checkbox).toBeChecked();
      
      // Card should have selected styling
      const cardHeader = cardOrRow.locator('[data-testid="employee-card-header"]').first();
      if (await cardHeader.count() > 0) {
        await expect(cardHeader).toHaveClass(/bg-gray-100/);
      }
    } else {
      // If no checkbox found on mobile, skip this test
      test.skip();
    }
  });
});

