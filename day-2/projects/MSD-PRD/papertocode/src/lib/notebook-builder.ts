// Stub — will be fully implemented in Task 6
export function buildNotebook(rawContent: string): Record<string, unknown> {
  return {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: {
        display_name: "Python 3",
        language: "python",
        name: "python3",
      },
      language_info: { name: "python", version: "3.10.0" },
    },
    cells: [
      {
        cell_type: "markdown",
        metadata: {},
        source: ["# Notebook\n", "\n", rawContent],
      },
    ],
  };
}
