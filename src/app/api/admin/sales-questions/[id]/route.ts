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

  const existing = await prisma.salesQuestion.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 })

  const data: any = {}
  if (body.texto !== undefined) data.texto = body.texto
  if (body.subtexto !== undefined) data.subtexto = body.subtexto
  if (body.tipo !== undefined) data.tipo = body.tipo
  if (body.opciones !== undefined) data.opciones = body.opciones
  if (body.orden !== undefined) data.orden = body.orden
  if (body.requerida !== undefined) data.requerida = body.requerida
  if (body.puntaje !== undefined) data.puntaje = body.puntaje
  if (body.condicionLogica !== undefined) data.condicionLogica = body.condicionLogica
  if (body.categoria !== undefined) data.categoria = body.categoria
  if (body.placeholder !== undefined) data.placeholder = body.placeholder
  if (body.maxChars !== undefined) data.maxChars = body.maxChars
  if (body.activo !== undefined) data.activo = body.activo
  if (body.sectionId !== undefined) data.sectionId = body.sectionId

  const question = await prisma.salesQuestion.update({ where: { id }, data })

  await createAuditEntry({
    action: "sales_question.updated",
    entity: "SalesQuestion",
    entityId: id,
    userId: admin.id,
    metadata: { changes: Object.keys(body) },
  })

  return NextResponse.json(question)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getLocalSuperadmin()
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params

  const existing = await prisma.salesQuestion.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Pregunta no encontrada" }, { status: 404 })

  await prisma.salesQuestion.delete({ where: { id } })

  await createAuditEntry({
    action: "sales_question.deleted",
    entity: "SalesQuestion",
    entityId: id,
    userId: admin.id,
    metadata: { texto: existing.texto, sectionId: existing.sectionId },
  })

  return NextResponse.json({ success: true })
}
