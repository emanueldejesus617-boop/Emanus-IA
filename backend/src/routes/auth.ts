import { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../db/db";
import { users as usersTable } from "../db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-tutor-ia";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const RegisterSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const ProfileSchema = z.object({
  classe: z.string(),
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
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch (err) {
    reply.status(401).send({ error: "Token inválido ou expirado" });
    return null;
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post("/login", async (request, reply) => {
    try {
      const { email, password } = LoginSchema.parse(request.body);
      
      const normalizedEmail = email.toUpperCase();
      const userList = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
      
      if (userList.length === 0) {
        return reply.status(401).send({ error: "Credenciais inválidas" });
      }

      const user = userList[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return reply.status(401).send({ error: "Credenciais inválidas" });
      }

      // Check and update streak upon login
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      let newStreak = user.streak;
      
      if (user.classe) { // Only sync streak if they have completed onboarding
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

      await db.update(usersTable)
        .set({ lastLoginAt: now.toISOString(), streak: newStreak })
        .where(eq(usersTable.id, user.id));

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const parsedSubjects = user.subjects ? JSON.parse(user.subjects) : [];

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
          xp: user.xp,
          streak: newStreak
        } 
      };
    } catch (e) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro interno no servidor" });
    }
  });

  fastify.post("/register", async (request, reply) => {
    try {
      const { name, email, password } = RegisterSchema.parse(request.body);
      const normalizedEmail = email.toUpperCase();
      
      const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail)).limit(1);
      if (existingUser.length > 0) {
        return reply.status(400).send({ error: "Email já está em uso" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUserId = crypto.randomUUID();
      
      await db.insert(usersTable).values({
        id: newUserId,
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "student",
        xp: 0,
        streak: 0,
        createdAt: new Date().toISOString()
      });

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
    } catch (e) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro interno no servidor" });
    }
  });

  fastify.get("/me", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const userList = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id)).limit(1);
      if (userList.length === 0) {
        return reply.status(404).send({ error: "Utilizador não encontrado" });
      }

      const user = userList[0];
      const parsedSubjects = user.subjects ? JSON.parse(user.subjects) : [];

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          classe: user.classe,
          curso: user.curso,
          subjects: parsedSubjects,
          xp: user.xp,
          streak: user.streak
        }
      };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao buscar dados do utilizador" });
    }
  });

  fastify.post("/profile", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { classe, curso, subjects } = ProfileSchema.parse(request.body);
      
      const userList = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id)).limit(1);
      if (userList.length === 0) {
        return reply.status(404).send({ error: "Utilizador não encontrado" });
      }

      const user = userList[0];
      
      const updatedData = {
        classe,
        curso: curso || null,
        subjects: JSON.stringify(subjects),
        xp: user.xp,
        streak: user.streak,
        lastLoginAt: new Date().toISOString()
      };

      await db.update(usersTable)
        .set(updatedData)
        .where(eq(usersTable.id, user.id));

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          classe,
          curso,
          subjects,
          xp: user.xp,
          streak: user.streak
        }
      };
    } catch (e) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao salvar perfil" });
    }
  });
}

