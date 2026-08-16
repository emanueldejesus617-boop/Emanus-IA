import { FastifyInstance } from "fastify";
import { firestore } from "../db/db";
import { authenticateUser } from "./auth";

export async function conversationsRoutes(fastify: FastifyInstance) {
  // GET / - List all user conversations
  fastify.get("/", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const snapshot = await firestore
        .collection("conversations")
        .where("userId", "==", decoded.id)
        .get();
      
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by createdAt descending
      list.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      
      return list;
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao buscar conversas" });
    }
  });

  // GET /:id/messages - Get messages for a specific conversation
  fastify.get("/:id/messages", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    const { id } = request.params as { id: string };

    try {
      const convDoc = await firestore.collection("conversations").doc(id).get();

      if (!convDoc.exists) {
        return reply.status(404).send({ error: "Conversa não encontrada" });
      }

      const convData = convDoc.data()!;
      if (convData.userId !== decoded.id) {
        return reply.status(403).send({ error: "Acesso proibido" });
      }

      const snapshot = await firestore
        .collection("messages")
        .where("conversationId", "==", id)
        .get();

      const msgList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      msgList.sort((a: any, b: any) => (a.createdAt || "").localeCompare(b.createdAt || ""));

      const formatted = msgList.map((msg: any) => {
        const parts: any[] = [{ text: msg.content }];
        if (msg.mediaData && msg.mediaType) {
          parts.push({
            inlineData: {
              mimeType: msg.mediaType,
              data: msg.mediaData
            }
          });
        }
        return {
          role: msg.role as "user" | "model",
          parts
        };
      });

      return formatted;
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao buscar mensagens" });
    }
  });

  // DELETE /:id - Delete conversation and its messages
  fastify.delete("/:id", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    const { id } = request.params as { id: string };

    try {
      const convDoc = await firestore.collection("conversations").doc(id).get();

      if (!convDoc.exists) {
        return reply.status(404).send({ error: "Conversa não encontrada" });
      }

      if (convDoc.data()!.userId !== decoded.id) {
        return reply.status(403).send({ error: "Acesso proibido" });
      }

      // Delete conversation doc
      await firestore.collection("conversations").doc(id).delete();

      // Batch delete associated messages
      const msgSnapshot = await firestore
        .collection("messages")
        .where("conversationId", "==", id)
        .get();

      const batch = firestore.batch();
      msgSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      return { success: true };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao eliminar conversa" });
    }
  });
}
