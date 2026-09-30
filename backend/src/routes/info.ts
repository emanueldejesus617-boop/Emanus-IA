import { FastifyInstance } from "fastify";
import { EMANUS_STARTUP_INFO } from "../data/emanus-info";
import { firestore } from "../db/db";

export async function infoRoutes(fastify: FastifyInstance) {
  // GET /api/info - Retorna dados institucionais oficiais da startup Emanus e da Emanus IA
  fastify.get("/", async (_request, reply) => {
    try {
      // Tentar obter dados do Firestore/banco local se existir personalização recente
      const doc = await firestore.collection("company_info").doc("emanus").get();
      if (doc && doc.exists) {
        return reply.send({
          success: true,
          data: doc.data(),
        });
      }
    } catch {
      // Fallback gracioso para os dados estáticos
    }

    return reply.send({
      success: true,
      data: EMANUS_STARTUP_INFO,
    });
  });
}
