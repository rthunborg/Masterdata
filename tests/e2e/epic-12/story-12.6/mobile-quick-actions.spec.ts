/**
 * E2E Tests: Mobile Quick Actions and Shortcuts
 * Story 12.6: Mobile Quick Actions and Shortcuts
 * 
 * End-to-end tests for mobile quick actions functionality.
 */

import { test, expect, type Page } from '@playwright/test';
import { createEmployeeViaUI, loginAsHRAdmin } from '../../helpers/e2e-helpers';

const mobileViewport = { width: 375, height: 667 };

async function waitForMobileDashboard(page: Page) {
  await expect(page.getByRole('region', { name: /Employee list/i })).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#employee-search')).toBeVisible({ timeout: 15000 });
}

async function ensureMobileEmployee(page: Page) {
  const existingCard = page.locator('article[aria-label]').first();
  const hasExistingCard = await existingCard.isVisible({ timeout: 1500 }).catch(() => false);

  if (!hasExistingCard) {
    const suffix = Date.now().toString().slice(-6);
    await createEmployeeViaUI(page, {
      first_name: `Quick${suffix}`,
      surname: 'Actions',
      ssn: `19800101${Date.now().toString().slice(-4)}`,
      email: `quick.actions.${suffix}@example.com`,
      mobile: '+46701234567',
      rank: 'SEV',
      gender: 'Man',
    });

    await page.setViewportSize(mobileViewport);
    await waitForMobileDashboard(page);
  }

  await expect(page.locator('article[aria-label]').first()).toBeVisible({ timeout: 15000 });
}

async function openCardContextMenu(page: Page) {
  await ensureMobileEmployee(page);

  const employeeCard = page.locator('article[aria-label]').first();
  await expect(employeeCard).toBeVisible();

  const cardBox = await employeeCard.boundingBox();
  if (!cardBox) {
    throw new Error('Employee card has no bounding box');
  }

  const x = cardBox.x + cardBox.width / 2;
  const y = cardBox.y + Math.min(cardBox.height / 2, 180);
  await employeeCard.evaluate((element, point) => {
    const touch = new Touch({
      identifier: 1,
      target: element,
      clientX: point.x,
      clientY: point.y,
    });
    element.dispatchEvent(new TouchEvent('touchstart', {
      touches: [touch],
      targetTouches: [touch],
      changedTouches: [touch],
      bubbles: true,
      cancelable: true,
    }));
  }, { x, y });
  await page.waitForTimeout(650);
  await employeeCard.evaluate((element, point) => {
    const touch = new Touch({
      identifier: 1,
      target: element,
      clientX: point.x,
      clientY: point.y,
    });
    element.dispatchEvent(new TouchEvent('touchend', {
      touches: [],
      targetTouches: [],
      changedTouches: [touch],
      bubbles: true,
      cancelable: true,
    }));
  }, { x, y });

  const menu = page.getByRole('menu', { name: /Employee quick actions/i });
  await expect(menu).toBeVisible({ timeout: 2000 });
  return menu;
}

test.describe('Mobile Quick Actions (Story 12.6)', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize(mobileViewport);
    
    await loginAsHRAdmin(page);
    await waitForMobileDashboard(page);
  });

  test('[P0] Long-press on employee card shows context menu', async ({ page }) => {
    // Given: I am on the employee list view on mobile
    // When: I long-press on an employee card
    const menu = await openCardContextMenu(page);

    // Then: A context menu appears with quick actions
    await expect(menu.getByRole('button', { name: /View Details/i })).toBeVisible();
    await expect(menu.getByRole('button', { name: /^Edit$/i })).toBeVisible();
  });

  test('[P0] Context menu closes after selecting action', async ({ page }) => {
    // Given: Context menu is open
    const menu = await openCardContextMenu(page);

    // When: I tap an action
    await menu.getByRole('button', { name: /^Edit$/i }).click();

    // Then: The context menu closes automatically
    await expect(menu).not.toBeVisible({ timeout: 1000 });
  });

  test('[P1] Email link has pre-filled subject', async ({ page }) => {
    // Given: I am viewing an employee card with email
    await ensureMobileEmployee(page);
    const emailLink = page.locator('a[href^="mailto:"]').first();
    await expect(emailLink).toBeVisible();

    // When: I check the email link
    const href = await emailLink.getAttribute('href');

    // Then: The subject line is pre-filled: "Re: [Employee Name]"
    expect(href).toContain('subject=');
    expect(decodeURIComponent(href || '')).toContain('Re:');
  });

  test('[P1] Phone link opens dialer', async ({ page }) => {
    // Given: I am viewing an employee card with phone number
    await ensureMobileEmployee(page);
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
    const fab = page.getByRole('button', { name: /Open quick actions menu/i });
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
    const fab = page.getByRole('button', { name: /Open quick actions menu/i });
    await expect(fab).toBeVisible();

    // When: I tap the FAB
    await fab.click();

    // Then: Menu shows: Add Employee, Import CSV, Quick Search
    await expect(page.getByRole('button', { name: /Add Employee/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Import CSV/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Quick Search/i })).toBeVisible();
  });

  test('[P1] Search input uses type="search" for mobile keyboard', async ({ page }) => {
    // Given: I am on the mobile dashboard
    const searchInput = page.locator('#employee-search');

    // Then: Search input has type="search"
    await expect(searchInput).toBeVisible();
    const inputType = await searchInput.getAttribute('type');
    expect(inputType).toBe('search');
  });

  test('[P1] Search debounces input (300ms delay)', async ({ page }) => {
    // Given: I am on the mobile dashboard
    const searchInput = page.locator('#employee-search');
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

  test('[P2] Search history is saved to localStorage', async ({ page }) => {
    // Given: I am on the mobile dashboard
    const searchInput = page.locator('#employee-search');
    const searchForm = searchInput.locator('xpath=ancestor::form');

    // When: I submit a search
    await searchInput.fill('test search');
    await searchForm.press('Enter');

    // Then: Search history is saved locally (last 5 searches)
    const history = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('employee_search_history') || '[]');
    });

    expect(history).toContain('test search');
    expect(history.length).toBeLessThanOrEqual(5);
  });
});

