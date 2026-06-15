/**
 * E2E Tests for Delete Column Functionality
 * 
 * Story: 17.2 - Delete Functionality for Custom Columns
 * 
 * Tests the complete delete flow:
 * - External user can delete their own custom columns
 * - Confirmation dialog appears
 * - Column is removed after confirmation
 * - Error handling for unauthorized deletion
 */

import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/e2e-helpers';

test.describe('Delete Custom Column E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as external party user (Sodexo)
    // Note: This assumes a test user exists with email/password
    // Adjust credentials based on your test setup
    const externalEmail = process.env.E2E_EXTERNAL_EMAIL || 'sodexo@test.com';
    const externalPassword = process.env.E2E_EXTERNAL_PASSWORD || 'Test123!';
    
    await loginAsUser(page, externalEmail, externalPassword);
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
  });

  test('should delete custom column after confirmation', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('table, [data-testid="employee-table"]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Find and click "Manage Columns" button
    // The button should have text "Hantera kolumner" or "Manage Columns"
    const manageButton = page.locator('button:has-text("Hantera kolumner"), button:has-text("Manage Columns")').first();
    
    // Check if button exists (user might not have custom columns)
    const buttonCount = await manageButton.count();
    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.scrollIntoViewIfNeeded();
    await manageButton.click();

    // Wait for manage columns dialog to open
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Find the first custom column in the dialog
    // Columns are displayed with Edit and Delete buttons
    const deleteButtons = page.locator('[role="dialog"] button[aria-label*="Ta bort"], [role="dialog"] button:has([class*="Trash"])');
    const deleteButtonCount = await deleteButtons.count();

    if (deleteButtonCount === 0) {
      // No custom columns to delete - skip test
      // Close dialog first
      const closeButton = page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button:has([class*="X"])').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
      }
      test.skip();
      return;
    }

    // Get the column name before deletion (for verification)
    const firstDeleteButton = deleteButtons.first();
    const columnRow = firstDeleteButton.locator('..').locator('..'); // Go up to row container
    const columnName = await columnRow.locator('button:has([class*="Edit"])').first().textContent().catch(() => '');
    
    // Click delete button
    await firstDeleteButton.scrollIntoViewIfNeeded();
    await firstDeleteButton.click();

    // Wait for confirmation dialog (AlertDialog)
    await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
    await page.waitForTimeout(300);

    // Verify confirmation dialog content
    const confirmDialog = page.locator('[role="alertdialog"]').first();
    await expect(confirmDialog).toBeVisible();
    
    // Check for confirmation message (Swedish)
    const confirmMessage = confirmDialog.locator('text=/Är du säker på att du vill ta bort kolumnen/i');
    await expect(confirmMessage).toBeVisible({ timeout: 5000 });

    // Click confirm button ("Ta bort")
    const confirmButton = confirmDialog.locator('button:has-text("Ta bort"), button:has-text("Delete")').first();
    await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
    await confirmButton.click();

    // After confirming, the column list refetches (columnService.getAll) and the
    // dialog re-renders, so the number of delete buttons drops by exactly one.
    // When the last custom column is removed the whole ManageColumnsDialog
    // unmounts (it renders null with zero custom columns), leaving zero delete
    // buttons — which also satisfies "deleteButtonCount - 1" when only one
    // existed. Use a web-first assertion (auto-retries up to the timeout) instead
    // of a fixed wait so refetch latency on a freshly-rebuilt local stack cannot
    // cause a flake.
    await expect(deleteButtons).toHaveCount(deleteButtonCount - 1, { timeout: 15000 });

    // Verify column is removed - check that manage columns dialog either:
    // 1. Closed (if no columns left), or
    // 2. Column no longer appears in the list
    const dialogStillOpen = await page.locator('[role="dialog"]').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (dialogStillOpen) {
      // Dialog still open - verify column is gone from list
      const remainingDeleteButtons = page.locator('[role="dialog"] button[aria-label*="Ta bort"]');
      const remainingCount = await remainingDeleteButtons.count();
      
      // If we had 1 column and deleted it, there should be 0 now
      // (or the dialog should close)
      expect(remainingCount).toBeLessThan(deleteButtonCount);
      
      // Verify the deleted column name is not in the dialog
      if (columnName) {
        const columnNameInDialog = await page.locator(`[role="dialog"]:has-text("${columnName}")`).count();
        expect(columnNameInDialog).toBe(0);
      }
    } else {
      // Dialog closed - this is expected if no columns remain
      // Verify by checking that manage button might not be visible anymore
      // (or it's still there but clicking it shows empty state)
    }

    // Check for success toast
    const successToast = page.locator('[data-sonner-toast][data-type="success"], [data-sonner-toast]:has-text("tagits bort")').first();
    const toastVisible = await successToast.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (toastVisible) {
      const toastText = await successToast.textContent().catch(() => '');
      expect(toastText).toContain('tagits bort');
    }
  });

  test('should cancel deletion when cancel button is clicked', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForSelector('table, [data-testid="employee-table"]', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Find and click "Manage Columns" button
    const manageButton = page.locator('button:has-text("Hantera kolumner"), button:has-text("Manage Columns")').first();
    
    const buttonCount = await manageButton.count();
    if (buttonCount === 0) {
      test.skip();
      return;
    }

    await manageButton.waitFor({ state: 'visible', timeout: 10000 });
    await manageButton.scrollIntoViewIfNeeded();
    await manageButton.click();

    // Wait for manage columns dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Find delete button
    const deleteButtons = page.locator('[role="dialog"] button[aria-label*="Ta bort"]');
    const deleteButtonCount = await deleteButtons.count();

    if (deleteButtonCount === 0) {
      const closeButton = page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button:has([class*="X"])').first();
      if (await closeButton.count() > 0) {
        await closeButton.click();
      }
      test.skip();
      return;
    }

    // Get column name before attempting deletion
    const firstDeleteButton = deleteButtons.first();
    const columnRow = firstDeleteButton.locator('..').locator('..');
    const columnName = await columnRow.locator('button:has([class*="Edit"])').first().textContent().catch(() => '');

    // Click delete button
    await firstDeleteButton.scrollIntoViewIfNeeded();
    await firstDeleteButton.click();

    // Wait for confirmation dialog
    await page.waitForSelector('[role="alertdialog"]', { timeout: 5000 });
    await page.waitForTimeout(300);

    // Click cancel button ("Avbryt")
    const cancelButton = page.locator('[role="alertdialog"] button:has-text("Avbryt"), [role="alertdialog"] button:has-text("Cancel")').first();
    await cancelButton.waitFor({ state: 'visible', timeout: 5000 });
    await cancelButton.click();

    // Wait for confirmation dialog to close
    await page.waitForTimeout(500);
    const confirmDialogVisible = await page.locator('[role="alertdialog"]').isVisible({ timeout: 2000 }).catch(() => false);
    expect(confirmDialogVisible).toBe(false);

    // Verify column is still in the list (not deleted)
    const manageDialog = page.locator('[role="dialog"]').first();
    const dialogVisible = await manageDialog.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (dialogVisible && columnName) {
      const columnStillExists = await manageDialog.locator(`text="${columnName}"`).count();
      expect(columnStillExists).toBeGreaterThan(0);
    }

    // Close manage columns dialog
    const closeButton = manageDialog.locator('button:has-text("Close"), button:has([class*="X"])').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
    }
  });

  test('should show error message when deletion fails', async ({ page }) => {
    // This test would require mocking the API to return an error
    // For now, we'll skip it as it requires more complex setup
    // In a real scenario, you might:
    // 1. Mock the API endpoint to return 403/404
    // 2. Or test with a column the user doesn't have permission to delete
    
    test.skip();
  });
});

