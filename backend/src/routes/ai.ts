import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { firestore } from "../db/db";
import jwt from "jsonwebtoken";
import { rateLimit } from "../utils/rateLimit";

const JWT_SECRET = process.env.JWT_SECRET || "7777fc2e8a53c41c7b96d64ed9455a1a5d59c83886d84d2f5281549631905bb4c5bd4ec0bfd563171dd75348a5ce018a47c0e8e241bb3ab8f5719d186b62c0a1";
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET not found in environment, using hardcoded fallback.");
}

const ChatSchema = z.object({
  // Max 4000 chars per message (~1000 tokens) to prevent abuse
  message: z.string().max(4000),
  // Max ~7.5MB of actual data when decoded from base64
  mediaData: z.string().max(10_000_000).optional().nullable(),
  // Flexible string validation to support varying browser MIME types (e.g. audio/webm;codecs=opus)
  mediaType: z.string().max(100).optional().nullable(),
  history: z.array(z.object({
    role: z.enum(["user", "model"]),
    parts: z.array(z.object({
      text: z.string().max(4000).optional().nullable(),
      inlineData: z.object({
        mimeType: z.string(),
        data: z.string()
      }).optional().nullable()
    }))
  })).max(50).optional().nullable().default([]),
  classe: z.string().max(100).optional().nullable(),
  curso: z.string().max(100).optional().nullable(),
  conversationId: z.string().uuid().optional().nullable(),
  subject: z.string().max(100).optional().nullable(),
  personality: z.enum(["step-by-step", "direct", "mixed"]).optional().nullable().default("step-by-step"),
});

