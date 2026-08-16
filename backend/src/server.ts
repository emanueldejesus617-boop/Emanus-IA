import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { setupRoutes } from "./routes";
import { seedAdminUser } from "./db/db";

// Validate essential environment variables at start
if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not defined!");
}
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET environment variable is not defined! Using weak fallback.");
}

const fastify = Fastify({
  logger: true,
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
    
    // Register helmet first for global security headers
    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    });

    await fastify.register(cors, {
      origin: [frontendUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
    });

    setupRoutes(fastify);

    // Seed the admin user if not exists
    await seedAdminUser();

    await fastify.listen({ port: 8080, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:8080`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
