import { describe, it, expect } from "vitest";
import { createGeminiClient, validateApiKey } from "../../src/lib/gemini";

describe("Gemini Client", () => {
  it("creates a client with a valid API key", () => {
    const client = createGeminiClient("test-key-123");
    expect(client).toBeDefined();
  });

  it("throws on empty API key", () => {
    expect(() => createGeminiClient("")).toThrow("API key is required");
  });

  it("validates API key format", () => {
    expect(validateApiKey("")).toBe(false);
    expect(validateApiKey("   ")).toBe(false);
    expect(validateApiKey("valid-key")).toBe(true);
    expect(validateApiKey("AIzaSyA1234567890")).toBe(true);
  });
});
