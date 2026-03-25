import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, generateNotebookContent } from "@/lib/gemini";
import { NOTEBOOK_SYSTEM_PROMPT } from "@/lib/prompts";
import { buildNotebook } from "@/lib/notebook-builder";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiKey = formData.get("apiKey") as string | null;
    const pdfFile = formData.get("pdf") as File | null;

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

    const pdfBuffer = await pdfFile.arrayBuffer();
    const rawContent = await generateNotebookContent(
      apiKey,
      pdfBuffer,
      NOTEBOOK_SYSTEM_PROMPT
    );

    const notebook = buildNotebook(rawContent);

    return NextResponse.json({ notebook, paperName: pdfFile.name });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    if (message.includes("API_KEY_INVALID") || message.includes("401")) {
      return NextResponse.json(
        { error: "Invalid Gemini API key. Please check and try again." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
