/**
 * Story 12.7: Enhanced Mobile Accessibility
 * E2E tests for mobile accessibility features
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsHRAdmin } from '../../helpers/e2e-helpers';

test.describe('Story 12.7: Mobile Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await loginAsHRAdmin(page);
  });

  test('should have proper ARIA landmarks on mobile', async ({ page }) => {
    // Check main landmark
    const employeeList = page.getByRole('region', { name: /Employee list/i });
    await expect(employeeList).toBeVisible();
  });

  test('should have accessible search input', async ({ page }) => {
    const searchInput = page.locator('input[aria-label*="Search employees"]');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('id', 'employee-search');
    await expect(searchInput).toHaveAttribute('type', 'search');
  });

  test('should have proper ARIA labels on employee cards', async ({ page }) => {
    // Wait for employee cards to load
    await page.waitForSelector('article[aria-label]', { timeout: 5000 });
    
    const firstCard = page.locator('article[aria-label]').first();
    const ariaLabel = await firstCard.getAttribute('aria-label');
    
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toMatch(/employee/i);
  });

  test('should have touch targets meeting 44x44px minimum', async ({ page }) => {
    // Check button sizes
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should have proper spacing between interactive elements', async ({ page }) => {
    // Check that buttons have adequate spacing (8px minimum)
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    if (count >= 2) {
      const firstButton = buttons.first();
      const secondButton = buttons.nth(1);
      
      const firstBox = await firstButton.boundingBox();
      const secondBox = await secondButton.boundingBox();
      
      if (firstBox && secondBox) {
        const spacing = Math.abs(secondBox.x - (firstBox.x + firstBox.width));
        expect(spacing).toBeGreaterThanOrEqual(8);
      }
    }
  });

  test('should announce validation errors to screen readers', async ({ page }) => {
    // Open add employee modal
    await page.getByRole('button', { name: /Lägg till anställd|Add Employee/i }).click();
    await page.waitForSelector('[role="dialog"]');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Check for live region
    const liveRegion = page.locator('#form-errors-announcement');
    await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    await expect(liveRegion).toHaveAttribute('role', 'alert');
  });

  test('should have aria-required on required form fields', async ({ page }) => {
    // Open add employee modal
    await page.getByRole('button', { name: /Lägg till anställd|Add Employee/i }).click();
    await page.waitForSelector('[role="dialog"]');
    
    // Check required fields
    const firstNameInput = page.locator('input[name="first_name"]');
    await expect(firstNameInput).toHaveAttribute('aria-required', 'true');
    
    const surnameInput = page.locator('input[name="surname"]');
    await expect(surnameInput).toHaveAttribute('aria-required', 'true');
  });

  test('should have descriptive ARIA labels on action buttons', async ({ page }) => {
    // Wait for employee cards
    await page.waitForSelector('article[aria-label]', { timeout: 5000 });
    
    // Check for buttons with descriptive labels
    const buttons = page.locator('button[aria-label]');
    const count = await buttons.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Verify at least one button has a descriptive label
    const firstButton = buttons.first();
    const ariaLabel = await firstButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel.length).toBeGreaterThan(5); // Not just empty or very short
  });

  test('should pass automated accessibility audit (axe-core)', async ({ page }) => {
    test.setTimeout(60000);

    // Wait for page to fully load
    await expect(page.getByRole('region', { name: /Employee list/i })).toBeVisible({ timeout: 5000 });
    
    // Run axe accessibility scan
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Check for critical violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious'
    );

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log(`Found ${accessibilityScanResults.violations.length} accessibility violations:`);
      accessibilityScanResults.violations.forEach((violation) => {
        console.log(`- [${violation.impact}] ${violation.id}: ${violation.description}`);
        console.log(`  Help: ${violation.helpUrl}`);
        if (violation.nodes.length > 0) {
          console.log(`  Affected elements: ${violation.nodes.length}`);
        }
      });
    }

    // AC #9: No critical ARIA errors detected
    expect(criticalViolations.length).toBe(0);
    
    // AC #8: Lighthouse accessibility score target is 90+, but we can't get exact score from axe
    // However, we can ensure no critical/serious violations exist
    // Note: Full Lighthouse audit should be run manually in browser DevTools
  });
});

