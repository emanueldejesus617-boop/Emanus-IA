import { FastifyInstance } from "fastify";
import { db } from "../db/db";
import * as schema from "../db/schema";
import { eq, desc, not } from "drizzle-orm";
import { authenticateUser } from "./auth";

export async function adminRoutes(fastify: FastifyInstance) {
  // Middleware helper to authorize admin role
  async function authorizeAdmin(request: any, reply: any) {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return null;

    if (decoded.role !== "admin") {
      reply.status(403).send({ error: "Acesso proibido. Apenas administradores podem aceder a esta rota." });
      return null;
    }
    return decoded;
  }

  // GET /stats - System aggregation statistics
  fastify.get("/stats", async (request, reply) => {
    const admin = await authorizeAdmin(request, reply);
    if (!admin) return;

    try {
      // 1. Total users
      const allUsers = await db.select().from(schema.users);
      const totalStudents = allUsers.filter(u => u.role === "student").length;

      // 2. Average XP (students)
      const students = allUsers.filter(u => u.role === "student");
      const totalXp = students.reduce((acc, curr) => acc + (curr.xp || 0), 0);
      const averageXp = students.length > 0 ? Math.round(totalXp / students.length) : 0;

      // 3. Simulated exams done
      const allExams = await db.select().from(schema.examResults);
      const totalExams = allExams.length;

      // 4. Completed study topics
      const allCompletedTopics = await db.select().from(schema.userCompletedTopics);
      const totalCompletedTopics = allCompletedTopics.length;

      return {
        totalStudents,
        averageXp,
        totalExams,
        totalCompletedTopics
      };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao carregar estatísticas do admin" });
    }
  });

  // GET /users - List of students
  fastify.get("/users", async (request, reply) => {
    const admin = await authorizeAdmin(request, reply);
    if (!admin) return;

    try {
      const students = await db
        .select({
          id: schema.users.id,
          name: schema.users.name,
          email: schema.users.email,
          classe: schema.users.classe,
          curso: schema.users.curso,
          xp: schema.users.xp,
          streak: schema.users.streak,
          createdAt: schema.users.createdAt,
          lastLoginAt: schema.users.lastLoginAt
        })
        .from(schema.users)
        .where(eq(schema.users.role, "student"))
        .orderBy(desc(schema.users.xp));

      return students;
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao obter lista de utilizadores" });
    }
  });
}
