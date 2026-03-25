import { describe, it, expect } from "vitest";
import { buildNotebook } from "../../src/lib/notebook-builder";

const sampleGeminiOutput = JSON.stringify({
  paper_metadata: {
    title: "Attention Is All You Need",
    authors: ["Vaswani et al."],
    abstract_summary: "Introduces the Transformer architecture.",
    year: 2017,
    key_topics: ["transformers", "attention"],
  },
  key_contributions: [
    "Self-attention mechanism",
    "Multi-head attention",
  ],
  environment_setup: {
    pip_packages: ["torch", "numpy", "matplotlib"],
    setup_code: "import torch\nimport numpy as np",
  },
  mathematical_formulation: [
    {
      title: "Scaled Dot-Product Attention",
      latex: "$$\\text{Attention}(Q,K,V) = \\text{softmax}(\\frac{QK^T}{\\sqrt{d_k}})V$$",
      explanation: "Computes attention weights.",
    },
  ],
  algorithm_pseudocode: [
    {
      name: "Multi-Head Attention",
      pseudocode: "1. Linear projections\n2. Scaled dot-product attention\n3. Concatenate heads",
      complexity: "O(n^2 * d)",
    },
  ],
  implementation: [
    {
      title: "Self-Attention Layer",
      description: "Implements scaled dot-product attention",
      code: "import torch\nimport torch.nn as nn\n\nclass SelfAttention(nn.Module):\n    def __init__(self, d_model=512):\n        super().__init__()\n        self.d_model = d_model\n    def forward(self, x):\n        return x",
    },
  ],
  synthetic_data: {
    description: "Synthetic sequence data for transformer testing",
    code: "import numpy as np\ndata = np.random.randn(32, 128, 512)\nprint(data.shape)",
  },
  execution: [
    {
      title: "Run Forward Pass",
      description: "Test the attention layer",
      code: "model = SelfAttention()\nout = model(torch.randn(32, 128, 512))\nprint(out.shape)",
    },
  ],
  visualizations: [
    {
      title: "Attention Heatmap",
      description: "Visualize attention weights",
      code: "import matplotlib.pyplot as plt\nplt.imshow(np.random.rand(10,10))\nplt.title('Attention Weights')\nplt.colorbar()\nplt.show()",
    },
  ],
  ablation_studies: [
    {
      title: "Number of Heads",
      parameter: "num_heads",
      description: "Impact of attention head count",
      code: "results = {h: np.random.rand() for h in [1,2,4,8]}\nfor h, v in results.items():\n    print(f'Heads={h}: {v:.4f}')",
    },
  ],
  reproducibility_notes: {
    random_seeds: "torch.manual_seed(42)\nnp.random.seed(42)",
    hardware_notes: "GPU recommended for training",
    known_limitations: ["Synthetic data only"],
    tips: ["Use gradient checkpointing for large models"],
  },
  references: [
    {
      citation: "Vaswani et al. (2017). Attention Is All You Need. NeurIPS.",
      relevance: "The original paper",
    },
  ],
});

describe("Notebook Builder", () => {
  it("produces valid nbformat v4 structure", () => {
    const nb = buildNotebook(sampleGeminiOutput);
    expect(nb.nbformat).toBe(4);
    expect(nb.nbformat_minor).toBe(5);
    expect(nb.metadata).toBeDefined();
    expect(nb.cells).toBeDefined();
    expect(Array.isArray(nb.cells)).toBe(true);
  });

  it("has correct kernel spec", () => {
    const nb = buildNotebook(sampleGeminiOutput);
    const meta = nb.metadata as Record<string, unknown>;
    const kernel = meta.kernelspec as Record<string, string>;
    expect(kernel.name).toBe("python3");
    expect(kernel.language).toBe("python");
  });

  it("contains both markdown and code cells", () => {
    const nb = buildNotebook(sampleGeminiOutput);
    const cells = nb.cells as Array<{ cell_type: string }>;
    const types = new Set(cells.map((c) => c.cell_type));
    expect(types.has("markdown")).toBe(true);
    expect(types.has("code")).toBe(true);
  });

  it("first cell contains the paper title", () => {
    const nb = buildNotebook(sampleGeminiOutput);
    const cells = nb.cells as Array<{ cell_type: string; source: string[] }>;
    const firstCell = cells[0];
    expect(firstCell.cell_type).toBe("markdown");
    expect(firstCell.source.join("")).toContain("Attention Is All You Need");
  });

  it("includes pip install cell", () => {
    const nb = buildNotebook(sampleGeminiOutput);
    const cells = nb.cells as Array<{ cell_type: string; source: string[] }>;
    const pipCell = cells.find(
      (c) => c.cell_type === "code" && c.source.join("").includes("pip install")
    );
    expect(pipCell).toBeDefined();
  });

  it("includes mathematical formulation cells with LaTeX", () => {
    const nb = buildNotebook(sampleGeminiOutput);
    const cells = nb.cells as Array<{ cell_type: string; source: string[] }>;
    const mathCell = cells.find(
      (c) =>
        c.cell_type === "markdown" &&
        c.source.join("").includes("Scaled Dot-Product Attention")
    );
    expect(mathCell).toBeDefined();
  });

  it("includes implementation code cells", () => {
    const nb = buildNotebook(sampleGeminiOutput);
    const cells = nb.cells as Array<{ cell_type: string; source: string[] }>;
    const implCell = cells.find(
      (c) =>
        c.cell_type === "code" &&
        c.source.join("").includes("SelfAttention")
    );
    expect(implCell).toBeDefined();
  });

  it("generates at least 15 cells for a complete notebook", () => {
    const nb = buildNotebook(sampleGeminiOutput);
    const cells = nb.cells as Array<unknown>;
    expect(cells.length).toBeGreaterThanOrEqual(15);
  });
});
