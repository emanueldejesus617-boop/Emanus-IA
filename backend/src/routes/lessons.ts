import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db/db";
import * as schema from "../db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateUser } from "./auth";
import { rateLimit } from "../utils/rateLimit";
import { safeParseJSON } from "../utils/jsonSanitizer";

const CompleteTopicSchema = z.object({
  subject: z.string(),
  topicName: z.string()
});

const GenerateLessonSchema = z.object({
  subject: z.string(),
  topicName: z.string(),
  classe: z.string().optional(),
  curso: z.string().optional()
});

export async function lessonsRoutes(fastify: FastifyInstance) {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  // GET /progress - Get all completed topics for authenticated user
  fastify.get("/progress", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const progress = await db
        .select()
        .from(schema.userCompletedTopics)
        .where(eq(schema.userCompletedTopics.userId, decoded.id));

      return progress;
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao obter progresso de aulas" });
    }
  });

  // POST /complete - Mark a topic as completed and award XP
  fastify.post("/complete", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { subject, topicName } = CompleteTopicSchema.parse(request.body);

      // Check if topic is already completed by this user to prevent double scoring
      const existing = await db
        .select()
        .from(schema.userCompletedTopics)
        .where(
          and(
            eq(schema.userCompletedTopics.userId, decoded.id),
            eq(schema.userCompletedTopics.subject, subject),
            eq(schema.userCompletedTopics.topicName, topicName)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: true, message: "Tópico já concluído anteriormente." };
      }

      const userList = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .limit(1);

      if (userList.length === 0) {
        return reply.status(404).send({ error: "Utilizador não encontrado" });
      }

      const user = userList[0];
      const xpGained = 30; // 30 XP for completing a curriculum topic
      const updatedXp = user.xp + xpGained;

      // Update user XP
      await db
        .update(schema.users)
        .set({ xp: updatedXp })
        .where(eq(schema.users.id, user.id));

      // Save completion
      await db.insert(schema.userCompletedTopics).values({
        id: crypto.randomUUID(),
        userId: user.id,
        subject,
        topicName,
        completedAt: new Date().toISOString()
      });

      return {
        success: true,
        xpGained,
        xpTotal: updatedXp
      };
    } catch (e) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao concluir tópico de estudo" });
    }
  });

  // POST /generate-lesson - Use Gemini to generate a lesson content and 1 question
  fastify.post("/generate-lesson", async (request, reply) => {
    // Apply rate limit (max 8 requests per minute)
    if (!rateLimit(request, reply, { maxRequests: 8, windowMs: 60 * 1000 })) {
      return;
    }

    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { subject, topicName, classe, curso } = GenerateLessonSchema.parse(request.body);

      const targetClasse = classe || "12.ª Classe";
      const targetCurso = curso || "Geral";

      const prompt = `Gere uma mini-aula e um exercício de fixação sobre o tópico "${topicName}" da disciplina de "${subject}" direcionada a um aluno da "${targetClasse}" (Curso: ${targetCurso}) em Angola.
A aula deve conter explicações limpas, claras e exemplos fáceis voltados à realidade angolana.

Retorne OBRIGATORIAMENTE um objeto JSON contendo exatamente as seguintes chaves:
- "content": String contendo o texto explicativo da aula em formato Markdown limpo (use parágrafos curtos, tópicos e negrito básico. NÃO use hashtags # para títulos).
- "question": Um objeto contendo o exercício com as chaves:
  - "question": String contendo o enunciado da questão.
  - "options": Um array contendo exatamente 4 alternativas de resposta (strings).
  - "correctIndex": Número de 0 a 3 correspondente à opção correta.
  - "explanation": Explicação didática do Tutor IA sobre a resposta certa.

Retorne APENAS o JSON válido, sem qualquer tipo de formatação markdown no bloco de código externo.`;

      const model = ai.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
          responseMimeType: "application/json"
        }
      });

      // Retry logic for transient rate limit (429) errors
      let response;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await model.generateContent(prompt);
          break; // success
        } catch (retryErr: any) {
          if (retryErr?.status === 429 && attempt < 2) {
            const waitMs = (attempt + 1) * 5000; // 5s, 10s
            fastify.log.warn(`Rate limited (attempt ${attempt + 1}), retrying in ${waitMs}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
            continue;
          }
          throw retryErr;
        }
      }
      if (!response) {
        throw new Error('Failed to get response from AI after retries');
      }
      let text = response.response.text().trim();
      let lessonData;

      // Ensure we have content
      if (!text) {
        fastify.log.warn('Empty response from Gemini model');
        lessonData = {
          content: 'Conteúdo da aula não pôde ser gerado no momento.',
          question: {
            question: 'Pergunta de exemplo',
            options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
            correctIndex: 0,
            explanation: 'Esta é uma explicação padrão.'
          }
        };
      } else {
        // Use robust JSON sanitizer to handle Gemini's malformed output
        lessonData = safeParseJSON(text);
        if (!lessonData) {
          fastify.log.warn({ raw: text }, 'Failed to parse Gemini response even after sanitization');
        }
      }

      // If still no lessonData, provide a fallback placeholder
      if (!lessonData) {
        fastify.log.warn('Returning placeholder lesson data due to parsing issues');
        lessonData = {
          content: 'Conteúdo da aula não pôde ser gerado no momento.',
          question: {
            question: 'Pergunta de exemplo',
            options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
            correctIndex: 0,
            explanation: 'Esta é uma explicação padrão.'
          }
        };
      }
      return lessonData;
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: e.errors });
      }
      fastify.log.error(e);
      let errorMsg = 'Erro ao gerar conteúdo da aula';
      if (e.status === 429 || (e.message && e.message.toLowerCase().includes("quota"))) {
        errorMsg = "Limite de quota da API do Gemini excedido. Por favor, tente novamente mais tarde.";
      }
      return reply.status(500).send({ error: errorMsg });
    }
  });
}
