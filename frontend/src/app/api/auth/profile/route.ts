import { NextRequest, NextResponse } from "next/server";
import { firestore, adminAuth } from "@/backend/db/db";
import { normalizeEmail, verifyToken } from "@/backend/utils/security";
import { findUserByEmailOrId, ProfileSchema, EditProfileSchema } from "@/backend/authHelper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function getAuthenticatedUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.split(" ")[1];
  try {
    return verifyToken(token);
  } catch {
    try {
      const decodedFirebaseToken = await adminAuth.verifyIdToken(token);
      const email = normalizeEmail(decodedFirebaseToken.email || "");
      const isAdmin = email === "emanueldejesus617@gmail.com";
      return {
        id: decodedFirebaseToken.uid,
        email,
        name: decodedFirebaseToken.name || email.split('@')[0],
        role: isAdmin ? "admin" : (decodedFirebaseToken.role || "student")
      };
    } catch {
      return null;
    }
  }
}

// POST - Initial Onboarding Profile Setup (classe, curso, subjects)
export async function POST(req: NextRequest) {
  try {
    const decoded = await getAuthenticatedUser(req);
    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
    }

    // Se vier com displayName ou username, é uma edição de perfil
    if (body.displayName !== undefined || body.username !== undefined || body.photoUrl !== undefined) {
      return handleEditProfile(decoded, body);
    }

    const parseResult = ProfileSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.errors[0]?.message || "Dados de perfil inválidos";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { classe, curso, subjects } = parseResult.data;
    const user = await findUserByEmailOrId(decoded.id, decoded.email);
    if (!user) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    const updatedData = {
      classe,
      curso: curso || null,
      subjects: JSON.stringify(subjects),
      lastLoginAt: new Date().toISOString()
    };

    await firestore.collection("users").doc(user.id).update(updatedData);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        displayName: user.displayName || user.name,
        username: user.username || "",
        photoUrl: user.photoUrl || user.avatar || "",
        email: user.email,
        role: user.role || "student",
        classe,
        curso,
        subjects,
        xp: user.xp || 0,
        streak: user.streak || 0
      }
    });
  } catch (error: any) {
    console.error("[Profile Route Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar perfil" },
      { status: 500 }
    );
  }
}

// PUT - Update Profile Info (displayName, username, photoUrl)
export async function PUT(req: NextRequest) {
  try {
    const decoded = await getAuthenticatedUser(req);
    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
    }

    return handleEditProfile(decoded, body);
  } catch (error: any) {
    console.error("[Edit Profile Route Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar perfil" },
      { status: 500 }
    );
  }
}

async function handleEditProfile(decoded: any, body: any) {
  const parseResult = EditProfileSchema.safeParse(body);
  if (!parseResult.success) {
    const msg = parseResult.error.errors[0]?.message || "Dados inválidos";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { displayName, username, photoUrl } = parseResult.data;
  const user = await findUserByEmailOrId(decoded.id, decoded.email);
  if (!user) {
    return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
  }

  const updatedData: any = {
    updatedAt: new Date().toISOString()
  };

  if (displayName !== undefined && displayName.trim() !== "") {
    const cleanDisplayName = displayName.trim();
    updatedData.name = cleanDisplayName;
    updatedData.displayName = cleanDisplayName;
  }

  if (username !== undefined) {
    const cleanUsername = username.trim().replace(/^@/, "");
    if (cleanUsername !== "") {
      const normUsername = cleanUsername.toLowerCase();
      const existingSnapshot = await firestore.collection("users")
        .where("username_lower", "==", normUsername)
        .limit(1)
        .get();
      if (!existingSnapshot.empty && existingSnapshot.docs[0].id !== user.id) {
        return NextResponse.json({ error: "Este nome de utilizador já está em uso por outro aluno." }, { status: 400 });
      }
      updatedData.username = cleanUsername;
      updatedData.username_lower = normUsername;
    } else {
      updatedData.username = "";
      updatedData.username_lower = "";
    }
  }

  if (photoUrl !== undefined) {
    updatedData.photoUrl = photoUrl;
    updatedData.avatar = photoUrl;
  }

  await firestore.collection("users").doc(user.id).update(updatedData);

  const refreshedDoc = await firestore.collection("users").doc(user.id).get();
  const updatedUser = refreshedDoc.data() || {};
  let parsedSubjects: string[] = [];
  try {
    parsedSubjects = updatedUser.subjects ? (typeof updatedUser.subjects === 'string' ? JSON.parse(updatedUser.subjects) : updatedUser.subjects) : [];
  } catch {
    parsedSubjects = [];
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: updatedUser.name || user.name,
      displayName: updatedUser.displayName || updatedUser.name || user.name,
      username: updatedUser.username || "",
      photoUrl: updatedUser.photoUrl || updatedUser.avatar || "",
      email: updatedUser.email || user.email,
      role: updatedUser.role || "student",
      classe: updatedUser.classe || null,
      curso: updatedUser.curso || null,
      subjects: parsedSubjects,
      xp: updatedUser.xp || 0,
      streak: updatedUser.streak || 0
    },
    message: "Perfil atualizado com sucesso!"
  });
}
