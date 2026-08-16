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
      if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error("O servidor backend não respondeu adequadamente (Porta 8080). Certifique-se de que os servidores estão a correr ('npm run dev').");
      }
      throw new Error(`Erro no servidor (${res.status}): ${text.substring(0, 100) || res.statusText}`);
    }
    throw new Error("Formato de resposta inválido do servidor.");
  }
}

