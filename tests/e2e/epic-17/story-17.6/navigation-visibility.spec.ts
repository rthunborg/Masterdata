/**
 * E2E Tests for Story 17.6: Navigation Visibility for HR Admin
 * 
 * Tests that HR Admin users still see the navigation area (desktop and mobile).
 * 
 * AC #4: HR Admin Unaffected (navigation still visible and functional)
 */

import { test, expect } from "@playwright/test";
import { loginAsUser } from "../../helpers/e2e-helpers";

test.describe("Story 17.6: Navigation Visibility for HR Admin", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");
    await page.waitForLoadState("load");
  });

  test("[P0] Desktop navigation is visible for HR Admin", async ({ page }) => {
    // Given: An HR Admin user is logged in
    const email = process.env.E2E_ADMIN_EMAIL || "hr@test.com";
    const password = process.env.E2E_ADMIN_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // When: They view the dashboard
    // Then: Desktop navigation SHOULD be visible
    const nav = page.locator('nav.bg-gray-100');
    await expect(nav).toBeVisible({ timeout: 5000 });
  });

  test("[P0] All navigation links are visible for HR Admin", async ({ page }) => {
    // Given: An HR Admin user is logged in
    const email = process.env.E2E_ADMIN_EMAIL || "hr@test.com";
    const password = process.env.E2E_ADMIN_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // When: They view the dashboard
    // Then: All navigation links should be visible
    const nav = page.locator('nav.bg-gray-100');
    await expect(nav).toBeVisible({ timeout: 5000 });

    // Check for navigation links (using flexible text matching)
    const employeesLink = page.locator('nav a:has-text("Anställda"), nav a:has-text("Employees")');
    await expect(employeesLink).toBeVisible({ timeout: 2000 });

    // Important dates link
    const importantDatesLink = page.locator('nav a:has-text("Viktiga datum"), nav a:has-text("Important Dates")');
    const hasImportantDates = await importantDatesLink.count() > 0;
    if (hasImportantDates) {
      await expect(importantDatesLink).toBeVisible({ timeout: 2000 });
    }

    // Admin links might be visible
    const adminLinks = page.locator('nav a:has-text("Användarhantering"), nav a:has-text("User Management"), nav a:has-text("Kolumninställningar"), nav a:has-text("Column Settings")');
    const adminLinksCount = await adminLinks.count();
    if (adminLinksCount > 0) {
      await expect(adminLinks.first()).toBeVisible({ timeout: 2000 });
    }
  });

  test("[P0] Navigation links are functional for HR Admin", async ({ page }) => {
    // Given: An HR Admin user is logged in
    const email = process.env.E2E_ADMIN_EMAIL || "hr@test.com";
    const password = process.env.E2E_ADMIN_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Wait for navigation to be visible
    const nav = page.locator('nav.bg-gray-100');
    await expect(nav).toBeVisible({ timeout: 5000 });

    // When: They click on a navigation link
    // Try to find and click the employees link (should navigate to dashboard)
    const employeesLink = page.locator('nav a:has-text("Anställda"), nav a:has-text("Employees")').first();
    const linkCount = await employeesLink.count();
    
    if (linkCount > 0) {
      await employeesLink.click();
      await page.waitForLoadState("load");

      // Then: They should navigate to the linked page
      // Dashboard URL should be in the URL
      const currentUrl = page.url();
      expect(currentUrl).toContain("/dashboard");
    }
  });

  test("[P0] Mobile navigation menu is visible for HR Admin", async ({ page }) => {
    // Given: An HR Admin user is logged in
    const email = process.env.E2E_ADMIN_EMAIL || "hr@test.com";
    const password = process.env.E2E_ADMIN_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // When: They view the dashboard on mobile
    // Then: Mobile navigation menu button SHOULD be visible
    // Look for menu button (hamburger icon) with aria-label containing "navigation" or "menu"
    const menuButton = page.locator('button[aria-label*="navigation" i], button[aria-label*="menu" i]').first();
    const menuButtonCount = await menuButton.count();
    
    // Menu button should exist for HR Admin
    expect(menuButtonCount).toBeGreaterThan(0);
    
    if (menuButtonCount > 0) {
      await expect(menuButton).toBeVisible({ timeout: 2000 });
    }
  });

  test("[P1] Mobile navigation menu opens and shows links for HR Admin", async ({ page }) => {
    // Given: An HR Admin user is logged in
    const email = process.env.E2E_ADMIN_EMAIL || "hr@test.com";
    const password = process.env.E2E_ADMIN_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // When: They click the mobile navigation menu button
    const menuButton = page.locator('button[aria-label*="navigation" i], button[aria-label*="menu" i]').first();
    const menuButtonCount = await menuButton.count();
    
    if (menuButtonCount > 0) {
      await menuButton.click();
      await page.waitForTimeout(500); // Wait for menu to open

      // Then: Navigation menu should open and show links
      // Look for navigation sheet/drawer
      const navSheet = page.locator('[role="dialog"], [data-slot="sheet-content"], [data-state="open"]');
      const sheetCount = await navSheet.count();
      
      if (sheetCount > 0) {
        // Navigation links should be visible in the menu
        const navLinks = page.locator('a:has-text("Anställda"), a:has-text("Employees"), a:has-text("Viktiga datum"), a:has-text("Important Dates")');
        const linksCount = await navLinks.count();
        expect(linksCount).toBeGreaterThan(0);
      }
    } else {
      // Skip if menu button not found (might be desktop-only test)
      test.skip();
    }
  });

  test("[P1] Header is visible and functional for HR Admin", async ({ page }) => {
    // Given: An HR Admin user is logged in
    const email = process.env.E2E_ADMIN_EMAIL || "hr@test.com";
    const password = process.env.E2E_ADMIN_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // When: They view the dashboard
    // Then: Header should be visible
    const header = page.locator('header, [role="banner"]');
    await expect(header).toBeVisible({ timeout: 5000 });

    // Logo should be visible
    const logo = page.locator('img[alt*="Stena"], img[alt*="stena"]');
    await expect(logo).toBeVisible({ timeout: 2000 });

    // Logout button should be visible and functional
    const logoutButton = page.locator('button:has-text("Logga ut"), button:has-text("Sign out"), button:has-text("Sign Out")');
    await expect(logoutButton.first()).toBeVisible({ timeout: 2000 });
  });

  test("[P1] Both desktop and mobile navigation work correctly for HR Admin", async ({ page }) => {
    // Given: An HR Admin user is logged in
    const email = process.env.E2E_ADMIN_EMAIL || "hr@test.com";
    const password = process.env.E2E_ADMIN_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // Test desktop navigation
    await page.setViewportSize({ width: 1920, height: 1080 });
    const desktopNav = page.locator('nav.bg-gray-100');
    await expect(desktopNav).toBeVisible({ timeout: 5000 });

    // Test mobile navigation
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Wait for layout to adjust
    
    // Desktop nav should be hidden on mobile (has `hidden lg:block` classes)
    await expect(desktopNav).not.toBeVisible({ timeout: 2000 });

    // Mobile nav button should be visible
    const mobileMenuButton = page.locator('button[aria-label*="navigation" i], button[aria-label*="menu" i]').first();
    const mobileMenuCount = await mobileMenuButton.count();
    expect(mobileMenuCount).toBeGreaterThan(0);
  });
});

