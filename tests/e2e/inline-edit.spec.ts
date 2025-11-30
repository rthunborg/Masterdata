import { test, expect } from '@playwright/test';
import { loginAsUser } from './helpers/e2e-helpers';

test.describe('Inline Editing E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Login as HR Admin
        await loginAsUser(page, 'admin@test.com', 'Test123!');

        // Navigate to employees page
        await page.goto('/dashboard');
        await page.waitForLoadState('load');

        // Listen for console logs
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    });

    test('Inline edit text field (First Name)', async ({ page }) => {
        // Wait for table to load
        await page.waitForSelector('table tbody tr', { timeout: 10000 });

        // Find the first employee row
        const firstRow = page.locator('table tbody tr').first();

        // Find the First Name cell (assuming it's one of the first columns)
        const targetCell = firstRow.locator('td').nth(1);
        const initialValue = await targetCell.textContent();

        // Click to edit
        await targetCell.click();

        // Check if input appears
        const input = targetCell.locator('input');
        await expect(input).toBeVisible();

        // Change value
        const newValue = 'UpdatedName';
        await input.fill(newValue);
        await input.press('Enter');

        // Verify update
        await expect(targetCell).toHaveText(newValue);

        // Revert change (optional, but good for cleanup)
        await targetCell.click();
        await input.fill(initialValue || '');
        await input.press('Enter');
        await expect(targetCell).toHaveText(initialValue || '');
    });

    test.only('Inline edit dropdown field (Gender)', async ({ page }) => {
        // Wait for table to load
        await page.waitForSelector('table tbody tr', { timeout: 10000 });

        // Find a row
        const firstRow = page.locator('table tbody tr').first();

        // Find the Gender cell. It should contain "Man" or "Woman".
        const genderCell = firstRow.locator('td').filter({ hasText: /^Man$|^Woman$/ }).first();

        // If no gender cell found (maybe empty?), try to find the column by header
        const genderHeader = page.locator('th').filter({ hasText: 'Gender' });
        if (await genderHeader.count() === 0) {
            console.log('Gender column not visible, skipping test');
            test.skip();
            return;
        }

        // Click to edit
        await genderCell.click();

        // Check if select trigger appears
        // Scope to the cell to avoid finding other comboboxes
        const selectTrigger = genderCell.locator('[role="combobox"]');
        await expect(selectTrigger).toBeVisible();

        // Open dropdown
        console.log('Clicking select trigger...');
        await selectTrigger.click();

        // Wait for the dropdown content to appear (it's in a portal)
        // Radix UI Select content usually has data-slot="select-content" or role="listbox"
        const content = page.locator('[data-slot="select-content"]');
        await expect(content).toBeVisible();

        // Log available options
        const options = page.locator('[role="option"]');
        const count = await options.count();
        console.log(`Found ${count} options`);

        const optionTexts = await options.allTextContents();
        console.log('Option texts:', optionTexts);

        // Select the OTHER option
        const currentText = await genderCell.textContent();
        const newOption = currentText?.trim() === 'Man' ? 'Woman' : 'Man';
        console.log(`Current value: "${currentText}", selecting: "${newOption}"`);

        const optionToClick = options.filter({ hasText: newOption }).first();
        await expect(optionToClick).toBeVisible();
        // await optionToClick.click({ force: true });
        await optionToClick.evaluate(node => (node as HTMLElement).click());

        // Verify update
        // The cell should now show the new option
        await expect(genderCell).toHaveText(newOption);

        // Revert
        console.log('Reverting change...');
        await genderCell.click();
        await selectTrigger.click();
        await expect(content).toBeVisible();
        const originalOption = options.filter({ hasText: currentText || '' }).first();
        await originalOption.click();
        await expect(genderCell).toHaveText(currentText || '');
    });
});
