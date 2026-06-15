/**
 * E2E Tests for Delete Column Functionality
 *
 * Story: 17.2 - Delete Functionality for Custom Columns
 *
 * Tests the delete flow for an external party (Sodexo) user. The tests are
 * SELF-CONTAINED: each one creates its own uniquely-named custom column (which
 * makes the current user the owner with edit rights) and then operates on that
 * column. They therefore do not depend on test ordering, pre-existing columns, or
 * seeded employee rows — and they exercise the real reactive refresh after a
 * mutation (which relies on the columns GET being fetched fresh, not from cache).
 */

import { test, expect, type Page } from '@playwright/test';
import { loginAsUser } from './helpers/e2e-helpers';

const ADD_COLUMN_BUTTON = /Lägg till kolumn/i;
const MANAGE_COLUMN_BUTTON = /Hantera kolumner/i;
// Placeholders uniquely identify the two text inputs in the add-column modal.
const COLUMN_NAME_PLACEHOLDER = /Training Status, Room Number/i;
const DB_NAME_PLACEHOLDER = /training_status, room_number/i;

async function createCustomColumn(page: Page, displayName: string, dbName: string) {
  const addButton = page.getByRole('button', { name: ADD_COLUMN_BUTTON });
  await expect(addButton).toBeVisible({ timeout: 30000 });
  await addButton.click();

  const addDialog = page.getByRole('dialog').filter({ hasText: 'Lägg till ny kolumn' });
  await expect(addDialog).toBeVisible({ timeout: 10000 });
  await addDialog.getByPlaceholder(COLUMN_NAME_PLACEHOLDER).fill(displayName);
  await addDialog.getByPlaceholder(DB_NAME_PLACEHOLDER).fill(dbName);
  await addDialog.getByRole('button', { name: /Skapa kolumn/i }).click();

  // On success the modal closes and the column list refetches.
  await expect(addDialog).toBeHidden({ timeout: 15000 });
}

async function openManageDialog(page: Page) {
  const manageButton = page.getByRole('button', { name: MANAGE_COLUMN_BUTTON });
  await expect(manageButton).toBeVisible({ timeout: 15000 });
  await manageButton.click();

  const manageDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Hantera anpassade kolumner' });
  await expect(manageDialog).toBeVisible({ timeout: 10000 });
  return manageDialog;
}

test.describe('Delete Custom Column E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as external party user (Sodexo).
    const externalEmail = process.env.E2E_EXTERNAL_EMAIL || 'sodexo@test.com';
    const externalPassword = process.env.E2E_EXTERNAL_PASSWORD || 'Test123!';

    await loginAsUser(page, externalEmail, externalPassword);

    // The add-column control is always present for external parties and does not
    // depend on employee data, so it is a reliable "dashboard ready" signal.
    await expect(page.getByRole('button', { name: ADD_COLUMN_BUTTON })).toBeVisible({
      timeout: 30000,
    });
  });

  test('should delete custom column after confirmation', async ({ page }) => {
    const suffix = `${Date.now()}`.slice(-9);
    const displayName = `E2E Delete ${suffix}`;
    const dbName = `e2e_delete_${suffix}`;

    // Create a column owned by this user so the delete is guaranteed to be allowed.
    await createCustomColumn(page, displayName, dbName);

    // ManageColumnsDialog has its own useColumns instance (separate from the add
    // modal's), so it only learns about the new column via the realtime
    // subscription. Reload to pick it up deterministically rather than depending on
    // realtime timing in the local e2e stack.
    await page.reload();
    await expect(page.getByRole('button', { name: ADD_COLUMN_BUTTON })).toBeVisible({
      timeout: 30000,
    });

    const manageDialog = await openManageDialog(page);
    await expect(manageDialog.getByRole('button', { name: displayName })).toBeVisible({
      timeout: 15000,
    });

    // Click the delete (trash) button in the created column's row.
    const row = manageDialog.locator('div.group').filter({ hasText: displayName });
    await row.locator('button[aria-label*="Ta bort"]').click();

    // Confirm in the AlertDialog.
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await expect(
      confirmDialog.getByText(/Är du säker på att du vill ta bort kolumnen/i)
    ).toBeVisible({ timeout: 5000 });
    await confirmDialog.getByRole('button', { name: /ta bort/i }).click();

    // The column list refetches fresh (no-store) and the column disappears. If it
    // was the only custom column the whole manage dialog unmounts; either way the
    // created column is gone. A web-first assertion avoids any fixed-wait flake.
    await expect(page.getByRole('button', { name: displayName })).toHaveCount(0, {
      timeout: 15000,
    });
  });

  test('should cancel deletion when cancel button is clicked', async ({ page }) => {
    const suffix = `${Date.now()}`.slice(-9);
    const displayName = `E2E Cancel ${suffix}`;
    const dbName = `e2e_cancel_${suffix}`;

    await createCustomColumn(page, displayName, dbName);

    // ManageColumnsDialog has its own useColumns instance (separate from the add
    // modal's), so it only learns about the new column via the realtime
    // subscription. Reload to pick it up deterministically rather than depending on
    // realtime timing in the local e2e stack.
    await page.reload();
    await expect(page.getByRole('button', { name: ADD_COLUMN_BUTTON })).toBeVisible({
      timeout: 30000,
    });

    const manageDialog = await openManageDialog(page);
    const row = manageDialog.locator('div.group').filter({ hasText: displayName });
    await expect(manageDialog.getByRole('button', { name: displayName })).toBeVisible({
      timeout: 15000,
    });

    // Open the delete confirmation, then cancel it.
    await row.locator('button[aria-label*="Ta bort"]').click();
    const confirmDialog = page.getByRole('alertdialog');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await confirmDialog.getByRole('button', { name: /avbryt/i }).click();

    // The confirmation closes and the column is still present.
    await expect(confirmDialog).toBeHidden({ timeout: 5000 });
    await expect(manageDialog.getByRole('button', { name: displayName })).toBeVisible({
      timeout: 10000,
    });

    // Clean up the column we created so it does not accumulate across local runs.
    await row.locator('button[aria-label*="Ta bort"]').click();
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    await confirmDialog.getByRole('button', { name: /ta bort/i }).click();
    await expect(page.getByRole('button', { name: displayName })).toHaveCount(0, {
      timeout: 15000,
    });
  });

  test('should show error message when deletion fails', async () => {
    // Requires API-level error injection (403/500). That failure path is covered
    // at the route/repository layer by unit/integration tests; the UI flow here is
    // limited to the happy/cancel paths above.
    test.skip();
  });
});
