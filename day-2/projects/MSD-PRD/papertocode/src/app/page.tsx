"use client";

import { useState, useCallback } from "react";
import Hero from "@/components/hero";
import ApiKeyInput from "@/components/api-key-input";
import PdfUpload from "@/components/pdf-upload";
import ProgressDisplay from "@/components/progress-display";
import DownloadSection from "@/components/download-section";
import type { ProgressStage } from "@/lib/progress";

type AppState = "idle" | "generating" | "done" | "error";

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [currentStage, setCurrentStage] = useState<ProgressStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notebook, setNotebook] = useState<Record<string, unknown> | null>(null);
  const [paperName, setPaperName] = useState<string>("");

  const handleGenerate = useCallback(async () => {
    if (!apiKey || !pdfFile) return;

    setAppState("generating");
    setError(null);
    setNotebook(null);

    const formData = new FormData();
    formData.append("apiKey", apiKey);
    formData.append("pdf", pdfFile);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      // If we get a JSON error response (validation failed)
      if (response.headers.get("content-type")?.includes("application/json")) {
        const data = await response.json();
        setError(data.error || "Unknown error");
        setAppState("error");
        return;
      }

      // SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        setError("Failed to read response stream");
        setAppState("error");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          if (!event.trim()) continue;
          const lines = event.split("\n");
          let eventType = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            if (line.startsWith("data: ")) eventData = line.slice(6);
          }

          if (eventType === "progress") {
            setCurrentStage(JSON.parse(eventData));
          } else if (eventType === "done") {
            const result = JSON.parse(eventData);
            setNotebook(result.notebook);
            setPaperName(result.paperName || "notebook");
            setAppState("done");
          } else if (eventType === "error") {
            const errData = JSON.parse(eventData);
            setError(errData.message);
            setAppState("error");
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setAppState("error");
    }
  }, [apiKey, pdfFile]);

  const isGenerating = appState === "generating";

  return (
    <main
      className="flex min-h-screen flex-col items-center px-4 pb-24"
      data-testid="main-container"
    >
      <Hero />

      <div className="w-full max-w-md flex flex-col items-center gap-8 mt-4">
        {appState !== "generating" && appState !== "done" && (
          <div className="w-full flex flex-col items-center gap-8 animate-fade-in">
            <ApiKeyInput value={apiKey} onChange={setApiKey} />

            {apiKey.length > 0 && (
              <div className="w-full animate-fade-in">
                <PdfUpload onFileSelect={setPdfFile} selectedFile={pdfFile} />
              </div>
            )}

            {apiKey.length > 0 && pdfFile && appState === "idle" && (
              <button
                data-testid="generate-button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full max-w-md bg-teal hover:bg-teal-dark text-black font-heading font-semibold py-3 px-6 rounded-lg transition-colors text-sm disabled:opacity-50 animate-fade-in"
              >
                Generate Notebook
              </button>
            )}
          </div>
        )}

        {(appState === "generating" || appState === "error") && (
          <div className="w-full animate-fade-in">
            <ProgressDisplay currentStage={currentStage} error={error} />
          </div>
        )}

        {appState === "error" && (
          <button
            data-testid="retry-button"
            onClick={() => {
              setAppState("idle");
              setError(null);
              setCurrentStage(null);
            }}
            className="w-full max-w-md border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 font-heading font-semibold py-3 px-6 rounded-lg transition-colors text-sm animate-fade-in"
          >
            Try Again
          </button>
        )}

        {appState === "done" && notebook && (
          <div className="w-full animate-fade-in">
            <DownloadSection
              notebook={notebook}
              paperName={paperName}
              onReset={() => {
                setAppState("idle");
                setNotebook(null);
                setCurrentStage(null);
                setPdfFile(null);
              }}
            />
          </div>
        )}
      </div>

      <footer className="mt-auto pt-16 pb-8 text-center">
        <p className="text-xs font-mono text-gray-800">
          PaperToCode v1 — Your API key never leaves your browser
        </p>
      </footer>
    </main>
  );
}
