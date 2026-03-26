"use client";

export type GeminiModel = "gemini-2.5-pro" | "gemini-2.5-flash";

interface ModelSelectorProps {
  value: GeminiModel;
  onChange: (model: GeminiModel) => void;
}

const models: { id: GeminiModel; label: string; desc: string }[] = [
  {
    id: "gemini-2.5-pro",
    label: "Pro",
    desc: "Higher quality, deeper analysis",
  },
  {
    id: "gemini-2.5-flash",
    label: "Flash",
    desc: "Faster generation, lower cost",
  },
];

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="w-full max-w-md" data-testid="model-selector">
      <label className="block text-xs font-mono text-gray-400 mb-2">
        Model
      </label>
      <div className="grid grid-cols-2 gap-3">
        {models.map((m) => {
          const selected = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              data-testid={`model-option-${m.id === "gemini-2.5-pro" ? "pro" : "flash"}`}
              data-selected={String(selected)}
              onClick={() => onChange(m.id)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-teal bg-teal-glow"
                  : "border-gray-800 bg-gray-900 hover:border-gray-600"
              }`}
            >
              <span
                className={`block text-sm font-heading font-semibold ${
                  selected ? "text-teal" : "text-white"
                }`}
              >
                {m.label}
              </span>
              <span className="block text-xs font-mono text-gray-500 mt-1">
                {m.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
