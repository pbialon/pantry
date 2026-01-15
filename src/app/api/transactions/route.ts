import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFilteredTransactions } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const type = searchParams.get("type") || undefined;
    const source = searchParams.get("source") || undefined;
    const search = searchParams.get("search") || undefined;

    const transactions = await getFilteredTransactions({ limit, type, source, search }, userId);
    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
