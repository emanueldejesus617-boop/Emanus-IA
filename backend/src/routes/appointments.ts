import { FastifyInstance } from "fastify";
import { firestore } from "../db/db";
import { authenticateUser } from "./auth";
import { z } from "zod";

const CreateAppointmentSchema = z.object({
  tutorId: z.string().min(1, "ID do tutor inválido"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (AAAA-MM-DD)"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora de início inválido (HH:MM)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora de término inválido (HH:MM)"),
  subject: z.string().max(100, "O assunto deve ter no máximo 100 caracteres").optional().nullable(),
});

const UpdateAppointmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido (AAAA-MM-DD)").optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora de início inválido (HH:MM)").optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora de término inválido (HH:MM)").optional(),
  status: z.enum(["scheduled", "rescheduled", "cancelled"]).optional(),
});

const CreateAvailabilitySchema = z.object({
  dayOfWeek: z.number().min(0, "Dia da semana deve ser entre 0 e 6").max(6, "Dia da semana deve ser entre 0 e 6"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora de início inválido (HH:MM)"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora de término inválido (HH:MM)"),
});

const ParamsIdSchema = z.object({
  id: z.string().min(1, "ID de agendamento inválido"),
});

const ParamsTutorIdSchema = z.object({
  tutorId: z.string().min(1, "ID de tutor inválido"),
});

export async function appointmentsRoutes(fastify: FastifyInstance) {
  
  // GET / - fetch appointments for user (tutor or student)
  fastify.get("/", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const userDoc = await firestore.collection("users").doc(decoded.id).get();
      let user: any = null;

      if (!userDoc.exists) {
        const userSnapshot = await firestore.collection("users").where("email", "==", decoded.email?.toUpperCase()).limit(1).get();
        if (userSnapshot.empty) {
          return reply.status(404).send({ error: "Utilizador não encontrado" });
        }
        user = userSnapshot.docs[0].data();
        user.id = userSnapshot.docs[0].id;
      } else {
        user = userDoc.data()!;
        user.id = userDoc.id;
      }

      let apps: any[] = [];

      if (user.role === 'tutor') {
        const snapshot = await firestore
          .collection("appointments")
          .where("tutorId", "==", user.id)
          .get();

        for (const doc of snapshot.docs) {
          const appData = doc.data() as any;
          let studentName = "Estudante";
          if (appData.studentId) {
            const studentDoc = await firestore.collection("users").doc(appData.studentId).get();
            if (studentDoc.exists) studentName = studentDoc.data()!.name;
          }
          apps.push({ id: doc.id, ...appData, studentName });
        }
      } else {
        const snapshot = await firestore
          .collection("appointments")
          .where("studentId", "==", user.id)
          .get();

        for (const doc of snapshot.docs) {
          const appData = doc.data() as any;
          let tutorName = "Explicador";
          if (appData.tutorId) {
            const tutorDoc = await firestore.collection("users").doc(appData.tutorId).get();
            if (tutorDoc.exists) tutorName = tutorDoc.data()!.name;
          }
          apps.push({ id: doc.id, ...appData, tutorName });
        }
      }

      return { appointments: apps };
    } catch (e: any) {
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao buscar agendamentos" });
    }
  });

  // POST / - create an appointment
  fastify.post("/", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { tutorId, date, startTime, endTime, subject } = CreateAppointmentSchema.parse(request.body);
      const appId = crypto.randomUUID();

      await firestore.collection("appointments").doc(appId).set({
        id: appId,
        tutorId,
        studentId: decoded.id,
        date,
        startTime,
        endTime,
        status: "scheduled",
        subject: subject || null,
        createdAt: new Date().toISOString()
      });

      return { success: true };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMsg = e.errors[0]?.message || "Dados inválidos";
        return reply.status(400).send({ error: errorMsg, details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao criar agendamento" });
    }
  });

  // PATCH /:id - reschedule or update status
  fastify.patch("/:id", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { id } = ParamsIdSchema.parse(request.params);
      const { date, startTime, endTime, status } = UpdateAppointmentSchema.parse(request.body);

      const appDoc = await firestore.collection("appointments").doc(id).get();
      if (!appDoc.exists) {
        return reply.status(404).send({ error: "Agendamento não encontrado" });
      }

      const app = appDoc.data()!;
      if (app.studentId !== decoded.id && app.tutorId !== decoded.id) {
        return reply.status(403).send({ error: "Sem permissão" });
      }

      const updates: any = {};
      if (date) updates.date = date;
      if (startTime) updates.startTime = startTime;
      if (endTime) updates.endTime = endTime;
      if (status) updates.status = status;

      await firestore.collection("appointments").doc(id).update(updates);

      return { success: true };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMsg = e.errors[0]?.message || "Dados inválidos";
        return reply.status(400).send({ error: errorMsg, details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao atualizar agendamento" });
    }
  });

  // GET /availability/:tutorId
  fastify.get("/availability/:tutorId", async (request, reply) => {
    try {
      const { tutorId } = ParamsTutorIdSchema.parse(request.params);
      
      const snapshot = await firestore
        .collection("tutor_availabilities")
        .where("tutorId", "==", tutorId)
        .get();

      const availabilities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return { availabilities };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMsg = e.errors[0]?.message || "Dados inválidos";
        return reply.status(400).send({ error: errorMsg, details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao buscar disponibilidade" });
    }
  });

  // POST /availability (tutor only)
  fastify.post("/availability", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { dayOfWeek, startTime, endTime } = CreateAvailabilitySchema.parse(request.body);

      const userDoc = await firestore.collection("users").doc(decoded.id).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'tutor') {
        return reply.status(403).send({ error: "Apenas tutores podem definir disponibilidade" });
      }

      const availId = crypto.randomUUID();
      await firestore.collection("tutor_availabilities").doc(availId).set({
        id: availId,
        tutorId: decoded.id,
        dayOfWeek,
        startTime,
        endTime
      });

      return { success: true };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMsg = e.errors[0]?.message || "Dados inválidos";
        return reply.status(400).send({ error: errorMsg, details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao adicionar disponibilidade" });
    }
  });

  // DELETE /availability/:id (tutor only)
  fastify.delete("/availability/:id", async (request, reply) => {
    const decoded = await authenticateUser(request, reply);
    if (!decoded) return;

    try {
      const { id } = ParamsIdSchema.parse(request.params);

      const availDoc = await firestore.collection("tutor_availabilities").doc(id).get();

      if (!availDoc.exists || availDoc.data()?.tutorId !== decoded.id) {
        return reply.status(403).send({ error: "Sem permissão" });
      }

      await firestore.collection("tutor_availabilities").doc(id).delete();

      return { success: true };
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const errorMsg = e.errors[0]?.message || "Dados inválidos";
        return reply.status(400).send({ error: errorMsg, details: e.errors });
      }
      fastify.log.error(e);
      return reply.status(500).send({ error: "Erro ao apagar disponibilidade" });
    }
  });
}
