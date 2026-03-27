import { describe, it, expect } from "vitest";
import { PROGRESS_STAGES, formatSSEMessage } from "../../src/lib/progress";

describe("Progress Utilities", () => {
  it("has at least 5 progress stages", () => {
    expect(PROGRESS_STAGES.length).toBeGreaterThanOrEqual(5);
  });

  it("has exactly 8 stages", () => {
    expect(PROGRESS_STAGES.length).toBe(8);
  });

  it("each stage has id, label, description, and percent", () => {
    for (const stage of PROGRESS_STAGES) {
      expect(stage.id).toBeTruthy();
      expect(stage.label).toBeTruthy();
      expect(stage.description).toBeTruthy();
      expect(typeof stage.percent).toBe("number");
    }
  });

  it("stages are in ascending percent order", () => {
    for (let i = 1; i < PROGRESS_STAGES.length; i++) {
      expect(PROGRESS_STAGES[i].percent).toBeGreaterThan(PROGRESS_STAGES[i - 1].percent);
    }
  });

  it("first stage starts above 0% and last stage is 100%", () => {
    expect(PROGRESS_STAGES[0].percent).toBeGreaterThan(0);
    expect(PROGRESS_STAGES[PROGRESS_STAGES.length - 1].percent).toBe(100);
  });

  it("all stage ids are unique", () => {
    const ids = PROGRESS_STAGES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
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

  it("SSE message follows exact format: event + newline + data + double newline", () => {
    const msg = formatSSEMessage("test", { a: 1 });
    const lines = msg.split("\n");
    expect(lines[0]).toBe("event: test");
    expect(lines[1]).toMatch(/^data: /);
    expect(lines[2]).toBe("");
    expect(lines[3]).toBe("");
  });

  it("SSE message handles special characters in data", () => {
    const msg = formatSSEMessage("error", { message: 'quotes "and" newlines\nhere' });
    expect(msg).toContain("event: error");
    // JSON.stringify escapes quotes and newlines
    const dataLine = msg.split("\n")[1];
    expect(dataLine.startsWith("data: ")).toBe(true);
    const parsed = JSON.parse(dataLine.slice(6));
    expect(parsed.message).toBe('quotes "and" newlines\nhere');
  });

  it("SSE message handles null and undefined data values", () => {
    const msg = formatSSEMessage("test", null);
    expect(msg).toContain("data: null");
  });
});
