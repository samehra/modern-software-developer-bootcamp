"use client";

import { useEffect, useRef, useState } from "react";

interface PdfPreviewProps {
  file: File;
}

export default function PdfPreview({ file }: PdfPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        if (cancelled) return;
        setPageCount(pdf.numPages);

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });

        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        if (!cancelled) setError(true);
      }
    }

    renderPreview();
    return () => { cancelled = true; };
  }, [file]);

  return (
    <div data-testid="pdf-preview" className="w-full max-w-md mt-3">
      {error ? (
        <div
          data-testid="pdf-preview-fallback"
          className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-center"
        >
          <p className="text-xs font-mono text-gray-400">
            {file.name}
          </p>
          <p className="text-xs font-mono text-gray-600 mt-1">
            Preview not available
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-800 overflow-hidden bg-gray-900 p-2">
          <canvas
            ref={canvasRef}
            className="w-full h-auto rounded"
            data-testid="pdf-preview-canvas"
          />
          {pageCount !== null && (
            <p className="text-xs font-mono text-gray-600 text-center mt-2">
              Page 1 of {pageCount}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
