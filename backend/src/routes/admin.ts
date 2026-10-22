import { FastifyInstance } from "fastify";
import { z } from "zod";
import { firestore } from "../db/db";
import { authenticateUser } from "./auth";

export async function adminRoutes(fastify: FastifyInstance) {
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
      const usersSnapshot = await firestore.collection("users").get();
      const allUsers = usersSnapshot.docs.map(doc => doc.data() as any);
      
      const students = allUsers.filter(u => u.role === "student");
      const totalStudents = students.length;

      const totalXp = students.reduce((acc, curr) => acc + (curr.xp || 0), 0);
      const averageXp = students.length > 0 ? Math.round(totalXp / students.length) : 0;

      const examsSnapshot = await firestore.collection("exam_results").get();
      const totalExams = examsSnapshot.size;

      const completedTopicsSnapshot = await firestore.collection("user_completed_topics").get();
      const totalCompletedTopics = completedTopicsSnapshot.size;

      // Count unresolved error reports
      const errorsSnapshot = await firestore.collection("error_reports").where("resolved", "==", false).get();
      const unresolvedErrors = errorsSnapshot.size;

      return {
        totalStudents,
        averageXp,
        totalExams,
        totalCompletedTopics,
        unresolvedErrors
      };
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao carregar estatísticas do admin" });
    }
  });

  // GET /users - List of students
  fastify.get("/users", async (request, reply) => {
    const admin = await authorizeAdmin(request, reply);
    if (!admin) return;

    try {
      const snapshot = await firestore
        .collection("users")
        .where("role", "==", "student")
        .get();

      const students = snapshot.docs.map(doc => {
        const u = doc.data() as any;
        return {
          id: doc.id,
          name: u.name,
          email: u.email,
          classe: u.classe,
          curso: u.curso,
          xp: u.xp || 0,
          streak: u.streak || 0,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt
        };
      });

      students.sort((a, b) => (b.xp || 0) - (a.xp || 0));

      return students;
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao obter lista de utilizadores" });
    }
  });

  // GET /errors - List error reports for admin
  fastify.get("/errors", async (request, reply) => {
    const admin = await authorizeAdmin(request, reply);
    if (!admin) return;

    try {
      const { resolved } = z.object({
        resolved: z.enum(["true", "false", "all"]).default("false")
      }).parse(request.query);

      let query: any = firestore.collection("error_reports");
      if (resolved !== "all") {
        query = query.where("resolved", "==", resolved === "true");
      }

      const snapshot = await query.get();
      const errors = snapshot.docs.map((doc: any) => doc.data() as any);
      errors.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      return errors;
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao carregar relatórios de erros" });
    }
  });

  // PATCH /errors/:id/resolve - Mark an error report as resolved
  fastify.patch("/errors/:id/resolve", async (request, reply) => {
    const admin = await authorizeAdmin(request, reply);
    if (!admin) return;

    try {
      const { id } = z.object({ id: z.string() }).parse(request.params);
      await firestore.collection("error_reports").doc(id).update({
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy: admin.email || admin.id
      });
      return { success: true };
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao marcar como resolvido" });
    }
  });

  // POST /errors/report - Allow any user to report an error or bug
  fastify.post("/errors/report", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { action, error, details } = z.object({
        action: z.string().max(200),
        error: z.string().max(2000),
        details: z.any().optional()
      }).parse(request.body);

      const errorId = crypto.randomUUID();
      await firestore.collection("error_reports").doc(errorId).set({
        id: errorId,
        userId: decoded.id,
        userEmail: decoded.email || null,
        action,
        error,
        details: details ? JSON.stringify(details) : null,
        createdAt: new Date().toISOString(),
        resolved: false,
        reportedByUser: true
      });

      return { success: true, id: errorId };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao submeter relatório" });
    }
  });
}
