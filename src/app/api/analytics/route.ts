import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

interface TopProduct {
  product_id: number;
  product_name: string;
  total_added: number;
  total_removed: number;
}

interface DailyActivity {
  date: string;
  added: number;
  removed: number;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    // Top consumed products (most removed in last 30 days)
    const topConsumed = await db.execute({
      sql: `
      SELECT
        t.product_id,
        p.name as product_name,
        SUM(CASE WHEN t.type = 'add' THEN t.quantity ELSE 0 END) as total_added,
        SUM(CASE WHEN t.type = 'remove' THEN t.quantity ELSE 0 END) as total_removed
      FROM transactions t
      JOIN products p ON t.product_id = p.id
      WHERE t.created_at >= date('now', '-30 days')
      AND t.user_id = ?
      GROUP BY t.product_id, p.name
      ORDER BY total_removed DESC
      LIMIT 5
    `,
      args: [userId],
    });

    // Daily activity last 7 days
    const dailyActivity = await db.execute({
      sql: `
      SELECT
        date(created_at) as date,
        SUM(CASE WHEN type = 'add' THEN quantity ELSE 0 END) as added,
        SUM(CASE WHEN type = 'remove' THEN quantity ELSE 0 END) as removed
      FROM transactions
      WHERE created_at >= date('now', '-7 days')
      AND user_id = ?
      GROUP BY date(created_at)
      ORDER BY date DESC
    `,
      args: [userId],
    });

    // Total stats for this month
    const monthStats = await db.execute({
      sql: `
      SELECT
        SUM(CASE WHEN type = 'add' THEN quantity ELSE 0 END) as total_added,
        SUM(CASE WHEN type = 'remove' THEN quantity ELSE 0 END) as total_removed,
        COUNT(DISTINCT product_id) as unique_products
      FROM transactions
      WHERE created_at >= date('now', 'start of month')
      AND user_id = ?
    `,
      args: [userId],
    });

    return NextResponse.json({
      topConsumed: topConsumed.rows as unknown as TopProduct[],
      dailyActivity: dailyActivity.rows as unknown as DailyActivity[],
      monthStats: monthStats.rows[0] as unknown as {
        total_added: number;
        total_removed: number;
        unique_products: number;
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
