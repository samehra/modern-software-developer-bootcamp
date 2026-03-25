import { describe, it, expect } from "vitest";
import { NOTEBOOK_SYSTEM_PROMPT, parseGeminiResponse } from "../../src/lib/prompts";

describe("Notebook Generation Prompt", () => {
  it("system prompt is non-empty and mentions JSON", () => {
    expect(NOTEBOOK_SYSTEM_PROMPT.length).toBeGreaterThan(500);
    expect(NOTEBOOK_SYSTEM_PROMPT).toContain("JSON");
  });

  it("system prompt covers all 12 notebook sections", () => {
    const requiredSections = [
      "metadata",
      "contributions",
      "setup",
      "mathematical",
      "pseudocode",
      "implementation",
      "synthetic",
      "execution",
      "visualization",
      "ablation",
      "reproducibility",
      "references",
    ];
    for (const section of requiredSections) {
      expect(NOTEBOOK_SYSTEM_PROMPT.toLowerCase()).toContain(section);
    }
  });

  it("parseGeminiResponse extracts JSON from markdown-wrapped response", () => {
    const wrapped = '```json\n{"title": "Test Paper"}\n```';
    const parsed = parseGeminiResponse(wrapped);
    expect(parsed).toEqual({ title: "Test Paper" });
  });

  it("parseGeminiResponse handles raw JSON", () => {
    const raw = '{"title": "Test Paper"}';
    const parsed = parseGeminiResponse(raw);
    expect(parsed).toEqual({ title: "Test Paper" });
  });

  it("parseGeminiResponse throws on invalid JSON", () => {
    expect(() => parseGeminiResponse("not json at all")).toThrow();
  });
});
