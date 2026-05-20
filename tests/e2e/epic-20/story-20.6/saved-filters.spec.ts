/**
 * End-to-End Test: Saved Filters
 * Story 20.6: Saved Filters
 * 
 * Tests:
 * - Save a filter with a custom name
 * - Load and apply saved filters
 * - Delete saved filters with confirmation
 * - Persist filters across page reloads
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsUser } from "../../helpers/e2e-helpers";

async function openFilterPanel(page: Page) {
  const filterPanel = page.getByTestId("filter-panel");

  if (!(await filterPanel.isVisible({ timeout: 500 }).catch(() => false))) {
    await page.getByTestId("filter-button").click();
  }

  await expect(filterPanel).toBeVisible();
  await expect(page.getByText("Filtrera anställda")).toBeVisible();
}

async function applyTextFilter(page: Page, columnName: string, value: string) {
  await openFilterPanel(page);
  await page.getByTestId(`filter-column-toggle-${columnName}`).click();
  const input = page.getByTestId(`text-filter-input-${columnName}`);
  await expect(input).toBeVisible();
  await input.fill(value);
  await expect(input).toHaveValue(value);
  await applyCurrentFilters(page);
  await expect(page.getByTestId("save-filter-button")).toBeVisible({
    timeout: 5000,
  });
}

async function applyBooleanFilter(page: Page, columnName: string, value: boolean) {
  await openFilterPanel(page);
  await page.getByTestId(`filter-column-toggle-${columnName}`).click();
  const option = page.getByTestId(
    `boolean-filter-${value ? "yes" : "no"}-${columnName}`
  );
  await expect(option).toBeVisible();
  await option.click();
  await applyCurrentFilters(page);
  await expect(page.getByTestId("save-filter-button")).toBeVisible({
    timeout: 5000,
  });
}

async function applyCurrentFilters(page: Page) {
  const filterPanel = page.getByTestId("filter-panel");

  if (await filterPanel.isVisible({ timeout: 500 }).catch(() => false)) {
    await page.getByTestId("apply-filters").click();
    await expect(filterPanel).not.toBeVisible();
  }
}

async function openSaveFilterDialog(page: Page) {
  await applyCurrentFilters(page);
  const saveFilterButton = page.getByTestId("save-filter-button");
  await expect(saveFilterButton).toBeVisible({ timeout: 5000 });
  await saveFilterButton.click();
  await expect(page.getByText(/ge denna filterkombination ett namn/i)).toBeVisible();
}

async function saveCurrentFilter(page: Page, name: string) {
  await openSaveFilterDialog(page);
  await page.getByLabel("Filternamn").fill(name);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^spara filter$/i })
    .click();
  await expect(page.getByText(/ge denna filterkombination ett namn/i)).not.toBeVisible();
}

test.describe("Story 20.6: Saved Filters", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, "admin@test.com", "Test123!");
    await page.goto("/dashboard");
    await page.waitForLoadState("load");
  });

  test("AC1-3: Save filter, reload page, and apply saved filter", async ({ page }) => {
    const filterName = `My Test Filter E2E ${Date.now()}`;

    // Step 1: Open filter panel
    await openFilterPanel(page);

    // Step 2: Apply a filter (e.g., search for "John" in first name)
    await applyTextFilter(page, "first_name", "John");

    // Step 3: Verify Save Filter button appears when filters are active
    await expect(page.getByTestId("save-filter-button")).toBeVisible();

    // Step 4: Click Save Filter button
    await openSaveFilterDialog(page);

    // Step 5: Verify Save Filter dialog opens
    await expect(page.getByText(/ge denna filterkombination ett namn/i)).toBeVisible();

    // Step 6: Enter filter name
    const filterNameInput = page.getByLabel("Filternamn");
    await filterNameInput.fill(filterName);

    // Step 7: Verify filter summary is shown
    await expect(page.getByText("Detta sparas:")).toBeVisible();

    // Step 8: Click Save in dialog
    const saveButton = page.getByRole("dialog").getByRole("button", { name: /^spara filter$/i });
    await saveButton.click();

    // Step 9: Verify success toast (optional, depends on toast implementation)
    // await expect(page.getByText("Filter saved successfully")).toBeVisible();

    // Step 10: Verify dialog closes
    await expect(page.getByText(/ge denna filterkombination ett namn/i)).not.toBeVisible();

    // Step 11: Reload page
    await page.reload();
    await page.waitForLoadState("load");

    // Step 12: Open filter panel again
    await openFilterPanel(page);

    // Step 13: Verify saved filter appears in dropdown
    await expect(page.getByText("Mina sparade filter")).toBeVisible();

    // Step 14: Open saved filters dropdown
    const dropdown = page.getByRole("combobox", { name: /välj ett sparat filter/i });
    await dropdown.click();

    // Step 15: Verify saved filter is in the list
    await expect(page.getByRole("option", { name: new RegExp(filterName) })).toBeVisible();

    // Step 16: Select saved filter
    await page.getByRole("option", { name: new RegExp(filterName) }).click();

    // Step 17: Verify filter is applied (check that input has the value)
    await page.waitForTimeout(500); // Wait for filter to be applied
    await expect(page.getByTestId("active-filters-list")).toContainText("John");

    // Step 18: Verify "current" indicator shows
    await dropdown.click();
    await expect(
      page.getByRole("option", { name: new RegExp(`${filterName}.*aktuell`, "i") })
    ).toBeVisible();
  });

  test("AC4: Delete saved filter with confirmation", async ({ page }) => {
    const filterName = `Filter to Delete E2E ${Date.now()}`;

    // Prerequisite: Create a filter first
    await openFilterPanel(page);

    // Apply a filter
    await applyBooleanFilter(page, "hotel_required", true);

    // Save filter
    await saveCurrentFilter(page, filterName);

    // Wait for dialog to close
    await page.waitForTimeout(500);
    await openFilterPanel(page);

    // Step 1: Open saved filters dropdown and select the filter to delete
    const dropdown = page.getByRole("combobox", { name: /välj ett sparat filter/i });
    await dropdown.click();

    // Step 2: Select the filter (this reveals the trash button next to the dropdown)
    const filterItem = page.getByRole("option", { name: new RegExp(filterName) });
    await filterItem.click();

    // Step 3: Click the trash button that appeared next to the dropdown
    const deleteButton = page.getByLabel(new RegExp(`radera.*${filterName}`, "i"));
    await deleteButton.click();

    // Step 4: Verify confirmation dialog appears
    await expect(page.getByText("Radera sparat filter?")).toBeVisible();
    await expect(page.getByText(/är du säker på att du vill radera/i)).toBeVisible();
    await expect(page.getByText(new RegExp(`"${filterName}"`))).toBeVisible();
    await expect(page.getByText(/åtgärden kan inte ångras/i)).toBeVisible();

    // Step 5: Click Cancel to test cancellation
    await page.getByRole("button", { name: /avbryt/i }).last().click();

    // Step 6: Verify dialog closes and delete button still visible
    await expect(page.getByText("Radera sparat filter?")).not.toBeVisible();
    await expect(deleteButton).toBeVisible();

    // Step 7: Click delete button again
    await deleteButton.click();

    // Step 8: Confirm deletion
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/users/filters/") &&
        response.request().method() === "DELETE"
    );
    await page.getByRole("button", { name: /^radera$/i }).last().click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.ok()).toBe(true);

    // Step 9: Verify filter is removed from list
    await dropdown.click();
    await expect(page.getByRole("option", { name: new RegExp(filterName) })).toHaveCount(0);

    // Step 10: Verify success toast (optional)
    // await expect(page.getByText("Filter deleted")).toBeVisible();
  });

  test("AC5: Duplicate name validation", async ({ page }) => {
    const filterName = `Duplicate Test Filter ${Date.now()}`;

    // Prerequisite: Create first filter
    await openFilterPanel(page);

    // Apply a filter
    await applyTextFilter(page, "first_name", "Test");

    // Save first filter
    await saveCurrentFilter(page, filterName);

    // Wait for save to complete
    await page.waitForTimeout(500);

    // Step 1: Clear filters
    const clearButton = page.getByTestId("clear-filter-button");
    if (await clearButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clearButton.click();
    }

    // Step 2: Apply different filter
    await applyTextFilter(page, "surname", "Different");

    // Step 3: Try to save with same name
    await openSaveFilterDialog(page);
    const filterNameInput = page.getByLabel("Filternamn");
    await filterNameInput.fill(filterName);
    const saveButton = page.getByRole("dialog").getByRole("button", { name: /^spara filter$/i });
    await saveButton.click();

    // Step 4: Verify error message appears
    await expect(page.getByText(/ett filter med det här namnet finns redan/i)).toBeVisible({
      timeout: 3000,
    });

    // Step 5: Verify dialog stays open
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Spara filter" })
    ).toBeVisible();
  });

  test("AC6: Empty name validation", async ({ page }) => {
    // Open filter panel and apply a filter
    await openFilterPanel(page);
    await applyTextFilter(page, "first_name", "Test");

    // Open save dialog
    await openSaveFilterDialog(page);

    // Step 1: Verify Save button is disabled when name is empty
    const saveButton = page.getByRole("dialog").getByRole("button", { name: /^spara filter$/i });
    await expect(saveButton).toBeDisabled();

    // Step 2: Type whitespace only
    const filterNameInput = page.getByLabel("Filternamn");
    await filterNameInput.fill("   ");

    // Step 3: Verify Save button is still disabled
    await expect(saveButton).toBeDisabled();

    // Step 4: Type valid name
    await filterNameInput.clear();
    await filterNameInput.fill("Valid Name");

    // Step 5: Verify Save button is enabled
    await expect(saveButton).not.toBeDisabled();
  });

  test("AC7: Maximum 50 characters validation", async ({ page }) => {
    // Open filter panel and apply a filter
    await openFilterPanel(page);
    await applyTextFilter(page, "first_name", "Test");

    // Open save dialog
    await openSaveFilterDialog(page);

    // Step 1: Try to type more than 50 characters
    const filterNameInput = page.getByLabel("Filternamn");
    const longName = "a".repeat(60);
    await filterNameInput.fill(longName);

    // Step 2: Verify input is capped at 50 characters
    const actualValue = await filterNameInput.inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(50);

    // Step 3: Verify hint text is shown
    await expect(page.getByText("Max 50 tecken")).toBeVisible();
  });
});
