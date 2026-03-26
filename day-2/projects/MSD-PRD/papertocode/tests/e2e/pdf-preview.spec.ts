import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "screenshots");

test.describe("Task 7: PDF Preview", () => {
  test("shows preview container after PDF upload", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("AIzaSyA12345678901234567890123456789abc");

    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "test-paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content for testing"),
    });

    const preview = page.getByTestId("pdf-preview");
    await expect(preview).toBeVisible({ timeout: 3000 });

    await page.screenshot({
      path: path.join(screenshotDir, "task7-01-pdf-preview.png"),
      fullPage: true,
    });
  });

  test("shows fallback text when PDF cannot be rendered", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("AIzaSyA12345678901234567890123456789abc");

    // Use a fake PDF that pdfjs can't render
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "corrupted-paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 not a real pdf"),
    });

    const preview = page.getByTestId("pdf-preview");
    await expect(preview).toBeVisible({ timeout: 3000 });

    // Should show the filename as fallback
    const fallback = page.getByTestId("pdf-preview-fallback");
    await expect(fallback).toBeVisible({ timeout: 3000 });

    await page.screenshot({
      path: path.join(screenshotDir, "task7-02-pdf-fallback.png"),
      fullPage: true,
    });
  });
});
