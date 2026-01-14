import { NextResponse } from "next/server";
import { z } from "zod";
import { extractTextFromImage, parseReceiptText } from "@/lib/api/ocr";

const ocrSchema = z.object({
  image: z.string().min(1), // Base64 encoded image
  fileType: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image, fileType } = ocrSchema.parse(body);

    // Extract text from image
    const rawText = await extractTextFromImage(image, fileType);

    // Parse receipt to get product lines
    const products = parseReceiptText(rawText);

    return NextResponse.json({
      rawText,
      products,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Nieprawidlowe dane", details: error.issues },
        { status: 400 }
      );
    }

    console.error("OCR error:", error);
    const message =
      error instanceof Error ? error.message : "Blad przetwarzania OCR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
