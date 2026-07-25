import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { enviarCitaCompletada, sendEmail } from "@/lib/email"
import { templateAppointmentRescheduled } from "@/lib/email-templates"
import { formatDate, formatTime } from "@/lib/email-helpers"

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "completed"] as const

function isValidDateStr(s: any): boolean {
  if (typeof s !== "string") return false
  const [y, m, d] = s.split("-").map(Number)
  if (!y || !m || !d) return false
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

function isValidTimeStr(s: any): boolean {
  if (typeof s !== "string") return false
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(s)
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

const DAY_KEYS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"]

async function validateSlot(
  agendaId: string,
  dateStr: string,
  timeStr: string,
  serviceDurationMin: number,
  excludeAppointmentId: string,
  employeeId?: string | null,
): Promise<{ valid: boolean; error?: string }> {
  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const dayOfWeek = date.getDay()

  // Get schedules
  let schedules: { startTime: string; endTime: string }[]
  if (employeeId) {
    schedules = await prisma.employeeSchedule.findMany({
      where: { employeeId, dayOfWeek, isActive: true },
    })
  } else {
    schedules = await prisma.schedule.findMany({
      where: { agendaId, dayOfWeek, isActive: true },
    })
  }

  // Fallback to storeHours
  if (schedules.length === 0) {
    const agenda = await prisma.agenda.findUnique({ where: { id: agendaId }, select: { negocioId: true } })
    if (agenda) {
      const store = await prisma.store.findUnique({ where: { negocioId: agenda.negocioId }, select: { storeHours: true } })
      if (store?.storeHours) {
        try {
          const parsed = JSON.parse(store.storeHours)
          const dayKey = DAY_KEYS[dayOfWeek]
          const day = parsed[dayKey]
          if (day && day.type !== "Cerrado") {
            schedules.push({ startTime: day.open || "09:00", endTime: day.close || "18:00" })
            if (day.reopen && day.reclose) {
              schedules.push({ startTime: day.reopen, endTime: day.reclose })
            }
          }
        } catch { /* ignore */ }
      }
    }
  }

  if (schedules.length === 0) {
    return { valid: false, error: "El negocio no tiene horarios configurados para este día" }
  }

  // Check if time + duration fits within any schedule block
  const startMin = timeToMinutes(timeStr)
  const endMin = startMin + serviceDurationMin
  const fitsInSchedule = schedules.some(s => {
    const sStart = timeToMinutes(s.startTime)
    const sEnd = timeToMinutes(s.endTime)
    return startMin >= sStart && endMin <= sEnd
  })
  if (!fitsInSchedule) {
    return { valid: false, error: "El horario seleccionado no está dentro del horario laboral" }
  }

  // Check blocked slots
  const blockedSlots = await prisma.blockedSlot.findMany({ where: { agendaId, date } })
  const overlapsBlocked = blockedSlots.some(block => {
    const blockStart = timeToMinutes(block.startTime)
    const blockEnd = timeToMinutes(block.endTime)
    return startMin < blockEnd && endMin > blockStart
  })
  if (overlapsBlocked) {
    return { valid: false, error: "El horario seleccionado está bloqueado" }
  }

  // Check existing appointments (overlap detection)
  const appointmentWhere: any = {
    agendaId,
    date,
    status: { not: "cancelled" },
    id: { not: excludeAppointmentId },
  }
  if (employeeId) appointmentWhere.employeeId = employeeId

  const existingAppointments = await prisma.appointment.findMany({
    where: appointmentWhere,
    select: { time: true, serviceId: true },
  })

  // Get service durations for overlapping check
  const serviceIds = existingAppointments.map(a => a.serviceId).filter(Boolean) as string[]
  const services = serviceIds.length > 0
    ? await prisma.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true, durationMin: true } })
    : []
  const serviceDurationMap = new Map(services.map(s => [s.id, s.durationMin]))

  for (const appt of existingAppointments) {
    const apptStart = timeToMinutes(appt.time)
    const apptDuration = appt.serviceId ? (serviceDurationMap.get(appt.serviceId) || 30) : 30
    const apptEnd = apptStart + apptDuration
    if (startMin < apptEnd && endMin > apptStart) {
      return { valid: false, error: "El horario se superpone con otra cita existente" }
    }
  }

  return { valid: true }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const appointment = await prisma.appointment.findFirst({
    where: { id, negocioId: negocio.id },
    include: { service: true },
  })
  if (!appointment) return NextResponse.json({ error: "No encontrada" }, { status: 404 })
  return NextResponse.json(appointment)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const appointment = await prisma.appointment.findFirst({ where: { id, negocioId: negocio.id } })
  if (!appointment) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const data: any = {}

  if (body.status && VALID_STATUSES.includes(body.status as any)) {
    data.status = body.status
  }
  if (body.notes !== undefined) data.notes = String(body.notes).slice(0, 1000)

  // Reagendar: cambiar fecha y/o hora
  let rescheduled = false
  let newDateStr = ""
  let newTimeStr = ""

  if (body.date !== undefined && isValidDateStr(body.date)) {
    const [y, m, d] = body.date.split("-").map(Number)
    data.date = new Date(y, m - 1, d)
    newDateStr = body.date
    rescheduled = true
  }
  if (body.time !== undefined && isValidTimeStr(body.time)) {
    data.time = body.time
    newTimeStr = body.time
    rescheduled = true
  }

  // Validate slot if rescheduling
  if (rescheduled) {
    const checkDate = newDateStr || appointment.date.toISOString().split("T")[0]
    const checkTime = newTimeStr || appointment.time
    const serviceDuration = appointment.serviceId
      ? (await prisma.service.findUnique({ where: { id: appointment.serviceId }, select: { durationMin: true } }))?.durationMin || 30
      : 30

    const validation = await validateSlot(
      appointment.agendaId,
      checkDate,
      checkTime,
      serviceDuration,
      id,
      appointment.employeeId,
    )
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 409 })
    }

    // Record reschedule history
    const historyEntry = {
      from: { date: appointment.date.toISOString().split("T")[0], time: appointment.time },
      to: { date: checkDate, time: checkTime },
      at: new Date().toISOString(),
    }
    const existingHistory = Array.isArray(appointment.rescheduleHistory) ? appointment.rescheduleHistory : []
    data.rescheduleHistory = [...existingHistory, historyEntry]
  }

  // NOTE: update + include triggers interactive transactions in Neon HTTP — do them separately
  await prisma.appointment.update({ where: { id }, data })
  const updated = await prisma.appointment.findUnique({ where: { id }, include: { service: true } })
  if (!updated) return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 })

  // Email de reagendado
  if (rescheduled && appointment.customerEmail) {
    const neg = await prisma.negocio.findUnique({ where: { id: appointment.negocioId }, select: { nombre: true } })
    const tpl = templateAppointmentRescheduled({
      clienteNombre: appointment.customerName,
      tiendaNombre: neg?.nombre || "Tu negocio",
      servicioNombre: updated.service?.name || "Servicio",
      fechaAnterior: formatDate(appointment.date),
      horaAnterior: formatTime(appointment.time),
      fechaNueva: formatDate(updated.date),
      horaNueva: formatTime(updated.time),
    })
    if (tpl) {
      sendEmail(
        appointment.customerEmail,
        `Cita reagendada — ${neg?.nombre || "Panitas"}`,
        tpl,
        "appointment_rescheduled"
      ).catch(e => console.error("[appointment email] rescheduled error:", e))
    }
  }

  // Send email when appointment is completed
  if (data.status === "completed" && appointment.customerEmail) {
    const negocioData = await prisma.negocio.findUnique({ where: { id: appointment.negocioId }, select: { nombre: true } })
    enviarCitaCompletada(appointment.customerEmail, {
      clienteNombre: appointment.customerName,
      tiendaNombre: negocioData?.nombre || "Tu negocio",
      fecha: formatDate(appointment.date),
      hora: formatTime(appointment.time),
      servicioNombre: updated.service?.name || "Sin servicio",
    }).catch(e => console.error("[appointment email] completed error:", e))
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const appointment = await prisma.appointment.findFirst({ where: { id, negocioId: negocio.id } })
  if (!appointment) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  await prisma.appointment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
