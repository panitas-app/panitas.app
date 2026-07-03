import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { safeInt } from "@/lib/validate"

export async function GET(request: NextRequest) {
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const agendaId = searchParams.get("agendaId")

  const where: any = { negocioId: negocio.id }
  if (agendaId) where.agendaId = agendaId

  const schedules = await prisma.schedule.findMany({
    where,
    orderBy: { dayOfWeek: "asc" },
  })

  return NextResponse.json(schedules)
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const dayOfWeek = safeInt(body.dayOfWeek, 0, 6)
  if (dayOfWeek === null) return NextResponse.json({ error: "dayOfWeek requerido (0-6)" }, { status: 400 })

  const agendaId = String(body.agendaId || "")
  if (!agendaId) return NextResponse.json({ error: "agendaId requerido" }, { status: 400 })

  const schedule = await prisma.schedule.create({
    data: {
      dayOfWeek,
      startTime: String(body.startTime || "09:00").slice(0, 5),
      endTime: String(body.endTime || "18:00").slice(0, 5),
      isActive: body.isActive !== false,
      agendaId,
      negocioId: negocio.id,
    },
  })

  return NextResponse.json(schedule, { status: 201 })
}
