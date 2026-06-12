import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import Fastify from "fastify";
import cors from "@fastify/cors";
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

async function start() {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
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
