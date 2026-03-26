import { parseGeminiResponse } from "./prompts";
import { sanitizeCodeCell, NOTEBOOK_WARNING_CELL } from "./sanitizer";

interface NotebookCell {
  cell_type: "markdown" | "code";
  metadata: Record<string, unknown>;
  source: string[];
  outputs?: unknown[];
  execution_count?: number | null;
}

function md(lines: string[]): NotebookCell {
  return { cell_type: "markdown", metadata: {}, source: lines };
}

function code(lines: string[]): NotebookCell {
  const raw = lines.join("");
  const { sanitized } = sanitizeCodeCell(raw);
  return {
    cell_type: "code",
    metadata: {},
    source: splitLines(sanitized),
    outputs: [],
    execution_count: null,
  };
}

function splitLines(text: string): string[] {
  return text.split("\n").map((line, i, arr) =>
    i < arr.length - 1 ? line + "\n" : line
  );
}

export function buildNotebook(rawContent: string): Record<string, unknown> {
  const data = parseGeminiResponse(rawContent) as Record<string, unknown>;
  const cells: NotebookCell[] = [];

  // --- Warning banner ---
  cells.push(md(NOTEBOOK_WARNING_CELL));

  // --- 1. Title & Paper Metadata ---
  const meta = data.paper_metadata as Record<string, unknown> | undefined;
  if (meta) {
    cells.push(
      md([
        `# ${meta.title || "Research Paper Implementation"}\n`,
        "\n",
        `**Authors:** ${Array.isArray(meta.authors) ? (meta.authors as string[]).join(", ") : "Unknown"}\n`,
        `**Year:** ${meta.year || "N/A"}\n`,
        "\n",
        `> ${meta.abstract_summary || ""}\n`,
        "\n",
        `**Key Topics:** ${Array.isArray(meta.key_topics) ? (meta.key_topics as string[]).join(", ") : ""}\n`,
      ])
    );
  }

  // --- 2. Key Contributions ---
  const contributions = data.key_contributions as string[] | undefined;
  if (contributions?.length) {
    cells.push(
      md([
        "## Key Contributions\n",
        "\n",
        ...contributions.map((c) => `- ${c}\n`),
      ])
    );
  }

  // --- 3. Environment Setup ---
  const env = data.environment_setup as Record<string, unknown> | undefined;
  if (env) {
    const packages = env.pip_packages as string[] | undefined;
    if (packages?.length) {
      cells.push(md(["## Environment Setup\n", "\n", "Install required packages:\n"]));
      cells.push(code(splitLines(`!pip install -q ${packages.join(" ")}`)));
    }
    if (env.setup_code) {
      cells.push(code(splitLines(env.setup_code as string)));
    }
  }

  // --- 4. Mathematical Formulation ---
  const math = data.mathematical_formulation as Array<Record<string, string>> | undefined;
  if (math?.length) {
    cells.push(md(["## Mathematical Formulation\n"]));
    for (const eq of math) {
      cells.push(
        md([
          `### ${eq.title}\n`,
          "\n",
          `${eq.latex}\n`,
          "\n",
          `${eq.explanation}\n`,
        ])
      );
    }
  }

  // --- 5. Algorithm Pseudocode ---
  const algos = data.algorithm_pseudocode as Array<Record<string, string>> | undefined;
  if (algos?.length) {
    cells.push(md(["## Algorithm Pseudocode\n"]));
    for (const algo of algos) {
      cells.push(
        md([
          `### ${algo.name}\n`,
          "\n",
          "```\n",
          ...splitLines(algo.pseudocode),
          "\n```\n",
          "\n",
          `**Complexity:** ${algo.complexity}\n`,
        ])
      );
    }
  }

  // --- 6. Implementation ---
  const impl = data.implementation as Array<Record<string, string>> | undefined;
  if (impl?.length) {
    cells.push(md(["## Implementation\n"]));
    for (const section of impl) {
      cells.push(md([`### ${section.title}\n`, "\n", `${section.description}\n`]));
      cells.push(code(splitLines(section.code)));
    }
  }

  // --- 7. Synthetic Data Generation ---
  const synth = data.synthetic_data as Record<string, string> | undefined;
  if (synth) {
    cells.push(
      md([
        "## Synthetic Data Generation\n",
        "\n",
        `${synth.description}\n`,
      ])
    );
    cells.push(code(splitLines(synth.code)));
  }

  // --- 8. Execution & Results ---
  const execution = data.execution as Array<Record<string, string>> | undefined;
  if (execution?.length) {
    cells.push(md(["## Execution & Results\n"]));
    for (const exp of execution) {
      cells.push(md([`### ${exp.title}\n`, "\n", `${exp.description}\n`]));
      cells.push(code(splitLines(exp.code)));
    }
  }

  // --- 9. Visualizations ---
  const viz = data.visualizations as Array<Record<string, string>> | undefined;
  if (viz?.length) {
    cells.push(md(["## Visualizations\n"]));
    for (const plot of viz) {
      cells.push(md([`### ${plot.title}\n`, "\n", `${plot.description}\n`]));
      cells.push(code(splitLines(plot.code)));
    }
  }

  // --- 10. Ablation Studies ---
  const ablation = data.ablation_studies as Array<Record<string, string>> | undefined;
  if (ablation?.length) {
    cells.push(md(["## Ablation Studies\n"]));
    for (const study of ablation) {
      cells.push(
        md([
          `### ${study.title}\n`,
          "\n",
          `**Parameter:** ${study.parameter}\n`,
          "\n",
          `${study.description}\n`,
        ])
      );
      cells.push(code(splitLines(study.code)));
    }
  }

  // --- 11. Reproducibility Notes ---
  const repro = data.reproducibility_notes as Record<string, unknown> | undefined;
  if (repro) {
    cells.push(md(["## Reproducibility Notes\n"]));
    if (repro.random_seeds) {
      cells.push(code(splitLines(repro.random_seeds as string)));
    }
    const notes: string[] = [];
    if (repro.hardware_notes) notes.push(`**Hardware:** ${repro.hardware_notes}\n`);
    const limitations = repro.known_limitations as string[] | undefined;
    if (limitations?.length) {
      notes.push("\n", "**Known Limitations:**\n", ...limitations.map((l) => `- ${l}\n`));
    }
    const tips = repro.tips as string[] | undefined;
    if (tips?.length) {
      notes.push("\n", "**Tips:**\n", ...tips.map((t) => `- ${t}\n`));
    }
    if (notes.length) cells.push(md(notes));
  }

  // --- 12. References ---
  const refs = data.references as Array<Record<string, string>> | undefined;
  if (refs?.length) {
    cells.push(md(["## References\n"]));
    cells.push(
      md(refs.map((r) => `- ${r.citation} — *${r.relevance}*\n`))
    );
  }

  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: {
        name: "python",
        version: "3.10.0",
      },
      colab: {
        provenance: [],
        name: meta?.title
          ? `${(meta.title as string).replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 60)}.ipynb`
          : "PaperToCode_Notebook.ipynb",
      },
    },
    cells,
  };
}
