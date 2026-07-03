import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { safeStr, safeFloat } from "@/lib/validate"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const service = await prisma.service.findFirst({
    where: { id, negocioId: negocio.id },
  })
  if (!service) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(service)
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
  const existing = await prisma.service.findFirst({ where: { id, negocioId: negocio.id } })
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const data: any = {}
  if (body.name !== undefined) data.name = safeStr(body.name, 100, 1)
  if (body.description !== undefined) data.description = safeStr(body.description, 500) || null
  if (body.image !== undefined) data.image = safeStr(body.image, 500) || null
  if (body.price !== undefined) data.price = safeFloat(body.price, 0, 10000)
  if (body.durationMin !== undefined) data.durationMin = Math.max(5, Math.min(480, Number(body.durationMin)))
  if (body.isActive !== undefined) data.isActive = body.isActive === true
  if (body.categoryId !== undefined) data.categoryId = body.categoryId || null

  const updated = await prisma.service.update({ where: { id }, data })
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
  const existing = await prisma.service.findFirst({ where: { id, negocioId: negocio.id } })
  if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  await prisma.service.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