function getSystemInstruction(
  classe?: string,
  curso?: string,
  subject?: string,
  isFirstMessage?: boolean,
  personality?: "step-by-step" | "direct" | "mixed"
) {
  let instruction = `O teu nome é Emanus IA e és a melhor professora do mundo${subject ? ` de ${subject}` : ""}.
Fores treinada especificamente para o currículo do Ministério da Educação de Angola (MINED), mas possuis conhecimento enciclopédico de todas as matérias do ensino primário, secundário e superior.

IDENTIDADE E ORIGEM:
- Fores criada e desenvolvida por Emanuel De Jesus, um jovem estudante angolano da área de Informática, apaixonado por tecnologia, programação e pelo desenvolvimento de soluções digitais que gerem impacto positivo.
- Emanuel tem interesse especial no desenvolvimento de websites, aplicações e ferramentas úteis para a educação, os negócios e a resolução de problemas do dia a dia. Valoriza a responsabilidade, a dedicação e o aprendizado constante, e acredita que a tecnologia é uma ferramenta poderosa para a inovação e o desenvolvimento de Angola.
- Quando alguém te perguntar quem te criou, quem te desenvolveu, quem é o teu programador, ou qualquer questão similar sobre a tua origem, deves responder com orgulho e naturalidade que fores criada por Emanuel De Jesus. Podes partilhar brevemente a sua descrição biográfica de forma calorosa e genuína, como se falasses de alguém que admiras.
- NUNCA digas que fores criada pelo Google, pela Google DeepMind ou por qualquer outra empresa tecnológica. A tua identidade como Emanus IA é uma criação de Emanuel De Jesus.

EQUIPA DE DESENVOLVIMENTO (menciona APENAS quando o utilizador perguntar especificamente sobre a equipa, os colaboradores, os contribuidores ou quem ajudou no desenvolvimento):
- Alfredo Rodrigues: co-fundador da Emanus IA. Desempenhou um papel fundamental na conceção e fundação deste projeto ao lado de Emanuel De Jesus.
- Dewers Matari: contribuidor de programação e peça muito importante no desenvolvimento da Emanus IA. O seu contributo técnico foi essencial para tornar este projeto uma realidade.
- Viviane Ambrósio: colaboradora do projeto, fazendo parte da equipa que apoiou o desenvolvimento da Emanus IA.
- Quando perguntado sobre a equipa completa, podes dizer algo como: "Fui desenvolvida por Emanuel De Jesus, co-fundada com Alfredo Rodrigues, com o contributo essencial de programação de Dewers Matari e a colaboração de Viviane Ambrósio. Juntos tornaram este projeto possível."
- Em perguntas gerais sobre quem te criou, menciona apenas Emanuel De Jesus como criador principal. Reserva a menção dos restantes para questões mais específicas sobre a equipa ou os colaboradores.`;

  if (isFirstMessage) {
    instruction += `\n\nEsta é a PRIMEIRA VEZ ABSOLUTA que este novo utilizador está a conversar contigo na plataforma. Apresenta-te de forma breve e calorosa como Emanus IA antes de responderes à mensagem. Por exemplo: "Olá! Sou a Emanus IA, a tua professora virtual. 😊" e depois continua com a resposta.`;
  } else {
    instruction += `\n\nIMPORTANTE: O utilizador já te conhece e esta NÃO é a primeira conversa/interação dele. NUNCA te apresentes nem digas o teu nome no início da resposta (como "Olá, sou a Emanus IA"), a menos que o utilizador te peça explicitamente para te apresentares ou pergunte quem és. Responde SEMPRE diretamente ao que foi pedido.`;
  }

  if (classe) {
    instruction += `\n\nO aluno com quem você está interagindo está na ${classe}${curso ? ` (Curso: ${curso})` : ""}. Adapte todas as suas explicações, exemplos, nível de complexidade e linguagem para este perfil de aluno de forma natural.`;
  }

  instruction += `\n\nPERSONALIDADE:
- Paciente, encorajador e nunca condescendente
- Usa exemplos do quotidiano angolano (kwanza, musseques, rio Kwanza, empresas angolanas, figuras históricas angolanas como Agostinho Neto)
- Adapta a linguagem ao nível do aluno (detecta automaticamente)
- Celebra progressos, mesmo pequenos`;

  if (personality === "direct") {
    instruction += `
- Foco em RESPOSTAS DIRETAS, indo diretamente ao assunto sem rodeios.
- Forneça a solução ou resposta de forma direta e objetiva, mantendo a explicação muito curta e concisa.`;
  } else if (personality === "mixed") {
    instruction += `
- Foco em RESPOSTAS MISTAS/HÍBRIDAS: explique de forma direta, mas em passos lógicos e curtos para que o estudante aprenda de forma rápida e com alta produtividade.
- Dê a resposta direta e mostre o passo a passo resumido de como lá chegar.`;
  } else {
    instruction += `
- Nunca dá a resposta directamente - guia o aluno ao raciocínio através de passos para que ele aprenda por si mesmo sem receber respostas prontas de bandeja.`;
  }

  instruction += `\n\nREGRAS CRÍTICAS DE FORMATAÇÃO E SIMPLICIDADE (SEM SÍMBOLOS TÉCNICOS OU LATEX):
- Suas explicações devem ser extremamente limpas, simples e fáceis de ler para estudantes angolanos, sem distrações visuais ou símbolos de código.
- NUNCA use cifrões ($ ou $$) nem marcas ou símbolos em estilo LaTeX (como \\frac, \\sqrt, \\cdot, \\times, \\int, \\sum, \\text, etc.). Os estudantes não usam LaTeX e o leitor de voz (TTS) da plataforma lê esses símbolos de forma incorreta (ex: lê "cifrão", "backslash frac", etc.).
- Represente SEMPRE expressões matemáticas, funções, frações e variáveis em português legível e natural. Exemplos:
  * Escreva "f(x)" em vez de "$f(x)$"
  * Escreva "f'(x)" ou "f linha de x" em vez de "$f'(x)$"
  * Escreva "dy/dx" ou "df/dx" em vez de "\\frac{dy}{dx}" ou "$\\frac{dy}{dx}$"
  * Escreva "y'" ou "y linha" em vez de "$y'$"
  * Escreva "x elevado a 2" ou "x²" em vez de "$x^2$"
  * Escreva "raiz quadrada de x" ou "raiz(x)" em vez de "\\sqrt{x}"
- NUNCA use hashtags (#) para títulos nem asteriscos (* ou **) para destaques ou tópicos. Use parágrafos simples, travessões (-) ou numeração (1., 2.).
- A escrita deve ser 100% didática, suave e fluida tanto para a leitura visual no ecrã quanto para ser lida por voz.`;

  return instruction;
}

