import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getShoppingList,
  addToShoppingList,
  toggleShoppingItem,
  removeFromShoppingList,
  clearPurchasedItems,
} from "@/lib/db/queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const items = await getShoppingList(userId);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching shopping list:", error);
    return NextResponse.json(
      { error: "Failed to fetch shopping list" },
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

    // Support single item or array
    const items = Array.isArray(body) ? body : [body];

    // Validate items
    for (const item of items) {
      if (!item.product_name || typeof item.product_name !== "string") {
        return NextResponse.json(
          { error: "product_name is required for each item" },
          { status: 400 }
        );
      }
    }

    const created = await addToShoppingList(userId, items);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error adding to shopping list:", error);
    return NextResponse.json(
      { error: "Failed to add to shopping list" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const updated = await toggleShoppingItem(userId, parseInt(id));
    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating shopping item:", error);
    return NextResponse.json(
      { error: "Failed to update shopping item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const clearPurchased = searchParams.get("clearPurchased");

    if (clearPurchased === "true") {
      const count = await clearPurchasedItems(userId);
      return NextResponse.json({ deleted: count });
    }

    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const deleted = await removeFromShoppingList(userId, parseInt(id));
    if (!deleted) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shopping item:", error);
    return NextResponse.json(
      { error: "Failed to delete shopping item" },
      { status: 500 }
    );
  }
}
