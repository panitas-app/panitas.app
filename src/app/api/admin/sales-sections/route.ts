import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLocalSuperadmin } from "@/lib/local-only"
import { createAuditEntry } from "@/lib/audit"

export async function GET() {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const sections = await prisma.salesSection.findMany({
    include: { questions: { orderBy: { orden: "asc" } } },
    orderBy: { orden: "asc" },
  })

  return NextResponse.json(sections)
}

export async function POST(req: NextRequest) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }) }

  if (!body.nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
  }

  const section = await prisma.salesSection.create({
    data: {
      nombre: body.nombre.trim(),
      descripcion: body.descripcion ?? undefined,
      icono: body.icono ?? undefined,
      orden: body.orden ?? 0,
    },
  })

  await createAuditEntry({
    action: "sales_section.created",
    entity: "SalesSection",
    entityId: section.id,
    userId: admin.id,
    metadata: { nombre: section.nombre },
  })

  return NextResponse.json(section, { status: 201 })
}
