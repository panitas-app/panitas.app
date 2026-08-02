import { AgendaService } from "@/services/agenda.service"
import type { AgentTool } from "@/lib/agent/types"

const agendaService = new AgendaService()

export const agendaTools: AgentTool[] = [
  {
    name: "agenda.list",
    description: "Lista citas de la agenda con filtros opcionales (date, employeeId, serviceId)",
    permissions: ["agenda.read"],
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "Fecha (YYYY-MM-DD)" },
        employeeId: { type: "string", description: "ID del empleado" },
        serviceId: { type: "string", description: "ID del servicio" },
      },
    },
    async execute(ctx, input) {
      if (!ctx.negocioId) return { ok: false, error: "Sin negocio asociado" }
      const appointments = await agendaService.list(ctx.negocioId, {
        date: typeof input.date === "string" ? input.date : null,
        employeeId: typeof input.employeeId === "string" ? input.employeeId : null,
        serviceId: typeof input.serviceId === "string" ? input.serviceId : null,
      })
      return {
        ok: true,
        data: appointments.map((a) => ({
          id: a.id,
          customerName: a.customerName,
          date: a.date,
          time: a.time,
          status: a.status,
        })),
      }
    },
  },
  {
    name: "agenda.create",
    description: "Crea una cita en la agenda del negocio",
    permissions: ["agenda.create"],
    input_schema: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Nombre del cliente" },
        customerPhone: { type: "string", description: "Teléfono del cliente" },
        date: { type: "string", description: "Fecha (YYYY-MM-DD)" },
        time: { type: "string", description: "Hora (HH:MM)" },
        serviceId: { type: "string", description: "ID del servicio" },
      },
      required: ["customerName", "customerPhone", "date", "time"],
    },
    async execute(ctx, input) {
      const appointment = await agendaService.create({
        body: input,
        negocio: ctx.negocioId ? { id: ctx.negocioId, planId: ctx.plan, modalidad: null } : null,
      })
      const anyAppointment = appointment as unknown as { id: string }
      return { ok: true, data: { id: anyAppointment.id } }
    },
  },
  {
    name: "agenda.cancel",
    description: "Cancela una cita de la agenda",
    permissions: ["agenda.cancel"],
    input_schema: {
      type: "object",
      properties: {
        appointmentId: { type: "string", description: "ID de la cita" },
      },
      required: ["appointmentId"],
    },
    async execute(ctx, input) {
      if (!ctx.negocioId) return { ok: false, error: "Sin negocio asociado" }
      const appointmentId = typeof input.appointmentId === "string" ? input.appointmentId : ""
      if (!appointmentId) return { ok: false, error: "Se requiere appointmentId" }
      const cancelled = await agendaService.cancel(ctx.negocioId, appointmentId)
      return { ok: true, data: { id: cancelled.id, status: cancelled.status } }
    },
  },
]
