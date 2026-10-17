import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { firestore } from "@/backend/db/db";
import { normalizeEmail, signToken } from "@/backend/utils/security";
import { findUserByEmailOrId, RegisterSchema } from "@/backend/authHelper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
    }

    const parseResult = RegisterSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors[0]?.message || "Dados de registo inválidos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, email, password } = parseResult.data;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await findUserByEmailOrId("", normalizedEmail);
    if (existingUser) {
      return NextResponse.json({ error: "Email já se encontra registado na plataforma." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserId = crypto.randomUUID();

    const newUser = {
      id: newUserId,
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "student",
      classe: null,
      curso: null,
      subjects: JSON.stringify([]),
      xp: 0,
      streak: 0,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    await firestore.collection("users").doc(newUserId).set(newUser);

    const token = signToken(
      { id: newUserId, email: normalizedEmail, role: "student", name: newUser.name },
      "7d"
    );

    return NextResponse.json({ 
      token, 
      user: { 
        id: newUserId, 
        email: normalizedEmail, 
        name: newUser.name, 
        role: "student",
        classe: null,
        curso: null,
        subjects: [],
        xp: 0,
        streak: 0
      } 
    }, { status: 201 });
  } catch (error: any) {
    console.error("[Register Route Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
