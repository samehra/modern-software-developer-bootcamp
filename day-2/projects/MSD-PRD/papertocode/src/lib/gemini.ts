import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{35}$/;

export function validateApiKey(key: string): boolean {
  return key.trim().length > 0;
}

export function isValidGeminiKeyFormat(key: string): boolean {
  return GEMINI_KEY_PATTERN.test(key.trim());
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
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    systemInstruction: systemPrompt,
  });

  const pdfPart = {
    inlineData: {
      data: Buffer.from(pdfBuffer).toString("base64"),
      mimeType: "application/pdf",
    },
  };

  const result = await model.generateContent([
    { text: "Analyze this research paper and generate a comprehensive notebook implementation as specified." },
    pdfPart,
  ]);

  return result.response.text();
}
