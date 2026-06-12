import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db/db";
import * as schema from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticateUser } from "./auth";
import { rateLimit } from "../utils/rateLimit";
import { safeParseJSON } from "../utils/jsonSanitizer";

const GenerateExamSchema = z.object({
  subject: z.string()
});

const GradeExamSchema = z.object({
  subject: z.string(),
  correctCount: z.number().min(0).max(5),
  questions: z.array(z.object({
    id: z.number(),
    question: z.string(),
    options: z.array(z.string()),
    correctIndex: z.number(),
    explanation: z.string(),
    selectedOption: z.number().nullable().optional()
  }))
});

export async function examsRoutes(fastify: FastifyInstance) {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  // POST /generate - Generate 5 multiple-choice questions for the Angolan National Exams
  fastify.post("/generate", async (request, reply) => {
    // Apply rate limit (max 5 requests per minute)
    if (!rateLimit(request, reply, { maxRequests: 5, windowMs: 60 * 1000 })) {
      return;
    }

    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { subject } = GenerateExamSchema.parse(request.body);

      // Get user information to personalize difficulty
      const userList = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .limit(1);

      if (userList.length === 0) {
        return reply.status(404).send({ error: "Utilizador não encontrado" });
      }

      const user = userList[0];
      const classe = user.classe || "12.ª Classe";
      const curso = user.curso || "Geral";

      const prompt = `Gere um simulado contendo exatamente 5 questões de escolha múltipla sobre a disciplina de "${subject}" para um estudante angolano da "${classe}" (curso: ${curso}).
As questões devem seguir rigorosamente o padrão e o currículo oficial dos exames nacionais do MINED (Ministério da Educação de Angola).
Retorne OBRIGATORIAMENTE um array JSON contendo objetos com as chaves:
- "id": número de 1 a 5
- "question": string contendo o enunciado da questão
- "options": um array contendo exatamente 4 alternativas de resposta (strings)
- "correctIndex": número de 0 a 3 indicando a opção correta
- "explanation": uma explicação didática do Tutor IA explicando o raciocínio correto.

Retorne APENAS o JSON válido, sem qualquer tipo de formatação markdown, blocos de código ou caracteres adicionais.`;

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
          break;
        } catch (retryErr: any) {
          if (retryErr?.status === 429 && attempt < 2) {
            const waitMs = (attempt + 1) * 5000;
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
      let questions;
      questions = safeParseJSON(text);
      if (!questions) {
        fastify.log.error({ raw: text }, "Failed to parse Gemini response even after sanitization");
        throw new Error("Formato de resposta do simulado inválido.");
      }

      return { questions };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      let errorMsg = "Erro ao gerar as questões do exame";
      if (e.status === 429 || (e.message && e.message.toLowerCase().includes("quota"))) {
        errorMsg = "Limite de quota da API do Gemini excedido. Por favor, tente novamente mais tarde.";
      }
      return reply.status(500).send({ error: errorMsg });
    }
  });

  // POST /grade - Evaluate answers and award XP / Streaks
  fastify.post("/grade", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { subject, correctCount, questions } = GradeExamSchema.parse(request.body);

      const userList = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .limit(1);

      if (userList.length === 0) {
        return reply.status(404).send({ error: "Utilizador não encontrado" });
      }

      const user = userList[0];

      // Calculate XP: 20 XP per correct answer (max 100 XP)
      const xpGained = correctCount * 20;
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      let newStreak = user.streak;

      if (!user.lastLoginAt) {
        newStreak = 1;
      } else {
        const lastLoginDateStr = user.lastLoginAt.split("T")[0];
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

      const updatedXp = user.xp + xpGained;

      // Update user XP & Streak
      await db
        .update(schema.users)
        .set({
          xp: updatedXp,
          streak: newStreak,
          lastLoginAt: now.toISOString()
        })
        .where(eq(schema.users.id, user.id));

      // Save complete exam results to the history table
      await db.insert(schema.examResults).values({
        id: crypto.randomUUID(),
        userId: user.id,
        subject,
        score: correctCount,
        totalQuestions: questions.length || 5,
        questions: JSON.stringify(questions),
        createdAt: now.toISOString()
      });

      return {
        success: true,
        xpGained,
        xpTotal: updatedXp,
        streak: newStreak
      };
    } catch (e) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao processar a nota do exame" });
    }
  });

  // GET /history - Get past exam history for authenticated user
  fastify.get("/history", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const results = await db
        .select()
        .from(schema.examResults)
        .where(eq(schema.examResults.userId, decoded.id))
        .orderBy(desc(schema.examResults.createdAt));
      
      // Parse questions JSON string back to objects
      const parsedResults = results.map(r => ({
        ...r,
        questions: JSON.parse(r.questions)
      }));

      return parsedResults;
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao obter o histórico de exames" });
    }
  });
}
