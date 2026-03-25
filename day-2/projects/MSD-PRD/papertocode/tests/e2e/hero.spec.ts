import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "screenshots");

test.describe("Task 2: Hero Section", () => {
  test("renders hero with title, tagline, and description", async ({
    page,
  }) => {
    await page.goto("/");

    const hero = page.getByTestId("hero-section");
    await expect(hero).toBeVisible();

    const title = page.getByTestId("app-title");
    await expect(title).toContainText("PaperToCode");

    const tagline = page.getByTestId("app-tagline");
    await expect(tagline).toBeVisible();

    const description = page.getByTestId("hero-description");
    await expect(description).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "task2-01-hero-section.png"),
      fullPage: true,
    });
  });

  test("hero has step indicators showing the workflow", async ({ page }) => {
    await page.goto("/");

    const steps = page.getByTestId("workflow-steps");
    await expect(steps).toBeVisible();

    // Should show 3 workflow steps
    const stepItems = page.locator('[data-testid^="step-"]');
    await expect(stepItems).toHaveCount(3);
  });

  test("page has proper centered layout with max-width container", async ({
    page,
  }) => {
    await page.goto("/");

    const container = page.getByTestId("main-container");
    await expect(container).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "task2-02-full-layout.png"),
      fullPage: true,
    });
  });
});
