import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchSimilarProducts } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");
    const brand = searchParams.get("brand");

    if (!name) {
      return NextResponse.json(
        { error: "Name parameter is required" },
        { status: 400 }
      );
    }

    const products = await searchSimilarProducts(name, brand, userId);
    return NextResponse.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    return NextResponse.json(
      { error: "Failed to search products" },
      { status: 500 }
    );
  }
}
