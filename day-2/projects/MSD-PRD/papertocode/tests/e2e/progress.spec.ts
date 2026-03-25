import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "screenshots");

test.describe("Task 8: Progress Display UI", () => {
  test("progress component renders when generation starts", async ({
    page,
  }) => {
    await page.goto("/");

    // Fill in API key and upload PDF
    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("fake-api-key-for-testing");

    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "test-paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf"),
    });

    // Click generate — this will fail the API call but should show progress UI
    const generateBtn = page.getByTestId("generate-button");
    await generateBtn.click();

    // Progress display should appear
    const progressDisplay = page.getByTestId("progress-display");
    await expect(progressDisplay).toBeVisible({ timeout: 3000 });

    await page.screenshot({
      path: path.join(screenshotDir, "task8-01-progress-display.png"),
      fullPage: true,
    });
  });

  test("progress display shows stage label", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("fake-api-key-for-testing");

    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "test-paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf"),
    });

    const generateBtn = page.getByTestId("generate-button");
    await generateBtn.click();

    const stageLabel = page.getByTestId("stage-label");
    await expect(stageLabel).toBeVisible({ timeout: 3000 });

    await page.screenshot({
      path: path.join(screenshotDir, "task8-02-stage-label.png"),
      fullPage: true,
    });
  });

  test("progress display shows progress bar", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("fake-api-key-for-testing");

    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "test-paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf"),
    });

    const generateBtn = page.getByTestId("generate-button");
    await generateBtn.click();

    const progressBar = page.getByTestId("progress-bar");
    await expect(progressBar).toBeVisible({ timeout: 3000 });
  });
});
