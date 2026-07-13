import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"

const DAY_KEYS = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get("date")
  if (!dateStr) return NextResponse.json({ error: "date requerida" }, { status: 400 })

  const [y, m, d] = dateStr.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const dayOfWeek = date.getDay()

  let agendaId = searchParams.get("agendaId")
  const employeeId = searchParams.get("employeeId")
  const storeSlug = searchParams.get("store")

  // Support public lookup by store slug
  let storeHours: string | null = null
  if (storeSlug && !agendaId) {
    const store = await prisma.store.findUnique({
      where: { slug: storeSlug, isActive: true },
      select: { negocioId: true, storeHours: true },
    })
    if (store?.negocioId) {
      storeHours = store.storeHours
      const agenda = await prisma.agenda.findFirst({
        where: { negocioId: store.negocioId },
        select: { id: true },
      })
      if (agenda) agendaId = agenda.id
    }
  }

  if (!agendaId) {
    const negocio = await getCurrentNegocio()
    if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    agendaId = searchParams.get("agendaId")
    if (!agendaId) return NextResponse.json({ error: "agendaId requerido" }, { status: 400 })
  }

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
  if (schedules.length === 0 && storeHours) {
    try {
      const parsed = JSON.parse(storeHours)
      const dayKey = DAY_KEYS[dayOfWeek]
      const day = parsed[dayKey]
      if (day && day.type !== "Cerrado") {
        schedules.push({ startTime: day.open || "09:00", endTime: day.close || "18:00" })
        if (day.reopen && day.reclose) {
          schedules.push({ startTime: day.reopen, endTime: day.reclose })
        }
      }
    } catch (e) { console.error("[unhandled error]", e) }
  }

  const appointmentWhere: any = { agendaId, date, status: { not: "cancelled" } }
  if (employeeId) appointmentWhere.employeeId = employeeId

  const appointments = await prisma.appointment.findMany({
    where: appointmentWhere,
    select: { time: true, serviceId: true },
  })

  const blockedSlots = await prisma.blockedSlot.findMany({
    where: { agendaId, date },
  })

  const services = await prisma.service.findMany({
    where: { agendaId, isActive: true },
  })

  return NextResponse.json({ schedules, appointments, blockedSlots, services })
}
