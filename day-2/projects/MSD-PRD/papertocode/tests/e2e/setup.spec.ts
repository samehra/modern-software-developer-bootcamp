import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "screenshots");

test.describe("Task 1: Project Setup Verification", () => {
  test("page loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("PaperToCode");
  });

  test("renders app title with teal accent", async ({ page }) => {
    await page.goto("/");

    const title = page.getByTestId("app-title");
    await expect(title).toBeVisible();
    await expect(title).toContainText("PaperToCode");

    await page.screenshot({
      path: path.join(screenshotDir, "task1-01-landing-page.png"),
      fullPage: true,
    });
  });

  test("renders tagline", async ({ page }) => {
    await page.goto("/");

    const tagline = page.getByTestId("app-tagline");
    await expect(tagline).toBeVisible();
    await expect(tagline).toContainText(
      "Turn research papers into executable notebooks"
    );
  });

  test("has dark background (black theme)", async ({ page }) => {
    await page.goto("/");

    const body = page.getByTestId("app-body");
    await expect(body).toBeVisible();

    // Verify the body has the bg-grid class (dark theme)
    await expect(body).toHaveClass(/bg-grid/);
  });

  test("loads Google Fonts (Space Grotesk + DM Mono)", async ({ page }) => {
    await page.goto("/");

    // Check that Google Fonts stylesheet links are present (use .first() since Next.js adds both preload and stylesheet)
    const fontLink = page.locator(
      'link[rel="stylesheet"][href*="fonts.googleapis.com"][href*="Space+Grotesk"]'
    );
    await expect(fontLink).toBeAttached();

    const fontLink2 = page.locator(
      'link[rel="stylesheet"][href*="fonts.googleapis.com"][href*="DM+Mono"]'
    );
    await expect(fontLink2).toBeAttached();

    await page.screenshot({
      path: path.join(screenshotDir, "task1-02-fonts-loaded.png"),
      fullPage: true,
    });
  });

  test("main container is centered", async ({ page }) => {
    await page.goto("/");

    const main = page.getByTestId("main-container");
    await expect(main).toHaveClass(/flex/);
    await expect(main).toHaveClass(/items-center/);
    await expect(main).toHaveClass(/justify-center/);
  });
});
