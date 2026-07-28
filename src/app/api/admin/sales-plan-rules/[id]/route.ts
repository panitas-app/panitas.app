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

  const existing = await prisma.salesPlanRecommendation.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 })

  const data: any = {}
  if (body.plan !== undefined) data.plan = body.plan
  if (body.minPuntuacion !== undefined) data.minPuntuacion = body.minPuntuacion
  if (body.maxPuntuacion !== undefined) data.maxPuntuacion = body.maxPuntuacion
  if (body.condiciones !== undefined) data.condiciones = body.condiciones
  if (body.descripcion !== undefined) data.descripcion = body.descripcion
  if (body.activo !== undefined) data.activo = body.activo

  const rule = await prisma.salesPlanRecommendation.update({ where: { id }, data })

  await createAuditEntry({
    action: "sales_plan_rule.updated",
    entity: "SalesPlanRecommendation",
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

  const existing = await prisma.salesPlanRecommendation.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 })

  await prisma.salesPlanRecommendation.delete({ where: { id } })

  await createAuditEntry({
    action: "sales_plan_rule.deleted",
    entity: "SalesPlanRecommendation",
    entityId: id,
    userId: admin.id,
    metadata: { plan: existing.plan, minPuntuacion: existing.minPuntuacion },
  })

  return NextResponse.json({ success: true })
}
