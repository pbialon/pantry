import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateShoppingFromHistory } from "@/lib/db/queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const suggestions = await generateShoppingFromHistory(userId);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error generating shopping suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
