import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db/client";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Nieprawidlowy email"),
  password: z.string().min(6, "Haslo musi miec minimum 6 znakow"),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, name } = parsed.data;

    // Check if user already exists
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Uzytkownik o tym emailu juz istnieje" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(password, 12);

    // Create user
    const result = await db.execute({
      sql: "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?) RETURNING id, email, name",
      args: [email, passwordHash, name || null],
    });

    const user = result.rows[0];

    return NextResponse.json(
      { message: "Konto utworzone pomyslnie", user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Blad podczas rejestracji" },
      { status: 500 }
    );
  }
}
