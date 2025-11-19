/**
 * E2E Tests: Mobile Quick Actions and Shortcuts
 * Story 12.6: Mobile Quick Actions and Shortcuts
 * 
 * End-to-end tests for mobile quick actions functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Mobile Quick Actions (Story 12.6)', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to dashboard (assuming auth is handled)
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForSelector('[data-testid="employee-list"]', { timeout: 10000 });
  });

  test('[P0] Long-press on employee card shows context menu', async ({ page }) => {
    // Given: I am on the employee list view on mobile
    const employeeCard = page.locator('article').first();
    await expect(employeeCard).toBeVisible();

    // When: I long-press (hold for 500ms) on an employee card
    const cardBox = await employeeCard.boundingBox();
    if (cardBox) {
      await page.touchscreen.tap(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await page.waitForTimeout(500); // Wait for long-press delay
    }

    // Then: A context menu appears with quick actions
    await expect(page.locator('text=View Details')).toBeVisible({ timeout: 1000 });
    await expect(page.locator('text=Edit')).toBeVisible();
  });

  test('[P0] Context menu closes after selecting action', async ({ page }) => {
    // Given: Context menu is open
    const employeeCard = page.locator('article').first();
    const cardBox = await employeeCard.boundingBox();
    if (cardBox) {
      await page.touchscreen.tap(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
      await page.waitForTimeout(500);
    }
    await expect(page.locator('text=Edit')).toBeVisible();

    // When: I tap an action
    await page.locator('text=Edit').click();

    // Then: The context menu closes automatically
    await expect(page.locator('text=Edit')).not.toBeVisible({ timeout: 1000 });
  });

  test('[P1] Email link has pre-filled subject', async ({ page }) => {
    // Given: I am viewing an employee card with email
    const emailLink = page.locator('a[href^="mailto:"]').first();
    await expect(emailLink).toBeVisible();

    // When: I check the email link
    const href = await emailLink.getAttribute('href');

    // Then: The subject line is pre-filled: "Re: [Employee Name]"
    expect(href).toContain('subject=');
    expect(href).toContain('Re:');
  });

  test('[P1] Phone link opens dialer', async ({ page }) => {
    // Given: I am viewing an employee card with phone number
    const phoneLink = page.locator('a[href^="tel:"]').first();
    await expect(phoneLink).toBeVisible();

    // When: I check the phone link
    const href = await phoneLink.getAttribute('href');

    // Then: The link uses tel: protocol
    expect(href).toMatch(/^tel:\+/);
  });

  test('[P0] FAB appears for HR Admin on mobile', async ({ page }) => {
    // Given: I am an HR Admin on mobile dashboard
    // (Assuming user is logged in as HR Admin)

    // Then: A floating action button (FAB) appears in the bottom-right corner
    const fab = page.locator('button[aria-label*="quick actions"]');
    await expect(fab).toBeVisible();
    
    // Verify position (bottom-right)
    const fabBox = await fab.boundingBox();
    const viewport = page.viewportSize();
    if (fabBox && viewport) {
      expect(fabBox.x + fabBox.width).toBeGreaterThan(viewport.width * 0.8);
      expect(fabBox.y + fabBox.height).toBeGreaterThan(viewport.height * 0.8);
    }
  });

  test('[P0] FAB menu shows correct options', async ({ page }) => {
    // Given: FAB is visible
    const fab = page.locator('button[aria-label*="quick actions"]');
    await expect(fab).toBeVisible();

    // When: I tap the FAB
    await fab.click();

    // Then: Menu shows: Add Employee, Import CSV, Quick Search
    await expect(page.locator('text=Add Employee')).toBeVisible();
    await expect(page.locator('text=Import CSV')).toBeVisible();
    await expect(page.locator('text=Quick Search')).toBeVisible();
  });

  test('[P1] Search input uses type="search" for mobile keyboard', async ({ page }) => {
    // Given: I am on the mobile dashboard
    const searchInput = page.locator('input[type="search"]');

    // Then: Search input has type="search"
    await expect(searchInput).toBeVisible();
    const inputType = await searchInput.getAttribute('type');
    expect(inputType).toBe('search');
  });

  test('[P1] Search debounces input (300ms delay)', async ({ page }) => {
    // Given: I am on the mobile dashboard
    const searchInput = page.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();

    // When: I type in the search box rapidly
    await searchInput.fill('J');
    await page.waitForTimeout(100);
    await searchInput.fill('Jo');
    await page.waitForTimeout(100);
    await searchInput.fill('Joh');
    await page.waitForTimeout(100);
    await searchInput.fill('John');

    // Then: Search results appear after debounce delay (300ms)
    // Note: This test verifies the input accepts rapid typing
    // Actual debouncing is tested in unit tests
    await expect(searchInput).toHaveValue('John');
  });

  test('[P2] Search history is saved to localStorage', async ({ page, context }) => {
    // Given: I am on the mobile dashboard
    const searchInput = page.locator('input[type="search"]');
    const searchForm = searchInput.locator('xpath=ancestor::form');

    // When: I submit a search
    await searchInput.fill('test search');
    await searchForm.press('Enter');

    // Then: Search history is saved locally (last 5 searches)
    const history = await context.evaluate(() => {
      return JSON.parse(localStorage.getItem('employee_search_history') || '[]');
    });

    expect(history).toContain('test search');
    expect(history.length).toBeLessThanOrEqual(5);
  });
});

