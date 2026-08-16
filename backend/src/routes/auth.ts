import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { firestore, adminAuth } from "../db/db";
import { rateLimit } from "../utils/rateLimit";

const JWT_SECRET = process.env.JWT_SECRET || "7777fc2e8a53c41c7b96d64ed9455a1a5d59c83886d84d2f5281549631905bb4c5bd4ec0bfd563171dd75348a5ce018a47c0e8e241bb3ab8f5719d186b62c0a1";

const LoginSchema = z.object({
  email: z.string().email("Formato de email inválido"),
  password: z.string().min(1, "A palavra-passe é obrigatória"),
});

const RegisterSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
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

export async function authenticateUser(request: any, reply: any) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      reply.status(401).send({ error: "Não autorizado" });
      return null;
    }
    const token = authHeader.split(" ")[1];
    
    // Attempt 1: Standard JWT verification (fastest & robust for backend tokens)
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return decoded;
    } catch (jwtErr) {
      // Attempt 2: Fallback to Firebase Auth ID Token verification
      const decodedFirebaseToken = await adminAuth.verifyIdToken(token);
      return {
        id: decodedFirebaseToken.uid,
        email: decodedFirebaseToken.email?.toUpperCase(),
        name: decodedFirebaseToken.name || decodedFirebaseToken.email?.split('@')[0],
        role: (decodedFirebaseToken as any).role || "student"
      };
    }
  } catch (err) {
    reply.status(401).send({ error: "Token inválido ou expirado" });
    return null;
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  // Google Authentication Endpoint
  fastify.post("/google", async (request, reply) => {
    try {
      const { idToken, name, email } = request.body as any;
      if (!idToken || !email) {
        return reply.status(400).send({ error: "idToken e email são obrigatórios" });
      }

      let uid = "google-" + crypto.randomUUID();
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        uid = decodedToken.uid;
      } catch (err) {
        console.warn("Aviso ao verificar idToken do Google no Firebase (Modo Dev):", err);
      }

      const normalizedEmail = email.toUpperCase();
      const usersRef = firestore.collection("users");
      let userSnapshot = await usersRef.where("email", "==", normalizedEmail).limit(1).get();

      if (userSnapshot.empty) {
        userSnapshot = await usersRef.where("email", "==", email.toLowerCase()).limit(1).get();
      }
      if (userSnapshot.empty) {
        userSnapshot = await usersRef.where("email", "==", email).limit(1).get();
      }

      let user: any = null;

      if (userSnapshot.empty) {
        // Create user document in Firestore
        const newUser = {
          id: uid,
          name: name || email.split("@")[0],
          email: normalizedEmail,
          password: "",
          role: "student",
          classe: null,
          curso: null,
          subjects: JSON.stringify([]),
          xp: 0,
          streak: 1,
          lastLoginAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        await usersRef.doc(uid).set(newUser);
        user = newUser;
      } else {
        const doc = userSnapshot.docs[0];
        user = doc.data();
        user.id = doc.id;
        
        // Update last login date
        await usersRef.doc(user.id).update({
          lastLoginAt: new Date().toISOString()
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const parsedSubjects = user.subjects ? (typeof user.subjects === 'string' ? JSON.parse(user.subjects) : user.subjects) : [];

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          classe: user.classe,
          curso: user.curso,
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
    if (!rateLimit(request, reply, { maxRequests: 5, windowMs: 60 * 1000 })) {
      return;
    }
    try {
      const { email, password } = LoginSchema.parse(request.body);
      
      const normalizedEmail = email.toUpperCase();
      const usersRef = firestore.collection("users");
      const userSnapshot = await usersRef.where("email", "==", normalizedEmail).limit(1).get();
      
      if (userSnapshot.empty) {
        return reply.status(401).send({ error: "Credenciais inválidas" });
      }

      const userDoc = userSnapshot.docs[0];
      const user = userDoc.data();
      user.id = userDoc.id;

      if (user.password) {
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return reply.status(401).send({ error: "Credenciais inválidas" });
        }
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

      await usersRef.doc(user.id).update({
        lastLoginAt: now.toISOString(),
        streak: newStreak
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const parsedSubjects = user.subjects ? (typeof user.subjects === 'string' ? JSON.parse(user.subjects) : user.subjects) : [];

      return { 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role,
          classe: user.classe,
          curso: user.curso,
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
      const normalizedEmail = email.toUpperCase();
      
      const usersRef = firestore.collection("users");
      const userSnapshot = await usersRef.where("email", "==", normalizedEmail).limit(1).get();
      if (!userSnapshot.empty) {
        return reply.status(400).send({ error: "Email já está em uso" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUserId = crypto.randomUUID();
      
      const newUser = {
        id: newUserId,
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "student",
        classe: null,
        curso: null,
        subjects: JSON.stringify([]),
        xp: 0,
        streak: 0,
        createdAt: new Date().toISOString()
      };

      await usersRef.doc(newUserId).set(newUser);

      const token = jwt.sign(
        { id: newUserId, email: normalizedEmail, role: "student", name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return reply.status(201).send({ 
        token, 
        user: { 
          id: newUserId, 
          email: normalizedEmail, 
          name, 
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

  // Get Me Endpoint
  fastify.get("/me", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const userDoc = await firestore.collection("users").doc(decoded.id).get();
      if (!userDoc.exists) {
        // Try searching by email
        const userSnapshot = await firestore.collection("users").where("email", "==", decoded.email?.toUpperCase()).limit(1).get();
        if (userSnapshot.empty) {
          return reply.status(404).send({ error: "Utilizador não encontrado" });
        }
        const user = userSnapshot.docs[0].data();
        const parsedSubjects = user.subjects ? (typeof user.subjects === 'string' ? JSON.parse(user.subjects) : user.subjects) : [];
        return {
          user: {
            id: userSnapshot.docs[0].id,
            name: user.name,
            email: user.email,
            role: user.role,
            classe: user.classe,
            curso: user.curso,
            subjects: parsedSubjects,
            xp: user.xp || 0,
            streak: user.streak || 0
          }
        };
      }

      const user = userDoc.data()!;
      const parsedSubjects = user.subjects ? (typeof user.subjects === 'string' ? JSON.parse(user.subjects) : user.subjects) : [];

      return {
        user: {
          id: userDoc.id,
          name: user.name,
          email: user.email,
          role: user.role,
          classe: user.classe,
          curso: user.curso,
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

  // Save Profile Endpoint
  fastify.post("/profile", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { classe, curso, subjects } = ProfileSchema.parse(request.body);
      
      const userRef = firestore.collection("users").doc(decoded.id);
      const userDoc = await userRef.get();
      let user: any = null;

      if (!userDoc.exists) {
        const userSnapshot = await firestore.collection("users").where("email", "==", decoded.email?.toUpperCase()).limit(1).get();
        if (userSnapshot.empty) {
          return reply.status(404).send({ error: "Utilizador não encontrado" });
        }
        user = userSnapshot.docs[0].data();
        user.id = userSnapshot.docs[0].id;
      } else {
        user = userDoc.data()!;
        user.id = userDoc.id;
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
          email: user.email,
          role: user.role,
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
}
