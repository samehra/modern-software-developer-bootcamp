export interface ProgressStage {
  id: string;
  label: string;
  description: string;
  percent: number;
}

export const PROGRESS_STAGES: ProgressStage[] = [
  {
    id: "uploading",
    label: "Uploading PDF",
    description: "Sending your paper to the analysis pipeline...",
    percent: 5,
  },
  {
    id: "analyzing",
    label: "Analyzing Paper",
    description: "Gemini is reading and understanding the research paper structure, methodology, and key algorithms...",
    percent: 15,
  },
  {
    id: "extracting_math",
    label: "Extracting Mathematics",
    description: "Identifying mathematical formulations, equations, and theoretical foundations...",
    percent: 30,
  },
  {
    id: "generating_code",
    label: "Generating Implementation",
    description: "Writing Python implementations of the paper's algorithms with proper class structures and documentation...",
    percent: 50,
  },
  {
    id: "synthetic_data",
    label: "Creating Synthetic Data",
    description: "Generating realistic datasets that match the paper's domain with proper distributions and dimensionality...",
    percent: 65,
  },
  {
    id: "visualizations",
    label: "Building Visualizations",
    description: "Creating publication-quality plots and ablation studies to demonstrate results...",
    percent: 80,
  },
  {
    id: "assembling",
    label: "Assembling Notebook",
    description: "Constructing the .ipynb file with all sections, metadata, and Colab compatibility...",
    percent: 95,
  },
  {
    id: "complete",
    label: "Complete",
    description: "Your notebook is ready for download!",
    percent: 100,
  },
];

export function formatSSEMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
