import { FastifyInstance } from "fastify";
import { db } from "../db/db";
import * as schema from "../db/schema";
import { eq, and, or } from "drizzle-orm";
import { authenticateUser } from "./auth";

export async function appointmentsRoutes(fastify: FastifyInstance) {
  
  // GET / - fetch appointments for user (tutor or student)
  fastify.get("/", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      // Find user role
      const userList = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .limit(1);

      if (userList.length === 0) {
        return reply.status(404).send({ error: "Utilizador não encontrado" });
      }

      const user = userList[0];
      let apps;

      if (user.role === 'tutor') {
        apps = await db
          .select({
            id: schema.appointments.id,
            tutorId: schema.appointments.tutorId,
            studentId: schema.appointments.studentId,
            date: schema.appointments.date,
            startTime: schema.appointments.startTime,
            endTime: schema.appointments.endTime,
            status: schema.appointments.status,
            subject: schema.appointments.subject,
            createdAt: schema.appointments.createdAt,
            studentName: schema.users.name,
          })
          .from(schema.appointments)
          .innerJoin(schema.users, eq(schema.appointments.studentId, schema.users.id))
          .where(eq(schema.appointments.tutorId, user.id));
      } else {
        apps = await db
          .select({
            id: schema.appointments.id,
            tutorId: schema.appointments.tutorId,
            studentId: schema.appointments.studentId,
            date: schema.appointments.date,
            startTime: schema.appointments.startTime,
            endTime: schema.appointments.endTime,
            status: schema.appointments.status,
            subject: schema.appointments.subject,
            createdAt: schema.appointments.createdAt,
            tutorName: schema.users.name,
          })
          .from(schema.appointments)
          .innerJoin(schema.users, eq(schema.appointments.tutorId, schema.users.id))
          .where(eq(schema.appointments.studentId, user.id));
      }

      return { appointments: apps };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao buscar agendamentos" });
    }
  });

  // POST / - create an appointment
  fastify.post("/", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    const { tutorId, date, startTime, endTime, subject } = request.body as any;

    if (!tutorId || !date || !startTime || !endTime) {
      return reply.status(400).send({ error: "Faltam parâmetros" });
    }

    try {
      await db.insert(schema.appointments).values({
        id: crypto.randomUUID(),
        tutorId,
        studentId: decoded.id,
        date,
        startTime,
        endTime,
        subject,
        createdAt: new Date().toISOString()
      });

      return { success: true };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao criar agendamento" });
    }
  });

  // PATCH /:id - reschedule or update status
  fastify.patch("/:id", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    const { id } = request.params as any;
    const { date, startTime, endTime, status } = request.body as any;

    try {
      const updates: any = {};
      if (date) updates.date = date;
      if (startTime) updates.startTime = startTime;
      if (endTime) updates.endTime = endTime;
      if (status) updates.status = status;

      // Ensure user owns or is tutor for this appointment
      const appList = await db
        .select()
        .from(schema.appointments)
        .where(eq(schema.appointments.id, id))
        .limit(1);

      if (appList.length === 0) {
        return reply.status(404).send({ error: "Agendamento não encontrado" });
      }

      const app = appList[0];
      if (app.studentId !== decoded.id && app.tutorId !== decoded.id) {
        return reply.status(403).send({ error: "Sem permissão" });
      }

      await db
        .update(schema.appointments)
        .set(updates)
        .where(eq(schema.appointments.id, id));

      return { success: true };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao atualizar agendamento" });
    }
  });

  // GET /availability/:tutorId
  fastify.get("/availability/:tutorId", async (request, reply) => {
    const { tutorId } = request.params as any;
    
    try {
      const availabilities = await db
        .select()
        .from(schema.tutorAvailabilities)
        .where(eq(schema.tutorAvailabilities.tutorId, tutorId));

      return { availabilities };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao buscar disponibilidade" });
    }
  });

  // POST /availability (tutor only)
  fastify.post("/availability", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    const { dayOfWeek, startTime, endTime } = request.body as any;

    try {
      const userList = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, decoded.id))
        .limit(1);

      if (userList.length === 0 || userList[0].role !== 'tutor') {
        return reply.status(403).send({ error: "Apenas tutores podem definir disponibilidade" });
      }

      await db.insert(schema.tutorAvailabilities).values({
        id: crypto.randomUUID(),
        tutorId: decoded.id,
        dayOfWeek,
        startTime,
        endTime
      });

      return { success: true };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao adicionar disponibilidade" });
    }
  });

  // DELETE /availability/:id (tutor only)
  fastify.delete("/availability/:id", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    const { id } = request.params as any;

    try {
      const availList = await db
        .select()
        .from(schema.tutorAvailabilities)
        .where(eq(schema.tutorAvailabilities.id, id))
        .limit(1);

      if (availList.length === 0 || availList[0].tutorId !== decoded.id) {
        return reply.status(403).send({ error: "Sem permissão" });
      }

      await db
        .delete(schema.tutorAvailabilities)
        .where(eq(schema.tutorAvailabilities.id, id));

      return { success: true };
    } catch (e) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao apagar disponibilidade" });
    }
  });
}
