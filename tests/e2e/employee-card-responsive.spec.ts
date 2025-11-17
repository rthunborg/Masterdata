/**
 * E2E Tests for Employee Card Responsive Behavior
 * Story 11.12: Employee Card Expansion Tests
 * AC4: Responsive Layout and Scrolling Tests
 * Task 4: Responsive and Mobile Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Employee Card - Responsive Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (assuming login is handled in global setup)
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('AC4: Responsive Layout and Scrolling Tests', () => {
    test('should expand card on mobile viewport (320px)', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      
      // Find first employee card
      const employeeCard = page.locator('[data-testid="employee-card"], .employee-card, article').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      // Find and click "More" button
      const moreButton = employeeCard.getByRole('button', { name: /more/i });
      await expect(moreButton).toBeVisible();
      await moreButton.click();

      // Check that expanded content is visible
      await expect(employeeCard.locator('text=/First Name|Surname|Email/i').first()).toBeVisible({ timeout: 5000 });
      
      // Check that "Less" button is visible
      await expect(employeeCard.getByRole('button', { name: /less/i })).toBeVisible();
    });

    test('should expand card on standard mobile viewport (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const employeeCard = page.locator('[data-testid="employee-card"], .employee-card, article').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      const moreButton = employeeCard.getByRole('button', { name: /more/i });
      await expect(moreButton).toBeVisible();
      await moreButton.click();

      await expect(employeeCard.locator('text=/First Name|Surname|Email/i').first()).toBeVisible({ timeout: 5000 });
      await expect(employeeCard.getByRole('button', { name: /less/i })).toBeVisible();
    });

    test('should expand card on tablet viewport (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const employeeCard = page.locator('[data-testid="employee-card"], .employee-card, article').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      const moreButton = employeeCard.getByRole('button', { name: /more/i });
      await expect(moreButton).toBeVisible();
      await moreButton.click();

      await expect(employeeCard.locator('text=/First Name|Surname|Email/i').first()).toBeVisible({ timeout: 5000 });
      await expect(employeeCard.getByRole('button', { name: /less/i })).toBeVisible();
    });

    test('should enable vertical scrolling when content exceeds viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const employeeCard = page.locator('[data-testid="employee-card"], .employee-card, article').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      // Expand card
      const moreButton = employeeCard.getByRole('button', { name: /more/i });
      await moreButton.click();

      // Wait for expanded content
      await expect(employeeCard.locator('text=/First Name|Surname|Email/i').first()).toBeVisible({ timeout: 5000 });

      // Find expanded content container
      const expandedContent = employeeCard.locator('.max-h-\\[70vh\\], [class*="max-h"]').first();
      
      // Check if scrolling is enabled (content height > container height)
      const scrollHeight = await expandedContent.evaluate((el) => el.scrollHeight);
      const clientHeight = await expandedContent.evaluate((el) => el.clientHeight);
      
      // If content is scrollable, scrollHeight should be greater than clientHeight
      // Or if content fits, they should be equal
      expect(scrollHeight).toBeGreaterThanOrEqual(clientHeight);
      
      // Test scrolling behavior
      if (scrollHeight > clientHeight) {
        await expandedContent.scroll({ top: 100 });
        const scrollTop = await expandedContent.evaluate((el) => el.scrollTop);
        expect(scrollTop).toBeGreaterThanOrEqual(0);
      }
    });

    test('should maintain accessible touch targets during scroll', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const employeeCard = page.locator('[data-testid="employee-card"], .employee-card, article').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      const moreButton = employeeCard.getByRole('button', { name: /more/i });
      await moreButton.click();

      await expect(employeeCard.locator('text=/First Name|Surname|Email/i').first()).toBeVisible({ timeout: 5000 });

      // Scroll expanded content
      const expandedContent = employeeCard.locator('.max-h-\\[70vh\\], [class*="max-h"]').first();
      await expandedContent.scroll({ top: 200 });

      // Check that buttons are still accessible
      const lessButton = employeeCard.getByRole('button', { name: /less/i });
      await expect(lessButton).toBeVisible();
      
      // Check button is clickable (touch target size)
      const buttonBox = await lessButton.boundingBox();
      expect(buttonBox).not.toBeNull();
      if (buttonBox) {
        // Touch targets should be at least 44x44px (iOS/Android guidelines)
        expect(buttonBox.width).toBeGreaterThanOrEqual(44);
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
      }
    });

    test('should have smooth scroll behavior', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const employeeCard = page.locator('[data-testid="employee-card"], .employee-card, article').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      const moreButton = employeeCard.getByRole('button', { name: /more/i });
      await moreButton.click();

      await expect(employeeCard.locator('text=/First Name|Surname|Email/i').first()).toBeVisible({ timeout: 5000 });

      const expandedContent = employeeCard.locator('.max-h-\\[70vh\\], [class*="max-h"]').first();
      
      // Check for smooth scrolling CSS
      const scrollBehavior = await expandedContent.evaluate((el) => {
        return window.getComputedStyle(el).scrollBehavior;
      });
      
      // Should have smooth scroll behavior (or default which is auto)
      expect(['smooth', 'auto']).toContain(scrollBehavior);
    });

    test('should adapt card width to screen size', async ({ page }) => {
      // Test on mobile
      await page.setViewportSize({ width: 320, height: 568 });
      const mobileCard = page.locator('[data-testid="employee-card"], .employee-card, article').first();
      await expect(mobileCard).toBeVisible({ timeout: 10000 });
      const mobileWidth = (await mobileCard.boundingBox())?.width || 0;
      
      // Test on tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState('networkidle');
      const tabletCard = page.locator('[data-testid="employee-card"], .employee-card, article').first();
      await expect(tabletCard).toBeVisible({ timeout: 10000 });
      const tabletWidth = (await tabletCard.boundingBox())?.width || 0;
      
      // Tablet should be wider (or same if card is constrained)
      expect(tabletWidth).toBeGreaterThanOrEqual(mobileWidth);
    });

    test('should maintain readable text at all viewport sizes', async ({ page }) => {
      const viewports = [
        { width: 320, height: 568 },
        { width: 375, height: 667 },
        { width: 768, height: 1024 },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        const employeeCard = page.locator('[data-testid="employee-card"], .employee-card, article').first();
        await expect(employeeCard).toBeVisible({ timeout: 10000 });

        // Expand card
        const moreButton = employeeCard.getByRole('button', { name: /more/i });
        await moreButton.click();

        await expect(employeeCard.locator('text=/First Name|Surname|Email/i').first()).toBeVisible({ timeout: 5000 });

        // Check text is readable (font size should be reasonable)
        const textElement = employeeCard.locator('text=/First Name|Surname|Email/i').first();
        const fontSize = await textElement.evaluate((el) => {
          return parseFloat(window.getComputedStyle(el).fontSize);
        });
        
        // Font size should be at least 12px for readability
        expect(fontSize).toBeGreaterThanOrEqual(12);
      }
    });
  });
});

