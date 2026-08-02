import { safeStr, LIMITS } from "@/lib/validate"
import { requireAccesoModulo } from "@/lib/plans"
import { enviarConfirmacionCita, enviarNuevaCitaNegocio } from "@/lib/email"
import { formatDate, formatTime } from "@/lib/email-helpers"
import { AgendaRepository } from "@/repositories/agenda.repository"
import { serviceError } from "@/services/errors"
import { eventService } from "@/events/event.service"

export type AppointmentListOptions = {
  date?: string | null
  agendaId?: string | null
  employeeId?: string | null
  serviceId?: string | null
}

export type AppointmentCreateInput = {
  body: Record<string, unknown>
  negocio?: { id: string; planId: string; modalidad: string | null } | null
}

export class AgendaService {
  constructor(private readonly repo = new AgendaRepository()) {}

  async list(negocioId: string, options: AppointmentListOptions) {
    let date: string | Date | undefined
    if (options.date) {
      const [y, m, d] = options.date.split("-").map(Number)
      date = new Date(y, m - 1, d)
    }
    return this.repo.list({
      negocioId,
      date,
      agendaId: options.agendaId || undefined,
      employeeId: options.employeeId || undefined,
      serviceId: options.serviceId || undefined,
    })
  }

  async create(input: AppointmentCreateInput) {
    const body = input.body

    const customerName = safeStr(body.customerName, LIMITS.MAX_NAME, 1)
    const customerPhone = safeStr(body.customerPhone, 20, 1)
    const time = safeStr(body.time, 5, 1)
    const dateStr = safeStr(body.date, 20, 1)
    const appointmentType = safeStr(body.appointmentType, 30) || "in_person"

    if (!customerName || !customerPhone || !time || !dateStr) {
      throw serviceError("Campos requeridos: customerName, customerPhone, date, time", 400)
    }

    // Support both authenticated (agendaId) and public (storeSlug) booking
    let agendaId = safeStr(body.agendaId, 50)
    let negocioId: string

    if (body.storeSlug) {
      const storeSlug = safeStr(body.storeSlug, 100)
      if (!storeSlug) throw serviceError("storeSlug inválido", 400)
      const store = await this.repo.findStoreBySlug(storeSlug)
      if (!store || !store.negocioId) {
        throw serviceError("Tienda no encontrada", 404)
      }
      negocioId = store.negocioId
      if (!agendaId) {
        const agenda = await this.repo.findAgendaByNegocioId(negocioId)
        if (!agenda) throw serviceError("Agenda no disponible", 404)
        agendaId = agenda.id
      }
    } else {
      const negocio = input.negocio
      if (!negocio) throw serviceError("No autorizado", 401)

      const { allowed, error } = requireAccesoModulo(negocio.planId, negocio.modalidad, "agenda")
      if (!allowed) throw serviceError(error || "Sin acceso", 403)

      negocioId = negocio.id
      if (!agendaId) {
        const agenda = await this.repo.findAgendaByNegocioId(negocio.id)
        if (!agenda) throw serviceError("Agenda no encontrada", 404)
        agendaId = agenda.id
      }
    }

    const agenda = await this.repo.findAgendaById(agendaId)
    if (!agenda || agenda.negocioId !== negocioId) {
      throw serviceError("Agenda no encontrada", 404)
    }

    const [ay, am, ad] = dateStr.split("-").map(Number)
    // NOTE: create + include triggers interactive transactions in Neon HTTP — do them separately
    const created = await this.repo.create({
      customerName,
      customerPhone,
      date: new Date(ay, am - 1, ad),
      time,
      appointmentType,
      address: body.address ? safeStr(body.address, 500) : null,
      notes: body.notes ? safeStr(body.notes, 1000) : null,
      receiptImage: body.receiptImage ? safeStr(body.receiptImage, 500) : null,
      agendaId: agenda.id,
      negocioId,
      serviceId: typeof body.serviceId === "string" ? body.serviceId : null,
      employeeId: typeof body.employeeId === "string" ? body.employeeId : null,
    })
    const appointment = await this.repo.findByIdWithService(created.id)
    if (!appointment) throw serviceError("Cita no encontrada", 404)

    // ─── Send emails ────────────────────────────────────────────────
    const fecha = formatDate(appointment.date)
    const hora = formatTime(appointment.time)
    const servicioNombre = appointment.service?.name || "Sin servicio"
    const duracion = appointment.service?.durationMin || 30
    const customerEmail = body.customerEmail ? safeStr(body.customerEmail, 200) : null

    // Update appointment with customerEmail if provided
    if (customerEmail && !appointment.customerEmail) {
      await this.repo.update(appointment.id, { customerEmail })
    }

    const negocio = await this.repo.findNegocioById(negocioId)
    const tiendaNombre = negocio?.nombre || "Tu negocio"

    // Email confirmation to client
    if (customerEmail) {
      enviarConfirmacionCita(customerEmail, {
        clienteNombre: customerName,
        tiendaNombre,
        fecha,
        hora,
        servicioNombre,
        duracion,
        tipo: appointmentType,
        direccion: appointment.address || undefined,
        notas: appointment.notes || undefined,
      }).catch((e) => console.error("[appointment email] confirmation error:", e))
    }

    // Email alert to merchant
    if (negocio?.userId) {
      const owner = await this.repo.findUserEmail(negocio.userId)
      if (owner?.email) {
        enviarNuevaCitaNegocio(owner.email, {
          tiendaNombre,
          clienteNombre: customerName,
          telefono: customerPhone,
          email: customerEmail,
          fecha,
          hora,
          servicio: servicioNombre,
          duracion,
          tipo: appointmentType,
          notas: appointment.notes || undefined,
        }).catch((e) => console.error("[appointment email] merchant alert error:", e))
      }
    }

    eventService.emit("appointment.created", {
      appointmentId: appointment.id,
      negocioId,
      date: appointment.date,
      time: appointment.time,
    })

    return appointment
  }

  async cancel(negocioId: string, appointmentId: string) {
    const appointment = await this.repo.findById(appointmentId)
    if (!appointment) throw serviceError("Cita no encontrada", 404)
    if (appointment.negocioId !== negocioId) throw serviceError("No autorizado", 403)
    return this.repo.update(appointmentId, { status: "cancelled" })
  }
}
