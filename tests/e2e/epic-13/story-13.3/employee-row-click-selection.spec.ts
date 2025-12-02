import { test, expect } from '@playwright/test';

test.describe('Story 13.3: Row Click Selection Workflow (REMOVED in Story 9.11)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (assuming login is handled)
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for employee table to be visible
    await page.waitForSelector('[data-testid^="employee-row-"]', { timeout: 10000 });
  });

  test('user can NOT click row to select employee (Story 9.11)', async ({ page }) => {
    // Find first employee row
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    
    // Verify row exists
    await expect(firstRow).toBeVisible();
    
    // Click on the row (not on a button or input)
    await firstRow.click();
    
    // Verify row does NOT have selected styling (row clicks removed in Story 9.11)
    await expect(firstRow).not.toHaveClass(/bg-gray-100/);
  });

  test('row clicks do NOT change selection (Story 9.11)', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    
    // Initially not selected
    await expect(firstRow).not.toHaveClass(/bg-gray-100/);
    
    // Click row - should NOT select
    await firstRow.click();
    await expect(firstRow).not.toHaveClass(/bg-gray-100/);
    
    // Click again - should still NOT select
    await firstRow.click();
    await expect(firstRow).not.toHaveClass(/bg-gray-100/);
  });

  test('clicking Edit button does not change selection (Story 9.11)', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    
    // Row should not be selected initially
    await expect(firstRow).not.toHaveClass(/bg-gray-100/);
    
    // Find and click Edit button (if available)
    const editButton = page.locator('button[aria-label*="Edit"], button:has-text("Edit")').first();
    
    if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editButton.click();
      
      // Row should still NOT be selected (row clicks removed)
      await expect(firstRow).not.toHaveClass(/bg-gray-100/);
    }
  });

  test('clicking inline field does not change selection (Story 9.11)', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    
    // Row should not be selected initially
    await expect(firstRow).not.toHaveClass(/bg-gray-100/);
    
    // Find an input field in the row (if available)
    const input = firstRow.locator('input').first();
    
    if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
      await input.click();
      
      // Row should still NOT be selected
      await expect(firstRow).not.toHaveClass(/bg-gray-100/);
    }
  });

  test('row clicks do NOT select multiple rows (Story 9.11)', async ({ page }) => {
    const rows = page.locator('[data-testid^="employee-row-"]');
    const firstRow = rows.first();
    const secondRow = rows.nth(1);
    
    // Click first row - should NOT select
    await firstRow.click();
    await expect(firstRow).not.toHaveClass(/bg-gray-100/);
    
    // Click second row - should NOT select
    await secondRow.click();
    await expect(secondRow).not.toHaveClass(/bg-gray-100/);
    
    // First row should still NOT be selected
    await expect(firstRow).not.toHaveClass(/bg-gray-100/);
  });

  test('card click does NOT work on mobile (Story 9.11)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for mobile card view
    await page.waitForLoadState('networkidle');
    
    // Find employee card (mobile view uses cards instead of table rows)
    const card = page.locator('article, [role="article"]').first();
    
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click on the card - should NOT select (card clicks removed)
      await card.click();
      
      // Card should NOT have selected styling
      await expect(card).not.toHaveClass(/bg-gray-100/);
    }
  });
});

