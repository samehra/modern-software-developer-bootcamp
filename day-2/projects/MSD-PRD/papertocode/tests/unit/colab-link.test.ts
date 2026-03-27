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

  it("handles empty notebook object", () => {
    const content = colabLink.generateDownloadBlob({});
    expect(JSON.parse(content)).toEqual({});
  });

  it("preserves unicode in notebook content", () => {
    const nb = { title: "Attention \u2014 Is All You Need", cells: [] };
    const content = colabLink.generateDownloadBlob(nb);
    expect(content).toContain("Attention");
    expect(JSON.parse(content).title).toBe("Attention \u2014 Is All You Need");
  });

  it("handles filename without .pdf extension", () => {
    expect(colabLink.getDownloadFilename("paper")).toBe("paper_notebook.ipynb");
  });

  it("handles filename with uppercase .PDF extension", () => {
    expect(colabLink.getDownloadFilename("paper.PDF")).toBe("paper_notebook.ipynb");
  });

  it("handles filename with special characters", () => {
    const result = colabLink.getDownloadFilename("paper@v2!final#1.pdf");
    expect(result).toBe("paper_v2_final_1_notebook.ipynb");
    expect(result).not.toContain("@");
    expect(result).not.toContain("!");
    expect(result).not.toContain("#");
  });

  it("handles empty string filename", () => {
    expect(colabLink.getDownloadFilename("")).toBe("_notebook.ipynb");
  });

  it("handles filename that is just .pdf", () => {
    expect(colabLink.getDownloadFilename(".pdf")).toBe("_notebook.ipynb");
  });
});
