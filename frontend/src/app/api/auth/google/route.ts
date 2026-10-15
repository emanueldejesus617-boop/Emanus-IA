import { NextRequest, NextResponse } from "next/server";
import { firestore, adminAuth } from "@/backend/db/db";
import { normalizeEmail, signToken } from "@/backend/utils/security";
import { findUserByEmailOrId } from "@/backend/routes/auth";

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

    const { idToken, name } = body;
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "O token do Google (idToken) é obrigatório." }, { status: 400 });
    }

    let decodedToken: any;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err: any) {
      console.warn("Tentativa de login Google com token rejeitado:", err);
      return NextResponse.json({ error: "Token do Google inválido ou expirado. Por favor, tente novamente." }, { status: 401 });
    }

    const uid = decodedToken.uid;
    const verifiedEmail = normalizeEmail(decodedToken.email || "");
    if (!verifiedEmail) {
      return NextResponse.json({ error: "Não foi possível obter um email válido a partir da conta Google." }, { status: 400 });
    }

    const usersRef = firestore.collection("users");
    let user = await findUserByEmailOrId(uid, verifiedEmail);

    const isAdminEmail = verifiedEmail === "emanueldejesus617@gmail.com";

    if (!user) {
      const newUser = {
        id: uid,
        name: name || decodedToken.name || verifiedEmail.split("@")[0],
        email: verifiedEmail,
        password: "",
        authProvider: "google",
        role: isAdminEmail ? "admin" : "student",
        classe: null,
        curso: null,
        subjects: JSON.stringify([]),
        xp: isAdminEmail ? 100 : 0,
        streak: 1,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      await usersRef.doc(uid).set(newUser);
      user = newUser;
    } else {
      const updates: any = {
        lastLoginAt: new Date().toISOString(),
        email: verifiedEmail
      };
      if (isAdminEmail) {
        updates.role = "admin";
        user.role = "admin";
      }
      try {
        await usersRef.doc(user.id).update(updates);
      } catch (upErr) {
        console.warn("Aviso ao atualizar login google:", upErr);
      }
    }

    const token = signToken(
      { id: user.id, email: verifiedEmail, role: user.role || "student", name: user.name },
      "7d"
    );

    let parsedSubjects: string[] = [];
    try {
      parsedSubjects = user.subjects 
        ? (typeof user.subjects === 'string' ? JSON.parse(user.subjects) : user.subjects) 
        : [];
    } catch {
      parsedSubjects = [];
    }

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: verifiedEmail,
        name: user.name,
        displayName: user.displayName || user.name,
        username: user.username || "",
        photoUrl: user.photoUrl || user.avatar || decodedToken.picture || "",
        role: user.role || "student",
        classe: user.classe || null,
        curso: user.curso || null,
        subjects: parsedSubjects,
        xp: user.xp || 0,
        streak: user.streak || 1
      }
    });
  } catch (error: any) {
    console.error("[Google Auth Route Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao autenticar com o Google" },
      { status: 500 }
    );
  }
}
