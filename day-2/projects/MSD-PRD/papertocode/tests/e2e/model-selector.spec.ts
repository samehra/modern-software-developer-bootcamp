import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "screenshots");

test.describe("Task 6: Model Selector", () => {
  test("model selector is visible after entering API key", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("AIzaSyA12345678901234567890123456789abc");

    const modelSelector = page.getByTestId("model-selector");
    await expect(modelSelector).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "task6-01-model-selector.png"),
      fullPage: true,
    });
  });

  test("defaults to Pro model", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("AIzaSyA12345678901234567890123456789abc");

    const proOption = page.getByTestId("model-option-pro");
    await expect(proOption).toHaveAttribute("data-selected", "true");
  });

  test("can switch to Flash model", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("AIzaSyA12345678901234567890123456789abc");

    const flashOption = page.getByTestId("model-option-flash");
    await flashOption.click();
    await expect(flashOption).toHaveAttribute("data-selected", "true");

    const proOption = page.getByTestId("model-option-pro");
    await expect(proOption).toHaveAttribute("data-selected", "false");

    await page.screenshot({
      path: path.join(screenshotDir, "task6-02-flash-selected.png"),
      fullPage: true,
    });
  });
});
