import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, generateNotebookContent } from "@/lib/gemini";
import { NOTEBOOK_SYSTEM_PROMPT } from "@/lib/prompts";
import { buildNotebook } from "@/lib/notebook-builder";
import { PROGRESS_STAGES, formatSSEMessage } from "@/lib/progress";
import { apiRateLimiter } from "@/lib/rate-limiter";
import { withRetry } from "@/lib/retry";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateResult = apiRateLimiter.check(ip);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)),
        },
      }
    );
  }

  const formData = await request.formData();
  const apiKey = formData.get("apiKey") as string | null;
  const pdfFile = formData.get("pdf") as File | null;
  const modelParam = formData.get("model") as string | null;
  const modelName = modelParam === "gemini-2.5-flash" ? "gemini-2.5-flash" : "gemini-2.5-pro";

  // Validation — return regular JSON errors for bad input
  if (!apiKey || !validateApiKey(apiKey)) {
    return NextResponse.json(
      { error: "Valid API key is required" },
      { status: 400 }
    );
  }

  if (!pdfFile) {
    return NextResponse.json(
      { error: "PDF file is required" },
      { status: 400 }
    );
  }

  if (pdfFile.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 20MB." },
      { status: 400 }
    );
  }

  if (pdfFile.type !== "application/pdf" && !pdfFile.name.endsWith(".pdf")) {
    return NextResponse.json(
      { error: "Only PDF files are accepted" },
      { status: 400 }
    );
  }

  // Streaming SSE response for the generation pipeline
  const encoder = new TextEncoder();
  let aborted = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (aborted) return;
        try {
          controller.enqueue(encoder.encode(formatSSEMessage(event, data)));
        } catch {
          aborted = true;
        }
      };

      try {
        // Stage 1: Uploading
        send("progress", PROGRESS_STAGES[0]);

        // Stage 2: Analyzing
        send("progress", PROGRESS_STAGES[1]);
        const pdfBuffer = await pdfFile.arrayBuffer();

        // Stage 3: Extracting math
        send("progress", PROGRESS_STAGES[2]);

        // Stage 4: Generating code (this is where Gemini does most of the work)
        // Send keepalive comments every 15s to prevent CloudFront/ALB timeout
        send("progress", PROGRESS_STAGES[3]);
        const keepalive = setInterval(() => {
          if (aborted) return;
          try {
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          } catch {
            aborted = true;
          }
        }, 15_000);
        let rawContent: string;
        try {
          rawContent = await withRetry(
            () => generateNotebookContent(apiKey, pdfBuffer, NOTEBOOK_SYSTEM_PROMPT, modelName),
            {
              maxRetries: 2,
              baseDelayMs: 2000,
              onRetry: (attempt) => {
                send("progress", {
                  ...PROGRESS_STAGES[3],
                  label: `Retrying... (attempt ${attempt + 1})`,
                  description: "The API request failed. Retrying with exponential backoff...",
                });
              },
            }
          );
        } finally {
          clearInterval(keepalive);
        }

        // Stage 5: Synthetic data
        send("progress", PROGRESS_STAGES[4]);

        // Stage 6: Visualizations
        send("progress", PROGRESS_STAGES[5]);

        // Stage 7: Assembling notebook
        send("progress", PROGRESS_STAGES[6]);
        const notebook = buildNotebook(rawContent);

        // Stage 8: Complete
        send("progress", PROGRESS_STAGES[7]);
        send("done", { notebook, paperName: pdfFile.name });
      } catch (error: unknown) {
        const rawMessage =
          error instanceof Error ? error.message : String(error);

        // Log full error server-side for debugging
        console.error("[PaperToCode] Generation error:", rawMessage);

        // Send only safe, generic messages to client
        if (rawMessage.includes("API_KEY_INVALID") || rawMessage.includes("401")) {
          send("error", {
            message: "Invalid Gemini API key. Please check and try again.",
          });
        } else if (rawMessage.includes("429") || rawMessage.includes("RESOURCE_EXHAUSTED")) {
          send("error", {
            message: "Gemini API rate limit reached. Please wait a moment and try again.",
          });
        } else if (rawMessage.includes("timeout") || rawMessage.includes("DEADLINE_EXCEEDED")) {
          send("error", {
            message: "Request timed out. The paper may be too large or complex. Please try again.",
          });
        } else {
          send("error", {
            message: "Notebook generation failed. Please try again.",
          });
        }
      } finally {
        if (!aborted) {
          try { controller.close(); } catch { /* already closed */ }
        }
      }
    },
    cancel() {
      aborted = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
