import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { firestore, adminAuth } from "@/backend/db/db";
import { normalizeEmail, signToken } from "@/backend/utils/security";
import { findUserByEmailOrId, LoginSchema } from "@/backend/routes/auth";

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

    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors[0]?.message || "Dados de login inválidos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = normalizeEmail(email);

    let user = await findUserByEmailOrId("", normalizedEmail);

    if (!user) {
      // Fallback: verificar se o utilizador autenticou via Firebase Auth e foi criado recentemente
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          const decodedFirebaseToken = await adminAuth.verifyIdToken(token);
          const decodedEmail = normalizeEmail(decodedFirebaseToken.email || "");
          if (decodedEmail === normalizedEmail) {
            const newUserId = decodedFirebaseToken.uid || crypto.randomUUID();
            const hashedPassword = await bcrypt.hash(password, 10);
            const isAdmin = normalizedEmail === "emanueldejesus617@gmail.com";
            const newUser = {
              id: newUserId,
              name: decodedFirebaseToken.name || normalizedEmail.split('@')[0],
              email: normalizedEmail,
              password: hashedPassword,
              role: isAdmin ? "admin" : "student",
              classe: null,
              curso: null,
              subjects: JSON.stringify([]),
              xp: isAdmin ? 100 : 0,
              streak: 1,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString()
            };
            await firestore.collection("users").doc(newUserId).set(newUser);
            user = newUser;
          }
        } catch (fbTokenErr) {
          console.warn("Falha ao validar Firebase token no fallback de login:", fbTokenErr);
        }
      }
    }

    if (!user) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    const isAdminAccount = normalizedEmail === "emanueldejesus617@gmail.com" || user.role === "admin";
    if (isAdminAccount && user.role !== "admin") {
      user.role = "admin";
      await firestore.collection("users").doc(user.id).update({ role: "admin" }).catch(() => {});
    }

    // Impedir que contas de alunos criadas via Google sem palavra-passe sejam acedidas com login convencional
    if (!isAdminAccount && (!user.password || typeof user.password !== "string" || user.password.trim() === "")) {
      return NextResponse.json({ 
        error: "Esta conta foi criada com o Google. Por favor, utilize o botão 'Continuar com o Google' para iniciar sessão." 
      }, { status: 400 });
    }

    let match = false;
    if (user.password && typeof user.password === "string" && user.password.trim() !== "") {
      try {
        match = await bcrypt.compare(password, user.password);
      } catch (bcryptErr: any) {
        console.warn("[Login] Erro ao comparar hash bcrypt:", bcryptErr?.message);
        match = false;
      }
    }

    // Se for a conta do Administrador, aceitar as senhas autorizadas: TutorIA@Admin2026!, tutoria007 ou ADMIN_PASSWORD do .env
    if (!match && isAdminAccount) {
      const envAdminPass = process.env.ADMIN_PASSWORD || "TutorIA@Admin2026!";
      if (password === envAdminPass || password === "TutorIA@Admin2026!" || password === "tutoria007") {
        match = true;
        try {
          const newHash = await bcrypt.hash(password, 10);
          await firestore.collection("users").doc(user.id).update({ password: newHash });
        } catch (syncErr) {
          console.warn("Falha ao sincronizar hash do admin:", syncErr);
        }
      }
    }

    if (!match) {
      return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
    }

    // Check and update streak upon login
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let newStreak = user.streak || 0;
    
    if (user.classe) {
      if (!user.lastLoginAt) {
        newStreak = 1;
      } else {
        const lastLoginDateStr = user.lastLoginAt.split('T')[0];
        if (lastLoginDateStr !== todayStr) {
          const lastLoginDate = new Date(lastLoginDateStr);
          const todayDate = new Date(todayStr);
          const diffTime = Math.abs(todayDate.getTime() - lastLoginDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays > 1) {
            newStreak = 1;
          }
        }
      }
    }

    try {
      await firestore.collection("users").doc(user.id).update({
        lastLoginAt: now.toISOString(),
        streak: newStreak
      });
    } catch (updateErr) {
      console.warn("Aviso ao atualizar lastLoginAt e streak:", updateErr);
    }

    const token = signToken(
      { id: user.id, email: normalizedEmail, role: user.role || "student", name: user.name },
      "7d"
    );

    let parsedSubjects: string[] = [];
    try {
      parsedSubjects = user.subjects ? (typeof user.subjects === 'string' ? JSON.parse(user.subjects) : user.subjects) : [];
    } catch {
      parsedSubjects = [];
    }

    return NextResponse.json({ 
      token, 
      user: { 
        id: user.id, 
        email: normalizedEmail, 
        name: user.name, 
        displayName: user.displayName || user.name,
        username: user.username || "",
        photoUrl: user.photoUrl || user.avatar || "",
        role: user.role || "student", 
        classe: user.classe || null,
        curso: user.curso || null,
        subjects: parsedSubjects,
        xp: user.xp || 0,
        streak: newStreak
      } 
    });
  } catch (error: any) {
    const errMsg = error?.message || String(error) || "Erro interno no servidor";
    const errStack = error?.stack || "";
    console.error("[Login Route Error]:", errMsg);
    console.error("[Login Route Stack]:", errStack);
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}
