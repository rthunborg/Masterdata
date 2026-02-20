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

import { test, expect } from "@playwright/test";
import { loginAsUser } from "../../helpers/e2e-helpers";

test.describe("Story 20.6: Saved Filters", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, "admin@test.com", "Test123!");
    await page.goto("/dashboard");
    await page.waitForLoadState("load");
  });

  test("AC1-3: Save filter, reload page, and apply saved filter", async ({ page }) => {
    // Step 1: Open filter panel
    const filterButton = page.getByRole("button", { name: /filter/i });
    await filterButton.click();

    // Wait for filter panel to open
    await expect(page.getByText("Filtrera anställda")).toBeVisible();

    // Step 2: Apply a filter (e.g., search for "John" in first name)
    const firstNameToggle = page.getByTestId("filter-column-toggle-first_name");
    if (await firstNameToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstNameToggle.click();
      const firstNameInput = page.getByTestId("text-filter-input-first_name");
      await firstNameInput.fill("John");
    }

    // Step 3: Verify Save Filter button appears when filters are active
    await expect(page.getByRole("button", { name: /spara filter/i })).toBeVisible();

    // Step 4: Click Save Filter button
    await page.getByRole("button", { name: /spara filter/i }).click();

    // Step 5: Verify Save Filter dialog opens
    await expect(page.getByText(/ge denna filterkombination ett namn/i)).toBeVisible();

    // Step 6: Enter filter name
    const filterNameInput = page.getByLabel("Filternamn");
    await filterNameInput.fill("My Test Filter E2E");

    // Step 7: Verify filter summary is shown
    await expect(page.getByText("Detta sparas:")).toBeVisible();

    // Step 8: Click Save in dialog
    const saveButton = page.getByRole("button", { name: /^spara filter$/i }).last();
    await saveButton.click();

    // Step 9: Verify success toast (optional, depends on toast implementation)
    // await expect(page.getByText("Filter saved successfully")).toBeVisible();

    // Step 10: Verify dialog closes
    await expect(page.getByText(/ge denna filterkombination ett namn/i)).not.toBeVisible();

    // Step 11: Close filter panel and reload page
    const applyFiltersButton = page.getByRole("button", { name: /tillämpa filter/i });
    await applyFiltersButton.click();

    await page.reload();
    await page.waitForLoadState("load");

    // Step 12: Open filter panel again
    await filterButton.click();
    await expect(page.getByText("Filtrera anställda")).toBeVisible();

    // Step 13: Verify saved filter appears in dropdown
    await expect(page.getByText("Mina sparade filter")).toBeVisible();

    // Step 14: Open saved filters dropdown
    const dropdown = page.getByRole("combobox", { name: /välj ett sparat filter/i });
    await dropdown.click();

    // Step 15: Verify saved filter is in the list
    await expect(page.getByText("My Test Filter E2E")).toBeVisible();

    // Step 16: Select saved filter
    await page.getByText("My Test Filter E2E").click();

    // Step 17: Verify filter is applied (check that input has the value)
    await page.waitForTimeout(500); // Wait for filter to be applied
    const appliedInput = page.locator('input[value="John"]').first();
    await expect(appliedInput).toBeVisible();

    // Step 18: Verify "current" indicator shows
    await dropdown.click();
    const currentFilter = page.locator('text="My Test Filter E2E"').locator('..').locator('text="aktuell"');
    await expect(currentFilter).toBeVisible();
  });

  test("AC4: Delete saved filter with confirmation", async ({ page }) => {
    // Prerequisite: Create a filter first
    const filterButton = page.getByRole("button", { name: /filter/i });
    await filterButton.click();
    await expect(page.getByText("Filtrera anställda")).toBeVisible();

    // Apply a filter
    const hotelRequiredToggle = page.getByTestId("filter-column-toggle-hotel_required");
    if (await hotelRequiredToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hotelRequiredToggle.click();
      const yesOption = page.getByTestId("boolean-filter-yes-hotel_required");
      await yesOption.click();
    }

    // Save filter
    await page.getByRole("button", { name: /spara filter/i }).click();
    const filterNameInput = page.getByLabel("Filternamn");
    await filterNameInput.fill("Filter to Delete E2E");
    const saveButton = page.getByRole("button", { name: /^spara filter$/i }).last();
    await saveButton.click();

    // Wait for dialog to close
    await page.waitForTimeout(500);

    // Step 1: Open saved filters dropdown and select the filter to delete
    const dropdown = page.getByRole("combobox", { name: /välj ett sparat filter/i });
    await dropdown.click();

    // Step 2: Select the filter (this reveals the trash button next to the dropdown)
    const filterItem = page.getByText("Filter to Delete E2E");
    await filterItem.click();

    // Step 3: Click the trash button that appeared next to the dropdown
    const deleteButton = page.getByLabel(/radera.*filter to delete e2e/i);
    await deleteButton.click();

    // Step 4: Verify confirmation dialog appears
    await expect(page.getByText("Radera sparat filter?")).toBeVisible();
    await expect(page.getByText(/är du säker på att du vill radera/i)).toBeVisible();
    await expect(page.getByText(/"Filter to Delete E2E"/)).toBeVisible();
    await expect(page.getByText(/åtgärden kan inte ångras/i)).toBeVisible();

    // Step 5: Click Cancel to test cancellation
    await page.getByRole("button", { name: /avbryt/i }).last().click();

    // Step 6: Verify dialog closes and delete button still visible
    await expect(page.getByText("Radera sparat filter?")).not.toBeVisible();
    await expect(deleteButton).toBeVisible();

    // Step 7: Click delete button again
    await deleteButton.click();

    // Step 8: Confirm deletion
    await page.getByRole("button", { name: /^radera$/i }).last().click();

    // Step 9: Verify filter is removed from list
    await page.waitForTimeout(500);
    await expect(page.getByText("Filter to Delete E2E")).not.toBeVisible();

    // Step 10: Verify success toast (optional)
    // await expect(page.getByText("Filter deleted")).toBeVisible();
  });

  test("AC5: Duplicate name validation", async ({ page }) => {
    // Prerequisite: Create first filter
    const filterButton = page.getByRole("button", { name: /filter/i });
    await filterButton.click();
    await expect(page.getByText("Filtrera anställda")).toBeVisible();

    // Apply a filter
    const firstNameToggle = page.getByTestId("filter-column-toggle-first_name");
    if (await firstNameToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstNameToggle.click();
      await page.getByTestId("text-filter-input-first_name").fill("Test");
    }

    // Save first filter
    await page.getByRole("button", { name: /spara filter/i }).click();
    let filterNameInput = page.getByLabel("Filternamn");
    await filterNameInput.fill("Duplicate Test Filter");
    let saveButton = page.getByRole("button", { name: /^spara filter$/i }).last();
    await saveButton.click();

    // Wait for save to complete
    await page.waitForTimeout(500);

    // Step 1: Clear filters
    const clearButton = page.getByRole("button", { name: /rensa alla/i });
    if (await clearButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clearButton.click();
    }

    // Step 2: Apply different filter
    const surnameToggle = page.getByTestId("filter-column-toggle-surname");
    if (await surnameToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await surnameToggle.click();
      await page.getByTestId("text-filter-input-surname").fill("Different");
    }

    // Step 3: Try to save with same name
    await page.getByRole("button", { name: /spara filter/i }).click();
    filterNameInput = page.getByLabel("Filternamn");
    await filterNameInput.fill("Duplicate Test Filter");
    saveButton = page.getByRole("button", { name: /^save filter$/i }).last();
    await saveButton.click();

    // Step 4: Verify error message appears
    await expect(page.getByText(/ett filter med det här namnet finns redan/i)).toBeVisible({
      timeout: 3000,
    });

    // Step 5: Verify dialog stays open
    await expect(page.getByText("Spara filter")).toBeVisible();
  });

  test("AC6: Empty name validation", async ({ page }) => {
    // Open filter panel and apply a filter
    const filterButton = page.getByRole("button", { name: /filter/i });
    await filterButton.click();
    await expect(page.getByText("Filtrera anställda")).toBeVisible();

    const firstNameToggle = page.getByTestId("filter-column-toggle-first_name");
    if (await firstNameToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstNameToggle.click();
      await page.getByTestId("text-filter-input-first_name").fill("Test");
    }

    // Open save dialog
    await page.getByRole("button", { name: /spara filter/i }).click();
    await expect(page.getByText(/ge denna filterkombination ett namn/i)).toBeVisible();

    // Step 1: Verify Save button is disabled when name is empty
    const saveButton = page.getByRole("button", { name: /^spara filter$/i }).last();
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
    const filterButton = page.getByRole("button", { name: /filter/i });
    await filterButton.click();
    await expect(page.getByText("Filtrera anställda")).toBeVisible();

    const firstNameToggle = page.getByTestId("filter-column-toggle-first_name");
    if (await firstNameToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstNameToggle.click();
      await page.getByTestId("text-filter-input-first_name").fill("Test");
    }

    // Open save dialog
    await page.getByRole("button", { name: /spara filter/i }).click();

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
