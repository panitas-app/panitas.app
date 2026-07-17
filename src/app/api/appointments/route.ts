import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { safeStr, safeFloat, safeInt, LIMITS } from "@/lib/validate"
import { requireAccesoModulo } from "@/lib/plans"
import { enviarConfirmacionCita, enviarNuevaCitaNegocio } from "@/lib/email"
import { formatDate, formatTime } from "@/lib/email-helpers"

export async function GET(request: NextRequest) {
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")
  const agendaId = searchParams.get("agendaId")
  const employeeId = searchParams.get("employeeId")
  const serviceId = searchParams.get("serviceId")

  const where: any = { negocioId: negocio.id }
  if (date) {
    const [y, m, d] = date.split("-").map(Number)
    where.date = new Date(y, m - 1, d)
  }
  if (agendaId) where.agendaId = agendaId
  if (employeeId) where.employeeId = employeeId
  if (serviceId) where.serviceId = serviceId

  const appointments = await prisma.appointment.findMany({
    where,
    include: { service: true, employee: { select: { id: true, name: true, photo: true } } },
    orderBy: { time: "asc" },
  })

  return NextResponse.json(appointments)
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const customerName = safeStr(body.customerName, LIMITS.MAX_NAME, 1)
  const customerPhone = safeStr(body.customerPhone, 20, 1)
  const time = safeStr(body.time, 5, 1)
  const dateStr = safeStr(body.date, 20, 1)
  const appointmentType = safeStr(body.appointmentType, 30) || "in_person"

  if (!customerName || !customerPhone || !time || !dateStr) {
    return NextResponse.json({ error: "Campos requeridos: customerName, customerPhone, date, time" }, { status: 400 })
  }

  // Support both authenticated (agendaId) and public (storeSlug) booking
  let agendaId = safeStr(body.agendaId, 50)
  let negocioId: string

  if (body.storeSlug) {
    const storeSlug = safeStr(body.storeSlug, 100)
    if (!storeSlug) return NextResponse.json({ error: "storeSlug inválido" }, { status: 400 })
    const store = await prisma.store.findUnique({
      where: { slug: storeSlug, isActive: true },
      select: { negocioId: true },
    })
    if (!store || !store.negocioId) {
      return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 })
    }
    negocioId = store.negocioId
    if (!agendaId) {
      const agenda = await prisma.agenda.findFirst({
        where: { negocioId },
        select: { id: true },
      })
      if (!agenda) return NextResponse.json({ error: "Agenda no disponible" }, { status: 404 })
      agendaId = agenda.id
    }
  } else {
    const negocio = await getCurrentNegocio()
    if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { allowed, error } = requireAccesoModulo(negocio.planId, negocio.modalidad, "agenda")
    if (!allowed) return NextResponse.json({ error }, { status: 403 })

    negocioId = negocio.id
    if (!agendaId) return NextResponse.json({ error: "agendaId requerido" }, { status: 400 })
  }

  const agenda = await prisma.agenda.findFirst({
    where: { id: agendaId, negocioId },
  })
  if (!agenda) return NextResponse.json({ error: "Agenda no encontrada" }, { status: 404 })

  const [ay, am, ad] = dateStr.split("-").map(Number)
  const appointment = await prisma.appointment.create({
    data: {
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
      serviceId: body.serviceId || null,
      employeeId: body.employeeId || null,
    },
    include: { service: true },
  })

  // ─── Send emails ────────────────────────────────────────────────
  const fecha = formatDate(appointment.date)
  const hora = formatTime(appointment.time)
  const servicioNombre = appointment.service?.name || "Sin servicio"
  const duracion = appointment.service?.durationMin || 30
  const customerEmail = body.customerEmail ? safeStr(body.customerEmail, 200) : null

  // Update appointment with customerEmail if provided
  if (customerEmail && !appointment.customerEmail) {
    await prisma.appointment.update({ where: { id: appointment.id }, data: { customerEmail } })
  }

  const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true, userId: true } })
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
    }).catch(e => console.error("[appointment email] confirmation error:", e))
  }

  // Email alert to merchant
  if (negocio?.userId) {
    const owner = await prisma.user.findUnique({ where: { id: negocio.userId }, select: { email: true } })
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
      }).catch(e => console.error("[appointment email] merchant alert error:", e))
    }
  }

  return NextResponse.json(appointment, { status: 201 })
}
