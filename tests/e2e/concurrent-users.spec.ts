/**
 * End-to-End Test: Concurrent User Scenario
 * Story 11.7: End-to-End Critical User Journey Tests
 * AC5: Concurrent User Scenario
 * 
 * Tests race condition handling when two users assign to last available spot
 */

import { test, expect } from '@playwright/test';
import { createEmployeeViaUI, loginAsUser } from './helpers/e2e-helpers';

test.describe('Concurrent User E2E Scenario', () => {
  test('AC5: Concurrent assignment to last spot', async ({ browser }) => {
    // Step 1: Create ÖMC date with 1 remaining spot
    // (Assumed to be set up via seed data or API)

    // Step 2: Open two browser contexts (User A, User B)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Login both users
    await loginAsUser(pageA, 'admin@test.com', 'Test123!');
    await loginAsUser(pageB, 'admin@test.com', 'Test123!');

    // Step 3: User A: Start assigning employee to date (fill form)
    await pageA.goto('/dashboard');
    await pageA.waitForLoadState('load');

    // Open add employee form
    const addButtonA = pageA.locator('[data-testid="add-employee-btn"], button:has-text("Lägg till")').first();
    await addButtonA.click();
    await pageA.waitForSelector('[role="dialog"], form', { timeout: 5000 });

    // Fill form (but don't submit yet)
    await pageA.fill('[name="first_name"]', 'Concurrent');
    await pageA.fill('[name="surname"]', 'UserA');
    await pageA.fill('[name="ssn"]', '199001011111');
    await pageA.selectOption('[name="rank"]', 'SEV');
    await pageA.selectOption('[name="gender"]', 'Man');
    await pageA.fill('[name="hire_date"]', '2025-01-01');
    await pageA.fill('[name="omc_date"]', '15-16 maj'); // Date with 1 spot

    // Step 4: User B: Start assigning employee to same date (fill form)
    await pageB.goto('/dashboard');
    await pageB.waitForLoadState('load');

    const addButtonB = pageB.locator('[data-testid="add-employee-btn"], button:has-text("Lägg till")').first();
    await addButtonB.click();
    await pageB.waitForSelector('[role="dialog"], form', { timeout: 5000 });

    await pageB.fill('[name="first_name"]', 'Concurrent');
    await pageB.fill('[name="surname"]', 'UserB');
    await pageB.fill('[name="ssn"]', '199001012222');
    await pageB.selectOption('[name="rank"]', 'SEV');
    await pageB.selectOption('[name="gender"]', 'Kvinna');
    await pageB.fill('[name="hire_date"]', '2025-01-02');
    await pageB.fill('[name="omc_date"]', '15-16 maj'); // Same date

    // Step 5: User A: Submit form (should succeed)
    const submitA = pageA.locator('button[type="submit"], button:has-text("Spara")').first();
    await submitA.click();
    await pageA.waitForTimeout(1000);
    await expect(pageA.locator('text=/success|lyckades|created/i')).toBeVisible({ timeout: 10000 });

    // Step 6: User B: Submit form (should fail with 409 error)
    const submitB = pageB.locator('button[type="submit"], button:has-text("Spara")').first();
    await submitB.click();
    await pageB.waitForTimeout(1000);

    // Step 7: Verify User A's employee assigned
    await pageA.goto('/dashboard');
    await pageA.waitForLoadState('load');
    await expect(pageA.locator('table, [data-testid="employee-table"]')).toContainText('UserA');

    // Step 8: Verify capacity = 0
    await pageA.goto('/important-dates');
    await pageA.waitForLoadState('load');
    const capacityBadge = pageA.locator('[data-testid="capacity-badge"]').filter({ hasText: '15-16 maj' }).first();
    await expect(capacityBadge).toContainText(/fullbokad|full|0/i);

    // Step 9: Verify User B sees error message
    await expect(pageB.locator('text=/fullbokat|full|capacity|error/i')).toBeVisible({ timeout: 5000 });

    // Step 10: Verify User B's employee NOT created
    await pageB.goto('/dashboard');
    await pageB.waitForLoadState('load');
    await expect(pageB.locator('table, [data-testid="employee-table"]')).not.toContainText('UserB');

    // Cleanup
    await contextA.close();
    await contextB.close();
  });
});

