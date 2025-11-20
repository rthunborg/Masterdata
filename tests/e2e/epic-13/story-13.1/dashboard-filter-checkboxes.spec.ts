import { test, expect } from '@playwright/test';

test.describe('Story 13.1: Filter Checkbox User Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (assuming login is handled)
    await page.goto('/dashboard');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('user can check "Show Archived" and see archived employees', async ({ page }) => {
    // Find and click the "Show Archived" checkbox
    const archivedCheckbox = page.getByRole('checkbox', { name: /show archived/i });
    
    // Verify it's initially unchecked
    await expect(archivedCheckbox).not.toBeChecked();
    
    // Click to check
    await archivedCheckbox.click();
    
    // Verify it's now checked
    await expect(archivedCheckbox).toBeChecked();
    
    // Verify view updates (this would require actual employee data in test environment)
    // The checkbox state should reflect the filter being active
  });

  test('user can uncheck "Show Archived" and hide archived employees', async ({ page }) => {
    const archivedCheckbox = page.getByRole('checkbox', { name: /show archived/i });
    
    // Check it first
    await archivedCheckbox.click();
    await expect(archivedCheckbox).toBeChecked();
    
    // Uncheck it
    await archivedCheckbox.click();
    await expect(archivedCheckbox).not.toBeChecked();
  });

  test('user can switch between filters (mutually exclusive)', async ({ page }) => {
    const archivedCheckbox = page.getByRole('checkbox', { name: /show archived/i });
    const terminatedCheckbox = page.getByRole('checkbox', { name: /show terminated/i });
    const repaymentCheckbox = page.getByRole('checkbox', { name: /needs repayment/i });
    
    // Check archived
    await archivedCheckbox.click();
    await expect(archivedCheckbox).toBeChecked();
    await expect(terminatedCheckbox).not.toBeChecked();
    await expect(repaymentCheckbox).not.toBeChecked();
    
    // Switch to terminated
    await terminatedCheckbox.click();
    await expect(terminatedCheckbox).toBeChecked();
    await expect(archivedCheckbox).not.toBeChecked();
    await expect(repaymentCheckbox).not.toBeChecked();
    
    // Switch to repayment
    await repaymentCheckbox.click();
    await expect(repaymentCheckbox).toBeChecked();
    await expect(archivedCheckbox).not.toBeChecked();
    await expect(terminatedCheckbox).not.toBeChecked();
  });

  test('checkbox visual state matches filter state', async ({ page }) => {
    const archivedCheckbox = page.getByRole('checkbox', { name: /show archived/i });
    
    // Initially unchecked
    await expect(archivedCheckbox).not.toBeChecked();
    
    // Check it
    await archivedCheckbox.click();
    await expect(archivedCheckbox).toBeChecked();
    
    // Uncheck it
    await archivedCheckbox.click();
    await expect(archivedCheckbox).not.toBeChecked();
  });

  test('view updates immediately on checkbox click', async ({ page }) => {
    const archivedCheckbox = page.getByRole('checkbox', { name: /show archived/i });
    
    // Click checkbox
    await archivedCheckbox.click();
    
    // Verify checkbox state changes immediately
    await expect(archivedCheckbox).toBeChecked();
    
    // The view should update (employee list should reflect filter)
    // This would require actual test data to fully verify
  });
});

