import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Track call count for rate limiting
let rateLimitCallCount = 0;
const RATE_LIMIT_MAX = 5;

// Mock the Gemini module
vi.mock("@/lib/gemini", () => ({
  validateApiKey: (key: string) => key.trim().length > 0,
  generateNotebookContent: vi.fn(),
}));

// Mock rate limiter with controllable state
vi.mock("@/lib/rate-limiter", () => ({
  apiRateLimiter: {
    check: () => {
      rateLimitCallCount++;
      if (rateLimitCallCount > RATE_LIMIT_MAX) {
        return { allowed: false, remaining: 0, retryAfterMs: 30_000 };
      }
      return { allowed: true, remaining: RATE_LIMIT_MAX - rateLimitCallCount, retryAfterMs: 0 };
    },
  },
}));

import { POST } from "../../src/app/api/generate/route";
import { generateNotebookContent } from "@/lib/gemini";

const VALID_GEMINI_RESPONSE = JSON.stringify({
  paper_metadata: {
    title: "Test Paper",
    authors: ["Author 1"],
    abstract_summary: "Summary",
    year: 2024,
    key_topics: ["ML"],
  },
  implementation: [
    { title: "Impl", description: "Desc", code: "print('hello')" },
  ],
});

function createPdfFile(
  name = "test.pdf",
  size = 1024,
  type = "application/pdf"
): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

function buildRequest(
  fields: Record<string, string | File>,
  headers?: Record<string, string>
): NextRequest {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return new NextRequest("http://localhost:3000/api/generate", {
    method: "POST",
    body: formData,
    headers: headers || {},
  });
}

async function readSSEStream(
  response: Response
): Promise<Array<{ event: string; data: unknown }>> {
  const text = await response.text();
  const events: Array<{ event: string; data: unknown }> = [];
  const blocks = text.split("\n\n").filter((b) => b.trim());
  for (const block of blocks) {
    const lines = block.split("\n");
    let event = "";
    let data = "";
    for (const line of lines) {
      if (line.startsWith("event: ")) event = line.slice(7);
      if (line.startsWith("data: ")) data = line.slice(6);
    }
    if (event && data) {
      try {
        events.push({ event, data: JSON.parse(data) });
      } catch {
        events.push({ event, data });
      }
    }
  }
  return events;
}

describe("/api/generate — Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitCallCount = 0;
  });

  it("returns 400 when API key is missing", async () => {
    const req = buildRequest({ pdf: createPdfFile() });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("API key");
  });

  it("returns 400 when API key is empty string", async () => {
    const req = buildRequest({ apiKey: "", pdf: createPdfFile() });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("API key");
  });

  it("returns 400 when PDF is missing", async () => {
    const req = buildRequest({ apiKey: "test-key" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("PDF");
  });

  it("returns 400 for oversized file (>20MB)", async () => {
    const bigFile = createPdfFile("big.pdf", 21 * 1024 * 1024);
    const req = buildRequest({ apiKey: "test-key", pdf: bigFile });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("too large");
  });

  it("returns 400 for non-PDF file type", async () => {
    const txtFile = new File([new ArrayBuffer(100)], "test.txt", {
      type: "text/plain",
    });
    const req = buildRequest({ apiKey: "test-key", pdf: txtFile });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("PDF");
  });
});

describe("/api/generate — Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitCallCount = 0;
  });

  it("returns 429 after exceeding rate limit", async () => {
    // Exhaust the rate limit (5 calls consume the quota)
    for (let i = 0; i < 5; i++) {
      rateLimitCallCount++;
    }

    // 6th request should be rate limited
    const req = buildRequest({ apiKey: "test-key", pdf: createPdfFile() });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Too many requests");
    expect(res.headers.get("Retry-After")).toBeDefined();
  });
});

