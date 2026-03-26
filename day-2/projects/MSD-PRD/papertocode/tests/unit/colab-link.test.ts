import { describe, it, expect } from "vitest";
import * as colabLink from "../../src/lib/colab-link";

const sampleNotebook = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { name: "python3" } },
  cells: [{ cell_type: "markdown", metadata: {}, source: ["# Test"] }],
};

describe("Colab Link Utilities", () => {
  it("generates valid download blob content", () => {
    const content = colabLink.generateDownloadBlob(sampleNotebook);
    expect(content).toContain('"nbformat": 4');
    expect(content).toContain('"cells"');
    const parsed = JSON.parse(content);
    expect(parsed.nbformat).toBe(4);
  });

  it("generates correct download filename from paper name", () => {
    expect(colabLink.getDownloadFilename("test-paper.pdf")).toBe("test-paper_notebook.ipynb");
    expect(colabLink.getDownloadFilename("My Paper (2024).pdf")).toBe("My_Paper__2024__notebook.ipynb");
  });

  it("does NOT export generateColabHtml (removed for XSS safety)", () => {
    const exports = Object.keys(colabLink);
    expect(exports).not.toContain("generateColabHtml");
    expect(exports).toContain("generateDownloadBlob");
    expect(exports).toContain("getDownloadFilename");
  });
});
