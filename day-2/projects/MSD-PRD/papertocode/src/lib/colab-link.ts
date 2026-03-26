export function generateDownloadBlob(notebook: Record<string, unknown>): string {
  return JSON.stringify(notebook, null, 2);
}

export function getDownloadFilename(paperName: string): string {
  const base = paperName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${base}_notebook.ipynb`;
}
