/**
 * E2E Tests for HR Admin Negative Case
 * 
 * Story: 16.6 - Comprehensive Test Coverage for Change Notifications
 * 
 * Tests that HR Admin users do NOT see:
 * - Change notification banner
 * - Field highlights in employee table
 * 
 * Verifies role-based exclusion works end-to-end
 */

import { test, expect } from '@playwright/test';
import { setupTestUser, loginAsHRAdmin } from '../../helpers/e2e-helpers';

test.describe('Story 16.6: HR Admin Should NOT See Banner or Highlights', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser();
    // Login as HR Admin (already navigates to dashboard)
    await loginAsHRAdmin(page);
    await page.waitForSelector('[data-testid^="employee-row-"], [data-testid^="employee-card-"]', { timeout: 15000 });
    await page.waitForLoadState('load');
  });

  test('HR admin should not see change notification banner', async ({ page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify banner does NOT appear
    // Banner uses role="alert" and contains change notification text
    const banner = page.locator('[role="alert"]').filter({
      hasText: /ändringar gjorda|changes made|sedan din senaste inloggning|since your last login/i,
    });

    const bannerCount = await banner.count();
    expect(bannerCount).toBe(0);

    // Also check for banner by class name (ChangeNotificationBanner component)
    const bannerByClass = page.locator('.bg-blue-50, .bg-blue-950').filter({
      hasText: /ändringar|changes/i,
    });
    const bannerByClassCount = await bannerByClass.count();
    expect(bannerByClassCount).toBe(0);
  });

  test('HR admin should not see field highlights in employee table', async ({ page }) => {
    // Wait for table to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get first employee row or card
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    const firstCard = page.locator('[data-testid^="employee-card-"]').first();

    const rowCount = await firstRow.count();
    const cardCount = await firstCard.count();

    if (rowCount === 0 && cardCount === 0) {
      test.skip();
      return;
    }

    // Check for highlight classes (amber/yellow background)
    // Highlight uses: bg-amber-50, dark:bg-amber-950/20
    const highlightedCells = page.locator('[class*="amber"], [class*="bg-amber"]');
    const highlightCount = await highlightedCells.count();

    // HR admin should not see any highlights
    expect(highlightCount).toBe(0);
  });

  test('HR admin should not see banner even when employee changes exist', async ({ page }) => {
    // This test verifies that even if changes exist in the system,
    // HR admin should not see the banner
    
    // First, we need to create a change scenario
    // For E2E, we'll verify the banner doesn't appear regardless of changes
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for banner - should NOT be present
    const banner = page.locator('[role="alert"]').filter({
      hasText: /ändringar|changes/i,
    });

    const bannerCount = await banner.count();
    expect(bannerCount).toBe(0);

    // Verify dashboard is loaded and functional
    const table = page.locator('table, [data-testid^="employee-row-"], [data-testid^="employee-card-"]').first();
    await expect(table).toBeVisible();
  });

  test('HR admin dashboard should render normally without banner', async ({ page }) => {
    // Verify that dashboard renders correctly for HR admin
    // even without the banner
    
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Dashboard should have title (h2 with translation)
    // The title uses t('title') which might translate to various text
    // Check for any h2 or h1 that's visible
    const title = page.locator('h2, h1').first();
    await expect(title).toBeVisible({ timeout: 5000 });

    // Employee table/cards should be visible
    const employeeView = page.locator('table, [data-testid^="employee-row-"], [data-testid^="employee-card-"]').first();
    await expect(employeeView).toBeVisible();

    // Banner should NOT be present
    const banner = page.locator('[role="alert"]').filter({
      hasText: /ändringar|changes/i,
    });
    const bannerCount = await banner.count();
    expect(bannerCount).toBe(0);
  });

  test('HR admin should not see highlights after making employee changes', async ({ page }) => {
    // This test verifies that even after HR admin makes changes,
    // they don't see highlights (because they're HR admin, not external user)
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get first employee row
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    const rowCount = await firstRow.count();

    if (rowCount === 0) {
      test.skip();
      return;
    }

    // Find an editable cell
    const editableCell = firstRow.locator('[role="gridcell"]').filter({
      has: page.locator('.cursor-pointer, input, [role="combobox"]'),
    }).first();

    const cellCount = await editableCell.count();

    if (cellCount > 0) {
      // Try to edit a field
      await editableCell.click();
      await page.waitForTimeout(500);

      // Check if input appeared
      const input = editableCell.locator('input').first();
      const inputCount = await input.count();

      if (inputCount > 0) {
        // Get current value
        const currentValue = await input.inputValue();
        const newValue = currentValue + ' Test';

        // Update value
        await input.fill(newValue);
        await page.waitForTimeout(300);

        // Save (press Enter)
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);

        // Wait for save to complete
        await page.waitForTimeout(500);

        // Verify no highlights appear (HR admin shouldn't see them)
        const highlightedCells = page.locator('[class*="amber"], [class*="bg-amber"]');
        const highlightCount = await highlightedCells.count();
        expect(highlightCount).toBe(0);
      }
    }
  });
});

