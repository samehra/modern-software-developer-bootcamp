import { describe, it, expect } from "vitest";
import { PROGRESS_STAGES, formatSSEMessage } from "../../src/lib/progress";

describe("Progress Utilities", () => {
  it("has at least 5 progress stages", () => {
    expect(PROGRESS_STAGES.length).toBeGreaterThanOrEqual(5);
  });

  it("each stage has id, label, and description", () => {
    for (const stage of PROGRESS_STAGES) {
      expect(stage.id).toBeTruthy();
      expect(stage.label).toBeTruthy();
      expect(stage.description).toBeTruthy();
    }
  });

  it("formats SSE message correctly", () => {
    const msg = formatSSEMessage("progress", { stage: "analyzing", percent: 25 });
    expect(msg).toContain("event: progress");
    expect(msg).toContain('"stage":"analyzing"');
    expect(msg).toContain('"percent":25');
    expect(msg.endsWith("\n\n")).toBe(true);
  });

  it("formats SSE message for done event", () => {
    const msg = formatSSEMessage("done", { notebook: {} });
    expect(msg).toContain("event: done");
    expect(msg).toContain('"notebook"');
  });

  it("formats SSE message for error event", () => {
    const msg = formatSSEMessage("error", { message: "Something went wrong" });
    expect(msg).toContain("event: error");
    expect(msg).toContain("Something went wrong");
  });
});
