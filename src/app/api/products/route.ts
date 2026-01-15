import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getProducts, createProduct, getProductByBarcode, getCategoryByName } from "@/lib/db/queries";
import { createProductInput } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");

    if (barcode) {
      const product = await getProductByBarcode(barcode, userId);
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      return NextResponse.json(product);
    }

    const products = await getProducts(userId);
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await request.json();

    // If category name is provided, look up category_id
    if (body.category && !body.category_id) {
      const category = await getCategoryByName(body.category);
      if (category) {
        body.category_id = category.id;
      }
      delete body.category; // Remove category name from body
    }

    const parsed = createProductInput.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const product = await createProduct(parsed.data, userId);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
