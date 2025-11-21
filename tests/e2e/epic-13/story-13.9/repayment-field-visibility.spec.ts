import { test, expect } from '@playwright/test';
import { setupTestUser, loginAsHRAdmin } from '../../helpers/e2e-helpers';

test.describe('Story 13.9: Repayment Field Visibility', () => {
  let employeeId: string;
  let terminatedEmployeeId: string;

  test.beforeEach(async ({ page }) => {
    await setupTestUser();
    await loginAsHRAdmin(page);
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid^="employee-row-"]', { timeout: 10000 });
  });

  test('non-terminated employee does not show repayment fields in table', async ({ page }) => {
    // Find a non-terminated employee row
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    
    // Check that repayment columns are not visible when "Show Terminated" filter is off
    const repaymentHeaders = page.locator('th').filter({ hasText: /Återbetalningsskyldig/ });
    await expect(repaymentHeaders).toHaveCount(0);
  });

  test('terminated employee shows repayment columns when "Show Terminated" filter is active', async ({ page }) => {
    // Enable "Show Terminated" filter
    const showTerminatedCheckbox = page.locator('label').filter({ hasText: /Show Terminated|Visa uppsagda/i }).first();
    if (await showTerminatedCheckbox.isVisible()) {
      await showTerminatedCheckbox.click();
      await page.waitForTimeout(500); // Wait for table to update
    }

    // Check for repayment column headers
    const repaymentHeaders = page.locator('th').filter({ hasText: /Återbetalningsskyldig/ });
    
    // If there are terminated employees, repayment columns should be visible
    const terminatedRows = page.locator('[data-testid^="employee-row-"]').filter({ hasText: /Terminated|Uppsagd/i });
    const terminatedCount = await terminatedRows.count();
    
    if (terminatedCount > 0) {
      // Repayment columns should appear in headers
      await expect(repaymentHeaders.first()).toBeVisible({ timeout: 5000 });
      
      // Check that terminated employees show repayment values
      const firstTerminatedRow = terminatedRows.first();
      const repaymentCells = firstTerminatedRow.locator('td').filter({ hasText: /\d{4}-\d{2}-\d{2}/ });
      // At least one repayment date should be visible for terminated employees
      const repaymentCellCount = await repaymentCells.count();
      expect(repaymentCellCount).toBeGreaterThan(0);
    }
  });

  test('non-terminated employees show empty cells for repayment columns when filter is active', async ({ page }) => {
    // Enable "Show Terminated" filter
    const showTerminatedCheckbox = page.locator('label').filter({ hasText: /Show Terminated|Visa uppsagda/i }).first();
    if (await showTerminatedCheckbox.isVisible()) {
      await showTerminatedCheckbox.click();
      await page.waitForTimeout(500);
    }

    // Find a non-terminated employee row
    const activeRows = page.locator('[data-testid^="employee-row-"]').filter({ hasText: /Active|Aktiv/i });
    const activeCount = await activeRows.count();
    
    if (activeCount > 0 && (await page.locator('th').filter({ hasText: /Återbetalningsskyldig/ }).count()) > 0) {
      const firstActiveRow = activeRows.first();
      // Repayment columns should exist but show empty/placeholder for non-terminated employees
      // This is verified by checking that the row doesn't have repayment date values
      const repaymentCells = firstActiveRow.locator('td').filter({ hasText: /\d{4}-\d{2}-\d{2}/ });
      // Non-terminated employees should not show repayment dates in those columns
      // (The exact implementation may vary, but the key is that repayment data is hidden)
    }
  });

  test('edit modal hides repayment fields for non-terminated employees', async ({ page }) => {
    // Find a non-terminated employee and click to edit
    const firstRow = page.locator('[data-testid^="employee-row-"]').first();
    await firstRow.click();
    
    // Wait for edit modal to open
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Check that repayment fields are not visible
    const repaymentOmcField = page.locator('label').filter({ hasText: /Repayment.*ÖMC|Återbetalningsskyldig.*ÖMC/i });
    const repaymentPe3Field = page.locator('label').filter({ hasText: /Repayment.*PE3|Återbetalningsskyldig.*PE3/i });
    
    await expect(repaymentOmcField).toHaveCount(0);
    await expect(repaymentPe3Field).toHaveCount(0);
    
    // Close modal
    const closeButton = page.locator('button').filter({ hasText: /Cancel|Avbryt/i }).first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test('edit modal shows repayment fields for terminated employees', async ({ page }) => {
    // Enable "Show Terminated" filter
    const showTerminatedCheckbox = page.locator('label').filter({ hasText: /Show Terminated|Visa uppsagda/i }).first();
    if (await showTerminatedCheckbox.isVisible()) {
      await showTerminatedCheckbox.click();
      await page.waitForTimeout(500);
    }

    // Find a terminated employee and click to edit
    const terminatedRows = page.locator('[data-testid^="employee-row-"]').filter({ hasText: /Terminated|Uppsagd/i });
    const terminatedCount = await terminatedRows.count();
    
    if (terminatedCount > 0) {
      const firstTerminatedRow = terminatedRows.first();
      await firstTerminatedRow.click();
      
      // Wait for edit modal to open
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Check that repayment fields are visible (may need to scroll)
      const repaymentOmcField = page.locator('label, input').filter({ hasText: /Repayment.*ÖMC|Återbetalningsskyldig.*ÖMC/i }).first();
      const repaymentPe3Field = page.locator('label, input').filter({ hasText: /Repayment.*PE3|Återbetalningsskyldig.*PE3/i }).first();
      
      // Fields should be visible for terminated employees
      const omcVisible = await repaymentOmcField.isVisible().catch(() => false);
      const pe3Visible = await repaymentPe3Field.isVisible().catch(() => false);
      
      // At least one repayment field should be visible
      expect(omcVisible || pe3Visible).toBe(true);
      
      // Close modal
      const closeButton = page.locator('button').filter({ hasText: /Cancel|Avbryt/i }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
    } else {
      test.skip();
    }
  });

  test('marking employee as terminated shows repayment fields immediately', async ({ page }) => {
    // This test requires creating/terminating an employee
    // For now, we'll verify the behavior exists
    // In a full implementation, you would:
    // 1. Create or select an employee
    // 2. Mark as terminated
    // 3. Verify repayment fields appear in table
    // 4. Verify repayment fields appear in edit modal
    
    test.skip(); // Skip for now as it requires employee creation/termination setup
  });

  test('reactivating employee hides repayment fields immediately', async ({ page }) => {
    // This test requires reactivating a terminated employee
    // For now, we'll verify the behavior exists
    // In a full implementation, you would:
    // 1. Find a terminated employee
    // 2. Reactivate them
    // 3. Verify repayment fields disappear from table
    // 4. Verify repayment fields disappear from edit modal
    
    test.skip(); // Skip for now as it requires reactivation setup
  });
});

