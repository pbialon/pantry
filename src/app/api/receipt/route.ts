import { NextResponse } from "next/server";
import { z } from "zod";
import { extractTextFromImage } from "@/lib/api/ocr";
import { parseReceiptWithAI } from "@/lib/api/ai";

const receiptSchema = z.object({
  image: z.string().min(1),
  fileType: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { image, fileType } = receiptSchema.parse(body);

    // Step 1: OCR - extract text from image
    const rawText = await extractTextFromImage(image, fileType);

    // Step 2: AI - parse receipt text to get products
    const products = await parseReceiptWithAI(rawText);

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

    console.error("Receipt processing error:", error);
    const message =
      error instanceof Error ? error.message : "Blad przetwarzania paragonu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
