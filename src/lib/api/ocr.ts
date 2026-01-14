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

// Parse receipt text to extract product lines
export function parseReceiptText(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const products: string[] = [];

  for (const line of lines) {
    // Skip empty lines
    if (!line) continue;

    // Skip common receipt headers/footers
    if (
      /^(paragon|fiskalny|nip|data|godzina|suma|razem|ptu|gotowka|reszta|karta|terminal|nr|kasa)/i.test(
        line
      )
    ) {
      continue;
    }

    // Skip lines that are just numbers or prices
    if (/^[\d\s,.\-*]+$/.test(line)) continue;

    // Skip very short lines
    if (line.length < 3) continue;

    // Skip lines with typical receipt patterns
    if (/^\d{2}[:\-]\d{2}/.test(line)) continue; // Time
    if (/^\d{2}[.\-\/]\d{2}[.\-\/]\d{2,4}/.test(line)) continue; // Date

    // Clean up product name - remove price at the end
    let productName = line
      .replace(/\s+\d+[,.]?\d*\s*(zl|pln)?$/i, "")
      .replace(/\s+[A-Z]\s*$/, "") // Remove tax category letter
      .replace(/\s+x\s*\d+.*$/i, "") // Remove quantity multiplier
      .trim();

    // Skip if too short after cleanup
    if (productName.length < 3) continue;

    products.push(productName);
  }

  return products;
}
