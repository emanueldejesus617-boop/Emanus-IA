import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { firestore } from "../db/db";
import { authenticateUser } from "./auth";
import { safeParseJSON } from "../utils/jsonSanitizer";
import { rateLimit } from "../utils/rateLimit";

const GenerateScheduleSchema = z.object({
  shift: z.enum(["morning", "afternoon", "night"]).default("morning").optional()
});

const SlotItemSchema = z.object({
  time: z.string().min(1),
  monday: z.string().optional().default(""),
  tuesday: z.string().optional().default(""),
  wednesday: z.string().optional().default(""),
  thursday: z.string().optional().default(""),
  friday: z.string().optional().default(""),
  saturday: z.string().optional().default(""),
  sunday: z.string().optional().default("")
});

const UpdateScheduleSchema = z.object({
  weekData: z.array(SlotItemSchema).min(1, "O horário deve conter pelo menos um bloco de estudo.")
});

export async function scheduleRoutes(fastify: FastifyInstance) {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  // POST /generate - Generate a customized study schedule with AI
  fastify.post("/generate", async (request, reply) => {
    if (!rateLimit(request, reply, { maxRequests: 5, windowMs: 60 * 1000 })) {
      return;
    }

    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { shift: rawShift } = GenerateScheduleSchema.parse(request.body || {});
      const shift = rawShift || "morning";

      const userRef = firestore.collection("users").doc(decoded.id);
      const userDoc = await userRef.get();
      let user: any = null;

      if (!userDoc.exists) {
        const userSnapshot = await firestore.collection("users").where("email", "==", decoded.email?.toLowerCase()).limit(1).get();
        if (userSnapshot.empty) {
          return reply.status(404).send({ error: "Utilizador não encontrado" });
        }
        user = userSnapshot.docs[0].data();
        user.id = userSnapshot.docs[0].id;
      } else {
        user = userDoc.data()!;
        user.id = userDoc.id;
      }

      const classe = user.classe || "12.ª Classe";
      const curso = user.curso || "Geral";
      const subjects = user.subjects ? (typeof user.subjects === 'string' ? JSON.parse(user.subjects) : user.subjects) : ["Língua Portuguesa", "Matemática", "Inglês", "Educação Física"];

      const shiftTimeMap: Record<string, { label: string; slots: string[] }> = {
        morning: {
          label: "manhã (07:00 - 12:30)",
          slots: ["14:00 - 15:30", "16:00 - 17:30", "19:00 - 20:30"]
        },
        afternoon: {
          label: "tarde (13:00 - 18:00)",
          slots: ["06:00 - 07:30", "08:00 - 09:30", "19:30 - 21:00"]
        },
        night: {
          label: "noite (18:30 - 23:00)",
          slots: ["07:00 - 08:30", "10:00 - 11:30", "14:00 - 15:30"]
        }
      };

      const shiftInfo = shiftTimeMap[shift] || shiftTimeMap.morning;
      const freeSlots = shiftInfo.slots;

      const prompt = `Crie um plano de estudos semanal personalizado (segunda-feira a domingo) para um estudante angolano da ${classe} do curso ${curso}.
O estudante frequenta a escola no turno da ${shiftInfo.label}, portanto o horário de estudos deve ser agendado APENAS nos horários livres fora do turno escolar.
Os horários livres disponíveis são: ${freeSlots.join(", ")}.
As disciplinas que o estudante deve focar são: ${subjects.join(", ")}.
Você deve retornar OBRIGATORIAMENTE um array JSON contendo exatamente ${freeSlots.length} blocos de horários usando EXATAMENTE estes horários livres, com as seguintes chaves para cada objeto do array:
- "time" (use EXATAMENTE um dos seguintes: ${freeSlots.map(s => `"${s}"`).join(", ")})
- "monday" (disciplina e tópico)
- "tuesday" (disciplina e tópico)
- "wednesday" (disciplina e tópico)
- "thursday" (disciplina e tópico)
- "friday" (disciplina e tópico)
- "saturday" (disciplina e tópico, ou "Revisão Livre" se o estudante precisar de descanso)
- "sunday" (disciplina e tópico, ou "Descanso" para recuperação)

Cada dia deve ter um tópico prático relacionado ao currículo do MINED de Angola (ex: "Matemática (Derivadas)", "História (Independência)", "Física (Mecânica)").
Distribua as disciplinas de forma equilibrada ao longo da semana. Ao fim de semana use tópicos de revisão ou prática leve.
Retorne APENAS o JSON válido sem formatação markdown ou blocos de código adicionais.`;

      const model = ai.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json"
        }
      });

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
      let weekData = safeParseJSON(text);
      if (!weekData) {
        fastify.log.error({ raw: text }, "Failed to parse Gemini response even after sanitization");
        throw new Error("Formato de resposta do horário inválido.");
      }

      const snapshot = await firestore
        .collection("study_plans")
        .where("userId", "==", user.id)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await firestore.collection("study_plans").doc(docId).update({
          weekData: JSON.stringify(weekData),
          createdAt: new Date().toISOString()
        });
      } else {
        const planId = crypto.randomUUID();
        await firestore.collection("study_plans").doc(planId).set({
          id: planId,
          userId: user.id,
          weekData: JSON.stringify(weekData),
          createdAt: new Date().toISOString()
        });
      }

      return { weekData };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Parâmetros inválidos", details: e.errors });
      }
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
      const snapshot = await firestore
        .collection("study_plans")
        .where("userId", "==", decoded.id)
        .get();

      if (snapshot.empty) {
        return { weekData: null };
      }

      const docs = snapshot.docs.map(doc => doc.data() as any);
      docs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      const plan = docs[0];

      const weekData = typeof plan.weekData === 'string' ? JSON.parse(plan.weekData) : plan.weekData;
      return { weekData };
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao buscar o horário atual" });
    }
  });

  // PUT /update - Save manually edited schedule
  fastify.put("/update", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { weekData } = UpdateScheduleSchema.parse(request.body);

      const snapshot = await firestore
        .collection("study_plans")
        .where("userId", "==", decoded.id)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await firestore.collection("study_plans").doc(docId).update({
          weekData: JSON.stringify(weekData)
        });
      } else {
        const planId = crypto.randomUUID();
        await firestore.collection("study_plans").doc(planId).set({
          id: planId,
          userId: decoded.id,
          weekData: JSON.stringify(weekData),
          createdAt: new Date().toISOString()
        });
      }

      return { success: true, weekData };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMsg = e.errors[0]?.message || "Dados de horário inválidos";
        return reply.status(400).send({ error: errorMsg, details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao guardar o horário editado." });
    }
  });
}
