/**
 * End-to-End Test: Real-time Sync Journey
 * Story 11.7: End-to-End Critical User Journey Tests
 * AC6: Real-time Sync Journey
 * 
 * Tests real-time updates propagate between users
 */

import { test, expect } from '@playwright/test';
import { loginAsUser, createEmployeeViaUI, waitForRealtimeUpdate } from './helpers/e2e-helpers';

test.describe('Real-time Sync E2E Journey', () => {
  test('AC6: Real-time sync between users', async ({ browser }) => {
    // Step 1: Open two browser contexts (User A, User B)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Step 2: Both users navigate to employees table
    await loginAsUser(pageA, 'admin@test.com', 'Test123!');
    await loginAsUser(pageB, 'admin@test.com', 'Test123!');

    await pageA.goto('/dashboard');
    await pageB.goto('/dashboard');
    await pageA.waitForLoadState('load');
    await pageB.waitForLoadState('load');

    // Get initial row count
    const initialRowsA = await pageA.locator('table tbody tr, [data-testid="employee-row"]').count();
    const initialRowsB = await pageB.locator('table tbody tr, [data-testid="employee-row"]').count();

    // Step 3: User A: Create new employee
    await createEmployeeViaUI(pageA, {
      first_name: 'Realtime',
      surname: 'SyncTest',
      ssn: '199001019999',
      rank: 'SEV',
      gender: 'Man',
      hire_date: '2025-01-01',
    });

    // Step 4: Verify User B sees new employee appear (<2s)
    await waitForRealtimeUpdate(pageB, 'Realtime', 2000);
    await expect(pageB.locator('table, [data-testid="employee-table"]')).toContainText('SyncTest');

    // Step 5: User A: Update employee rank
    // Find the employee row
    const employeeRowA = pageA.locator('table tbody tr, [data-testid="employee-row"]')
      .filter({ hasText: 'Realtime' })
      .first();
    
    await employeeRowA.click();
    
    // Edit rank (assuming inline editing or modal)
    const rankCell = employeeRowA.locator('[data-testid="rank-cell"], td').filter({ hasText: 'SEV' }).first();
    await rankCell.click();
    
    // Change rank to CHEF
    const rankSelect = pageA.locator('select[name="rank"], [data-testid="rank-select"]').first();
    await rankSelect.selectOption('CHEF');
    
    // Save (if needed)
    const saveButton = pageA.locator('button:has-text("Spara"), button:has-text("Save")').first();
    if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await saveButton.click();
    }

    // Step 6: Verify User B sees rank update (<2s)
    await waitForRealtimeUpdate(pageB, 'CHEF', 2000);
    const employeeRowB = pageB.locator('table tbody tr, [data-testid="employee-row"]')
      .filter({ hasText: 'Realtime' })
      .first();
    await expect(employeeRowB).toContainText('CHEF');

    // Step 7: User A: Terminate employee
    await employeeRowA.click();
    const terminateButton = pageA.locator('button:has-text("Avsluta"), button:has-text("Terminate")').first();
    await terminateButton.click();
    
    await pageA.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await pageA.fill('[name="termination_date"]', '2025-11-13');
    await pageA.click('button:has-text("Bekräfta"), button:has-text("Confirm")');

    // Step 8: Verify User B sees termination (<2s)
    await waitForRealtimeUpdate(pageB, /terminated|avslutad/i, 2000);

    // Step 9: User A: Delete employee
    await employeeRowA.click();
    const deleteButton = pageA.locator('button:has-text("Radera"), button:has-text("Delete")').first();
    await deleteButton.click();
    
    // Confirm deletion if modal appears
    const confirmDelete = pageA.locator('button:has-text("Bekräfta"), button:has-text("Confirm")').first();
    if (await confirmDelete.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmDelete.click();
    }

    // Step 10: Verify User B sees deletion (<2s)
    await pageB.waitForTimeout(2000);
    await expect(pageB.locator('table, [data-testid="employee-table"]')).not.toContainText('Realtime');

    // Cleanup
    await contextA.close();
    await contextB.close();
  });
});

