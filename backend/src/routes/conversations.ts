import { FastifyInstance } from "fastify";
import { db } from "../db/db";
import * as schema from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticateUser } from "./auth";

export async function conversationsRoutes(fastify: FastifyInstance) {
  // GET / - List all user conversations
  fastify.get("/", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const list = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.userId, decoded.id))
        .orderBy(desc(schema.conversations.createdAt));
      
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
      // Verify conversation owner
      const conversationList = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, id))
        .limit(1);

      if (conversationList.length === 0) {
        return reply.status(404).send({ error: "Conversa não encontrada" });
      }

      if (conversationList[0].userId !== decoded.id) {
        return reply.status(403).send({ error: "Acesso proibido" });
      }

      const list = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, id))
        .orderBy(schema.messages.createdAt);

      // Return messages formatted in the historical shape
      const formatted = list.map((msg) => {
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
      // Verify conversation owner
      const conversationList = await db
        .select()
        .from(schema.conversations)
        .where(eq(schema.conversations.id, id))
        .limit(1);

      if (conversationList.length === 0) {
        return reply.status(404).send({ error: "Conversa não encontrada" });
      }

      if (conversationList[0].userId !== decoded.id) {
        return reply.status(403).send({ error: "Acesso proibido" });
      }

      // Manually cascade delete to ensure safety across SQLite instances
      await db.delete(schema.messages).where(eq(schema.messages.conversationId, id));
      await db.delete(schema.conversations).where(eq(schema.conversations.id, id));

      return { success: true };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao eliminar conversa" });
    }
  });
}
