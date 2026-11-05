import { FastifyInstance } from "fastify";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { firestore, adminAuth } from "../db/db";
import { authenticateUser } from "./auth";

/**
 * Coletor abrangente e resiliente de utilizadores registrados.
 * Combina Firestore remoto, Firebase Authentication e base de dados local persistente
 * para garantir que absolutamente nenhuma conta em uso seja omitida do painel.
 */
async function fetchAllDatabaseUsers(): Promise<any[]> {
  const usersMap = new Map<string, any>();

  // 1. Obter do Firestore / Hybrid store
  try {
    const snapshot = await firestore.collection("users").get();
    if (snapshot && snapshot.docs) {
      snapshot.docs.forEach((doc: any) => {
        const u = doc.data() as any;
        const id = doc.id || u.id;
        const email = (u.email || "").trim();
        const emailKey = (email || id).toLowerCase();
        const isAdmin = email.toLowerCase() === "emanueldejesus617@gmail.com" || u.role === "admin";

        usersMap.set(emailKey, {
          id,
          name: u.name || u.displayName || "Sem nome",
          email: u.email || "",
          role: isAdmin ? "admin" : (u.role || "student"),
          classe: u.classe || null,
          curso: u.curso || null,
          xp: u.xp || 0,
          streak: u.streak || 0,
          createdAt: u.createdAt || new Date().toISOString(),
          lastLoginAt: u.lastLoginAt || null
        });
      });
    }
  } catch (err: any) {
    console.warn("Aviso ao ler coleção users:", err.message);
  }

  // 2. Obter do Firebase Authentication (contas registadas por Google ou email/senha)
  try {
    if (adminAuth && typeof adminAuth.listUsers === "function") {
      const fbUsers = await adminAuth.listUsers(1000).catch(() => null);
      if (fbUsers && fbUsers.users) {
        fbUsers.users.forEach((u: any) => {
          const email = (u.email || "").trim();
          if (!email) return;
          const emailKey = email.toLowerCase();
          const existing = usersMap.get(emailKey);
          const isAdmin = emailKey === "emanueldejesus617@gmail.com" || u.customClaims?.role === "admin";

          if (!existing) {
            usersMap.set(emailKey, {
              id: u.uid,
              name: u.displayName || email.split("@")[0] || "Sem nome",
              email: u.email,
              role: isAdmin ? "admin" : "student",
              classe: null,
              curso: null,
              xp: isAdmin ? 100 : 0,
              streak: 0,
              createdAt: u.metadata?.creationTime || new Date().toISOString(),
              lastLoginAt: u.metadata?.lastSignInTime || null
            });
          } else if (isAdmin) {
            existing.role = "admin";
          }
        });
      }
    }
  } catch (fbAuthErr: any) {
    // Silencioso em caso de token expirado ou sem internet
  }

  // 3. Fallback e sincronização a partir de ficheiros locais db_local.json
  const candidateFiles = [
    path.resolve(process.cwd(), "frontend/src/backend/data/db_local.json"),
    path.resolve(process.cwd(), "frontend/data/db_local.json"),
    path.resolve(process.cwd(), "backend/data/db_local.json"),
    path.resolve(process.cwd(), "data/db_local.json"),
    path.resolve(__dirname, "../../data/db_local.json")
  ];

  for (const fp of candidateFiles) {
    try {
      if (fs.existsSync(fp)) {
        const raw = fs.readFileSync(fp, "utf-8");
        const json = JSON.parse(raw);
        if (json.users && typeof json.users === "object") {
          Object.entries(json.users).forEach(([id, u]: [string, any]) => {
            const email = (u.email || "").trim();
            const emailKey = (email || id).toLowerCase();
            const existing = usersMap.get(emailKey);
            const isAdmin = email.toLowerCase() === "emanueldejesus617@gmail.com" || u.role === "admin";

            if (!existing) {
              usersMap.set(emailKey, {
                id,
                name: u.name || u.displayName || "Sem nome",
                email: u.email || "",
                role: isAdmin ? "admin" : (u.role || "student"),
                classe: u.classe || null,
                curso: u.curso || null,
                xp: u.xp || 0,
                streak: u.streak || 0,
                createdAt: u.createdAt || new Date().toISOString(),
                lastLoginAt: u.lastLoginAt || null
              });
            } else {
              if (!existing.classe && u.classe) existing.classe = u.classe;
              if (!existing.curso && u.curso) existing.curso = u.curso;
              if (isAdmin) existing.role = "admin";
            }
          });
        }
      }
    } catch {}
  }

  const list = Array.from(usersMap.values());
  // Ordenar: primeiro administradores, depois alunos por XP decrescente
  list.sort((a, b) => {
    if (a.role === "admin" && b.role !== "admin") return -1;
    if (b.role === "admin" && a.role !== "admin") return 1;
    return (b.xp || 0) - (a.xp || 0);
  });

  return list;
}

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

  // GET /stats - Estatísticas consolidadas de todas as contas
  fastify.get("/stats", async (request, reply) => {
    const admin = await authorizeAdmin(request, reply);
    if (!admin) return;

    try {
      const allUsers = await fetchAllDatabaseUsers();

      const totalUsers = allUsers.length;
      const students = allUsers.filter((u: any) => u.role !== "admin");
      const totalStudents = students.length;
      const totalAdmins = allUsers.filter((u: any) => u.role === "admin").length;

      const totalXp = students.reduce((acc: number, curr: any) => acc + (curr.xp || 0), 0);
      const averageXp = students.length > 0 ? Math.round(totalXp / students.length) : 0;

      const examsSnapshot = await firestore.collection("exam_results").get();
      const totalExams = examsSnapshot.size;

      const completedTopicsSnapshot = await firestore.collection("user_completed_topics").get();
      const totalCompletedTopics = completedTopicsSnapshot.size;

      // Relatórios de erro não resolvidos
      const errorsSnapshot = await firestore.collection("error_reports").where("resolved", "==", false).get();
      const unresolvedErrors = errorsSnapshot.size;

      return {
        totalUsers,
        totalStudents,
        totalAdmins,
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

  // GET /users - Todas as contas registadas na base de dados (sem omissões)
  fastify.get("/users", async (request, reply) => {
    const admin = await authorizeAdmin(request, reply);
    if (!admin) return;

    try {
      const allUsers = await fetchAllDatabaseUsers();
      return allUsers;
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao obter lista de utilizadores" });
    }
  });

  // DELETE /users/:id - Excluir conta de utilizador
  fastify.delete("/users/:id", async (request, reply) => {
    const admin = await authorizeAdmin(request, reply);
    if (!admin) return;

    try {
      const { id } = z.object({ id: z.string() }).parse(request.params);

      // Proteção: não permitir excluir conta de admin
      const userDoc = await firestore.collection("users").doc(id).get();
      if (userDoc.exists) {
        const userData = userDoc.data() as any;
        if (userData?.email === "emanueldejesus617@gmail.com" || userData?.role === "admin") {
          return reply.status(400).send({ error: "Não é permitido excluir a conta de administrador." });
        }
      }

      // 1. Elimina da coleção de utilizadores
      await firestore.collection("users").doc(id).delete();

      // 2. Tenta eliminar do Firebase Authentication
      await adminAuth.deleteUser(id).catch(() => {});

      return { success: true, message: "Conta excluída com sucesso." };
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao excluir conta." });
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
