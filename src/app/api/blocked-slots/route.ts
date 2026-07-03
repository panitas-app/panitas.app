import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { safeStr } from "@/lib/validate"

export async function GET(request: NextRequest) {
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")
  const agendaId = searchParams.get("agendaId")

  const where: any = { negocioId: negocio.id }
  if (date) where.date = new Date(date)
  if (agendaId) where.agendaId = agendaId

  const blocks = await prisma.blockedSlot.findMany({ where })
  return NextResponse.json(blocks)
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const dateStr = safeStr(body.date, 20, 1)
  const startTime = safeStr(body.startTime, 5, 1)
  const endTime = safeStr(body.endTime, 5, 1)
  const agendaId = safeStr(body.agendaId, 50)

  if (!dateStr || !startTime || !endTime || !agendaId) {
    return NextResponse.json({ error: "Campos requeridos: date, startTime, endTime, agendaId" }, { status: 400 })
  }

  const block = await prisma.blockedSlot.create({
    data: {
      date: new Date(dateStr),
      startTime,
      endTime,
      reason: body.reason ? safeStr(body.reason, 500) : null,
      agendaId,
      negocioId: negocio.id,
    },
  })

  return NextResponse.json(block, { status: 201 })
}
