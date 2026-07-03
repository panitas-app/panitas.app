import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { safeStr, LIMITS } from "@/lib/validate"

export async function GET(request: NextRequest) {
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const agendaId = searchParams.get("agendaId")

  const where: any = { negocioId: negocio.id }
  if (agendaId) where.agendaId = agendaId

  const categories = await prisma.serviceCategory.findMany({
    where,
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const name = safeStr(body.name, LIMITS.MAX_NAME, 1)
  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const agendaId = safeStr(body.agendaId, 50)
  if (!agendaId) return NextResponse.json({ error: "agendaId requerido" }, { status: 400 })

  const category = await prisma.serviceCategory.create({
    data: {
      name,
      description: body.description ? safeStr(body.description, 500) : null,
      agendaId,
      negocioId: negocio.id,
    },
  })

  return NextResponse.json(category, { status: 201 })
}
