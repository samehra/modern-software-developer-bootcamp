import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, generateNotebookContent } from "@/lib/gemini";
import { NOTEBOOK_SYSTEM_PROMPT } from "@/lib/prompts";
import { buildNotebook } from "@/lib/notebook-builder";
import { PROGRESS_STAGES, formatSSEMessage } from "@/lib/progress";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const apiKey = formData.get("apiKey") as string | null;
  const pdfFile = formData.get("pdf") as File | null;

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
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(formatSSEMessage(event, data)));
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
        send("progress", PROGRESS_STAGES[3]);
        const rawContent = await generateNotebookContent(
          apiKey,
          pdfBuffer,
          NOTEBOOK_SYSTEM_PROMPT
        );

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
        const message =
          error instanceof Error
            ? error.message
            : "An unexpected error occurred";

        if (message.includes("API_KEY_INVALID") || message.includes("401")) {
          send("error", {
            message: "Invalid Gemini API key. Please check and try again.",
          });
        } else {
          send("error", { message });
        }
      } finally {
        controller.close();
      }
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
