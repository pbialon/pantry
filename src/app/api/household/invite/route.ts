import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserHousehold,
  getHouseholdMembers,
  createHouseholdInvite,
  deleteHouseholdInvite,
  getInviteByToken,
  acceptHouseholdInvite,
} from "@/lib/db/queries";

// POST - Create invite or accept invite
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const body = await request.json();

    // Accept invite
    if (body.token) {
      // Check if user already has a household
      const existing = await getUserHousehold(userId);
      if (existing) {
        return NextResponse.json(
          { error: "Masz juz gospodarstwo domowe. Opusc je zanim dolaczysz do innego." },
          { status: 400 }
        );
      }

      const invite = await getInviteByToken(body.token);
      if (!invite) {
        return NextResponse.json(
          { error: "Zaproszenie jest nieprawidlowe lub wygaslo" },
          { status: 400 }
        );
      }

      const success = await acceptHouseholdInvite(body.token, userId);
      if (!success) {
        return NextResponse.json(
          { error: "Nie udalo sie dolaczyc do gospodarstwa" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, householdName: invite.household_name });
    }

    // Create invite
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Nieprawidlowy adres email" },
        { status: 400 }
      );
    }

    const household = await getUserHousehold(userId);
    if (!household) {
      return NextResponse.json(
        { error: "Nie nalezysz do zadnego gospodarstwa" },
        { status: 400 }
      );
    }

    // Check if user is owner/member
    const members = await getHouseholdMembers(household.id);
    const isOwner = members.some((m) => m.user_id === userId && m.role === "owner");
    if (!isOwner) {
      return NextResponse.json(
        { error: "Tylko wlasciciel moze zapraszac uzytkownikow" },
        { status: 403 }
      );
    }

    // Check if email already a member
    const alreadyMember = members.some((m) => m.user_email?.toLowerCase() === email.toLowerCase());
    if (alreadyMember) {
      return NextResponse.json(
        { error: "Ten uzytkownik jest juz czlonkiem gospodarstwa" },
        { status: 400 }
      );
    }

    const invite = await createHouseholdInvite(household.id, email, userId);

    // Generate invite link
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const inviteLink = `${baseUrl}/invite/${invite.token}`;

    return NextResponse.json({ invite, inviteLink });
  } catch (error) {
    console.error("Error with invite:", error);
    return NextResponse.json(
      { error: "Failed to process invite" },
      { status: 500 }
    );
  }
}

// GET - Get invite info by token (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const invite = await getInviteByToken(token);
    if (!invite) {
      return NextResponse.json(
        { error: "Zaproszenie jest nieprawidlowe lub wygaslo" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      householdName: invite.household_name,
      email: invite.email,
      expiresAt: invite.expires_at,
    });
  } catch (error) {
    console.error("Error getting invite:", error);
    return NextResponse.json(
      { error: "Failed to get invite info" },
      { status: 500 }
    );
  }
}

// DELETE - Delete invite
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = parseInt(session.user.id);

    const { searchParams } = new URL(request.url);
    const inviteId = parseInt(searchParams.get("id") || "0");

    if (!inviteId) {
      return NextResponse.json({ error: "Invite ID required" }, { status: 400 });
    }

    const household = await getUserHousehold(userId);
    if (!household) {
      return NextResponse.json({ error: "No household" }, { status: 400 });
    }

    const success = await deleteHouseholdInvite(inviteId, household.id);
    if (!success) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invite:", error);
    return NextResponse.json(
      { error: "Failed to delete invite" },
      { status: 500 }
    );
  }
}
