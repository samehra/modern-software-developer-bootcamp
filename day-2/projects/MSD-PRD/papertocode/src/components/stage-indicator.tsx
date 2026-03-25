"use client";

import { PROGRESS_STAGES } from "@/lib/progress";

interface StageIndicatorProps {
  currentPercent: number;
}

export default function StageIndicator({ currentPercent }: StageIndicatorProps) {
  return (
    <div className="mt-6 flex items-center gap-1">
      {PROGRESS_STAGES.map((stage) => (
        <div
          key={stage.id}
          className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
            currentPercent >= stage.percent ? "bg-teal" : "bg-gray-800"
          }`}
        />
      ))}
    </div>
  );
}
