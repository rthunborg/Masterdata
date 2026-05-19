/**
 * E2E Tests for Story 17.6: Remove Navigation Area for External Users
 * 
 * Tests that external party users do not see the navigation area (desktop or mobile).
 * 
 * AC #1: Navigation Area Hidden for external users
 * AC #2: Header Preserved for all users
 * AC #3: Dashboard Content Visible (no spacing issues)
 * AC #5: Layout Consistency
 */

import { test, expect } from "@playwright/test";
import { loginAsUser } from "../../helpers/e2e-helpers";

test.describe("Story 17.6: Navigation Hiding for External Users", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");
    await page.waitForLoadState("load");
  });

  test("[P0] Desktop navigation is hidden for sodexo user", async ({ page }) => {
    // Given: A sodexo user is logged in
    const email = process.env.E2E_SODEXO_EMAIL || "sodexo@test.com";
    const password = process.env.E2E_SODEXO_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // When: They view the dashboard
    // Then: Desktop navigation should NOT be visible
    // Look for navigation element with navigation links
    const nav = page.locator('nav.bg-gray-100');
    await expect(nav).not.toBeVisible({ timeout: 5000 });

    // Navigation links should NOT be visible
    const employeesLink = page.locator('a:has-text("Anställda"), a:has-text("Employees")');
    await expect(employeesLink).not.toBeVisible({ timeout: 2000 });
  });

  test("[P0] Desktop navigation is hidden for omc user", async ({ page }) => {
    // Given: An omc user is logged in
    const email = process.env.E2E_OMC_EMAIL || "omc@test.com";
    const password = process.env.E2E_OMC_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // When: They view the dashboard
    // Then: Desktop navigation should NOT be visible
    const nav = page.locator('nav.bg-gray-100');
    await expect(nav).not.toBeVisible({ timeout: 5000 });
  });

  test("[P0] Desktop navigation is hidden for payroll user", async ({ page }) => {
    // Given: A payroll user is logged in
    const email = process.env.E2E_PAYROLL_EMAIL || "payroll@test.com";
    const password = process.env.E2E_PAYROLL_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // When: They view the dashboard
    // Then: Desktop navigation should NOT be visible
    const nav = page.locator('nav.bg-gray-100');
    await expect(nav).not.toBeVisible({ timeout: 5000 });
  });

  test("[P0] Desktop navigation is hidden for toplux user", async ({ page }) => {
    // Given: A toplux user is logged in
    const email = process.env.E2E_TOPLUX_EMAIL || "toplux@test.com";
    const password = process.env.E2E_TOPLUX_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // When: They view the dashboard
    // Then: Desktop navigation should NOT be visible
    const nav = page.locator('nav.bg-gray-100');
    await expect(nav).not.toBeVisible({ timeout: 5000 });
  });

  test("[P0] Mobile navigation menu button is hidden for external users", async ({ page }) => {
    // Given: An external user is logged in (using sodexo as example)
    const email = process.env.E2E_SODEXO_EMAIL || "sodexo@test.com";
    const password = process.env.E2E_SODEXO_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // When: They view the dashboard on mobile
    // Then: Mobile navigation menu button should NOT be visible
    // Look for menu button (hamburger icon) - should be hidden for external users
    const menuButton = page.locator('button[aria-label*="navigation"], button[aria-label*="menu"], button:has(svg)').first();
    
    // Check if menu button exists - if it does, it should not be visible for external users
    const menuButtonCount = await menuButton.count();
    if (menuButtonCount > 0) {
      // If menu button exists, verify it's not the mobile nav (it might be another button)
      const isMobileNav = await menuButton.getAttribute('aria-label');
      if (isMobileNav?.toLowerCase().includes('navigation') || isMobileNav?.toLowerCase().includes('menu')) {
        await expect(menuButton).not.toBeVisible({ timeout: 2000 });
      }
    }
  });

  test("[P0] Header is visible for external users", async ({ page }) => {
    // Given: An external user is logged in
    const email = process.env.E2E_SODEXO_EMAIL || "sodexo@test.com";
    const password = process.env.E2E_SODEXO_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // When: They view the dashboard
    // Then: Header should be visible
    const header = page.locator('header, [role="banner"]');
    await expect(header).toBeVisible({ timeout: 5000 });

    // Logo should be visible
    const logo = page.locator('img[alt*="Stena"], img[alt*="stena"]');
    await expect(logo).toBeVisible({ timeout: 2000 });

    // Logout button should be visible
    const logoutButton = page.locator('button:has-text("Logga ut"), button:has-text("Sign out"), button:has-text("Sign Out")');
    await expect(logoutButton.first()).toBeVisible({ timeout: 2000 });
  });

  test("[P0] Dashboard content is visible for external users", async ({ page }) => {
    // Given: An external user is logged in
    const email = process.env.E2E_SODEXO_EMAIL || "sodexo@test.com";
    const password = process.env.E2E_SODEXO_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // When: They view the dashboard
    // Then: Dashboard content should be visible
    // Wait for main content area
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible({ timeout: 5000 });

    // Employee table or dashboard content should be visible
    const table = page.locator('table, [data-testid*="employee"], [data-testid*="table"]');
    const hasTable = await table.count() > 0;
    
    // Either table exists or some dashboard content exists
    const dashboardContent = page.locator('text=/Personalhantering|Employees|Dashboard/i');
    await expect(dashboardContent.first()).toBeVisible({ timeout: 5000 });
  });

  test("[P1] Layout has no spacing issues when navigation is hidden", async ({ page }) => {
    // Given: An external user is logged in
    const email = process.env.E2E_SODEXO_EMAIL || "sodexo@test.com";
    const password = process.env.E2E_SODEXO_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // When: They view the dashboard
    // Then: Layout should be clean with no awkward spacing
    // Verify navigation element is not in DOM (not just hidden)
    const navInDOM = await page.locator('nav.bg-gray-100').count();
    expect(navInDOM).toBe(0);

    // Verify main content is properly positioned
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible({ timeout: 5000 });

    // Check that there's no large gap between header and content
    const header = page.locator('header, [role="banner"]');
    const headerBox = await header.boundingBox();
    const mainBox = await main.boundingBox();

    if (headerBox && mainBox) {
      // Main should start shortly after header (no large gap)
      const gap = mainBox.y - (headerBox.y + headerBox.height);
      // Gap should be reasonable (less than 100px - navigation would add more)
      expect(gap).toBeLessThan(100);
    }
  });

  test("[P1] Navigation links are not accessible via direct URL for external users", async ({ page }) => {
    // Given: An external user is logged in
    const email = process.env.E2E_SODEXO_EMAIL || "sodexo@test.com";
    const password = process.env.E2E_SODEXO_PASSWORD || "Test123!";
    
    await loginAsUser(page, email, password);
    await page.waitForLoadState("load");

    // When: They try to access admin routes directly
    // Then: They should be redirected (middleware protection)
    await page.goto("/dashboard/admin/users");
    await page.waitForLoadState("load");

    // Should be redirected away from admin route
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/admin");
  });
});