async function classifySubject(
  ai: GoogleGenerativeAI,
  userMessage: string,
  registeredSubjects: string[]
): Promise<string> {
  const fallback = registeredSubjects[0] || "Matemática";
  if (!userMessage || userMessage.trim().length === 0 || registeredSubjects.length === 0) {
    return fallback;
  }

  try {
    const classifierModel = ai.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: { maxOutputTokens: 30, temperature: 0.1 }
    });

    const prompt = `Analise a mensagem do estudante e determine a qual disciplina ela pertence.

Disciplinas Registadas do Estudante:
${registeredSubjects.map(s => `- "${s}"`).join("\n")}

Mensagem do Estudante: "${userMessage.slice(0, 300)}"

REGRAS:
1. Se a mensagem for sobre um tópico ou tema de uma das Disciplinas Registadas acima, responda EXATAMENTE com o nome dessa disciplina (copie o nome idêntico).
2. Se for uma pergunta geral, curiosidade ou saudação, responda EXATAMENTE com: "${fallback}".
3. Responda APENAS o nome de uma das disciplinas registadas listadas, sem explicações adicionais, pontuação ou aspas.`;

    const result = await classifierModel.generateContent(prompt);
    const text = result.response.text().trim().replace(/['"]/g, "");

    const normText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const matched = registeredSubjects.find(s => {
      const normSub = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return normSub === normText || normText.includes(normSub);
    });
    if (matched) return matched;
    return fallback;
  } catch (err) {
    console.error("Error classifying subject:", err);
    return fallback;
  }
}

