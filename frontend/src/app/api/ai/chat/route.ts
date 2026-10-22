import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { firestore } from "@/backend/db/db";
import { verifyToken } from "@/backend/utils/security";
import { getSystemInstruction } from "@/backend/routes/ai";

import dns from "node:dns";
if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}


export async function POST(req: NextRequest) {
  const geminiApiKey = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "").trim();
  if (!geminiApiKey) {
    return new Response(JSON.stringify({ error: "Serviço de IA não configurado. Contacta o suporte." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "JSON inválido" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      message = "",
      mediaData,
      mediaType,
      history = [],
      classe,
      curso,
      conversationId: reqConversationId,
      subject,
      personality = "step-by-step",
    } = body;

    // Autenticação do utilizador
    const authHeader = req.headers.get("Authorization") || "";
    let userId = "";

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      try {
        const decoded = verifyToken(token);
        if (decoded && decoded.id) {
          userId = decoded.id;
        }
      } catch {
        // Token inválido ou expirado
      }
    }

    let conversationId = reqConversationId;
    const displayMessage =
      message ||
      (mediaType?.startsWith("audio/") ? "Mensagem de voz" : "Imagem enviada");

    const targetSubject = subject || "Matemática";

    // Criação de conversa se não existir
    if (userId && !conversationId) {
      conversationId = crypto.randomUUID();
      const title =
        displayMessage.length > 40
          ? displayMessage.slice(0, 40) + "..."
          : displayMessage;
      try {
        await firestore.collection("conversations").doc(conversationId).set({
          id: conversationId,
          userId,
          title,
          subject: targetSubject,
          createdAt: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn("Aviso ao guardar conversa:", dbErr);
      }
    }

    // Salvar mensagem do utilizador
    if (userId && conversationId) {
      const userMsgId = crypto.randomUUID();
      try {
        await firestore.collection("messages").doc(userMsgId).set({
          id: userMsgId,
          conversationId,
          role: "user",
          content: message || displayMessage,
          mediaData: mediaData || null,
          mediaType: mediaType || null,
          createdAt: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn("Aviso ao guardar mensagem do aluno:", dbErr);
      }
    }

    // Configurar modelo Gemini
    const ai = new GoogleGenerativeAI(geminiApiKey);
    const rawModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const modelName = rawModel.trim().replace(/^["']|["']$/g, "").trim() || "gemini-2.5-flash";

    const model = ai.getGenerativeModel({
      model: modelName,
      systemInstruction: getSystemInstruction(
        classe || undefined,
        curso || undefined,
        targetSubject,
        false,
        personality || undefined
      ),
    });

    const parts: any[] = [{ text: message || displayMessage }];
    if (mediaData && mediaType) {
      parts.push({
        inlineData: {
          data: mediaData,
          mimeType: mediaType,
        },
      });
    }

    // Sanitizar histórico
    const sanitizedHistory = (history || [])
      .filter((h: any) => h.role === "user" || h.role === "model")
      .map((h: any) => ({
        role: h.role,
        parts: (h.parts || []).map((p: any) => {
          if (p.inlineData) {
            return {
              inlineData: {
                data: p.inlineData.data,
                mimeType: p.inlineData.mimeType,
              },
            };
          }
          return { text: p.text || "" };
        }),
      }));

    // Iniciar streaming do Gemini
    const responseStream = await model.generateContentStream({
      contents: [...sanitizedHistory, { role: "user", parts }],
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Enviar cabeçalho de conversa primeiro
        if (conversationId) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ conversationId, subject: targetSubject })}\n\n`
            )
          );
        }

        let responseText = "";

        try {
          for await (const chunk of responseStream.stream) {
            let chunkText = "";
            try {
              chunkText = chunk.text();
            } catch {
              if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
                chunkText = chunk.candidates[0].content.parts[0].text;
              }
            }

            if (chunkText) {
              responseText += chunkText;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunkText })}\n\n`)
              );
            }
          }

          // Gravar resposta no Firestore
          if (userId && conversationId && responseText) {
            const aiMsgId = crypto.randomUUID();
            try {
              await firestore.collection("messages").doc(aiMsgId).set({
                id: aiMsgId,
                conversationId,
                role: "model",
                content: responseText,
                createdAt: new Date().toISOString(),
              });
            } catch (dbErr) {
              console.warn("Aviso ao guardar mensagem da IA:", dbErr);
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (streamErr: any) {
          console.error("Erro no stream Gemini:", streamErr);
          const errorMsg =
            streamErr.message || "Erro ao processar resposta da IA";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("[AI Chat Handler Error]:", error);
    return new Response(
      `data: ${JSON.stringify({ error: error.message || "Erro interno na IA" })}\n\n`,
      {
        status: 500,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      }
    );
  }
}
