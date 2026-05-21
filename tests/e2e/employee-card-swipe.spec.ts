/**
 * E2E Tests for Employee Card Swipe Gestures
 * Story 12.2: Swipe Gestures for Row Actions
 */

import { expect, test, type Locator, type Page } from "@playwright/test";

type TouchPoint = {
  x: number;
  y: number;
};

async function openMobileDashboard(page: Page) {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/dashboard");
  await expect(page.getByRole("region", { name: /Employee cards/i })).toBeVisible({
    timeout: 15000,
  });
  await expect(firstEmployeeCard(page)).toBeVisible({ timeout: 15000 });
}

function firstEmployeeCard(page: Page) {
  return page.locator('article[aria-label^="Employee "]').first();
}

function cardSurface(card: Locator) {
  return card.locator(".transition-transform").first();
}

function swipeActionsGroup(card: Locator) {
  return card.getByRole("group", { name: /Swipe actions/i });
}

function archiveAction(page: Page) {
  return page.getByRole("button", { name: /^Archive .+/i }).first();
}

function terminateAction(page: Page) {
  return page.getByRole("button", { name: /^Terminate .+/i }).first();
}

function editAction(page: Page) {
  return page.getByRole("button", { name: /^Edit .+/i }).first();
}

async function dispatchTouch(card: Locator, type: "touchstart" | "touchmove" | "touchend", point: TouchPoint) {
  await card.evaluate(
    (element, args) => {
      const touch = new Touch({
        identifier: 1,
        target: element,
        clientX: args.point.x,
        clientY: args.point.y,
      });

      element.dispatchEvent(
        new TouchEvent(args.type, {
          touches: args.type === "touchend" ? [] : [touch],
          targetTouches: args.type === "touchend" ? [] : [touch],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        })
      );
    },
    { type, point }
  );
}

async function swipeLeft(card: Locator, page: Page) {
  const box = await card.boundingBox();
  expect(box).not.toBeNull();

  const start = {
    x: box!.x + box!.width - 32,
    y: box!.y + Math.min(box!.height / 2, 180),
  };
  const end = {
    x: box!.x + Math.max(32, box!.width - 260),
    y: start.y,
  };

  await dispatchTouch(card, "touchstart", start);

  for (let step = 1; step <= 8; step += 1) {
    const progress = step / 8;
    await dispatchTouch(card, "touchmove", {
      x: start.x + (end.x - start.x) * progress,
      y: start.y,
    });
    await page.waitForTimeout(16);
  }

  await dispatchTouch(card, "touchend", end);
  await page.waitForTimeout(350);
}

async function swipeRight(card: Locator, page: Page) {
  const box = await card.boundingBox();
  expect(box).not.toBeNull();

  const start = {
    x: box!.x + 40,
    y: box!.y + Math.min(box!.height / 2, 180),
  };
  const end = {
    x: box!.x + box!.width - 32,
    y: start.y,
  };

  await dispatchTouch(card, "touchstart", start);

  for (let step = 1; step <= 8; step += 1) {
    const progress = step / 8;
    await dispatchTouch(card, "touchmove", {
      x: start.x + (end.x - start.x) * progress,
      y: start.y,
    });
    await page.waitForTimeout(16);
  }

  await dispatchTouch(card, "touchend", end);
  await page.waitForTimeout(350);
}

async function getCardTransform(card: Locator) {
  return cardSurface(card).evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      inline: (el as HTMLElement).style.transform,
      computed: style.transform,
      willChange: style.willChange,
    };
  });
}

async function expectSwipeActionsEnabled(card: Locator) {
  await expect
    .poll(async () => swipeActionsGroup(card).evaluate((el) => window.getComputedStyle(el).pointerEvents))
    .toBe("auto");
}

async function expectSwipeActionsDisabled(card: Locator) {
  await expect
    .poll(async () => swipeActionsGroup(card).evaluate((el) => window.getComputedStyle(el).pointerEvents))
    .toBe("none");
}

test.describe("Employee Card - Swipe Gestures (Story 12.2)", () => {
  test.beforeEach(async ({ page }) => {
    await openMobileDashboard(page);
  });

  test.describe("AC1: Swipe gesture reveals action buttons", () => {
    test("should reveal action buttons when swiping left on employee card", async ({ page }) => {
      const employeeCard = firstEmployeeCard(page);
      await swipeLeft(employeeCard, page);

      await expectSwipeActionsEnabled(employeeCard);
      await expect(archiveAction(page)).toBeVisible({ timeout: 2000 });
      await expect(terminateAction(page)).toBeVisible();
      await expect(editAction(page)).toBeVisible();
    });

    test("should translate the card surface while revealing actions", async ({ page }) => {
      const employeeCard = firstEmployeeCard(page);

      await swipeLeft(employeeCard, page);

      const transform = await getCardTransform(employeeCard);
      expect(transform.inline).toContain("translateX(-240px)");
      expect(transform.computed).not.toBe("none");
    });
  });

  test.describe("AC2: Action button interactions", () => {
    test("should open archive confirmation when Archive is clicked", async ({ page }) => {
      const employeeCard = firstEmployeeCard(page);
      await swipeLeft(employeeCard, page);

      await archiveAction(page).click();

      await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 2000 });
      await expect(page.getByRole("heading", { name: /Archive Employee/i })).toBeVisible();
    });

    test("should open terminate dialog when Terminate is clicked", async ({ page }) => {
      const employeeCard = firstEmployeeCard(page);
      await swipeLeft(employeeCard, page);

      await terminateAction(page).click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2000 });
      await expect(page.getByText(/Uppsägningsdatum|Termination date/i)).toBeVisible();
    });

    test("should open edit dialog when Edit is clicked", async ({ page }) => {
      const employeeCard = firstEmployeeCard(page);
      await swipeLeft(employeeCard, page);

      await editAction(page).click();

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 2000 });
      await expect(page.getByRole("heading", { name: /Redigera anställd|Edit Employee/i })).toBeVisible();
    });
  });

  test.describe("AC3: Desktop device gesture handling", () => {
    test("should render the table instead of swipe cards on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/dashboard");

      await expect(page.locator('article[aria-label^="Employee "]')).toHaveCount(0);
      await expect(page.getByRole("table")).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe("AC4: Card state management", () => {
    test("should return card to original position on swipe right", async ({ page }) => {
      const employeeCard = firstEmployeeCard(page);
      await swipeLeft(employeeCard, page);
      await expectSwipeActionsEnabled(employeeCard);

      await swipeRight(employeeCard, page);

      const transform = await getCardTransform(employeeCard);
      expect(transform.inline).toContain("translateX(0px)");
      await expectSwipeActionsDisabled(employeeCard);
    });

    test("should close swipe actions on tap outside card", async ({ page }) => {
      const employeeCard = firstEmployeeCard(page);
      await swipeLeft(employeeCard, page);
      await expectSwipeActionsEnabled(employeeCard);

      await page.mouse.click(10, 10);
      await page.waitForTimeout(350);

      await expectSwipeActionsDisabled(employeeCard);
      const transform = await getCardTransform(employeeCard);
      expect(transform.inline).toContain("translateX(0px)");
    });
  });
});
