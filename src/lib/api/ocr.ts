// Workaround for SSL certificate issues in development
if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const OCR_API_URL = "https://api.ocr.space/parse/image";

interface OcrResult {
  ParsedResults: Array<{
    ParsedText: string;
    ErrorMessage?: string;
  }>;
  IsErroredOnProcessing: boolean;
  ErrorMessage?: string[];
}

export async function extractTextFromImage(
  imageBase64: string,
  fileType: string = "image/jpeg"
): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY;

  if (!apiKey) {
    throw new Error("Brak klucza OCR_SPACE_API_KEY");
  }

  // Prepare base64 with data URI prefix
  const base64WithPrefix = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:${fileType};base64,${imageBase64}`;

  const formData = new FormData();
  formData.append("apikey", apiKey);
  formData.append("base64Image", base64WithPrefix);
  formData.append("language", "pol"); // Polish language
  formData.append("isOverlayRequired", "false");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("OCREngine", "2"); // Engine 2 is better for receipts

  const response = await fetch(OCR_API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR API error: ${response.status}`);
  }

  const result: OcrResult = await response.json();

  if (result.IsErroredOnProcessing) {
    throw new Error(result.ErrorMessage?.join(", ") || "Blad OCR");
  }

  const parsedText = result.ParsedResults?.[0]?.ParsedText;

  if (!parsedText) {
    throw new Error("Nie udalo sie odczytac tekstu z obrazu");
  }

  return parsedText;
}

// Simple extraction - just return raw text, AI will do the heavy lifting
export function parseReceiptText(text: string): string[] {
  // Return raw text as single item - AI will parse it properly
  return [text];
}
