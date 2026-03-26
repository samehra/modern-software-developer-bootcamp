"use client";

import { useState, useCallback, useRef } from "react";
import PdfPreview from "./pdf-preview";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface PdfUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export default function PdfUpload({ onFileSelect, selectedFile }: PdfUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSet = useCallback(
    (file: File) => {
      setError(null);

      if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
        setError("Please upload a PDF file.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("File too large. Maximum size is 20MB.");
        return;
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSet(file);
    },
    [validateAndSet]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSet(file);
    },
    [validateAndSet]
  );

  return (
    <div className="w-full max-w-md">
      <label className="block text-xs font-mono text-gray-400 mb-2">
        Research Paper
      </label>

      <div
        data-testid="pdf-upload-zone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${
          isDragging
            ? "border-teal bg-teal-glow"
            : selectedFile
              ? "border-teal/50 bg-gray-900"
              : "border-gray-800 bg-gray-900 hover:border-gray-600"
        }`}
      >
        <input
          ref={fileInputRef}
          data-testid="pdf-file-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {selectedFile ? (
          <>
            <svg
              className="w-8 h-8 text-teal"
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
            <span
              data-testid="uploaded-file-name"
              className="text-sm font-mono text-white truncate max-w-full"
            >
              {selectedFile.name}
            </span>
            <span className="text-xs font-mono text-gray-600">
              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB — Click to
              replace
            </span>
          </>
        ) : (
          <>
            <svg
              className="w-8 h-8 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <span className="text-sm font-mono text-gray-400">
              Drop your PDF here or click to browse
            </span>
            <span className="text-xs font-mono text-gray-600">
              Max 20MB
            </span>
          </>
        )}
      </div>

      {error && (
        <p
          data-testid="upload-error"
          className="mt-2 text-xs font-mono text-red-400"
        >
          {error}
        </p>
      )}

      {selectedFile && !error && <PdfPreview file={selectedFile} />}
    </div>
  );
}
