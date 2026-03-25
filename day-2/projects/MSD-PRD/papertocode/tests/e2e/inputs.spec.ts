import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "screenshots");

test.describe("Task 3: API Key Input and PDF Upload", () => {
  test("renders API key input field", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await expect(apiKeyInput).toBeVisible();
    await expect(apiKeyInput).toHaveAttribute("type", "password");

    await page.screenshot({
      path: path.join(screenshotDir, "task3-01-api-key-input.png"),
      fullPage: true,
    });
  });

  test("API key input accepts text and shows toggle", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("test-api-key-12345");

    const toggleBtn = page.getByTestId("api-key-toggle");
    await expect(toggleBtn).toBeVisible();

    // Toggle to show the key
    await toggleBtn.click();
    await expect(apiKeyInput).toHaveAttribute("type", "text");

    // Toggle back to hide
    await toggleBtn.click();
    await expect(apiKeyInput).toHaveAttribute("type", "password");
  });

  test("renders PDF upload area with drag-and-drop zone", async ({ page }) => {
    await page.goto("/");

    // First enter API key to reveal upload
    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("test-api-key-12345");

    const uploadZone = page.getByTestId("pdf-upload-zone");
    await expect(uploadZone).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "task3-02-pdf-upload.png"),
      fullPage: true,
    });
  });

  test("PDF upload validates file type", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("test-api-key-12345");

    // Upload a non-PDF file
    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not a pdf"),
    });

    const error = page.getByTestId("upload-error");
    await expect(error).toBeVisible();
    await expect(error).toContainText("PDF");

    await page.screenshot({
      path: path.join(screenshotDir, "task3-03-validation-error.png"),
      fullPage: true,
    });
  });

  test("PDF upload accepts valid PDF and shows filename", async ({ page }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("test-api-key-12345");

    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "attention-is-all-you-need.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content"),
    });

    const fileName = page.getByTestId("uploaded-file-name");
    await expect(fileName).toBeVisible();
    await expect(fileName).toContainText("attention-is-all-you-need.pdf");

    await page.screenshot({
      path: path.join(screenshotDir, "task3-04-file-uploaded.png"),
      fullPage: true,
    });
  });

  test("generate button appears when API key and PDF are provided", async ({
    page,
  }) => {
    await page.goto("/");

    const apiKeyInput = page.getByTestId("api-key-input");
    await apiKeyInput.fill("test-api-key-12345");

    const fileInput = page.getByTestId("pdf-file-input");
    await fileInput.setInputFiles({
      name: "paper.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 fake pdf content"),
    });

    const generateBtn = page.getByTestId("generate-button");
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeEnabled();

    await page.screenshot({
      path: path.join(screenshotDir, "task3-05-ready-to-generate.png"),
      fullPage: true,
    });
  });
});
