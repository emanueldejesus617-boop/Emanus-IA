import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail, verifyToken } from "@/backend/utils/security";
import { adminAuth } from "@/backend/db/db";
import { findUserByEmailOrId } from "@/backend/authHelper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autorizado. Token de sessão em falta." }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];

    let decoded: any = null;
    try {
      decoded = verifyToken(token);
    } catch {
      try {
        const decodedFirebaseToken = await adminAuth.verifyIdToken(token);
        const email = normalizeEmail(decodedFirebaseToken.email || "");
        const isAdmin = email === "emanueldejesus617@gmail.com";
        decoded = {
          id: decodedFirebaseToken.uid,
          email,
          name: decodedFirebaseToken.name || email.split('@')[0],
          role: isAdmin ? "admin" : (decodedFirebaseToken.role || "student")
        };
      } catch {
        return NextResponse.json({ error: "Sessão inválida ou expirada. Por favor, inicia sessão novamente." }, { status: 401 });
      }
    }

    if (!decoded) {
      return NextResponse.json({ error: "Token de autenticação inválido" }, { status: 401 });
    }

    const user = await findUserByEmailOrId(decoded.id, decoded.email);
    if (!user) {
      return NextResponse.json({ error: "Utilizador não encontrado na base de dados." }, { status: 404 });
    }

    let parsedSubjects: string[] = [];
    try {
      parsedSubjects = user.subjects ? (typeof user.subjects === 'string' ? JSON.parse(user.subjects) : user.subjects) : [];
    } catch {
      parsedSubjects = [];
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        displayName: user.displayName || user.name,
        username: user.username || "",
        photoUrl: user.photoUrl || user.avatar || "",
        email: user.email,
        role: user.role || "student",
        classe: user.classe || null,
        curso: user.curso || null,
        subjects: parsedSubjects,
        xp: user.xp || 0,
        streak: user.streak || 0
      }
    });
  } catch (error: any) {
    console.error("[Me Route Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
