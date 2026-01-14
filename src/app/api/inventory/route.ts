import { NextRequest, NextResponse } from "next/server";
import { getInventory, addToInventory, removeFromInventory, getExpiringItems } from "@/lib/db/queries";
import { addToInventoryInput } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const expiring = searchParams.get("expiring");

    if (expiring) {
      const days = parseInt(expiring) || 7;
      const items = await getExpiringItems(days);
      return NextResponse.json(items);
    }

    const inventory = await getInventory();
    return NextResponse.json(inventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = addToInventoryInput.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const item = await addToInventory(parsed.data);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error adding to inventory:", error);
    return NextResponse.json(
      { error: "Failed to add to inventory" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const quantity = searchParams.get("quantity");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const item = await removeFromInventory(
      parseInt(id),
      quantity ? parseFloat(quantity) : 1,
      "manual"
    );

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error removing from inventory:", error);
    return NextResponse.json(
      { error: "Failed to remove from inventory" },
      { status: 500 }
    );
  }
}
