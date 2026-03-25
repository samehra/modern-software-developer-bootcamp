"use client";

import type { ProgressStage } from "@/lib/progress";
import StageIndicator from "./stage-indicator";

interface ProgressDisplayProps {
  currentStage: ProgressStage | null;
  error: string | null;
}

export default function ProgressDisplay({
  currentStage,
  error,
}: ProgressDisplayProps) {
  if (error) {
    return (
      <div
        data-testid="progress-display"
        className="w-full max-w-md rounded-lg border border-red-900/50 bg-red-950/20 p-6"
      >
        <div className="flex items-center gap-3 mb-3">
          <svg
            className="w-5 h-5 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span
            data-testid="stage-label"
            className="font-heading text-sm font-semibold text-red-400"
          >
            Generation Failed
          </span>
        </div>
        <p className="text-xs font-mono text-red-400/80">{error}</p>
      </div>
    );
  }

  if (!currentStage) return null;

  return (
    <div
      data-testid="progress-display"
      className="w-full max-w-md rounded-lg border border-gray-800 bg-gray-900/50 p-6 animate-pulse-glow"
    >
      <div className="flex items-center justify-between mb-4">
        <span
          data-testid="stage-label"
          className="font-heading text-sm font-semibold text-white"
        >
          {currentStage.label}
        </span>
        <span className="font-mono text-xs text-teal">
          {currentStage.percent}%
        </span>
      </div>

      {/* Progress bar */}
      <div
        data-testid="progress-bar"
        className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-4"
      >
        <div
          className="h-full bg-teal rounded-full transition-all duration-700 ease-out"
          style={{ width: `${currentStage.percent}%` }}
        />
      </div>

      <p className="text-xs font-mono text-gray-400 leading-relaxed">
        {currentStage.description}
      </p>

      <StageIndicator currentPercent={currentStage.percent} />
    </div>
  );
}
