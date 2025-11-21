/**
 * E2E Tests for Header Text Display
 * Story 13.12: Update Header Text to "Säsongsrekrytering 2026"
 * 
 * Tests verify:
 * - Header displays "Säsongsrekrytering 2026" on all pages
 * - Header text is visible and readable
 * - Header works correctly on mobile
 * - "HR Masterdata" is no longer displayed
 */

import { test, expect } from '@playwright/test';
import { setupTestUser, loginAsHRAdmin } from '../../helpers/e2e-helpers';

test.describe('Story 13.12: Header Text Display', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser();
    await loginAsHRAdmin(page);
  });

  test('should display "Säsongsrekrytering 2026" in header on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('header', { timeout: 10000 });

    // Check for new header text
    const headerText = page.locator('header h1:has-text("Säsongsrekrytering 2026")');
    await expect(headerText).toBeVisible();
  });

  test('should NOT display "HR Masterdata" in header', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('header', { timeout: 10000 });

    // Verify old text is not present
    const oldText = page.locator('text=HR Masterdata');
    await expect(oldText).not.toBeVisible();
  });

  test('should display correct header text on important dates page', async ({ page }) => {
    await page.goto('/dashboard/important-dates');
    await page.waitForSelector('header', { timeout: 10000 });

    const headerText = page.locator('header h1:has-text("Säsongsrekrytering 2026")');
    await expect(headerText).toBeVisible();
  });

  test('should display correct header text on user management page', async ({ page }) => {
    await page.goto('/dashboard/admin/users');
    await page.waitForSelector('header', { timeout: 10000 });

    const headerText = page.locator('header h1:has-text("Säsongsrekrytering 2026")');
    await expect(headerText).toBeVisible();
  });

  test('should display correct header text on column settings page', async ({ page }) => {
    await page.goto('/dashboard/admin/columns');
    await page.waitForSelector('header', { timeout: 10000 });

    const headerText = page.locator('header h1:has-text("Säsongsrekrytering 2026")');
    await expect(headerText).toBeVisible();
  });

  test('should display header text correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForSelector('header', { timeout: 10000 });

    // On mobile, header text should be hidden (hidden sm:block)
    // But we can verify the header itself is visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // On mobile, the text might be hidden, so we check the header structure
    // The text should exist in DOM but may be hidden via CSS
    const headerText = page.locator('header h1');
    await expect(headerText).toHaveCount(1);
  });

  test('should display header text correctly on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForSelector('header', { timeout: 10000 });

    // On desktop, header text should be visible
    const headerText = page.locator('header h1:has-text("Säsongsrekrytering 2026")');
    await expect(headerText).toBeVisible();
  });

  test('should not break header layout with longer text', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('header', { timeout: 10000 });

    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check that header doesn't overflow
    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();
    
    // Header should have reasonable height
    if (headerBox) {
      expect(headerBox.height).toBeGreaterThan(0);
      expect(headerBox.height).toBeLessThan(200); // Should not be excessively tall
    }
  });

  test('should maintain header functionality with new text', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('header', { timeout: 10000 });

    // Verify header elements are still functional
    const logoutButton = page.locator('button:has-text("Logga ut")');
    await expect(logoutButton).toBeVisible();

    // Verify logo is present
    const logo = page.locator('img[alt="Stena Line"]');
    await expect(logo).toBeVisible();
  });
});

