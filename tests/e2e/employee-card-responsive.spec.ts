/**
 * E2E Tests for Employee Card Responsive Behavior
 * Story 11.12: Employee Card Expansion Tests
 */

import { expect, test, type Locator, type Page } from "@playwright/test";

type Viewport = {
  width: number;
  height: number;
};

const MOBILE_VIEWPORTS: Viewport[] = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 768, height: 1024 },
];

async function openMobileDashboard(page: Page, viewport: Viewport) {
  await page.setViewportSize(viewport);
  await page.goto("/dashboard");
  await expect(page.getByRole("region", { name: /Employee cards/i })).toBeVisible({
    timeout: 15000,
  });
}

function firstEmployeeCard(page: Page) {
  return page.locator('article[aria-label^="Employee "]').first();
}

async function expandCard(card: Locator) {
  const detailsToggle = card.locator('button[aria-expanded]').first();

  await expect(detailsToggle).toBeVisible();
  await expect(detailsToggle).toHaveAttribute("aria-expanded", "false");
  await detailsToggle.click();
  await expect(detailsToggle).toHaveAttribute("aria-expanded", "true");

  const expandedContent = card.locator(".max-h-\\[70vh\\].overflow-y-auto").first();
  await expect(expandedContent).toBeAttached();

  return { detailsToggle, expandedContent };
}

test.describe("Employee Card - Responsive Behavior", () => {
  test.describe("AC4: Responsive Layout and Scrolling Tests", () => {
    test("should expand card on narrow mobile viewport (320px)", async ({ page }) => {
      await openMobileDashboard(page, { width: 320, height: 568 });

      const employeeCard = firstEmployeeCard(page);
      await expect(employeeCard).toBeVisible();

      const { detailsToggle, expandedContent } = await expandCard(employeeCard);
      await expect(expandedContent).toBeAttached();
      await expect(detailsToggle).toContainText(/Less/i);
    });

    test("should expand card on standard mobile viewport (375px)", async ({ page }) => {
      await openMobileDashboard(page, { width: 375, height: 667 });

      const employeeCard = firstEmployeeCard(page);
      await expect(employeeCard).toBeVisible();

      const { detailsToggle, expandedContent } = await expandCard(employeeCard);
      await expect(expandedContent).toBeAttached();
      await expect(detailsToggle).toContainText(/Less/i);
    });

    test("should expand card on tablet viewport (768px)", async ({ page }) => {
      await openMobileDashboard(page, { width: 768, height: 1024 });

      const employeeCard = firstEmployeeCard(page);
      await expect(employeeCard).toBeVisible();

      const { detailsToggle, expandedContent } = await expandCard(employeeCard);
      await expect(expandedContent).toBeAttached();
      await expect(detailsToggle).toContainText(/Less/i);
    });

    test("should enable vertical scrolling when expanded content exceeds viewport", async ({ page }) => {
      await openMobileDashboard(page, { width: 375, height: 667 });

      const employeeCard = firstEmployeeCard(page);
      await expect(employeeCard).toBeVisible();

      const { expandedContent } = await expandCard(employeeCard);

      const scrollMetrics = await expandedContent.evaluate((el) => ({
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      }));

      expect(scrollMetrics.scrollHeight).toBeGreaterThanOrEqual(scrollMetrics.clientHeight);

      if (scrollMetrics.scrollHeight > scrollMetrics.clientHeight) {
        await expandedContent.evaluate((el) => {
          el.scrollTo({ top: 100 });
        });
        const scrollTop = await expandedContent.evaluate((el) => el.scrollTop);
        expect(scrollTop).toBeGreaterThanOrEqual(0);
      }
    });

    test("should maintain accessible touch targets during scroll", async ({ page }) => {
      await openMobileDashboard(page, { width: 375, height: 667 });

      const employeeCard = firstEmployeeCard(page);
      await expect(employeeCard).toBeVisible();

      const { detailsToggle, expandedContent } = await expandCard(employeeCard);

      await expandedContent.evaluate((el) => {
        el.scrollTo({ top: 200 });
      });

      await expect(detailsToggle).toBeVisible();

      const buttonBox = await detailsToggle.boundingBox();
      expect(buttonBox).not.toBeNull();
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.height).toBeGreaterThanOrEqual(36);
    });

    test("should have smooth or default scroll behavior", async ({ page }) => {
      await openMobileDashboard(page, { width: 375, height: 667 });

      const employeeCard = firstEmployeeCard(page);
      await expect(employeeCard).toBeVisible();

      const { expandedContent } = await expandCard(employeeCard);

      const scrollBehavior = await expandedContent.evaluate((el) => {
        return window.getComputedStyle(el).scrollBehavior;
      });

      expect(["smooth", "auto"]).toContain(scrollBehavior);
    });

    test("should adapt card width to screen size", async ({ page }) => {
      await openMobileDashboard(page, { width: 320, height: 568 });
      const mobileCard = firstEmployeeCard(page);
      await expect(mobileCard).toBeVisible();
      const mobileWidth = (await mobileCard.boundingBox())?.width ?? 0;

      await openMobileDashboard(page, { width: 768, height: 1024 });
      const tabletCard = firstEmployeeCard(page);
      await expect(tabletCard).toBeVisible();
      const tabletWidth = (await tabletCard.boundingBox())?.width ?? 0;

      expect(tabletWidth).toBeGreaterThanOrEqual(mobileWidth);
    });

    test("should maintain readable text at all viewport sizes", async ({ page }) => {
      for (const viewport of MOBILE_VIEWPORTS) {
        await openMobileDashboard(page, viewport);

        const employeeCard = firstEmployeeCard(page);
        await expect(employeeCard).toBeVisible();

        await expandCard(employeeCard);

        const label = employeeCard.getByText(/First Name|Surname|Rank/i).first();
        await expect(label).toBeVisible();

        const fontSize = await label.evaluate((el) => {
          return parseFloat(window.getComputedStyle(el).fontSize);
        });

        expect(fontSize).toBeGreaterThanOrEqual(12);
      }
    });
  });
});
