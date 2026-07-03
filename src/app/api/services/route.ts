import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { safeStr, safeFloat, LIMITS } from "@/lib/validate"
import { requireAccesoModulo } from "@/lib/plans"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const agendaId = searchParams.get("agendaId")
  const store = searchParams.get("store")

  // Support public lookup by store slug
  if (store) {
    const storeData = await prisma.store.findUnique({
      where: { slug: store, isActive: true },
      select: { negocioId: true },
    })
    if (!storeData?.negocioId) {
      return NextResponse.json([])
    }
    const services = await prisma.service.findMany({
      where: { negocioId: storeData.negocioId, isActive: true },
      orderBy: { sortOrder: "asc" },
    })
    return NextResponse.json(services)
  }

  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const where: any = { negocioId: negocio.id }
  if (agendaId) where.agendaId = agendaId

  const services = await prisma.service.findMany({
    where,
    include: { category: true },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json(services)
}

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { allowed, error } = requireAccesoModulo(negocio.planId, negocio.modalidad, "agenda")
  if (!allowed) return NextResponse.json({ error }, { status: 403 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const name = safeStr(body.name, LIMITS.MAX_NAME, 1)
  if (!name) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })

  const agendaId = safeStr(body.agendaId, 50)
  if (!agendaId) return NextResponse.json({ error: "agendaId requerido" }, { status: 400 })

  const agenda = await prisma.agenda.findFirst({
    where: { id: agendaId, negocioId: negocio.id },
  })
  if (!agenda) return NextResponse.json({ error: "Agenda no encontrada" }, { status: 404 })

  const service = await prisma.service.create({
    data: {
      name,
      description: body.description ? safeStr(body.description, 500) : null,
      image: body.image ? safeStr(body.image, 500) : null,
      price: safeFloat(body.price, 0, 10000) ?? 0,
      durationMin: Math.max(5, Math.min(480, Number(body.durationMin) || 30)),
      agendaId: agenda.id,
      negocioId: negocio.id,
      categoryId: body.categoryId || null,
    },
  })

  return NextResponse.json(service, { status: 201 })
}
