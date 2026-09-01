import { test, expect, type Locator, type Page } from '@playwright/test';
import { createEmployeeViaUI, loginAsUser } from './helpers/e2e-helpers';

let inlineSeedCounter = 0;

async function firstEmployeeRow(page: Page) {
    await expect(
        page.getByRole('button', { name: /Totalt antal anställda.*\d+/i })
    ).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 });

    const row = page.locator('[data-testid^="employee-row-"]').first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await expect(row.getByRole('gridcell', { name: /Edit first_name/i })).toBeVisible({ timeout: 15000 });

    return row;
}

async function columnIndex(page: Page, label: RegExp) {
    const headers = page.getByRole('columnheader');
    const count = await headers.count();

    for (let index = 0; index < count; index += 1) {
        const headerText = (await headers.nth(index).textContent()) || '';
        if (label.test(headerText)) {
            return index;
        }
    }

    throw new Error(`Column header not found: ${label}`);
}

async function tableCellByColumn(page: Page, row: Locator, label: RegExp) {
    const index = await columnIndex(page, label);
    const cell = row.locator('td').nth(index);
    await expect(cell).toBeVisible({ timeout: 10000 });
    await cell.scrollIntoViewIfNeeded();
    return cell;
}

async function openInlineSelect(page: Page, cell: Locator, label: RegExp) {
    const editor = cell.getByRole('gridcell', { name: label }).first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    for (let attempt = 0; attempt < 3; attempt += 1) {
        await editor.scrollIntoViewIfNeeded();
        await editor.click({ force: attempt > 0 });

        const trigger = cell.getByRole('combobox').first();
        if (await trigger.waitFor({ state: 'visible', timeout: 3000 }).then(() => true).catch(() => false)) {
            const listbox = page.getByRole('listbox').first();
            if (await listbox.waitFor({ state: 'visible', timeout: 1000 }).then(() => true).catch(() => false)) {
                return listbox;
            }

            const isExpanded = (await trigger.getAttribute('aria-expanded').catch(() => null)) === 'true';
            if (!isExpanded) {
                await trigger.click({ force: true });
            }
            await expect(listbox).toBeVisible({ timeout: 10000 });
            return listbox;
        }

        const alreadyOpen = page.getByRole('listbox').first();
        if (await alreadyOpen.waitFor({ state: 'visible', timeout: 1000 }).then(() => true).catch(() => false)) {
            return alreadyOpen;
        }

        await editor.press('Enter').catch(() => {});
    }

    const listbox = page.getByRole('listbox').first();
    await expect(listbox).toBeVisible({ timeout: 10000 });
    return listbox;
}

async function selectInlineOption(page: Page, cell: Locator, label: RegExp, optionName: string) {
    const listbox = await openInlineSelect(page, cell, label);
    const option = listbox.getByRole('option', { name: optionName, exact: true }).first();

    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();
    await expect(listbox).not.toBeVisible({ timeout: 5000 });
}

test.describe('Inline Editing E2E', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        await loginAsUser(page, 'admin@test.com', 'Test123!');
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

        const seed = `${testInfo.workerIndex % 10}${testInfo.retry % 10}${String(inlineSeedCounter++ % 100).padStart(2, '0')}`;
        await createEmployeeViaUI(page, {
            first_name: `Inline${seed}`,
            surname: 'Employee',
            ssn: `19881231${seed}`,
            rank: 'SEV',
            gender: 'Man',
            hire_date: '2026-01-01',
        });
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    });

    test('Inline edit text field (First Name)', async ({ page }) => {
        const firstRow = await firstEmployeeRow(page);
        const targetCell = await tableCellByColumn(page, firstRow, /First Name/i);
        const initialValue = (await targetCell.textContent())?.trim() || '';

        await targetCell.getByRole('gridcell', { name: /Edit first_name/i }).click();

        const input = targetCell.locator('input').first();
        await expect(input).toBeVisible({ timeout: 10000 });

        const newValue = 'UpdatedName';
        await input.fill(newValue);
        await input.press('Enter');

        await expect(targetCell).toContainText(newValue, { timeout: 10000 });

        await targetCell.getByRole('gridcell', { name: /Edit first_name/i }).click();
        const revertInput = targetCell.locator('input').first();
        await expect(revertInput).toBeVisible({ timeout: 10000 });
        await revertInput.fill(initialValue);
        await revertInput.press('Enter');
        await expect(targetCell).toContainText(initialValue, { timeout: 10000 });
    });

    test('Inline edit dropdown field (Gender)', async ({ page }) => {
        const firstRow = await firstEmployeeRow(page);
        const genderCell = await tableCellByColumn(page, firstRow, /Gender|Kön/i);
        const currentText = (await genderCell.textContent())?.trim() || '';
        const newOption = currentText === 'Man' ? 'Woman' : 'Man';

        await selectInlineOption(page, genderCell, /Edit gender/i, newOption);

        await expect(genderCell).toContainText(newOption, { timeout: 10000 });

        await selectInlineOption(page, genderCell, /Edit gender/i, currentText);

        await expect(genderCell).toContainText(currentText, { timeout: 10000 });
    });

    test('Inline edit boolean field', async ({ page }) => {
        const firstRow = await firstEmployeeRow(page);
        const specialDietCell = await tableCellByColumn(page, firstRow, /Specialkost|Special Diet/i);
        const currentText = (await specialDietCell.textContent())?.trim() || '';
        const isCurrentlyTrue = /Klart|Ja/i.test(currentText);
        // special_diet is a non-checklist boolean, so its true label is "Ja".
        // Checklist booleans use "Klart", but the column metadata intentionally
        // distinguishes those two presentation semantics.
        const newValue = isCurrentlyTrue ? 'Nej' : 'Ja';

        await selectInlineOption(page, specialDietCell, /Edit special_diet/i, newValue);

        await expect(specialDietCell).toContainText(newValue, { timeout: 10000 });

        const originalValue = isCurrentlyTrue ? 'Ja' : 'Nej';
        await selectInlineOption(page, specialDietCell, /Edit special_diet/i, originalValue);

        await expect(specialDietCell).toContainText(originalValue, { timeout: 10000 });
    });
});
