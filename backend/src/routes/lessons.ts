import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { firestore } from "../db/db";
import { authenticateUser } from "./auth";
import { rateLimit } from "../utils/rateLimit";
import { safeParseJSON } from "../utils/jsonSanitizer";
import { validateTopics, getCurriculumForSubject } from "../data/mined-curriculum";

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

const SaveProgramSchema = z.object({
  subject: z.string(),
  topics: z.array(z.string())
});

export async function lessonsRoutes(fastify: FastifyInstance) {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  // GET /programs - Get all quarterly programs for authenticated user
  fastify.get("/programs", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const snapshot = await firestore
        .collection("quarterly_programs")
        .where("userId", "==", decoded.id)
        .get();

      const formattedPrograms = snapshot.docs.map((doc) => {
        const p = doc.data() as any;
        let parsedTopics: string[] = [];
        try {
          parsedTopics = typeof p.topics === 'string' ? JSON.parse(p.topics) : (p.topics || []);
        } catch (err) {
          parsedTopics = [];
        }
        return {
          id: doc.id,
          subject: p.subject,
          topics: parsedTopics,
          createdAt: p.createdAt,
        };
      });

      return formattedPrograms;
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao obter programas trimestrais" });
    }
  });

  // POST /programs - Save or update quarterly program for a subject
  fastify.post("/programs", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { subject, topics } = SaveProgramSchema.parse(request.body);

      const { valid, invalid } = validateTopics(subject, topics);

      if (invalid.length > 0) {
        return reply.status(400).send({
          error: "Alguns temas não existem no programa oficial do MINED.",
          invalidTopics: invalid
        });
      }

      const snapshot = await firestore
        .collection("quarterly_programs")
        .where("userId", "==", decoded.id)
        .where("subject", "==", subject)
        .limit(1)
        .get();

      const stringifiedTopics = JSON.stringify(valid);

      if (!snapshot.empty) {
        const docId = snapshot.docs[0].id;
        await firestore.collection("quarterly_programs").doc(docId).update({
          topics: stringifiedTopics
        });
      } else {
        const newId = crypto.randomUUID();
        await firestore.collection("quarterly_programs").doc(newId).set({
          id: newId,
          userId: decoded.id,
          subject,
          topics: stringifiedTopics,
          createdAt: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao guardar programa trimestral" });
    }
  });

  // GET /curriculum - Get official MINED curriculum for a subject
  fastify.get("/curriculum", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { subject } = z.object({ subject: z.string() }).parse(request.query);
      const curriculum = getCurriculumForSubject(subject);
      
      if (!curriculum) {
        return [];
      }
      return curriculum;
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Parâmetro 'subject' em falta ou inválido." });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao obter currículo oficial" });
    }
  });

  // GET /progress - Get all completed topics for authenticated user
  fastify.get("/progress", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const snapshot = await firestore
        .collection("user_completed_topics")
        .where("userId", "==", decoded.id)
        .get();

      return snapshot.docs.map(doc => doc.data());
    } catch (e: any) {
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

      const snapshot = await firestore
        .collection("user_completed_topics")
        .where("userId", "==", decoded.id)
        .where("subject", "==", subject)
        .where("topicName", "==", topicName)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return { success: true, message: "Tópico já concluído anteriormente." };
      }

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

      const xpGained = 30;
      const updatedXp = (user.xp || 0) + xpGained;

      await firestore.collection("users").doc(user.id).update({
        xp: updatedXp
      });

      const completedId = crypto.randomUUID();
      await firestore.collection("user_completed_topics").doc(completedId).set({
        id: completedId,
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
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        return reply.status(400).send({ error: "Dados inválidos", details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao concluir tópico de estudo" });
    }
  });

  // POST /generate-lesson - Use Gemini to generate lesson content and 1 question
  fastify.post("/generate-lesson", async (request, reply) => {
    if (!rateLimit(request, reply, { maxRequests: 8, windowMs: 60 * 1000 })) {
      return;
    }

    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const snapshot = await firestore
        .collection("quarterly_programs")
        .where("userId", "==", decoded.id)
        .get();

      const hasAnyProgram = snapshot.docs.some(doc => {
        const p = doc.data();
        try {
          const parsed = typeof p.topics === 'string' ? JSON.parse(p.topics) : (p.topics || []);
          return Array.isArray(parsed) && parsed.length > 0;
        } catch {
          return false;
        }
      });

      if (!hasAnyProgram) {
        return reply.status(400).send({
          error: "É impossível gerar aula por falta de programa trimestral escolar."
        });
      }

      const { subject, topicName, classe, curso } = GenerateLessonSchema.parse(request.body);

      const targetClasse = classe || "12.ª Classe";
      const targetCurso = curso || "Geral";

      const prompt = `Gere uma mini-aula e um exercício de fixação sobre o tópico "${topicName}" da disciplina de "${subject}" direcionada a um aluno da "${targetClasse}" (Curso: ${targetCurso}) em Angola.
A aula deve conter explicações limpas, claras e exemplos fáceis voltados à realidade angolana.

Retorne OBRIGATORIAMENTE um objeto JSON contendo exatamente as seguintes chaves:
- "content": String contendo o texto explicativo da aula em formato limpo, suave e didático, sem cifrões ($), asteriscos (*) ou símbolos LaTeX (escreva expressões como dy/dx, f(x), f'(x) em texto legível natural. NÃO use hashtags # para títulos).
- "question": Um objeto contendo o exercício com as chaves:
  - "question": String contendo o enunciado da questão.
  - "options": Um array contendo exatamente 4 alternativas de resposta (strings).
  - "correctIndex": Número de 0 a 3 correspondente à opção correta.
  - "explanation": Explicação didática da Emanus IA sobre a resposta certa.

ATENÇÃO CRÍTICA PARA EVITAR ERROS DE FORMATAÇÃO JSON:
- Não inclua aspas duplas (") dentro das strings de texto. Se precisar destacar termos, use aspas simples (').
- Retorne APENAS o JSON válido, sem qualquer tipo de formatação markdown no bloco de código externo.`;

      const model = ai.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json"
        },
        systemInstruction: "Você é a Emanus IA, uma tutora escolar inteligente. Suas respostas devem ser estritamente objetos JSON válidos. Nunca coloque aspas duplas sem escapar dentro das strings do JSON."
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
      let lessonData = safeParseJSON(text);

      if (!lessonData) {
        lessonData = {
          content: 'Conteúdo da aula gerado com sucesso.',
          question: {
            question: 'Pergunta sobre ' + topicName,
            options: ['Opção A', 'Opção B', 'Opção C', 'Opção D'],
            correctIndex: 0,
            explanation: 'Explicação didática da Emanus IA.'
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
