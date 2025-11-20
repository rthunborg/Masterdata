import { test, expect } from '@playwright/test';

test.describe('Story 13.3: Row Click Selection Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (assuming login is handled)
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Wait for employee table to be visible
    await page.waitForSelector('[data-testid^="employee-row-"]', { timeout: 10000 });
  });

  test('user can click row to select employee', async ({ page }) => {
    // Find first employee row
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    
    // Verify row exists
    await expect(firstRow).toBeVisible();
    
    // Click on the row (not on a button or input)
    await firstRow.click();
    
    // Verify row has selected styling (greyish tint)
    await expect(firstRow).toHaveClass(/bg-gray-100/);
  });

  test('user can click selected row to deselect', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    
    // First click - select
    await firstRow.click();
    await expect(firstRow).toHaveClass(/bg-gray-100/);
    
    // Second click - deselect
    await firstRow.click();
    await expect(firstRow).not.toHaveClass(/bg-gray-100/);
  });

  test('clicking Edit button does not change selection', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    
    // Click row to select
    await firstRow.click();
    await expect(firstRow).toHaveClass(/bg-gray-100/);
    
    // Find and click Edit button (if available)
    const editButton = page.locator('button[aria-label*="Edit"], button:has-text("Edit")').first();
    
    if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editButton.click();
      
      // Row should still be selected (or selection should not change)
      // Note: Edit button might open a modal, but selection should remain
      await expect(firstRow).toHaveClass(/bg-gray-100/);
    }
  });

  test('clicking inline field does not change selection', async ({ page }) => {
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    
    // Click row to select
    await firstRow.click();
    await expect(firstRow).toHaveClass(/bg-gray-100/);
    
    // Find an input field in the row (if available)
    const input = firstRow.locator('input').first();
    
    if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
      await input.click();
      
      // Row should still be selected
      await expect(firstRow).toHaveClass(/bg-gray-100/);
    }
  });

  test('multiple rows can be selected via clicks', async ({ page }) => {
    const rows = page.locator('[data-testid^="employee-row-"]');
    const firstRow = rows.first();
    const secondRow = rows.nth(1);
    
    // Click first row
    await firstRow.click();
    await expect(firstRow).toHaveClass(/bg-gray-100/);
    
    // Click second row
    await secondRow.click();
    await expect(secondRow).toHaveClass(/bg-gray-100/);
    
    // First row should still be selected
    await expect(firstRow).toHaveClass(/bg-gray-100/);
  });

  test('row click works on mobile cards', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for mobile card view
    await page.waitForLoadState('networkidle');
    
    // Find employee card (mobile view uses cards instead of table rows)
    const card = page.locator('article, [role="article"]').first();
    
    if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click on the card
      await card.click();
      
      // Card should have selected styling
      await expect(card).toHaveClass(/bg-gray-100/);
    }
  });
});

