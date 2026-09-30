import { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8080";

export const runtime = "nodejs";
// Disable body size limit and response buffering for SSE streaming
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const authHeader = req.headers.get("Authorization");

  const baseUrl = process.env.BACKEND_URL || "http://127.0.0.1:8080";
  const targetUrl = new URL("/api/ai/chat", baseUrl);

  let backendRes: Response;
  try {
    backendRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body,
      // @ts-ignore — disable compression so stream chunks arrive as-is
      compress: false,
    });
  } catch (err) {
    console.error("[AI Proxy] Failed to reach backend:", err);
    return new Response(
      `data: ${JSON.stringify({ error: "Não foi possível ligar ao servidor. Verifica se o backend está a correr." })}\n\n`,
      {
        status: 502,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      }
    );
  }

  if (!backendRes.ok || !backendRes.body) {
    const errorText = await backendRes.text().catch(() => "");
    console.error("[AI Proxy] Backend error:", backendRes.status, errorText);
    return new Response(
      `data: ${JSON.stringify({ error: "Erro interno no servidor." })}\n\n`,
      {
        status: backendRes.status,
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      }
    );
  }

  // Pipe the backend SSE stream directly to the client
  const stream = new ReadableStream({
    async start(controller) {
      const reader = backendRes.body!.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (err) {
        console.error("[AI Proxy] Stream read error:", err);
        const errorChunk = new TextEncoder().encode(
          `data: ${JSON.stringify({ error: "Erro ao processar a resposta da IA." })}\n\n`
        );
        controller.enqueue(errorChunk);
      } finally {
        controller.close();
      }
    },
    cancel() {
      backendRes.body?.cancel();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering if behind a proxy
    },
  });
}
