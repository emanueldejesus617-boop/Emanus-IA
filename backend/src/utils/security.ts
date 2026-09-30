import jwt from "jsonwebtoken";

const DEFAULT_FALLBACK_SECRET = "7777fc2e8a53c41c7b96d64ed9455a1a5d59c83886d84d2f5281549631905bb4c5bd4ec0bfd563171dd75348a5ce018a47c0e8e241bb3ab8f5719d186b62c0a1";

/**
 * Retorna a chave secreta para assinatura e verificação de JWT.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ERRO CRÍTICO DE SEGURANÇA: JWT_SECRET não está definido no ambiente de produção!");
    }
    return DEFAULT_FALLBACK_SECRET;
  }
  return secret;
}

/**
 * Normaliza e sanitiza um endereço de email para prevenir inconsistências e duplicados.
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== "string") return "";
  return email.trim().toLowerCase();
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  name?: string;
  [key: string]: any;
}

/**
 * Assina um token JWT com algoritmo seguro e tempo de expiração definido.
 */
export function signToken(payload: TokenPayload, expiresIn: string | number = "7d"): string {
  return jwt.sign(payload, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: expiresIn as any,
  });
}

/**
 * Verifica e decodifica um token JWT.
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  }) as TokenPayload;
}
