"use client";

import { useState } from "react";
import { isValidGeminiKeyFormat } from "@/lib/gemini";

interface ApiKeyInputProps {
  value: string;
  onChange: (key: string) => void;
}

export default function ApiKeyInput({ value, onChange }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);
  const [touched, setTouched] = useState(false);

  const showFormatError = touched && value.length > 0 && !isValidGeminiKeyFormat(value);

  return (
    <div className="w-full max-w-md">
      <label className="block text-xs font-mono text-gray-400 mb-2">
        Gemini API Key
      </label>
      <div className="relative">
        <input
          data-testid="api-key-input"
          type={showKey ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Enter your Gemini API key"
          className={`w-full bg-gray-900 border rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none transition-colors ${
            showFormatError
              ? "border-red-500 focus:border-red-400"
              : "border-gray-800 focus:border-teal"
          }`}
        />
        <button
          data-testid="api-key-toggle"
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors text-xs font-mono"
        >
          {showKey ? "HIDE" : "SHOW"}
        </button>
      </div>
      {showFormatError ? (
        <p data-testid="api-key-format-error" className="mt-2 text-xs font-mono text-red-400">
          Invalid format. Gemini keys start with &quot;AIza&quot; and are 39 characters.
        </p>
      ) : (
        <p className="mt-2 text-xs font-mono text-gray-600">
          Your key is sent securely to our server for processing. Never stored or logged.
        </p>
      )}
    </div>
  );
}
