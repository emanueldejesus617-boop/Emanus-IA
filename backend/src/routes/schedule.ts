import { FastifyInstance } from "fastify";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db/db";
import * as schema from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticateUser } from "./auth";
import { safeParseJSON } from "../utils/jsonSanitizer";

export async function scheduleRoutes(fastify: FastifyInstance) {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  // POST /generate - Generate a customized study schedule with AI
  fastify.post("/generate", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
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
      const subjects = user.subjects ? JSON.parse(user.subjects) : ["Língua Portuguesa", "Matemática", "Inglês", "Educação Física"];

      const prompt = `Crie um plano de estudos semanal personalizado (segunda a sexta-feira) para um estudante angolano da ${classe} do curso ${curso}.
As disciplinas que o estudante deve focar são: ${subjects.join(", ")}.
Você deve retornar OBRIGATORIAMENTE um array JSON contendo exatamente 3 blocos de horários diários (manhã/tarde/noite conforme apropriado), com as seguintes chaves para cada objeto do array:
- "time" (ex: "08:00 - 09:30")
- "monday" (disciplina e tópico)
- "tuesday" (disciplina e tópico)
- "wednesday" (disciplina e tópico)
- "thursday" (disciplina e tópico)
- "friday" (disciplina e tópico)

Cada dia deve ter um tópico prático relacionado ao currículo do MINED de Angola (ex: "Matemática (Derivadas)", "História (Independência)", "Física (Mecânica)").
Retorne APENAS o JSON válido sem formatação markdown ou blocos de código adicionais.`;

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
      let weekData;
      weekData = safeParseJSON(text);
      if (!weekData) {
        fastify.log.error({ raw: text }, "Failed to parse Gemini response even after sanitization");
        throw new Error("Formato de resposta do horário inválido.");
      }

      // Check if user has an existing study plan
      const existing = await db
        .select()
        .from(schema.studyPlans)
        .where(eq(schema.studyPlans.userId, decoded.id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(schema.studyPlans)
          .set({
            weekData: JSON.stringify(weekData),
            createdAt: new Date().toISOString()
          })
          .where(eq(schema.studyPlans.userId, decoded.id));
      } else {
        await db.insert(schema.studyPlans).values({
          id: crypto.randomUUID(),
          userId: decoded.id,
          weekData: JSON.stringify(weekData),
          createdAt: new Date().toISOString()
        });
      }

      return { weekData };
    } catch (e: any) {
      fastify.log.error(e);
      let errorMsg = "Erro ao gerar o horário inteligente";
      if (e.status === 429 || (e.message && e.message.toLowerCase().includes("quota"))) {
        errorMsg = "Limite de quota da API do Gemini excedido. Por favor, tente novamente mais tarde.";
      }
      return reply.status(500).send({ error: errorMsg });
    }
  });

  // GET /current - Fetch existing study schedule
  fastify.get("/current", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const list = await db
        .select()
        .from(schema.studyPlans)
        .where(eq(schema.studyPlans.userId, decoded.id))
        .orderBy(desc(schema.studyPlans.createdAt))
        .limit(1);

      if (list.length === 0) {
        return { weekData: null };
      }

      return { weekData: JSON.parse(list[0].weekData) };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao buscar o horário atual" });
    }
  });
}
