import { test, expect } from "@playwright/test";
import path from "path";

const screenshotDir = path.join(__dirname, "..", "screenshots");

test.describe("Task 1: Security Headers", () => {
  test("response includes X-Content-Type-Options: nosniff", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("response includes X-Frame-Options: DENY", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
  });

  test("response includes Referrer-Policy", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin"
    );
  });

  test("response includes Permissions-Policy", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["permissions-policy"]).toBe(
      "camera=(), microphone=(), geolocation=()"
    );
  });

  test("response includes X-DNS-Prefetch-Control: off", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["x-dns-prefetch-control"]).toBe("off");
  });

  test("response includes Content-Security-Policy", async ({ request }) => {
    const response = await request.get("/");
    const csp = response.headers()["content-security-policy"];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("font-src 'self' fonts.gstatic.com");
  });

  test("app still renders correctly with security headers", async ({ page }) => {
    await page.goto("/");
    const title = page.getByTestId("app-title");
    await expect(title).toBeVisible();

    // Fonts should still load (CSP allows fonts.googleapis.com)
    const body = page.locator("body");
    await expect(body).toBeVisible();

    await page.screenshot({
      path: path.join(screenshotDir, "task1-01-app-with-headers.png"),
      fullPage: true,
    });
  });
});
