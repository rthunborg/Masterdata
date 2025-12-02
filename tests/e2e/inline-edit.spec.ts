import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/e2e-helpers';

test.describe('Inline Editing E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Login as HR Admin using the proper helper
        await loginAsUser(page, 'admin@test.com', 'Test123!');
        // Wait for dashboard to fully load after login
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(1000);
    });

    test('Inline edit text field (First Name)', async ({ page }) => {
        // Wait for table to load
        await page.waitForSelector('table, [data-testid="employee-table"]', { timeout: 10000 });
        await page.waitForSelector('table tbody tr, [data-testid*="employee-row"]', { timeout: 10000 });

        // Find the first employee row
        const firstRow = page.locator('table tbody tr, [data-testid*="employee-row"]').first();

        // Find the First Name cell (assuming it's one of the first columns)
        const targetCell = firstRow.locator('td').nth(1);
        const initialValue = await targetCell.textContent();

        // Click to edit
        await targetCell.click();

        // Wait for edit mode to activate - input should appear
        const input = targetCell.locator('input');
        await expect(input).toBeVisible({ timeout: 10000 });

        // Change value
        const newValue = 'UpdatedName';
        await input.fill(newValue);
        await input.press('Enter');

        // Verify update
        await expect(targetCell).toHaveText(newValue, { timeout: 10000 });

        // Revert change (optional, but good for cleanup)
        await targetCell.click();
        const revertInput = targetCell.locator('input');
        await expect(revertInput).toBeVisible({ timeout: 10000 });
        await revertInput.fill(initialValue || '');
        await revertInput.press('Enter');
        await expect(targetCell).toHaveText(initialValue || '', { timeout: 10000 });
    });

    test('Inline edit dropdown field (Gender)', async ({ page }) => {
        // Wait for table to load
        await page.waitForSelector('table, [data-testid="employee-table"]', { timeout: 10000 });
        await page.waitForSelector('table tbody tr, [data-testid*="employee-row"]', { timeout: 10000 });

        // Find the Gender column by header
        const genderHeader = page.locator('th').filter({ hasText: /Gender|Kön/i });
        if (await genderHeader.count() === 0) {
            test.skip();
            return;
        }

        // Get the column index by counting headers before Gender
        const allHeaders = page.locator('th');
        const headerCount = await allHeaders.count();
        let genderColumnIndex = -1;
        for (let i = 0; i < headerCount; i++) {
            const headerText = await allHeaders.nth(i).textContent();
            if (headerText && /Gender|Kön/i.test(headerText)) {
                genderColumnIndex = i;
                break;
            }
        }

        if (genderColumnIndex === -1) {
            test.skip();
            return;
        }

        // Find the first row and get the gender cell by index
        const firstRow = page.locator('table tbody tr, [data-testid*="employee-row"]').first();
        const genderCell = firstRow.locator('td').nth(genderColumnIndex);

        // Wait for cell to be visible and scroll into view
        await expect(genderCell).toBeVisible({ timeout: 10000 });
        await genderCell.scrollIntoViewIfNeeded();

        // Get current value before editing
        const currentText = await genderCell.textContent();
        const newOption = currentText?.trim() === 'Man' ? 'Woman' : 'Man';

        // Click to edit - this should open the Select dropdown automatically
        await genderCell.click();

        // Wait for listbox to be visible (dropdown auto-opens on edit)
        const listbox = page.getByRole('listbox').first();
        await expect(listbox).toBeVisible({ timeout: 5000 });

        // Select the new option - find it from the page root to avoid detached element issues
        const option = page.getByRole('option', { name: newOption }).first();
        await expect(option).toBeVisible({ timeout: 5000 });
        // Small delay to ensure option is stable
        await page.waitForTimeout(200);
        await option.click();

        // Wait for dropdown to close and edit mode to exit
        await expect(listbox).not.toBeVisible({ timeout: 5000 });
        
        // Wait for network request to complete
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
            // Network idle might not happen, that's okay
        });
        
        // Wait for the table to update
        await page.waitForTimeout(1000);

        // Verify update - wait for cell text to change
        const updatedGenderCell = firstRow.locator('td').nth(genderColumnIndex);
        await expect(updatedGenderCell).toHaveText(newOption, { timeout: 10000 });

        // Revert to original value
        await updatedGenderCell.click();
        await page.waitForTimeout(300);
        const revertListbox = page.getByRole('listbox').first();
        await expect(revertListbox).toBeVisible({ timeout: 5000 });
        const originalOption = revertListbox.getByRole('option', { name: currentText?.trim() || '' }).first();
        await originalOption.click();
        await expect(revertListbox).not.toBeVisible({ timeout: 5000 });
        await expect(updatedGenderCell).toHaveText(currentText?.trim() || '', { timeout: 10000 });
    });

    test('Inline edit boolean field', async ({ page }) => {
        // Wait for table to load
        await page.waitForSelector('table, [data-testid="employee-table"]', { timeout: 10000 });
        await page.waitForSelector('table tbody tr, [data-testid*="employee-row"]', { timeout: 10000 });

        // Find a boolean column (e.g., "One", "Talmundo", "Crewing/Done")
        // Look for columns that might be boolean
        const allHeaders = page.locator('th');
        const headerCount = await allHeaders.count();
        let booleanColumnIndex = -1;
        let booleanColumnName = '';

        // Try to find a boolean column
        for (let i = 0; i < headerCount; i++) {
            const headerText = await allHeaders.nth(i).textContent();
            if (headerText && (/One|Talmundo|Crewing/i.test(headerText))) {
                booleanColumnIndex = i;
                booleanColumnName = headerText.trim();
                break;
            }
        }

        if (booleanColumnIndex === -1) {
            test.skip();
            return;
        }

        // Find the first row and get the boolean cell by index
        const firstRow = page.locator('table tbody tr, [data-testid*="employee-row"]').first();
        const booleanCell = firstRow.locator('td').nth(booleanColumnIndex);

        // Wait for cell to be visible and scroll into view
        await expect(booleanCell).toBeVisible({ timeout: 10000 });
        await booleanCell.scrollIntoViewIfNeeded();

        // Get current value before editing
        const currentText = await booleanCell.textContent();
        // Boolean fields show "Ja" (true) or "Nej" (false) in Swedish
        const newValue = currentText?.trim().toLowerCase().includes('ja') ? 'Nej' : 'Ja';

        // Click to edit - this should open the Select dropdown automatically
        await booleanCell.click();

        // Wait for Select trigger to be visible first (ensures Select component is rendered)
        // Try multiple selectors for the trigger
        const selectTrigger = page.locator('[role="combobox"], [data-slot="select-trigger"], button[aria-haspopup="listbox"]').first();
        await expect(selectTrigger).toBeVisible({ timeout: 5000 });
        
        // Wait a bit for auto-open to happen
        await page.waitForTimeout(500);

        // Check if dropdown is open, if not click the trigger
        let listbox = page.getByRole('listbox').first();
        const isListboxVisible = await listbox.isVisible().catch(() => false);
        
        if (!isListboxVisible) {
          // Dropdown didn't auto-open, click the trigger to open it
          await selectTrigger.click({ force: true });
          await page.waitForTimeout(300);
          // Re-query listbox after click
          listbox = page.getByRole('listbox').first();
        }
        
        // Now wait for listbox to be visible
        await expect(listbox).toBeVisible({ timeout: 5000 });

        // Select the new value
        const option = listbox.getByRole('option', { name: newValue }).first();
        await expect(option).toBeVisible({ timeout: 5000 });
        await option.click();

        // Wait for dropdown to close and edit mode to exit
        await expect(listbox).not.toBeVisible({ timeout: 5000 });
        
        // Wait for network request to complete
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
            // Network idle might not happen, that's okay
        });
        
        // Wait for the table to update
        await page.waitForTimeout(1000);

        // Verify update - wait for cell text to change
        const updatedBooleanCell = firstRow.locator('td').nth(booleanColumnIndex);
        await expect(updatedBooleanCell).toHaveText(newValue, { timeout: 10000 });

        // Revert to original value
        await updatedBooleanCell.click();
        await page.waitForTimeout(300);
        const revertListbox = page.getByRole('listbox').first();
        await expect(revertListbox).toBeVisible({ timeout: 5000 });
        const originalOption = revertListbox.getByRole('option', { name: currentText?.trim() || '' }).first();
        await originalOption.click();
        await expect(revertListbox).not.toBeVisible({ timeout: 5000 });
        await expect(updatedBooleanCell).toHaveText(currentText?.trim() || '', { timeout: 10000 });
    });
});
