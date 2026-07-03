import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentNegocio } from "@/lib/permissions"
import { csrfGuard } from "@/lib/csrf"
import { safeStr } from "@/lib/validate"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf
  const negocio = await getCurrentNegocio()
  if (!negocio) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const cat = await prisma.serviceCategory.findFirst({ where: { id, negocioId: negocio.id } })
  if (!cat) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const data: any = {}
  if (body.name !== undefined) data.name = safeStr(body.name, 100, 1)
  if (body.description !== undefined) data.description = safeStr(body.description, 500) || null

  const updated = await prisma.serviceCategory.update({ where: { id }, data })
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
  const cat = await prisma.serviceCategory.findFirst({ where: { id, negocioId: negocio.id } })
  if (!cat) return NextResponse.json({ error: "No encontrada" }, { status: 404 })

  await prisma.serviceCategory.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
