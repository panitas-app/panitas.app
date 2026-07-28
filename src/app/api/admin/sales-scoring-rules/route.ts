import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function GET() {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const rules = await prisma.salesScoringRule.findMany({
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
  }
  if (!body.campo?.trim()) {
    return NextResponse.json({ error: "El campo es requerido" }, { status: 400 })
  }
  if (!body.valor?.trim()) {
    return NextResponse.json({ error: "El valor es requerido" }, { status: 400 })
  }

  const rule = await prisma.salesScoringRule.create({
    data: {
      nombre: body.nombre.trim(),
      descripcion: body.descripcion ?? undefined,
      campo: body.campo.trim(),
      valor: body.valor.trim(),
      puntos: body.puntos ?? 0,
      operador: body.operador ?? "equals",
      activo: body.activo ?? true,
    },
  })

  await createAuditEntry({
    action: "sales_scoring_rule.created",
    entity: "SalesScoringRule",
    entityId: rule.id,
    userId: admin.id,
    metadata: { nombre: rule.nombre, campo: rule.campo },
  })

  return NextResponse.json(rule, { status: 201 })
}
