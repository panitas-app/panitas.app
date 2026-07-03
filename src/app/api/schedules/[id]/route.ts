import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { safeInt } from "@/lib/validate"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const schedule = await prisma.schedule.findFirst({ where: { id, negocioId: negocio.id } })
  if (!schedule) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const data: any = {}
  if (body.startTime !== undefined) data.startTime = String(body.startTime).slice(0, 5)
  if (body.endTime !== undefined) data.endTime = String(body.endTime).slice(0, 5)
  if (body.isActive !== undefined) data.isActive = body.isActive === true

  const updated = await prisma.schedule.update({ where: { id }, data })
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
  const schedule = await prisma.schedule.findFirst({ where: { id, negocioId: negocio.id } })
  if (!schedule) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  await prisma.schedule.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
