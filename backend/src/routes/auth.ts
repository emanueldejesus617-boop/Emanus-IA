import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { firestore, adminAuth } from "../db/db";
import { rateLimit } from "../utils/rateLimit";
import { normalizeEmail, signToken, verifyToken } from "../utils/security";

const LoginSchema = z.object({
  email: z.string().email("Formato de email inválido"),
  password: z.string().min(1, "A palavra-passe é obrigatória"),
});

const RegisterSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(100, "O nome é demasiado longo"),
  email: z.string().email("Formato de email inválido"),
  password: z.string()
    .min(8, "A palavra-passe deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A palavra-passe deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A palavra-passe deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A palavra-passe deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "A palavra-passe deve conter pelo menos um caractere especial"),
});

const ProfileSchema = z.object({
  classe: z.string().min(1, "A classe é obrigatória"),
  curso: z.string().optional(),
  subjects: z.array(z.string()),
});

const EditProfileSchema = z.object({
  displayName: z.string().min(2, "O nome de apresentação deve ter pelo menos 2 caracteres").max(100).optional().or(z.literal("")),
  username: z.string().min(3, "O nome de utilizador deve ter pelo menos 3 caracteres").max(30).regex(/^[a-zA-Z0-9_.-]+$/, "Nome de utilizador só pode conter letras, números, sublinhado e traço").optional().or(z.literal("")),
  photoUrl: z.string().max(3500000, "A imagem é demasiado grande (máx ~2.5MB)").optional().or(z.literal("")),
});

export async function authenticateUser(request: any, reply: any) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      reply.status(401).send({ error: "Não autorizado. Token de sessão em falta." });
      return null;
    }
    const token = authHeader.split(" ")[1];
    
    // Attempt 1: Standard JWT verification (fastest & robust for backend tokens)
    try {
      const decoded = verifyToken(token);
      return decoded;
    } catch (jwtErr) {
      // Attempt 2: Fallback to Firebase Auth ID Token verification
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
      } catch (fbErr) {
        reply.status(401).send({ error: "Sessão inválida ou expirada. Por favor, inicia sessão novamente." });
        return null;
      }
    }
  } catch (err) {
    reply.status(401).send({ error: "Token de autenticação inválido" });
    return null;
  }
}

/**
 * Função utilitária para localizar utilizador no Firestore por ID ou por qualquer variante de email.
 */
