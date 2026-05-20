/**
 * End-to-End Test: Termination & Reactivation Journey
 * Story 11.7: End-to-End Critical User Journey Tests
 */

import { expect, test } from "@playwright/test";
import { createEmployeeViaUI, loginAsUser } from "./helpers/e2e-helpers";

test.describe("Termination & Reactivation E2E Journey", () => {
  test.describe.configure({ timeout: 120000 });

  test.beforeEach(async ({ page }) => {
    await loginAsUser(page, "admin@test.com", "Test123!");
    await page.goto("/dashboard");
    await page.waitForLoadState("load");
  });

  test("AC2: terminate and reactivate an employee from the dashboard table", async ({ page }) => {
    const runId = Date.now().toString().slice(-6);
    const firstName = `Terminate${runId}`;

    await createEmployeeViaUI(page, {
      first_name: firstName,
      surname: "Test",
      ssn: `199001${runId}`,
      rank: "SEV",
      gender: "Man",
      hire_date: "2025-01-01",
    });

    await page.goto("/dashboard");
    await expect(page.getByRole("table")).toContainText(firstName, { timeout: 15000 });

    const row = page.locator("table tbody tr").filter({ hasText: firstName }).first();
    await row.getByRole("button", { name: /^(Markera som uppsagd|Terminate|Avsluta)/i }).click();

    const terminateDialog = page.getByRole("dialog");
    await expect(terminateDialog).toBeVisible({ timeout: 5000 });
    await terminateDialog.locator('input[name="termination_date"]').fill("2025-11-13");
    await terminateDialog.locator('textarea[name="termination_reason"]').fill("E2E Test");
    await terminateDialog
      .getByRole("button", { name: /Bekräfta uppsägning|Confirm|Terminate/i })
      .click();
    await expect(terminateDialog).toBeHidden({ timeout: 15000 });

    await page.getByRole("checkbox", { name: /Visa uppsagda|Show terminated/i }).click();

    const terminatedRow = page.locator("table tbody tr").filter({ hasText: firstName }).first();
    await expect(terminatedRow).toBeVisible({ timeout: 15000 });
    await terminatedRow
      .getByRole("button", { name: /Återaktivera anställd|Reactivate/i })
      .click();

    const reactivateDialog = page.getByRole("alertdialog");
    await expect(reactivateDialog).toBeVisible({ timeout: 5000 });
    await reactivateDialog
      .getByRole("button", { name: /Återaktivera|Reactivate|Confirm/i })
      .click();
    await expect(reactivateDialog).toBeHidden({ timeout: 15000 });

    await page.goto("/dashboard");
    await expect(page.getByRole("table")).toContainText(firstName, { timeout: 15000 });

    await expect(
      page
        .locator("table tbody tr")
        .filter({ hasText: firstName })
        .first()
        .getByRole("button", { name: /^(Markera som uppsagd|Terminate|Avsluta)/i })
    ).toBeVisible({ timeout: 15000 });
  });

  test.describe.skip("Legacy termination/reactivation variants", () => {
    test("skipped: old data-testid-based date restoration placeholder flows", async () => {
      // The removed variants targeted obsolete employee-table/reactivate test IDs
      // and contained placeholder assertions for date restoration edge cases.
    });
  });
});
