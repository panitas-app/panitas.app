import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  const existing = await prisma.salesScoringRule.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 })

  const data: any = {}
  if (body.nombre !== undefined) data.nombre = body.nombre
  if (body.descripcion !== undefined) data.descripcion = body.descripcion
  if (body.campo !== undefined) data.campo = body.campo
  if (body.valor !== undefined) data.valor = body.valor
  if (body.puntos !== undefined) data.puntos = body.puntos
  if (body.operador !== undefined) data.operador = body.operador
  if (body.activo !== undefined) data.activo = body.activo

  const rule = await prisma.salesScoringRule.update({ where: { id }, data })

  await createAuditEntry({
    action: "sales_scoring_rule.updated",
    entity: "SalesScoringRule",
    entityId: id,
    userId: admin.id,
    metadata: { changes: Object.keys(body) },
  })

  return NextResponse.json(rule)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const existing = await prisma.salesScoringRule.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 })

  await prisma.salesScoringRule.delete({ where: { id } })

  await createAuditEntry({
    action: "sales_scoring_rule.deleted",
    entity: "SalesScoringRule",
    entityId: id,
    userId: admin.id,
    metadata: { nombre: existing.nombre, campo: existing.campo },
  })

  return NextResponse.json({ success: true })
}
