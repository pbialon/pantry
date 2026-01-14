import { NextResponse } from "next/server";
import { z } from "zod";
import { categorizeProducts } from "@/lib/api/ai";

const categorizeSchema = z.object({
  products: z.array(z.string().min(1)).min(1).max(50),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { products } = categorizeSchema.parse(body);

    const categorized = await categorizeProducts(products);

    return NextResponse.json(categorized);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Nieprawidlowe dane", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error categorizing products:", error);
    return NextResponse.json(
      { error: "Blad kategoryzacji produktow" },
      { status: 500 }
    );
  }
}
