"use client";

import { useCallback } from "react";
import { generateDownloadBlob, getDownloadFilename } from "@/lib/colab-link";

interface DownloadSectionProps {
  notebook: Record<string, unknown>;
  paperName: string;
  onReset: () => void;
}

export default function DownloadSection({
  notebook,
  paperName,
  onReset,
}: DownloadSectionProps) {
  const filename = getDownloadFilename(paperName);

  const handleDownload = useCallback(() => {
    const content = generateDownloadBlob(notebook);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [notebook, filename]);

  const handleOpenInColab = useCallback(() => {
    // Download the file first, then open Colab's upload page
    handleDownload();
    setTimeout(() => {
      window.open("https://colab.research.google.com/#create=true", "_blank");
    }, 300);
  }, [handleDownload]);

  return (
    <div
      data-testid="download-section"
      className="w-full max-w-md rounded-lg border border-teal/30 bg-teal-glow p-6 text-center"
    >
      <svg
        className="mx-auto w-12 h-12 text-teal mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <h3
        className="font-heading text-lg font-semibold text-white mb-1"
        data-testid="download-title"
      >
        Notebook Ready
      </h3>
      <p className="text-xs font-mono text-gray-400 mb-6">{filename}</p>

      <div className="flex flex-col gap-3">
        <button
          data-testid="download-button"
          onClick={handleDownload}
          className="w-full bg-teal hover:bg-teal-dark text-black font-heading font-semibold py-3 px-6 rounded-lg transition-colors text-sm"
        >
          Download .ipynb
        </button>

        <button
          data-testid="open-in-colab-button"
          onClick={handleOpenInColab}
          className="w-full border border-teal/50 text-teal hover:bg-teal-glow font-heading font-semibold py-3 px-6 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <path d="M16.941 4.976a7.033 7.033 0 00-4.93-2.064 7.033 7.033 0 00-4.936 2.064l6.589 4.218 3.277-4.218z" />
            <path d="M4.81 5.251A7.053 7.053 0 003 10.085c0 1.835.702 3.508 1.849 4.757L8.12 9.168 4.81 5.251z" />
            <path d="M12.012 17.088a7.033 7.033 0 004.935-2.065l-6.588-4.218-3.278 4.218a7.033 7.033 0 004.93 2.065z" />
            <path d="M21 10.085a7.053 7.053 0 00-1.81-4.834l-3.31 4.257 3.27 4.218A7.053 7.053 0 0021 10.085z" />
          </svg>
          Open in Colab
        </button>
      </div>

      <button
        data-testid="generate-another-button"
        onClick={onReset}
        className="mt-4 text-xs font-mono text-gray-600 hover:text-gray-400 transition-colors"
      >
        Generate another notebook
      </button>
    </div>
  );
}
