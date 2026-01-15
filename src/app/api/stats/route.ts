import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getConsumptionStats,
  getCategoryStats,
  getStatsSummary,
  getStats,
} from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30");

    const [consumption, categories, summary, dashboardStats] = await Promise.all([
      getConsumptionStats(userId, days),
      getCategoryStats(userId),
      getStatsSummary(userId),
      getStats(userId),
    ]);

    return NextResponse.json({
      // Dashboard stats (flat, for backward compatibility)
      ...dashboardStats,
      // Detailed stats for /stats page
      consumption,
      categories,
      summary,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
