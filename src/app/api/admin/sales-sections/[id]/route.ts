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

  const existing = await prisma.salesSection.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 })

  const data: any = {}
  if (body.nombre !== undefined) data.nombre = body.nombre
  if (body.descripcion !== undefined) data.descripcion = body.descripcion
  if (body.icono !== undefined) data.icono = body.icono
  if (body.tipo !== undefined) data.tipo = body.tipo
  if (body.route !== undefined) data.route = body.route
  if (body.guiaVendedor !== undefined) data.guiaVendedor = body.guiaVendedor
  if (body.orden !== undefined) data.orden = body.orden
  if (body.activo !== undefined) data.activo = body.activo

  const section = await prisma.salesSection.update({ where: { id }, data })

  await createAuditEntry({
    action: "sales_section.updated",
    entity: "SalesSection",
    entityId: id,
    userId: admin.id,
    metadata: { changes: Object.keys(body) },
  })

  return NextResponse.json(section)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const existing = await prisma.salesSection.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Sección no encontrada" }, { status: 404 })

  await prisma.salesSection.delete({ where: { id } })

  await createAuditEntry({
    action: "sales_section.deleted",
    entity: "SalesSection",
    entityId: id,
    userId: admin.id,
    metadata: { nombre: existing.nombre },
  })

  return NextResponse.json({ success: true })
}
