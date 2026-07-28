import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function GET() {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const rules = await prisma.salesPlanRecommendation.findMany({
    orderBy: { minPuntuacion: "asc" },
  })

  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  if (!body.plan?.trim()) {
    return NextResponse.json({ error: "El plan es requerido" }, { status: 400 })
  }
  if (body.minPuntuacion === undefined || body.minPuntuacion === null) {
    return NextResponse.json({ error: "La puntuación mínima es requerida" }, { status: 400 })
  }

  const rule = await prisma.salesPlanRecommendation.create({
    data: {
      plan: body.plan.trim(),
      minPuntuacion: body.minPuntuacion,
      maxPuntuacion: body.maxPuntuacion ?? undefined,
      condiciones: body.condiciones ?? undefined,
      descripcion: body.descripcion ?? undefined,
      activo: body.activo ?? true,
    },
  })

  await createAuditEntry({
    action: "sales_plan_rule.created",
    entity: "SalesPlanRecommendation",
    entityId: rule.id,
    userId: admin.id,
    metadata: { plan: rule.plan, minPuntuacion: rule.minPuntuacion },
  })

  return NextResponse.json(rule, { status: 201 })
}
