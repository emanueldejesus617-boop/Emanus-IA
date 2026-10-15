import { NextRequest, NextResponse } from "next/server";
import { normalizeEmail } from "@/backend/utils/security";
import { adminAuth } from "@/backend/db/db";
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

    const { email } = body;
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "O e-mail é obrigatório." }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: "O formato do e-mail é inválido." }, { status: 400 });
    }

    const blockedDomains = ["tempmail.com", "mailinator.com", "10minutemail.com", "guerrillamail.com", "throwaway.email", "fakeinbox.com", "sharklasers.com", "trashmail.com"];
    const emailDomain = normalizedEmail.split("@")[1];
    if (blockedDomains.includes(emailDomain)) {
      return NextResponse.json({ error: "Não são aceites endereços de e-mail descartáveis." }, { status: 400 });
    }

    const user = await findUserByEmailOrId("", normalizedEmail);
    if (!user) {
      // Segurança: evitar enumeração de contas
      return NextResponse.json({ success: true, message: "Se existir uma conta com este e-mail, receberá um link de recuperação." });
    }

    if (!user.password || user.password.trim() === "" || user.authProvider === "google") {
      return NextResponse.json({ 
        error: "Esta conta foi criada com o Google. Para aceder, use o botão 'Continuar com o Google' na página de login." 
      }, { status: 400 });
    }

    let resetLink: string | null = null;
    try {
      resetLink = await adminAuth.generatePasswordResetLink(normalizedEmail);
    } catch (fbErr) {
      console.warn("Aviso ao gerar link via Firebase Admin:", fbErr);
    }

    return NextResponse.json({
      success: true,
      message: "Instruções de recuperação enviadas com sucesso.",
      resetLink: process.env.NODE_ENV !== "production" ? resetLink : undefined
    });
  } catch (error: any) {
    console.error("[Forgot Password Route Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar o pedido" },
      { status: 500 }
    );
  }
}
