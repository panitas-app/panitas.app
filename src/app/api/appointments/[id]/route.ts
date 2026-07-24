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
  if (body.date !== undefined && isValidDateStr(body.date)) {
    const [y, m, d] = body.date.split("-").map(Number)
    data.date = new Date(y, m - 1, d)
    rescheduled = true
  }
  if (body.time !== undefined && isValidTimeStr(body.time)) {
    data.time = body.time
    rescheduled = true
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
