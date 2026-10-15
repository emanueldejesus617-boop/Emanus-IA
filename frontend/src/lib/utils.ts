import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function parseJsonResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    if (!res.ok) {
      if (res.status === 504) {
        throw new Error("O servidor demorou a responder (Timeout). Por favor, tenta novamente em instantes.");
      }
      if (res.status === 502 || res.status === 503) {
        throw new Error("O serviço está a reiniciar ou temporariamente indisponível. Por favor, tenta novamente em breves momentos.");
      }
      if (res.status === 500) {
        const cleanSnippet = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 120);
        if (cleanSnippet && !cleanSnippet.toLowerCase().includes("doctype") && cleanSnippet.length > 5) {
          throw new Error(`Erro interno no servidor: ${cleanSnippet}`);
        }
        throw new Error("Erro interno no servidor. Por favor, tenta novamente.");
      }
      throw new Error(`Erro no servidor (${res.status}): ${text.substring(0, 100) || res.statusText}`);
    }
    throw new Error("Formato de resposta inválido do servidor.");
  }
}


