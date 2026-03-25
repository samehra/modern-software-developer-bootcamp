export function generateDownloadBlob(notebook: Record<string, unknown>): string {
  return JSON.stringify(notebook, null, 2);
}

export function getDownloadFilename(paperName: string): string {
  const base = paperName.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${base}_notebook.ipynb`;
}

export function generateColabHtml(
  notebook: Record<string, unknown>,
  paperName: string
): string {
  const filename = getDownloadFilename(paperName);
  const notebookJson = JSON.stringify(notebook);

  // Create an HTML page that auto-uploads to Colab via their upload endpoint
  return `<!DOCTYPE html>
<html>
<head><title>Opening in Google Colab...</title></head>
<body>
<p>Opening <strong>${filename}</strong> in Google Colab...</p>
<p>If the notebook doesn't open automatically,
<a href="https://colab.research.google.com/#create=true">click here</a>
and upload the .ipynb file manually.</p>
<script>
  const nb = ${notebookJson};
  const blob = new Blob([JSON.stringify(nb)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '${filename}';
  a.click();
  setTimeout(() => window.open('https://colab.research.google.com/#create=true', '_blank'), 500);
</script>
</body>
</html>`;
}
