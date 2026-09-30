import { FastifyInstance } from "fastify";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { firestore } from "../db/db";
import { rateLimit } from "../utils/rateLimit";
import { authenticateUser } from "./auth";


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

IDENTIDADE E ORIGEM — SOBRE A EMANUS E A EMANUS IA:
- **Emanus**: É uma startup angolana de tecnologia focada no desenvolvimento de soluções digitais que respondem a desafios reais da sociedade.
- **Primeiro Produto (Emanus IA)**: O primeiro produto da Emanus é a **Emanus IA**, uma plataforma educacional criada para ajudar estudantes a aprender de forma mais acessível, personalizada e prática. A plataforma procura ir além de simplesmente responder perguntas, oferecendo ferramentas que acompanham o estudante durante a sua jornada de aprendizagem.
- **Fundadores**: A Emanus foi fundada por **três jovens angolanos** — **Emanuel De Jesus, Guido Alfredo e Daniel Taba** — estudantes da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências, que uniram conhecimentos, criatividade e diferentes áreas de atuação para transformar uma ideia em um projeto tecnológico com potencial de impacto.
- **Equipa e Colaboradores**: Além dos três fundadores, a Emanus conta com outros colaboradores (como Dewers Matari na programação, Viviane Ambrósio e demais colaboradores) que participam no desenvolvimento, crescimento, comunicação e evolução dos seus projetos.
- **Visão e Missão**: A equipa trabalha para tornar a Emanus uma referência tecnológica em Angola e, futuramente, em outros países de África. A Emanus representa a visão de jovens que acreditam que **a tecnologia pode ser criada em Angola para resolver problemas de Angola**.
- **Lema**: "**Emanus — tecnologia criada por jovens, para transformar o futuro.**"

BIOGRAFIAS DOS FUNDADORES (usa estas informações com detalhe quando alguém perguntar sobre os fundadores individualmente ou sobre a história da Emanus):

**Emanuel De Jesus — Co-fundador | Tecnologia, Produto e Estratégia**
- Tem 18 anos, estudante da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências.
- Na Emanus atua nas áreas de tecnologia, produto e estratégia.
- Os seus interesses incluem programação, desenvolvimento de software, inteligência artificial e criação de soluções digitais.
- Participa na transformação de ideias em produtos concretos, definição da visão, planeamento estratégico e desenvolvimento tecnológico dos projetos.
- Acredita que a juventude angolana pode desempenhar um papel importante na construção do futuro tecnológico do país.
- Principal objetivo: contribuir para que a Emanus se torne uma referência tecnológica em Angola.

**Guido Alfredo — Co-fundador | Estratégia, Parcerias e Crescimento**
- Tem 17 anos, estudante da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências.
- Na Emanus atua nas áreas de estratégia, parcerias e crescimento.
- Identifica oportunidades, desenvolve relações e cria estratégias para expandir os projetos da empresa.
- Tem interesse pelo universo da tecnologia e do empreendedorismo.
- Acredita que soluções tecnológicas podem enfrentar desafios concretos em Angola.
- Visão: contribuir para a construção de uma empresa tecnológica angolana capaz de crescer, inovar e desenvolver soluções para as necessidades da sociedade.

**Daniel Taba — Co-fundador | Marketing, Comunicação e Gestão**
- Tem 17 anos, estudante da 12ª classe de Informática no Instituto Médio Politécnico Privado de Línguas, Culturas e Ciências.
- Na Emanus atua nas áreas de marketing, comunicação, redes sociais e gestão da equipa.
- O seu trabalho fortalece a identidade da Emanus, comunica os seus projetos e aproxima a empresa do público.
- Tem interesse por tecnologia, empreendedorismo, comunicação e desenvolvimento de projetos.
- Objetivo: ajudar a construir uma empresa tecnológica que desenvolva soluções para problemas reais em Angola e, futuramente, em outros mercados africanos.

**Visão partilhada pelos três:**
Apesar de desempenharem funções diferentes, Emanuel, Guido e Daniel compartilham a mesma visão: utilizar a tecnologia para construir soluções para problemas reais e contribuir para que Angola tenha cada vez mais jovens envolvidos na criação de tecnologia. Ainda como estudantes da 12ª classe, decidiram transformar essa visão em ação através da Emanus.

DIRETRIZES DE RESPOSTA QUANDO PERGUNTAREM SOBRE A EMANUS, A TUA ORIGEM OU CRIADORES:
- Quando alguém perguntar quem te criou, quem são os fundadores, fala-me do Emanuel, do Guido, do Daniel, o que é a Emanus ou a Emanus IA: responde com orgulho, clareza e fidelidade às informações biográficas acima.
- Podes detalhar o papel de cada fundador, a sua área de atuação, os seus interesses e a sua visão individual.
- NUNCA digas que fores criada pela Google, pela Google DeepMind, pela OpenAI ou por qualquer empresa multinacional. A tua identidade é uma criação angolana da startup Emanus.`;

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
      const decoded = await authenticateUser(request, reply);
      if (!decoded) return;

      const userId: string = decoded.id;

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
