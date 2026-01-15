import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserHousehold,
  getHouseholdMembers,
  createHousehold,
  leaveHousehold,
  deleteHousehold,
  getHouseholdInvites,
} from "@/lib/db/queries";

// GET - Get current user's household
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const household = await getUserHousehold(userId);

    if (!household) {
      return NextResponse.json({ household: null, members: [], invites: [] });
    }

    const [members, invites] = await Promise.all([
      getHouseholdMembers(household.id),
      getHouseholdInvites(household.id),
    ]);

    // Determine if current user is owner
    const isOwner = members.some((m) => m.user_id === userId && m.role === "owner");

    return NextResponse.json({
      household,
      members,
      invites,
      isOwner,
    });
  } catch (error) {
    console.error("Error fetching household:", error);
    return NextResponse.json(
      { error: "Failed to fetch household" },
      { status: 500 }
    );
  }
}

// POST - Create household
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    // Check if user already has a household
    const existing = await getUserHousehold(userId);
    if (existing) {
      return NextResponse.json(
        { error: "Masz juz gospodarstwo domowe" },
        { status: 400 }
      );
    }

    const { name } = await request.json();

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nazwa musi miec co najmniej 2 znaki" },
        { status: 400 }
      );
    }

    const household = await createHousehold(name.trim(), userId);

    return NextResponse.json({ household });
  } catch (error) {
    console.error("Error creating household:", error);
    return NextResponse.json(
      { error: "Failed to create household" },
      { status: 500 }
    );
  }
}

// DELETE - Leave or delete household
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action"); // "leave" or "delete"

    const household = await getUserHousehold(userId);
    if (!household) {
      return NextResponse.json(
        { error: "Nie nalezysz do zadnego gospodarstwa" },
        { status: 400 }
      );
    }

    if (action === "delete") {
      const success = await deleteHousehold(household.id, userId);
      if (!success) {
        return NextResponse.json(
          { error: "Tylko wlasciciel moze usunac gospodarstwo" },
          { status: 403 }
        );
      }
      return NextResponse.json({ success: true });
    } else {
      // Default: leave
      const success = await leaveHousehold(userId);
      if (!success) {
        return NextResponse.json(
          { error: "Wlasciciel nie moze opuscic gospodarstwa - usun je lub przekaz wlasnosc" },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Error with household action:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
