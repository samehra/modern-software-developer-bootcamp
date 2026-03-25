"use client";

import { useState } from "react";
import Hero from "@/components/hero";
import ApiKeyInput from "@/components/api-key-input";
import PdfUpload from "@/components/pdf-upload";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  return (
    <main
      className="flex min-h-screen flex-col items-center px-4 pb-24"
      data-testid="main-container"
    >
      <Hero />

      <div className="w-full max-w-md flex flex-col items-center gap-8 mt-4">
        <ApiKeyInput value={apiKey} onChange={setApiKey} />

        {apiKey.length > 0 && (
          <PdfUpload onFileSelect={setPdfFile} selectedFile={pdfFile} />
        )}

        {apiKey.length > 0 && pdfFile && (
          <button
            data-testid="generate-button"
            className="w-full max-w-md bg-teal hover:bg-teal-dark text-black font-heading font-semibold py-3 px-6 rounded-lg transition-colors text-sm"
          >
            Generate Notebook
          </button>
        )}
      </div>
    </main>
  );
}
