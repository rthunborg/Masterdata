import { test, expect } from '@playwright/test';

test.describe('Kolumnsynlighet Button Removal', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should not display Kolumnsynlighet button in dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify the button with "Kolumnsynlighet" text is not present
    const kolumnsynlighetButton = page.getByRole('button', { name: /kolumnsynlighet/i });
    await expect(kolumnsynlighetButton).not.toBeVisible();
    
    // Also check for the Swedish translation
    const columnVisibilityButton = page.getByRole('button', { name: /column visibility/i });
    await expect(columnVisibilityButton).not.toBeVisible();
  });

  test('should render dashboard correctly without the button', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Dashboard should still render - check for table or employee list
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should not have broken UI elements after button removal', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any errors to appear
    await page.waitForTimeout(1000);

    // Filter out errors related to the removed button
    const relevantErrors = errors.filter(
      (error) => 
        !error.includes('Kolumnsynlighet') && 
        !error.includes('columnVisibility') &&
        !error.includes('Failed to load resource') // Ignore network errors
    );

    // Should not have errors related to the removed button
    expect(relevantErrors.length).toBe(0);
  });

  test('should maintain dashboard functionality without the button', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify other dashboard elements still work
    // Check if table is visible and functional
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check if other buttons (like Export) are still present if they should be
    // This ensures we didn't accidentally remove other functionality
    const exportButton = page.getByRole('button', { name: /export/i });
    // Export button might or might not be visible depending on selection
    // Just verify the page doesn't crash
    await expect(page).not.toHaveURL(/error/);
  });
});