describe("/api/generate — Success Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitCallCount = 0;
  });

  it("returns SSE stream with progress and done events on success", async () => {
    vi.mocked(generateNotebookContent).mockResolvedValue(VALID_GEMINI_RESPONSE);

    const req = buildRequest({
      apiKey: "test-key",
      pdf: createPdfFile(),
      model: "gemini-2.5-pro",
    });
    const res = await POST(req);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const events = await readSSEStream(res);
    const progressEvents = events.filter((e) => e.event === "progress");
    const doneEvents = events.filter((e) => e.event === "done");

    expect(progressEvents.length).toBeGreaterThanOrEqual(7);
    expect(doneEvents.length).toBe(1);

    const doneData = doneEvents[0].data as { notebook: Record<string, unknown>; paperName: string };
    expect(doneData.notebook).toBeDefined();
    expect(doneData.paperName).toBe("test.pdf");
  });

  it("defaults model to gemini-2.5-pro when no model param sent", async () => {
    vi.mocked(generateNotebookContent).mockResolvedValue(VALID_GEMINI_RESPONSE);

    const req = buildRequest({ apiKey: "test-key", pdf: createPdfFile() });
    const res = await POST(req);
    await readSSEStream(res); // consume stream so async code runs

    expect(generateNotebookContent).toHaveBeenCalledWith(
      "test-key",
      expect.any(ArrayBuffer),
      expect.any(String),
      "gemini-2.5-pro"
    );
  });

  it("passes gemini-2.5-flash when model param is flash", async () => {
    vi.mocked(generateNotebookContent).mockResolvedValue(VALID_GEMINI_RESPONSE);

    const req = buildRequest({
      apiKey: "test-key",
      pdf: createPdfFile(),
      model: "gemini-2.5-flash",
    });
    const res = await POST(req);
    await readSSEStream(res);

    expect(generateNotebookContent).toHaveBeenCalledWith(
      "test-key",
      expect.any(ArrayBuffer),
      expect.any(String),
      "gemini-2.5-flash"
    );
  });

  it("defaults unknown model values to gemini-2.5-pro", async () => {
    vi.mocked(generateNotebookContent).mockResolvedValue(VALID_GEMINI_RESPONSE);

    const req = buildRequest({
      apiKey: "test-key",
      pdf: createPdfFile(),
      model: "gemini-evil-model",
    });
    const res = await POST(req);
    await readSSEStream(res);

    expect(generateNotebookContent).toHaveBeenCalledWith(
      "test-key",
      expect.any(ArrayBuffer),
      expect.any(String),
      "gemini-2.5-pro"
    );
  });
});

describe("/api/generate — Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitCallCount = 0;
  });

  it("returns generic error event when Gemini throws unknown error", async () => {
    vi.mocked(generateNotebookContent).mockRejectedValue(
      new Error("Something unexpected")
    );

    const req = buildRequest({ apiKey: "test-key", pdf: createPdfFile() });
    const res = await POST(req);
    const events = await readSSEStream(res);
    const errorEvents = events.filter((e) => e.event === "error");

    expect(errorEvents.length).toBe(1);
    const msg = (errorEvents[0].data as { message: string }).message;
    expect(msg).toBe("Notebook generation failed. Please try again.");
    expect(msg).not.toContain("Something unexpected");
  });

  it("returns API key error for 401/API_KEY_INVALID", async () => {
    vi.mocked(generateNotebookContent).mockRejectedValue(
      new Error("401 Unauthorized - API_KEY_INVALID")
    );

    const req = buildRequest({ apiKey: "test-key", pdf: createPdfFile() });
    const res = await POST(req);
    const events = await readSSEStream(res);
    const errorEvents = events.filter((e) => e.event === "error");

    const msg = (errorEvents[0].data as { message: string }).message;
    expect(msg).toContain("Invalid Gemini API key");
  });

  it(
    "returns timeout error for DEADLINE_EXCEEDED (retries exhaust first)",
    async () => {
      // DEADLINE_EXCEEDED is retryable — withRetry retries 2x with 2s/4s delays
      // before finally throwing. This test needs a longer timeout.
      vi.mocked(generateNotebookContent).mockRejectedValue(
        new Error("DEADLINE_EXCEEDED")
      );

      const req = buildRequest({ apiKey: "test-key", pdf: createPdfFile() });
      const res = await POST(req);
      const events = await readSSEStream(res);
      const errorEvents = events.filter((e) => e.event === "error");

      const msg = (errorEvents[0].data as { message: string }).message;
      expect(msg).toContain("timed out");

      // Verify retry events were sent
      const retryEvents = events.filter(
        (e) => e.event === "progress" && JSON.stringify(e.data).includes("Retrying")
      );
      expect(retryEvents.length).toBeGreaterThanOrEqual(1);
    },
    15_000
  );
});