async function findUserByEmailOrId(id: string, email: string) {
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

  return null;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Google Authentication Endpoint com validação criptográfica estrita
  fastify.post("/google", async (request, reply) => {
    if (!rateLimit(request, reply, { maxRequests: 20, windowMs: 60 * 1000 })) {
      return;
    }

    try {
      const { idToken, name } = request.body as any;
      if (!idToken || typeof idToken !== "string") {
        return reply.status(400).send({ error: "O token do Google (idToken) é obrigatório." });
      }

      // Validação estrita do token do Firebase Admin
      let decodedToken: any;
      try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
      } catch (err: any) {
        fastify.log.warn({ err }, "Tentativa de login Google com token inválido ou rejeitado pelo Firebase.");
        return reply.status(401).send({ error: "Token do Google inválido ou expirado. Por favor, tente novamente." });
      }

      const uid = decodedToken.uid;
      const verifiedEmail = normalizeEmail(decodedToken.email || "");
      if (!verifiedEmail) {
        return reply.status(400).send({ error: "Não foi possível obter um email válido a partir da conta Google." });
      }

      const usersRef = firestore.collection("users");
      let user = await findUserByEmailOrId(uid, verifiedEmail);

      const isAdminEmail = verifiedEmail === "emanueldejesus617@gmail.com";

      if (!user) {
        // Criar novo utilizador seguro no Firestore
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
        // Atualizar último login e garantir que o email está normalizado
        const updates: any = {
          lastLoginAt: new Date().toISOString(),
          email: verifiedEmail
        };
        if (isAdminEmail) {
          updates.role = "admin";
          user.role = "admin";
        }
        await usersRef.doc(user.id).update(updates);
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

      return {
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
      };
    } catch (e: any) {
      fastify.log.error(e);
      const isNotFound = e?.code === 5 || e?.message?.includes("NOT_FOUND") || e?.details?.includes("NOT_FOUND");
      const errorMessage = isNotFound
        ? "Base de dados Firestore ainda não foi criada. Por favor aceda a Firebase Console > Build > Firestore Database e clique em 'Criar base de dados'."
        : (e.message || "Erro ao autenticar com o Google");
      return reply.status(500).send({ error: errorMessage });
    }
  });

  // Login Endpoint
  fastify.post("/login", async (request, reply) => {
    if (!rateLimit(request, reply, { maxRequests: 20, windowMs: 60 * 1000 })) {
      return;
    }
    try {
      const { email, password } = LoginSchema.parse(request.body);
      const normalizedEmail = normalizeEmail(email);

      let user = await findUserByEmailOrId("", normalizedEmail);
      
      if (!user) {
        // Fallback: verificar se o utilizador autenticou via Firebase Auth e foi criado recentemente
        const authHeader = request.headers.authorization;
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
            fastify.log.warn({ fbTokenErr }, "Falha ao validar Firebase token no fallback de login.");
          }
        }
      }

      if (!user) {
        return reply.status(401).send({ error: "Credenciais inválidas" });
      }

      const isAdminAccount = normalizedEmail === "emanueldejesus617@gmail.com" || user.role === "admin";
      if (isAdminAccount && user.role !== "admin") {
        user.role = "admin";
        await firestore.collection("users").doc(user.id).update({ role: "admin" }).catch(() => {});
      }

      // Impedir que contas de alunos criadas via Google sem palavra-passe sejam acedidas com login convencional
      if (!isAdminAccount && (!user.password || typeof user.password !== "string" || user.password.trim() === "")) {
        return reply.status(400).send({ 
          error: "Esta conta foi criada com o Google. Por favor, utilize o botão 'Continuar com o Google' para iniciar sessão." 
        });
      }

      let match = false;
      if (user.password && typeof user.password === "string" && user.password.trim() !== "") {
        match = await bcrypt.compare(password, user.password);
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
            fastify.log.warn({ syncErr }, "Falha ao sincronizar hash do admin");
          }
        }
      }

      if (!match) {
        return reply.status(401).send({ error: "Credenciais inválidas" });
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

      await firestore.collection("users").doc(user.id).update({
        lastLoginAt: now.toISOString(),
        streak: newStreak
      });

      const token = signToken(
        { id: user.id, email: normalizedEmail, role: user.role || "student", name: user.name },
        "7d"
      );

      const parsedSubjects = user.subjects ? (typeof user.subjects === 'string' ? JSON.parse(user.subjects) : user.subjects) : [];

      return { 
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
      };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMsg = e.errors[0]?.message || "Dados inválidos";
        return reply.status(400).send({ error: errorMsg, details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro interno no servidor" });
    }
  });

  // Register Endpoint
  fastify.post("/register", async (request, reply) => {
    if (!rateLimit(request, reply, { maxRequests: 3, windowMs: 60 * 1000 })) {
      return;
    }
    try {
      const { name, email, password } = RegisterSchema.parse(request.body);
      const normalizedEmail = normalizeEmail(email);
      
      const existingUser = await findUserByEmailOrId("", normalizedEmail);
      if (existingUser) {
        return reply.status(400).send({ error: "Email já se encontra registado na plataforma." });
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

      return reply.status(201).send({ 
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
      });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMsg = e.errors[0]?.message || "Dados inválidos";
        return reply.status(400).send({ error: errorMsg, details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro interno no servidor" });
    }
  });

  // Get Me Endpoint - Validação da sessão ativa
  fastify.get("/me", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const user = await findUserByEmailOrId(decoded.id, decoded.email);
      if (!user) {
        return reply.status(404).send({ error: "Utilizador não encontrado na base de dados." });
      }

      const parsedSubjects = user.subjects ? (typeof user.subjects === 'string' ? JSON.parse(user.subjects) : user.subjects) : [];

      return {
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
      };
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao buscar dados do utilizador" });
    }
  });

  // Save Profile Endpoint (Onboarding: classe, curso, subjects)
  fastify.post("/profile", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { classe, curso, subjects } = ProfileSchema.parse(request.body);
      const user = await findUserByEmailOrId(decoded.id, decoded.email);
      
      if (!user) {
        return reply.status(404).send({ error: "Utilizador não encontrado" });
      }
      
      const updatedData = {
        classe,
        curso: curso || null,
        subjects: JSON.stringify(subjects),
        lastLoginAt: new Date().toISOString()
      };

      await firestore.collection("users").doc(user.id).update(updatedData);

      return {
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
      };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMsg = e.errors[0]?.message || "Dados inválidos";
        return reply.status(400).send({ error: errorMsg, details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao salvar perfil" });
    }
  });

  // Edit Profile Endpoint (Photo, Username, Display Name)
  const handleEditProfile = async (request: any, reply: any) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { displayName, username, photoUrl } = EditProfileSchema.parse(request.body);
      const user = await findUserByEmailOrId(decoded.id, decoded.email);
      
      if (!user) {
        return reply.status(404).send({ error: "Utilizador não encontrado" });
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
            return reply.status(400).send({ error: "Este nome de utilizador já está em uso por outro aluno." });
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
      const parsedSubjects = updatedUser.subjects ? (typeof updatedUser.subjects === 'string' ? JSON.parse(updatedUser.subjects) : updatedUser.subjects) : [];

      return {
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
      };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMsg = e.errors[0]?.message || "Dados inválidos";
        return reply.status(400).send({ error: errorMsg, details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: e.message || "Erro ao atualizar perfil" });
    }
  };

  fastify.put("/profile", handleEditProfile);
  fastify.post("/profile/update", handleEditProfile);

  // Forgot Password Endpoint
  fastify.post("/forgot-password", async (request, reply) => {
    if (!rateLimit(request, reply, { maxRequests: 3, windowMs: 60 * 1000 })) {
      return;
    }
    try {
      const { email } = request.body as any;

      if (!email || typeof email !== "string") {
        return reply.status(400).send({ error: "O e-mail é obrigatório." });
      }

      const normalizedEmail = normalizeEmail(email);

      // Critério 1: formato de email válido
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return reply.status(400).send({ error: "O formato do e-mail é inválido." });
      }

      // Critério 2: bloquear domínios descartáveis comuns
      const blockedDomains = ["tempmail.com", "mailinator.com", "10minutemail.com", "guerrillamail.com", "throwaway.email", "fakeinbox.com", "sharklasers.com", "trashmail.com"];
      const emailDomain = normalizedEmail.split("@")[1];
      if (blockedDomains.includes(emailDomain)) {
        return reply.status(400).send({ error: "Não são aceites endereços de e-mail descartáveis. Use o seu e-mail real de aluno." });
      }

      // Critério 3: verificar se a conta existe no Firestore
      const user = await findUserByEmailOrId("", normalizedEmail);
      if (!user) {
        // Por segurança, retornamos sucesso mesmo se o utilizador não existir (evitar enumeração de emails)
        return reply.send({ success: true, message: "Se existir uma conta com este e-mail, receberá um link de recuperação." });
      }

      // Critério 4: impedir recuperação de contas exclusivamente do Google (sem palavra-passe definida)
      if (!user.password || user.password.trim() === "" || user.authProvider === "google") {
        return reply.status(400).send({ 
          error: "Esta conta foi criada com o Google. Para aceder, use o botão 'Continuar com o Google' na página de login." 
        });
      }

      // Tentar gerar link de redefinição via Firebase Admin
      try {
        const resetLink = await adminAuth.generatePasswordResetLink(normalizedEmail);
        if (resetLink) {
          fastify.log.info({ email: normalizedEmail }, "Link de redefinição de palavra-passe gerado com sucesso.");
          return reply.send({
            success: true,
            message: "Enviámos um link de recuperação para o seu e-mail. Verifique também a pasta de spam.",
            // Em desenvolvimento, expor o link para facilitar testes (remover em produção):
            ...(process.env.NODE_ENV !== "production" ? { devResetLink: resetLink } : {})
          });
        }
      } catch (firebaseErr: any) {
        fastify.log.warn({ firebaseErr }, "Falha ao gerar link de redefinição pelo Firebase Admin.");
        // Se o utilizador não existir no Firebase Auth mas existe no Firestore (conta legada)
        if (firebaseErr?.code === "auth/user-not-found") {
          return reply.status(404).send({
            error: "Conta não encontrada no sistema de autenticação. Tente criar uma nova conta ou entre em contacto com o suporte."
          });
        }
      }

      // Fallback: confirmar que recebemos o pedido mesmo sem envio real
      return reply.send({
        success: true,
        message: "Se existir uma conta com este e-mail, receberá um link de recuperação em breve."
      });
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro interno ao processar o pedido de recuperação." });
    }
  });
}
