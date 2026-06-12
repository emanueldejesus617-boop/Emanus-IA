import { FastifyInstance } from "fastify";
import { authRoutes } from "./auth";
import { aiRoutes } from "./ai";
import { conversationsRoutes } from "./conversations";
import { scheduleRoutes } from "./schedule";
import { examsRoutes } from "./exams";
import { lessonsRoutes } from "./lessons";
import { adminRoutes } from "./admin";
import { appointmentsRoutes } from "./appointments";

export function setupRoutes(fastify: FastifyInstance) {
  fastify.register(authRoutes, { prefix: "/api/auth" });
  fastify.register(aiRoutes, { prefix: "/api/ai" });
  fastify.register(conversationsRoutes, { prefix: "/api/conversations" });
  fastify.register(scheduleRoutes, { prefix: "/api/schedule" });
  fastify.register(examsRoutes, { prefix: "/api/exams" });
  fastify.register(lessonsRoutes, { prefix: "/api/lessons" });
  fastify.register(adminRoutes, { prefix: "/api/admin" });
  fastify.register(appointmentsRoutes, { prefix: "/api/appointments" });
}
