import { NextRequest } from "next/server";
import { getFastifyApp } from "@/backend/app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(req: NextRequest): Promise<Response> {
  try {
    const app = await getFastifyApp();
    const url = req.nextUrl.pathname + req.nextUrl.search;
    const method = req.method;

    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      // Don't forward host or connection headers to avoid injection confusion
      if (key !== "host" && key !== "connection") {
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

    const res = await app.inject({
      method: method as any,
      url,
      headers,
      payload,
    });

    const responseHeaders = new Headers();
    for (const [key, val] of Object.entries(res.headers)) {
      if (val !== undefined) {
        if (Array.isArray(val)) {
          val.forEach((v) => responseHeaders.append(key, v));
        } else {
          responseHeaders.set(key, String(val));
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
