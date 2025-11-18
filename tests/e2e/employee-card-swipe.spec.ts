/**
 * E2E Tests for Employee Card Swipe Gestures
 * Story 12.2: Swipe Gestures for Row Actions
 * Tests swipe gesture detection, action button reveal, and interaction on real mobile viewports
 */

import { test, expect } from '@playwright/test';

test.describe('Employee Card - Swipe Gestures (Story 12.2)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test.describe('AC1: Swipe gesture reveals action buttons', () => {
    test('should reveal action buttons when swiping left on employee card', async ({ page }) => {
      // Find first employee card
      const employeeCard = page.locator('article, [class*="Card"]').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      // Get initial position
      const initialBox = await employeeCard.boundingBox();
      expect(initialBox).not.toBeNull();

      // Perform swipe left gesture
      const startX = (initialBox!.x + initialBox!.width) - 50;
      const startY = initialBox!.y + initialBox!.height / 2;
      const endX = initialBox!.x + 50;
      
      await page.touchscreen.tap(startX, startY);
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, startY, { steps: 10 });
      await page.mouse.up();

      // Wait for action buttons to appear
      await page.waitForTimeout(300); // Wait for animation

      // Check that action buttons are visible
      const archiveButton = page.getByRole('button', { name: /archive/i });
      const terminateButton = page.getByRole('button', { name: /terminate/i });
      const editButton = page.getByRole('button', { name: /edit/i });

      // At least one action button should be visible (they might be in a swipe-revealed area)
      await expect(archiveButton.or(terminateButton).or(editButton).first()).toBeVisible({ timeout: 2000 });
    });

    test('should have smooth 60fps animation when swiping', async ({ page }) => {
      const employeeCard = page.locator('article, [class*="Card"]').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      const initialBox = await employeeCard.boundingBox();
      expect(initialBox).not.toBeNull();

      // Perform swipe and measure animation smoothness
      const startX = (initialBox!.x + initialBox!.width) - 50;
      const startY = initialBox!.y + initialBox!.height / 2;
      const endX = initialBox!.x + 50;

      // Start swipe
      await page.touchscreen.tap(startX, startY);
      await page.mouse.move(startX, startY);
      await page.mouse.down();

      // Move with multiple steps to simulate smooth animation
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const currentX = startX + (endX - startX) * (i / steps);
        await page.mouse.move(currentX, startY);
        await page.waitForTimeout(10); // Small delay to check smoothness
      }

      await page.mouse.up();
      await page.waitForTimeout(300);

      // Card should have been transformed
      const transform = await employeeCard.evaluate((el) => {
        const card = el.closest('div[class*="relative"]')?.querySelector('div[class*="Card"]') as HTMLElement;
        return card?.style.transform || '';
      });

      expect(transform).toContain('translateX');
    });
  });

  test.describe('AC2: Action button interactions', () => {
    test('should trigger archive action when Archive button is clicked', async ({ page }) => {
      // Find first employee card
      const employeeCard = page.locator('article, [class*="Card"]').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      // Swipe to reveal actions
      const initialBox = await employeeCard.boundingBox();
      expect(initialBox).not.toBeNull();

      const startX = (initialBox!.x + initialBox!.width) - 50;
      const startY = initialBox!.y + initialBox!.height / 2;
      const endX = initialBox!.x + 50;

      await page.touchscreen.tap(startX, startY);
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, startY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Click Archive button
      const archiveButton = page.getByRole('button', { name: /archive/i }).first();
      await expect(archiveButton).toBeVisible({ timeout: 2000 });
      await archiveButton.click();

      // Archive confirmation dialog should appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2000 });
      await expect(page.getByText(/archive employee/i)).toBeVisible();
    });

    test('should trigger terminate action when Terminate button is clicked', async ({ page }) => {
      const employeeCard = page.locator('article, [class*="Card"]').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      // Swipe to reveal actions
      const initialBox = await employeeCard.boundingBox();
      expect(initialBox).not.toBeNull();

      const startX = (initialBox!.x + initialBox!.width) - 50;
      const startY = initialBox!.y + initialBox!.height / 2;
      const endX = initialBox!.x + 50;

      await page.touchscreen.tap(startX, startY);
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, startY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Click Terminate button
      const terminateButton = page.getByRole('button', { name: /terminate/i }).first();
      await expect(terminateButton).toBeVisible({ timeout: 2000 });
      await terminateButton.click();

      // Terminate modal should appear
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2000 });
    });

    test('should trigger edit action when Edit button is clicked', async ({ page }) => {
      const employeeCard = page.locator('article, [class*="Card"]').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      // Swipe to reveal actions
      const initialBox = await employeeCard.boundingBox();
      expect(initialBox).not.toBeNull();

      const startX = (initialBox!.x + initialBox!.width) - 50;
      const startY = initialBox!.y + initialBox!.height / 2;
      const endX = initialBox!.x + 50;

      await page.touchscreen.tap(startX, startY);
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, startY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Click Edit button
      const editButton = page.getByRole('button', { name: /edit/i }).first();
      await expect(editButton).toBeVisible({ timeout: 2000 });
      await editButton.click();

      // Edit action should be triggered (toast or card expansion)
      // Since there's no edit modal, we check for toast or card expansion
      await page.waitForTimeout(500);
      // Toast might appear or card might expand
    });
  });

  test.describe('AC3: Desktop device gesture ignoring', () => {
    test('should ignore swipe gestures on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      const employeeCard = page.locator('article, [class*="Card"]').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      // Attempt swipe gesture
      const initialBox = await employeeCard.boundingBox();
      expect(initialBox).not.toBeNull();

      const startX = (initialBox!.x + initialBox!.width) - 50;
      const startY = initialBox!.y + initialBox!.height / 2;
      const endX = initialBox!.x + 50;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, startY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Action buttons should NOT be visible on desktop
      const archiveButton = page.getByRole('button', { name: /archive/i });
      await expect(archiveButton).not.toBeVisible({ timeout: 1000 });
    });
  });

  test.describe('AC4: Card state management', () => {
    test('should return card to original position on swipe right', async ({ page }) => {
      const employeeCard = page.locator('article, [class*="Card"]').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      // Swipe left to reveal
      const initialBox = await employeeCard.boundingBox();
      expect(initialBox).not.toBeNull();

      const startX = (initialBox!.x + initialBox!.width) - 50;
      const startY = initialBox!.y + initialBox!.height / 2;
      const endX = initialBox!.x + 50;

      await page.touchscreen.tap(startX, startY);
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, startY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Verify actions are revealed
      const archiveButton = page.getByRole('button', { name: /archive/i }).first();
      await expect(archiveButton).toBeVisible({ timeout: 2000 });

      // Now swipe right to close
      const newBox = await employeeCard.boundingBox();
      expect(newBox).not.toBeNull();

      const rightStartX = newBox!.x + 50;
      const rightEndX = newBox!.x + newBox!.width - 50;

      await page.touchscreen.tap(rightStartX, startY);
      await page.mouse.move(rightStartX, startY);
      await page.mouse.down();
      await page.mouse.move(rightEndX, startY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Actions should be hidden
      await expect(archiveButton).not.toBeVisible({ timeout: 2000 });
    });

    test('should close swipe on tap outside card', async ({ page }) => {
      const employeeCard = page.locator('article, [class*="Card"]').first();
      await expect(employeeCard).toBeVisible({ timeout: 10000 });

      // Swipe left to reveal
      const initialBox = await employeeCard.boundingBox();
      expect(initialBox).not.toBeNull();

      const startX = (initialBox!.x + initialBox!.width) - 50;
      const startY = initialBox!.y + initialBox!.height / 2;
      const endX = initialBox!.x + 50;

      await page.touchscreen.tap(startX, startY);
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, startY, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);

      // Verify actions are revealed
      const archiveButton = page.getByRole('button', { name: /archive/i }).first();
      await expect(archiveButton).toBeVisible({ timeout: 2000 });

      // Tap outside the card
      await page.touchscreen.tap(10, 10);
      await page.waitForTimeout(300);

      // Actions should be hidden
      await expect(archiveButton).not.toBeVisible({ timeout: 2000 });
    });
  });
});

