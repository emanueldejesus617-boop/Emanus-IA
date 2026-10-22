import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { firestore } from "../db/db";
import { authenticateUser } from "./auth";
import { rateLimit } from "../utils/rateLimit";
import { safeParseJSON } from "../utils/jsonSanitizer";
import { getCurriculumForSubject } from "../data/mined-curriculum";
import { checkAndIncrementLimit, reportErrorToAdmin } from "../utils/dailyLimits";

const withSafeTimeout = <T>(promise: Promise<T>, ms = 22000): Promise<T> => {
  let timer: any;
  return Promise.race([
    promise.finally(() => { if (timer) clearTimeout(timer); }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timeout Gemini")), ms);
    })
  ]);
};

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

      // ── Daily exam limit: 1 simulado per day per user (skip for admins) ──
      if (decoded.role !== "admin") {
        const limitResult = await checkAndIncrementLimit(decoded.id, "exam", 1);
        if (!limitResult.allowed) {
          const resetDate = limitResult.resetAt
            ? new Date(limitResult.resetAt).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })
            : "meia-noite";
          return reply.status(429).send({
            error: `Limite diário atingido. Já realizaste o teu simulado de hoje. Podes fazer um novo depois das ${resetDate}. 🎯`,
            limitReached: true,
            resetAt: limitResult.resetAt,
          });
        }
      }

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

      let activeTopics = completedForSubject;
      let isDiagnostic = false;
      if (activeTopics.length === 0) {
        isDiagnostic = true;
        const official = getCurriculumForSubject(subject) || [];
        activeTopics = official.length > 0 ? official.slice(0, 5) : ["Fundamentos e Conceitos Centrais", "Aplicações Práticas", "Exercícios de Fixação"];
      }

      const topicsList = activeTopics.map((t: string) => `"${t}"`).join(", ");

      const isEnglish = subject.toLowerCase().includes("inglês") || 
                        subject.toLowerCase().includes("ingles") || 
                        subject.toLowerCase().includes("english");

      const prompt = `Gere um simulado contendo exatamente 5 questões de escolha múltipla sobre a disciplina de "${subject}" para um estudante angolano da "${classe}" (curso: ${curso}).

${isDiagnostic 
  ? `Este é um simulado geral/diagnóstico baseado nos seguintes tópicos fundamentais do currículo oficial do MINED:` 
  : `As questões devem ser focadas nos tópicos concluídos pelo estudante:`}
${topicsList}

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

      let questions: any = null;
      try {
        let response;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            response = await withSafeTimeout(model.generateContent(prompt), 22000);
            break;
          } catch (retryErr: any) {
            if (retryErr?.status === 429 && attempt < 1) {
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue;
            }
            throw retryErr;
          }
        }
        if (response) {
          const text = response.response.text().trim();
          questions = safeParseJSON(text);
        }
      } catch (aiErr: any) {
        fastify.log.warn({ aiErr }, "Aviso na geração de simulado via IA, a aplicar banco curricular estruturado");
      }

      // Fallback robusto se a IA falhar ou demorar
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        questions = activeTopics.slice(0, 5).map((topic: string, idx: number) => ({
          id: idx + 1,
          question: `De acordo com o programa de ${subject} (${classe}), qual é o conceito central abordado no tópico "${topic}"?`,
          options: [
            `Aplicação prática e resolução fundamentada de problemas`,
            `Memorização isolada de fórmulas sem contextualização`,
            `Inexistência de ligação prática no quotidiano`,
            `Substituição total da teoria sem demonstração`
          ],
          correctIndex: 0,
          explanation: `No âmbito de ${subject}, o tópico "${topic}" exige sólida fundamentação teórica orientada para a resolução prática e análise crítica contextualizada.`
        }));
      }

      return { questions, completedTopics: activeTopics, isDiagnostic };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      let errorMsg = "Erro ao gerar as questões do exame";
      if (e.status === 429 || (e.message && e.message.toLowerCase().includes("quota"))) {
        errorMsg = "Limite de quota da API do Gemini excedido. Por favor, tente novamente mais tarde.";
      }
      // Report to admin
      try {
        await reportErrorToAdmin({
          userId: decoded?.id,
          userEmail: decoded?.email,
          action: "generate-exam",
          error: errorMsg,
          details: { message: e.message, status: e.status }
        });
      } catch (_) {}
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
