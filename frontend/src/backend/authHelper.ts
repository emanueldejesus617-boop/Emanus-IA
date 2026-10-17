import { z } from "zod";
import { firestore, adminAuth } from "./db/db";
import { normalizeEmail, verifyToken } from "./utils/security";

export const LoginSchema = z.object({
  email: z.string().email("Formato de email inválido"),
  password: z.string().min(1, "A palavra-passe é obrigatória"),
});

export const RegisterSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(100, "O nome é demasiado longo"),
  email: z.string().email("Formato de email inválido"),
  password: z.string()
    .min(8, "A palavra-passe deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A palavra-passe deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A palavra-passe deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A palavra-passe deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "A palavra-passe deve conter pelo menos um caractere especial"),
});

export const ProfileSchema = z.object({
  classe: z.string().min(1, "A classe é obrigatória"),
  curso: z.string().optional(),
  subjects: z.array(z.string()),
});

export const EditProfileSchema = z.object({
  displayName: z.string().min(2, "O nome de apresentação deve ter pelo menos 2 caracteres").max(100).optional().or(z.literal("")),
  username: z.string().min(3, "O nome de utilizador deve ter pelo menos 3 caracteres").max(30).regex(/^[a-zA-Z0-9_.-]+$/, "Nome de utilizador só pode conter letras, números, sublinhado e traço").optional().or(z.literal("")),
  photoUrl: z.string().max(3500000, "A imagem é demasiado grande (máx ~2.5MB)").optional().or(z.literal("")),
});

/**
 * Função utilitária para autenticar utilizador via cabeçalho Authorization
 */
export async function authenticateUser(request: any, reply?: any) {
  try {
    const authHeader = request.headers?.authorization || (typeof request.headers?.get === "function" ? request.headers.get("authorization") : null);
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (reply && typeof reply.status === "function") {
        reply.status(401).send({ error: "Não autorizado. Token de sessão em falta." });
      }
      return null;
    }
    const token = authHeader.split(" ")[1];
    
    // Tentativa 1: JWT padrão
    try {
      const decoded = verifyToken(token);
      return decoded;
    } catch {
      // Tentativa 2: Firebase Auth ID Token
      try {
        const decodedFirebaseToken = await adminAuth.verifyIdToken(token);
        const email = normalizeEmail(decodedFirebaseToken.email || "");
        const isAdmin = email === "emanueldejesus617@gmail.com";
        return {
          id: decodedFirebaseToken.uid,
          email,
          name: decodedFirebaseToken.name || email.split('@')[0],
          role: isAdmin ? "admin" : ((decodedFirebaseToken as any).role || "student")
        };
      } catch {
        if (reply && typeof reply.status === "function") {
          reply.status(401).send({ error: "Sessão inválida ou expirada. Por favor, inicia sessão novamente." });
        }
        return null;
      }
    }
  } catch {
    if (reply && typeof reply.status === "function") {
      reply.status(401).send({ error: "Token de autenticação inválido" });
    }
    return null;
  }
}

/**
 * Função utilitária para localizar utilizador no Firestore por ID ou por qualquer variante de email.
 */
export async function findUserByEmailOrId(id: string, email: string) {
  const usersRef = firestore.collection("users");
  
  if (id) {
    try {
      const userDoc = await usersRef.doc(id).get();
      if (userDoc.exists) {
        return { id: userDoc.id, ...userDoc.data() } as any;
      }
    } catch (e) {
      // Continuar para pesquisa por email
    }
  }

  const normEmail = normalizeEmail(email);
  if (!normEmail) return null;

  try {
    // Busca por email normalizado (minúsculas)
    let snapshot = await usersRef.where("email", "==", normEmail).limit(1).get();
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
    }

    // Fallback para registos legados em maiúsculas
    snapshot = await usersRef.where("email", "==", normEmail.toUpperCase()).limit(1).get();
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
    }

    // Fallback para email original (caso venha com maiúsculas/minúsculas mistas)
    if (email && email !== normEmail && email !== normEmail.toUpperCase()) {
      snapshot = await usersRef.where("email", "==", email).limit(1).get();
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
      }
    }
  } catch (err) {
    // Tratar silenciosamente falhas de consulta
  }

  // Fallback para conta de administrador pré-definida
  if (normEmail === "emanueldejesus617@gmail.com") {
    try {
      const adminDoc = await usersRef.doc("admin-default-id").get();
      if (adminDoc.exists) {
        return { id: adminDoc.id, ...adminDoc.data() } as any;
      }
    } catch (e) {}
  }

  // Fallback para utilizador registado no Firebase Auth
  try {
    if (adminAuth && typeof adminAuth.getUserByEmail === "function") {
      const fbUser = await adminAuth.getUserByEmail(normEmail);
      if (fbUser && fbUser.uid) {
        const userByUid = await usersRef.doc(fbUser.uid).get();
        if (userByUid.exists) {
          return { id: userByUid.id, ...userByUid.data() } as any;
        }
      }
    }
  } catch (fbAuthErr) {}

  return null;
}
