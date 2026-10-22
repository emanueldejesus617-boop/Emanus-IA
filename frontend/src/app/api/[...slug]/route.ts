import { NextRequest } from "next/server";
import { getFastifyApp } from "@/backend/app";

import dns from "node:dns";
if (typeof dns?.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: NextRequest): Promise<Response> {
  let timeoutTimer: NodeJS.Timeout | undefined;
  try {
    const app = await getFastifyApp();
    const url = req.nextUrl.pathname + req.nextUrl.search;
    const method = req.method;

    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      // Não repassar cabeçalhos de conexão ou tamanho que quebram o mock do Fastify inject
      if (
        lower !== "host" &&
        lower !== "connection" &&
        lower !== "content-length" &&
        lower !== "transfer-encoding" &&
        lower !== "content-encoding" &&
        lower !== "accept-encoding"
      ) {
        headers[key] = val;
      }
    });

    let payload: string | undefined;
    if (method !== "GET" && method !== "HEAD") {
      try {
        payload = await req.text();
      } catch {
        payload = undefined;
      }
    }

    const injectPromise = app.inject({
      method: method as any,
      url,
      headers,
      payload,
    });

    // Rotas com geração de IA (horário, aulas, simulados e chat) exigem tempo suficiente para retorno dos tokens
    const isAiRoute =
      url.includes("/api/schedule/generate") ||
      url.includes("/api/lessons/generate") ||
      url.includes("/api/exams/generate") ||
      url.includes("/api/ai/");
    const timeoutMs = isAiRoute ? 58000 : 35000;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => reject(new Error("Timeout de resposta da API")), timeoutMs);
    });

    const res = await Promise.race([
      injectPromise.finally(() => {
        if (timeoutTimer) clearTimeout(timeoutTimer);
      }),
      timeoutPromise,
    ]);

    const responseHeaders = new Headers();
    for (const [key, val] of Object.entries(res.headers)) {
      if (val !== undefined) {
        const lower = key.toLowerCase();
        if (
          lower !== "content-length" &&
          lower !== "content-encoding" &&
          lower !== "transfer-encoding" &&
          lower !== "connection"
        ) {
          if (Array.isArray(val)) {
            val.forEach((v) => responseHeaders.append(key, v));
          } else {
            responseHeaders.set(key, String(val));
          }
        }
      }
    }

    return new Response(res.body, {
      status: res.statusCode,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("[API Gateway Error]:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno no servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

export async function PUT(req: NextRequest) {
  return handle(req);
}

export async function PATCH(req: NextRequest) {
  return handle(req);
}

export async function DELETE(req: NextRequest) {
  return handle(req);
}

export async function OPTIONS(req: NextRequest) {
  return handle(req);
}
