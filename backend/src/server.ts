import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { setupRoutes } from "./routes";
import { seedAdminUser } from "./db/db";
import { getJwtSecret } from "./utils/security";

// Validar variáveis essenciais de ambiente
try {
  getJwtSecret();
} catch (secErr: any) {
  console.error("ERRO CRÍTICO DE SEGURANÇA:", secErr.message);
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.warn("AVISO: Variável de ambiente GEMINI_API_KEY não foi definida!");
}

const fastify = Fastify({
  logger: true,
  trustProxy: true, // Permite identificar HTTPS e o IP real do cliente atrás de proxies/CDNs (Cloudflare, Nginx, Vercel)
});

fastify.setErrorHandler((error: any, request, reply) => {
  fastify.log.error(error);
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    error: error.message || "Erro interno no servidor"
  });
});

async function start() {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    
    // Registo do Helmet com cabeçalhos rigorosos de segurança e HSTS
    await fastify.register(helmet, {
      global: true,
      hsts: {
        maxAge: 63072000, // 2 anos de política HSTS rigorosa
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: "deny",
      },
      noSniff: true,
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          upgradeInsecureRequests: [],
          frameAncestors: ["'none'"],
        },
      },
    });

    const allowedOrigins = [
      frontendUrl,
      "http://localhost:3000",
      "https://localhost:3000",
      "http://127.0.0.1:3000",
      "https://127.0.0.1:3000"
    ];

    await fastify.register(cors, {
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") || origin.startsWith("https://")) {
          return cb(null, true);
        }
        return cb(new Error("Origem não permitida por política de CORS"), false);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    });

    setupRoutes(fastify);

    // Seed do utilizador administrador seguro
    await seedAdminUser();

    const port = Number(process.env.PORT) || 8080;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🔒 Servidor seguro a escutar na porta ${port} (HTTPS/Proxy pronto)`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
