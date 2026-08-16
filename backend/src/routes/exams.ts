import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { firestore } from "../db/db";
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

  // POST /generate - Generate 5 multiple-choice questions ONLY from completed lesson topics
  fastify.post("/generate", async (request, reply) => {
    if (!rateLimit(request, reply, { maxRequests: 5, windowMs: 60 * 1000 })) {
      return;
    }

    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { subject } = GenerateExamSchema.parse(request.body);

      // Fetch user info from Firestore
      const userDoc = await firestore.collection("users").doc(decoded.id).get();
      let user: any = null;

      if (!userDoc.exists) {
        const userSnapshot = await firestore.collection("users").where("email", "==", decoded.email?.toUpperCase()).limit(1).get();
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

      // Fetch completed topics for this user
      const completedTopicsSnapshot = await firestore
        .collection("user_completed_topics")
        .where("userId", "==", user.id)
        .get();

      const completedTopicsRows = completedTopicsSnapshot.docs.map(doc => doc.data());

      const completedForSubject = completedTopicsRows
        .filter((t: any) => t.subject && t.subject.toLowerCase() === subject.toLowerCase())
        .map((t: any) => t.topicName);

      if (completedForSubject.length === 0) {
        return reply.status(400).send({
          error: `Não tens nenhuma aula concluída em ${subject}. Conclui pelo menos uma aula antes de fazer um simulado.`,
          noCompletedLessons: true
        });
      }

      const topicsList = completedForSubject.map((t: string) => `"${t}"`).join(", ");

      const isEnglish = subject.toLowerCase().includes("inglês") || 
                        subject.toLowerCase().includes("ingles") || 
                        subject.toLowerCase().includes("english");

      const prompt = `Gere um simulado contendo exatamente 5 questões de escolha múltipla sobre a disciplina de "${subject}" para um estudante angolano da "${classe}" (curso: ${curso}).

IMPORTANTE: As questões devem ser EXCLUSIVAMENTE sobre os seguintes tópicos que o estudante já estudou e concluiu:
${topicsList}

Não incluas questões sobre tópicos que não estejam nesta lista.
As questões devem seguir rigorosamente o padrão e o currículo oficial dos exames nacionais do MINED (Ministério da Educação de Angola).
${isEnglish ? `Como a disciplina é de Inglês, as perguntas, as opções de resposta e a explicação devem ser escritas obrigatoriamente e inteiramente em inglês (English).` : ''}
Retorne OBRIGATORIAMENTE um array JSON contendo objetos com as chaves:
- "id": número de 1 a 5
- "question": string contendo o enunciado da questão (em ${isEnglish ? 'inglês' : 'português'})
- "options": um array contendo exatamente 4 alternativas de resposta (strings em ${isEnglish ? 'inglês' : 'português'})
- "correctIndex": número de 0 a 3 indicando a opção correta
- "explanation": uma explicação didática da Emanus IA explicando o raciocínio correto (em ${isEnglish ? 'inglês' : 'português'}).

Retorne APENAS o JSON válido, sem qualquer tipo de formatação markdown, blocos de código ou caracteres adicionais.`;

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
      let questions = safeParseJSON(text);
      if (!questions) {
        fastify.log.error({ raw: text }, "Failed to parse Gemini response even after sanitization");
        throw new Error("Formato de resposta do simulado inválido.");
      }

      return { questions, completedTopics: completedForSubject };
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

      const userRef = firestore.collection("users").doc(decoded.id);
      const userDoc = await userRef.get();
      let user: any = null;

      if (!userDoc.exists) {
        const userSnapshot = await firestore.collection("users").where("email", "==", decoded.email?.toUpperCase()).limit(1).get();
        if (userSnapshot.empty) {
          return reply.status(404).send({ error: "Utilizador não encontrado" });
        }
        user = userSnapshot.docs[0].data();
        user.id = userSnapshot.docs[0].id;
      } else {
        user = userDoc.data()!;
        user.id = userDoc.id;
      }

      const xpGained = correctCount * 20;
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      let newStreak = user.streak || 0;

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

      const updatedXp = (user.xp || 0) + xpGained;

      await firestore.collection("users").doc(user.id).update({
        xp: updatedXp,
        streak: newStreak,
        lastLoginAt: now.toISOString()
      });

      const examResultId = crypto.randomUUID();
      await firestore.collection("exam_results").doc(examResultId).set({
        id: examResultId,
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
    } catch (e: any) {
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
      const snapshot = await firestore
        .collection("exam_results")
        .where("userId", "==", decoded.id)
        .get();

      const results = snapshot.docs.map(doc => doc.data() as any);
      results.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      
      const parsedResults = results.map(r => ({
        ...r,
        questions: typeof r.questions === 'string' ? JSON.parse(r.questions) : r.questions
      }));

      return parsedResults;
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao obter o histórico de exames" });
    }
  });
}
