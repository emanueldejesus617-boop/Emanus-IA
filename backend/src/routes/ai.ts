import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db/db";
import * as schema from "../db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { rateLimit } from "../utils/rateLimit";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-tutor-ia";

const ChatSchema = z.object({
  message: z.string(),
  mediaData: z.string().optional(),
  mediaType: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(["user", "model"]),
    parts: z.array(z.object({
      text: z.string().optional(),
      inlineData: z.object({
        mimeType: z.string(),
        data: z.string()
      }).optional()
    }))
  })).optional().default([]),
  classe: z.string().optional(),
  curso: z.string().optional(),
  conversationId: z.string().optional(),
  subject: z.string().optional(),
});

function getSystemInstruction(classe?: string, curso?: string, subject?: string) {
  let instruction = `Você é o TUTOR IA, o melhor professor do mundo${subject ? ` de ${subject}` : ""}.
Você foi treinado especificamente para o currículo do Ministério da Educação de Angola (MINED), mas possui conhecimento enciclopédico de todas as matérias do ensino primário, secundário e superior.`;

  if (classe) {
    instruction += `\n\nO aluno com quem você está interagindo está na ${classe}${curso ? ` (Curso: ${curso})` : ""}. Adapte todas as suas explicações, exemplos, nível de complexidade e linguagem para este perfil de aluno de forma natural.`;
  }

  instruction += `\n\nPERSONALIDADE:
- Paciente, encorajador e nunca condescendente
- Usa exemplos do quotidiano angolano (kwanza, musseques, rio Kwanza, empresas angolanas, figuras históricas angolanas como Agostinho Neto)
- Adapta a linguagem ao nível do aluno (detecta automaticamente)
- Celebra progressos, mesmo pequenos
- Nunca dá a resposta directamente - guia o aluno ao raciocínio
- 
REGRAS DE FORMATAÇÃO E SIMPLICIDADE:
- Suas explicações devem ser extremamente limpas, simples e fáceis de ler para que o aluno aprenda sem distrações.
- NÃO utilize formatação Markdown complexa ou símbolos estranhos.
- NUNCA use hashtags (#) para títulos ou cabeçalhos.
- Evite o uso desnecessário de asteriscos (como ** ou *).
- Use apenas parágrafos curtos, linhas em branco e marcadores simples (como traço ou número) se necessário.`;

  return instruction;
}

export async function aiRoutes(fastify: FastifyInstance) {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  
  fastify.post("/chat", async (request, reply) => {
    // Apply rate limit (max 10 requests per minute)
    if (!rateLimit(request, reply, { maxRequests: 10, windowMs: 60 * 1000 })) {
      return;
    }

    try {
      const { message, mediaData, mediaType, history, classe, curso, conversationId: reqConversationId, subject } = ChatSchema.parse(request.body);

      // Verify JWT for optional authentication
      let userId: string | null = null;
      try {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.split(" ")[1];
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          userId = decoded.id;
        }
      } catch (err) {
        // Proceed as guest if token is invalid or missing
      }

      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');

      let conversationId = reqConversationId;
      
      const displayMessage = message || (mediaType?.startsWith("audio/") ? "Mensagem de voz" : "Imagem enviada");

      // If authenticated and no conversation ID is provided, create a new conversation
      if (userId && !conversationId) {
        conversationId = crypto.randomUUID();
        const title = displayMessage.length > 40 ? displayMessage.slice(0, 40) + "..." : displayMessage;
        await db.insert(schema.conversations).values({
          id: conversationId,
          userId,
          title,
          subject: subject || "Geral",
          createdAt: new Date().toISOString()
        });
        
        // Write the conversation ID to the stream first so the client can save it
        reply.raw.write(`data: ${JSON.stringify({ conversationId })}\n\n`);
      }

      // Save user message to database if authenticated and conversation exists
      if (userId && conversationId) {
        await db.insert(schema.messages).values({
          id: crypto.randomUUID(),
          conversationId,
          role: "user",
          content: message || displayMessage,
          mediaData: mediaData || null,
          mediaType: mediaType || null,
          createdAt: new Date().toISOString()
        });
      }

      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: getSystemInstruction(classe, curso, subject),
      });

      const parts: any[] = [{ text: message || displayMessage }];
      if (mediaData && mediaType) {
        parts.push({
          inlineData: {
            mimeType: mediaType,
            data: mediaData
          }
        });
      }

      let responseStream;
      try {
        responseStream = await model.generateContentStream({
          contents: [
              ...history,
              { role: "user", parts }
          ]
        });
      } catch (err: any) {
        fastify.log.error(err);
        let errorMsg = "Erro interno ao contactar a IA";
        if (err.status === 429 || (err.message && err.message.toLowerCase().includes("quota"))) {
          errorMsg = "Limite de quota da API do Gemini excedido. Por favor, tente novamente mais tarde.";
        }
        reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
        reply.raw.end();
        return;
      }

      let responseText = "";
      try {
        for await (const chunk of responseStream.stream) {
          const chunkText = chunk.text();
          responseText += chunkText;
          reply.raw.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
      } catch (err: any) {
        fastify.log.error(err);
        let errorMsg = "Erro interno ao processar a resposta da IA";
        if (err.status === 429 || (err.message && err.message.toLowerCase().includes("quota"))) {
          errorMsg = "Limite de quota da API do Gemini excedido. Por favor, tente novamente mais tarde.";
        }
        reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
        reply.raw.end();
        return;
      }

      // Save AI message to database if authenticated and conversation exists
      if (userId && conversationId) {
        await db.insert(schema.messages).values({
          id: crypto.randomUUID(),
          conversationId,
          role: "model",
          content: responseText,
          createdAt: new Date().toISOString()
        });
      }

      reply.raw.write('data: [DONE]\n\n');
      reply.raw.end();
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      let errorMsg = "Erro interno ao contactar a IA";
      if (e.status === 429 || (e.message && e.message.toLowerCase().includes("quota"))) {
        errorMsg = "Limite de quota da API do Gemini excedido. Por favor, tente novamente mais tarde.";
      }
      if (!reply.raw.headersSent) {
         return reply.status(500).send(JSON.stringify({ error: errorMsg }));
      } else {
         reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
         reply.raw.end();
      }
    }
  });
}
