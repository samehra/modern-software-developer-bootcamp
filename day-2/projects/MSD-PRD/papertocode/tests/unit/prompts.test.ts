import { describe, it, expect } from "vitest";
import { NOTEBOOK_SYSTEM_PROMPT, parseGeminiResponse } from "../../src/lib/prompts";

const validJson = JSON.stringify({
  paper_metadata: { title: "Test Paper", authors: ["Author 1"] },
  implementation: [{ title: "Impl", description: "Desc", code: "x=1" }],
});

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
    const wrapped = "```json\n" + validJson + "\n```";
    const parsed = parseGeminiResponse(wrapped);
    expect(parsed.paper_metadata).toBeDefined();
  });

  it("parseGeminiResponse handles raw JSON", () => {
    const parsed = parseGeminiResponse(validJson);
    expect(parsed.paper_metadata).toBeDefined();
  });

  it("parseGeminiResponse throws on invalid JSON", () => {
    expect(() => parseGeminiResponse("not json at all")).toThrow();
  });

  it("parseGeminiResponse throws on valid JSON but invalid schema", () => {
    expect(() => parseGeminiResponse('{"foo": "bar"}')).toThrow(
      "Invalid Gemini response structure"
    );
  });

  it("parseGeminiResponse handles whitespace around JSON", () => {
    const padded = "  \n" + validJson + "\n  ";
    const parsed = parseGeminiResponse(padded);
    expect(parsed.paper_metadata).toBeDefined();
  });

  it("parseGeminiResponse handles triple-backtick without json label", () => {
    const wrapped = "```\n" + validJson + "\n```";
    const parsed = parseGeminiResponse(wrapped);
    expect(parsed.paper_metadata).toBeDefined();
  });

  it("parseGeminiResponse throws on truncated JSON", () => {
    expect(() => parseGeminiResponse('{"paper_metadata": {"title":')).toThrow();
  });

  it("parseGeminiResponse throws on empty string", () => {
    expect(() => parseGeminiResponse("")).toThrow();
  });

  it("system prompt instructs to return ONLY JSON", () => {
    expect(NOTEBOOK_SYSTEM_PROMPT).toContain("Return ONLY");
    expect(NOTEBOOK_SYSTEM_PROMPT).toContain("valid JSON");
  });
});
