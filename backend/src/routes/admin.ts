import { FastifyInstance } from "fastify";
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

      return {
        totalStudents,
        averageXp,
        totalExams,
        totalCompletedTopics
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
}
