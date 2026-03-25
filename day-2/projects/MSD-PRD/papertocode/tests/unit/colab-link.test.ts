import { describe, it, expect } from "vitest";
import { generateColabHtml, generateDownloadBlob } from "../../src/lib/colab-link";

const sampleNotebook = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { name: "python3" } },
  cells: [{ cell_type: "markdown", metadata: {}, source: ["# Test"] }],
};

describe("Colab Link Utilities", () => {
  it("generates valid download blob content", () => {
    const content = generateDownloadBlob(sampleNotebook);
    expect(content).toContain('"nbformat": 4');
    expect(content).toContain('"cells"');
    const parsed = JSON.parse(content);
    expect(parsed.nbformat).toBe(4);
  });

  it("generates Colab HTML form with notebook data", () => {
    const html = generateColabHtml(sampleNotebook, "test-paper.pdf");
    expect(html).toContain("colab.research.google.com");
    expect(html).toContain("test-paper");
  });
});
