import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { setupRoutes } from "./routes";
import { seedAdminUser } from "./db/db";

let app: FastifyInstance | null = null;
let initPromise: Promise<FastifyInstance> | null = null;

export async function getFastifyApp(): Promise<FastifyInstance> {
  if (app) return app;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const server = Fastify({
      logger: false,
    });

    await server.register(cors, {
      origin: true,
      credentials: true,
    });

    setupRoutes(server);

    try {
      await seedAdminUser();
    } catch (e) {
      console.warn("Aviso ao semear utilizador admin:", e);
    }

    await server.ready();
    app = server;
    return app;
  })();

  return initPromise;
}