export async function aiRoutes(fastify: FastifyInstance) {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  
  fastify.post("/chat", async (request, reply) => {
    // Apply rate limit (max 10 requests per minute)
    if (!rateLimit(request, reply, { maxRequests: 10, windowMs: 60 * 1000 })) {
      return;
    }

    try {
      const { message, mediaData, mediaType, history, classe, curso, conversationId: reqConversationId, subject, personality } = ChatSchema.parse(request.body);

      // Authentication is mandatory — guests cannot use the AI endpoint
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return reply.status(401).send({ error: "Autenticação necessária para utilizar a Emanus IA." });
      }

      let userId: string;
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (err) {
        return reply.status(401).send({ error: "Token inválido ou expirado. Por favor, inicia sessão novamente." });
      }

      reply.raw.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');

      let conversationId = reqConversationId;
      
      const displayMessage = message || (mediaType?.startsWith("audio/") ? "Mensagem de voz" : "Imagem enviada");

      // Fetch user's registered subjects from Firestore for classification
      let userRegisteredSubjects: string[] = [];
      if (userId) {
        const userDoc = await firestore.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.subjects) {
            try {
              userRegisteredSubjects = typeof userData.subjects === "string" ? JSON.parse(userData.subjects) : userData.subjects;
            } catch (e) {
              console.error("Error parsing user subjects", e);
            }
          }
        }
      }

      // Classify subject for the user's message against their course registered subjects
      let targetSubject = subject || userRegisteredSubjects[0] || "Matemática";
      if (subject) {
        targetSubject = subject;
      } else if (userRegisteredSubjects.length > 0) {
        targetSubject = await classifySubject(ai, message || displayMessage, userRegisteredSubjects);
      }

      // Check if this user has any previous conversations (to determine if new user first interaction ever)
      let isFirstUserEverMessage = false;
      if (userId && !reqConversationId) {
        const userConversations = await firestore.collection("conversations").where("userId", "==", userId).limit(1).get();
        if (userConversations.empty) {
          isFirstUserEverMessage = true;
        }
      }

      // If authenticated and no conversation ID is provided, create a new conversation
      if (userId && !conversationId) {
        conversationId = crypto.randomUUID();
        const title = displayMessage.length > 40 ? displayMessage.slice(0, 40) + "..." : displayMessage;
        await firestore.collection("conversations").doc(conversationId).set({
          id: conversationId,
          userId,
          title,
          subject: targetSubject,
          createdAt: new Date().toISOString()
        });
        
        // Write the conversation ID and assigned subject to the stream first so the client can save it
        reply.raw.write(`data: ${JSON.stringify({ conversationId, subject: targetSubject })}\n\n`);
      } else if (userId && conversationId) {
        // If conversation already exists and was set to fallback, update if message is classified as a specific subject
        const convDoc = await firestore.collection("conversations").doc(conversationId).get();
        if (convDoc.exists) {
          const data = convDoc.data()!;
          if (!data.subject || data.subject === "Geral") {
            await firestore.collection("conversations").doc(conversationId).update({ subject: targetSubject });
          } else if (data.subject && !subject) {
            targetSubject = data.subject;
          }
        }
        reply.raw.write(`data: ${JSON.stringify({ conversationId, subject: targetSubject })}\n\n`);
      }

      // Save user message to database if authenticated and conversation exists
      if (userId && conversationId) {
        const userMsgId = crypto.randomUUID();
        await firestore.collection("messages").doc(userMsgId).set({
          id: userMsgId,
          conversationId,
          role: "user",
          content: message || displayMessage,
          mediaData: mediaData || null,
          mediaType: mediaType || null,
          createdAt: new Date().toISOString()
        });
      }

      const model = ai.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        systemInstruction: getSystemInstruction(classe || undefined, curso || undefined, targetSubject, isFirstUserEverMessage, personality || undefined),
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

      // Clean and sanitize history parts for Gemini SDK compatibility
      const sanitizedHistory = (history || [])
        .map((msg: any) => {
          const cleanParts = (msg.parts || [])
            .map((p: any) => {
              const cleaned: any = {};
              if (p.text && typeof p.text === "string" && p.text.trim()) {
                cleaned.text = p.text.trim();
              }
              if (p.inlineData && p.inlineData.mimeType && p.inlineData.data) {
                cleaned.inlineData = {
                  mimeType: p.inlineData.mimeType,
                  data: p.inlineData.data
                };
              }
              return cleaned;
            })
            .filter((p: any) => p.text || p.inlineData);

          return {
            role: msg.role === "model" ? "model" : "user",
            parts: cleanParts
          };
        })
        .filter((msg: any) => msg.parts.length > 0);

      let responseStream;
      try {
        responseStream = await model.generateContentStream({
          contents: [
            ...sanitizedHistory,
            { role: "user", parts }
          ]
        });
      } catch (err: any) {
        console.error("[Gemini API Stream Error]:", err);
        fastify.log.error(err);
        let errorMsg = err.message || "Erro interno ao contactar a IA";
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
          // If the connection was closed by the client, stop generating
          if (reply.raw.closed || reply.raw.writableEnded) {
            break;
          }

          let chunkText = "";
          try {
            chunkText = chunk.text();
          } catch (textErr) {
            // Safe fallback if chunk.text() throws (e.g. safety blocks, empty parts, etc)
            if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
              chunkText = chunk.candidates[0].content.parts[0].text;
            }
          }

          if (chunkText) {
            responseText += chunkText;
            reply.raw.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
          }
        }
      } catch (err: any) {
        fastify.log.error(err);
        let errorMsg = "Erro interno ao processar a resposta da IA";
        if (err.status === 429 || (err.message && err.message.toLowerCase().includes("quota"))) {
          errorMsg = "Limite de quota da API do Gemini excedido. Por favor, tente novamente mais tarde.";
        }
        if (!reply.raw.closed && !reply.raw.writableEnded) {
          reply.raw.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
          reply.raw.end();
        }
        return;
      }

      // Save AI message to database if authenticated, conversation exists and stream wasn't closed early
      if (userId && conversationId && !reply.raw.closed && !reply.raw.writableEnded) {
        const aiMsgId = crypto.randomUUID();
        await firestore.collection("messages").doc(aiMsgId).set({
          id: aiMsgId,
          conversationId,
          role: "model",
          content: responseText,
          createdAt: new Date().toISOString()
        });
      }

      if (!reply.raw.closed && !reply.raw.writableEnded) {
        reply.raw.write('data: [DONE]\n\n');
        reply.raw.end();
      }
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        console.error("Zod Validation Error details:", JSON.stringify(e.errors, null, 2));
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
