import { GoogleGenerativeAI } from "@google/generative-ai";

export function validateApiKey(key: string): boolean {
  return key.trim().length > 0;
}

export function createGeminiClient(apiKey: string) {
  if (!validateApiKey(apiKey)) {
    throw new Error("API key is required");
  }
  return new GoogleGenerativeAI(apiKey);
}

export async function generateNotebookContent(
  apiKey: string,
  pdfBuffer: ArrayBuffer,
  systemPrompt: string
): Promise<string> {
  const genAI = createGeminiClient(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  const pdfPart = {
    inlineData: {
      data: Buffer.from(pdfBuffer).toString("base64"),
      mimeType: "application/pdf",
    },
  };

  const result = await model.generateContent([
    { text: systemPrompt },
    pdfPart,
  ]);

  return result.response.text();
}
