import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "screenshots");

test.describe("Task 10: End-to-End Integration", () => {
  test("full flow: enter key → upload PDF → click generate → see progress", async ({
    page,
  }) => {
    await page.goto("/");

    // Step 1: Enter API key
    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("test-api-key-12345");

    // Step 2: Upload PDF
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "attention-is-all-you-need.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content for testing"),
    });

    // Step 3: Verify uploaded file name
    const fileName = page.getByTestId("uploaded-file-name");
    await expect(fileName).toContainText("attention-is-all-you-need.pdf");

    // Step 4: Click generate
    const generateBtn = page.getByTestId("generate-button");
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // Step 5: Progress display should appear
    const progressDisplay = page.getByTestId("progress-display");
    await expect(progressDisplay).toBeVisible({ timeout: 3000 });

    await page.screenshot({
      path: path.join(screenshotDir, "task10-01-full-flow.png"),
      fullPage: true,
    });
  });

  test("error state shows retry button", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("invalid-key");

    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake"),
    });

    const generateBtn = page.getByTestId("generate-button");
    await generateBtn.click();

    // Wait for error state (API will fail with fake key)
    const retryBtn = page.getByTestId("retry-button");
    await expect(retryBtn).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: path.join(screenshotDir, "task10-02-error-state.png"),
      fullPage: true,
    });

    // Click retry returns to idle state
    await retryBtn.click();
    await expect(page.getByTestId("api-key-input")).toBeVisible();
  });

  test("responsive: works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const title = page.getByTestId("app-title");
    await expect(title).toBeVisible();

    const apiKeyInput = page.getByTestId("api-key-input");
    await expect(apiKeyInput).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "task10-03-mobile.png"),
      fullPage: true,
    });
  });

  test("footer is visible", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("PaperToCode v1");
  });

  test("no console errors on page load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await page.waitForTimeout(2000);

    const realErrors = errors.filter(
      (e) => !e.includes("favicon") && !e.includes("404") && !e.includes("hydrat")
    );
    expect(realErrors).toHaveLength(0);
  });
});
