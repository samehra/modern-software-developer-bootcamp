import { describe, it, expect } from "vitest";
import { validateGeminiOutput } from "../../src/lib/schema";

const validOutput = {
  paper_metadata: {
    title: "Test Paper",
    authors: ["Author 1"],
    abstract_summary: "Summary",
    year: 2024,
    key_topics: ["topic1"],
  },
  key_contributions: ["Contribution 1"],
  environment_setup: {
    pip_packages: ["numpy"],
    setup_code: "import numpy as np",
  },
  mathematical_formulation: [
    { title: "Eq 1", latex: "$$x=1$$", explanation: "Simple" },
  ],
  algorithm_pseudocode: [
    { name: "Algo 1", pseudocode: "step 1", complexity: "O(n)" },
  ],
  implementation: [
    { title: "Impl 1", description: "Desc", code: "print('hello')" },
  ],
  synthetic_data: {
    description: "Synthetic data",
    code: "data = [1,2,3]",
  },
  execution: [
    { title: "Exec 1", description: "Run it", code: "run()" },
  ],
  visualizations: [
    { title: "Plot 1", description: "A plot", code: "plt.show()" },
  ],
  ablation_studies: [
    {
      title: "Ablation 1",
      parameter: "lr",
      description: "Vary learning rate",
      code: "for lr in [0.01, 0.1]: pass",
    },
  ],
  reproducibility_notes: {
    random_seeds: "seed(42)",
    hardware_notes: "GPU",
    known_limitations: ["None"],
    tips: ["Use GPU"],
  },
  references: [
    { citation: "Author (2024)", relevance: "Original paper" },
  ],
};

describe("Gemini Output Schema Validation", () => {
  it("accepts a fully valid output", () => {
    const result = validateGeminiOutput(validOutput);
    expect(result.success).toBe(true);
  });

  it("accepts output with missing optional arrays (partial response)", () => {
    const partial = {
      paper_metadata: validOutput.paper_metadata,
      implementation: validOutput.implementation,
    };
    const result = validateGeminiOutput(partial);
    expect(result.success).toBe(true);
  });

  it("rejects output missing paper_metadata", () => {
    const invalid = { ...validOutput, paper_metadata: undefined };
    const result = validateGeminiOutput(invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain("paper_metadata");
  });

  it("rejects output with wrong types", () => {
    const invalid = { ...validOutput, paper_metadata: "not an object" };
    const result = validateGeminiOutput(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects non-object input", () => {
    const result = validateGeminiOutput("just a string");
    expect(result.success).toBe(false);
  });

  it("rejects null input", () => {
    const result = validateGeminiOutput(null);
    expect(result.success).toBe(false);
  });
});
