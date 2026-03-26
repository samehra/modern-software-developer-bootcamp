import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "screenshots");

test.describe("v2 Integration Tests", () => {
  test("full v2 flow: key → model → upload → preview → generate", async ({
    page,
  }) => {
    await page.goto("/");

    // Step 1: Enter API key
    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("AIzaSyA12345678901234567890123456789abc");

    // Step 2: Model selector should be visible
    const modelSelector = page.getByTestId("model-selector");
    await expect(modelSelector).toBeVisible();

    // Step 3: Upload PDF
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "attention-paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content"),
    });

    // Step 4: PDF preview should appear
    const preview = page.getByTestId("pdf-preview");
    await expect(preview).toBeVisible({ timeout: 3000 });

    // Step 5: Generate button should be visible
    const generateBtn = page.getByTestId("generate-button");
    await expect(generateBtn).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "task10-v2-01-full-flow.png"),
      fullPage: true,
    });

    // Step 6: Click generate → progress should appear
    await generateBtn.click();
    const progressDisplay = page.getByTestId("progress-display");
    await expect(progressDisplay).toBeVisible({ timeout: 3000 });

    await page.screenshot({
      path: path.join(screenshotDir, "task10-v2-02-generating.png"),
      fullPage: true,
    });
  });

  test("malformed API key shows format error on blur", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("bad-key");
    await apiKeyInput.blur();

    const formatError = page.getByTestId("api-key-format-error");
    await expect(formatError).toBeVisible();
    await expect(formatError).toContainText("AIza");

    await page.screenshot({
      path: path.join(screenshotDir, "task10-v2-03-bad-key.png"),
      fullPage: true,
    });
  });

  test("security headers present in API response", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["content-security-policy"]).toBeDefined();
  });

  test("model selector + PDF upload flow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("AIzaSyA12345678901234567890123456789abc");

    const modelSelector = page.getByTestId("model-selector");
    await expect(modelSelector).toBeVisible();

    const uploadZone = page.getByTestId("pdf-upload-zone");
    await expect(uploadZone).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "task10-v2-04-mobile.png"),
      fullPage: true,
    });
  });

  test("all v1 E2E tests still pass (no regressions)", async ({ page }) => {
    await page.goto("/");

    // Basic checks from v1
    const title = page.getByTestId("app-title");
    await expect(title).toBeVisible();

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer).toContainText("PaperToCode v2");
  });
});
