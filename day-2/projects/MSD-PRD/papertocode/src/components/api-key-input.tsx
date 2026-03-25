"use client";

import { useState } from "react";

interface ApiKeyInputProps {
  value: string;
  onChange: (key: string) => void;
}

export default function ApiKeyInput({ value, onChange }: ApiKeyInputProps) {
  const [showKey, setShowKey] = useState(false);

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
          placeholder="Enter your Gemini API key"
          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-teal transition-colors"
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
      <p className="mt-2 text-xs font-mono text-gray-600">
        Your key stays in your browser. Never sent to our servers.
      </p>
    </div>
  );
}
