import { describe, it, expect } from "vitest";
import { createGeminiClient, validateApiKey, isValidGeminiKeyFormat } from "../../src/lib/gemini";

// Valid key: AIza + 35 alphanumeric/dash/underscore chars = 39 total
const VALID_KEY = "AIzaSyA12345678901234567890123456789abc"; // 39 chars

describe("Gemini Client", () => {
  it("creates a client with a valid API key", () => {
    const client = createGeminiClient(VALID_KEY);
    expect(client).toBeDefined();
  });

  it("throws on empty API key", () => {
    expect(() => createGeminiClient("")).toThrow("API key is required");
  });

  it("validates non-empty keys", () => {
    expect(validateApiKey("")).toBe(false);
    expect(validateApiKey("   ")).toBe(false);
    expect(validateApiKey(VALID_KEY)).toBe(true);
  });
});

describe("Gemini Key Format Validation", () => {
  it("accepts keys starting with AIza and 39 chars total", () => {
    expect(isValidGeminiKeyFormat(VALID_KEY)).toBe(true);
  });

  it("rejects keys not starting with AIza", () => {
    expect(isValidGeminiKeyFormat("XYzaSyA12345678901234567890123456789abc")).toBe(false);
    expect(isValidGeminiKeyFormat("test-key-123")).toBe(false);
    expect(isValidGeminiKeyFormat("sk-abc123")).toBe(false);
  });

  it("rejects keys that are too short or too long", () => {
    expect(isValidGeminiKeyFormat("AIza")).toBe(false);
    expect(isValidGeminiKeyFormat("AIzaSyA123")).toBe(false);
    // 40 chars (1 too many)
    expect(isValidGeminiKeyFormat("AIzaSyA12345678901234567890123456789abcd")).toBe(false);
  });

  it("rejects empty and whitespace-only keys", () => {
    expect(isValidGeminiKeyFormat("")).toBe(false);
    expect(isValidGeminiKeyFormat("   ")).toBe(false);
  });

  it("accepts keys with hyphens and underscores", () => {
    expect(isValidGeminiKeyFormat("AIza_yA1234567890123456789012345-789abc")).toBe(true);
  });
});
