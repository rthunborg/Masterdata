/**
 * Story 22.13 — external custom-column lifecycle restrictions.
 *
 * External parties retain presentation editing for assigned custom columns,
 * but creation and deletion are HR Admin-only operations.
 */

import { expect, test } from '@playwright/test';

import { loginAsUser } from './helpers/e2e-helpers';

const ADD_COLUMN_BUTTON = /Lägg till kolumn/i;
const MANAGE_COLUMN_BUTTON = /Hantera kolumner/i;

test.describe('External custom-column lifecycle restrictions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(
      page,
      process.env.E2E_EXTERNAL_EMAIL || 'sodexo@test.com',
      process.env.E2E_EXTERNAL_PASSWORD || 'Test123!'
    );
    await page.goto('/dashboard', { waitUntil: 'load' });
  });

  test('hides create and delete controls while keeping presentation editing', async ({
    page,
  }) => {
    await expect(
      page.getByRole('button', { name: ADD_COLUMN_BUTTON })
    ).toHaveCount(0);

    const manageButton = page.getByRole('button', {
      name: MANAGE_COLUMN_BUTTON,
    });
    await expect(manageButton).toBeVisible({ timeout: 30000 });
    await manageButton.click();

    const manageDialog = page
      .getByRole('dialog')
      .filter({ hasText: 'Hantera anpassade kolumner' });
    await expect(manageDialog).toBeVisible({ timeout: 10000 });
    await expect(
      manageDialog.locator('button[aria-label*="Ta bort"]')
    ).toHaveCount(0);
    await expect(
      manageDialog.getByRole('button', { name: /sodexo_meal_plan/i })
    ).toBeVisible();
  });

  test('rejects direct external create and delete API calls', async ({ page }) => {
    const createResponse = await page.request.post('/api/columns', {
      data: {
        column_name: 'Forbidden external lifecycle probe',
        db_column_name: 'forbidden_external_lifecycle_probe',
        column_type: 'boolean',
        is_masterdata: false,
      },
    });
    expect(createResponse.status()).toBe(403);

    const deleteResponse = await page.request.delete(
      '/api/columns/00000000-0000-4000-8000-000000000013'
    );
    expect(deleteResponse.status()).toBe(403);
  });
});
